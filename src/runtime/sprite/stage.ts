import { directionToRadians, STAGE, type Sprite } from './sprite';
import { colorsMatch } from './sensing';
import { t } from '../../app/i18n';

export type Scene = {
  sprites: Sprite[];
  backdropUrl: string | null;
  costumeUrlFor: (sprite: Sprite) => string | null;
};

export type Stage = {
  render(): void;
  hitTest(clientX: number, clientY: number): string | null;
  setPointer(clientX: number, clientY: number, down: boolean): void;
  pointer(): { x: number; y: number; down: boolean };
  colorUnderSprite(spriteId: string, hex: string, tolerance?: number): boolean;
  costumeNaturalOf(spriteId: string): { width: number; height: number };
  showAsk(question: string, onSubmit: (answer: string) => void): void;
  hideAsk(): void;
  thumbnail(maxW?: number): string;
  setNeedsResize(): void;
  dispose(): void;
};

export function createStage(canvas: HTMLCanvasElement, getScene: () => Scene): Stage {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D tidak tersedia.');

  const images = new Map<string, HTMLImageElement>();
  let needsResize = true;
  let disposed = false;
  let redrawQueued = false;
  let pointerState = { x: 0, y: 0, down: false };
  let askOverlay: HTMLFormElement | null = null;

  const scheduleRedraw = (): void => {
    if (disposed || redrawQueued) return;
    redrawQueued = true;
    queueMicrotask(() => {
      redrawQueued = false;
      if (!disposed) stage.render();
    });
  };

  const imageFor = (url: string): HTMLImageElement => {
    const cached = images.get(url);
    if (cached) return cached;
    const image = new Image();
    images.set(url, image);
    image.onload = scheduleRedraw;
    image.src = url;
    return image;
  };

  const ready = (image: HTMLImageElement): boolean =>
    image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;

  const drawBackdrop = (target: CanvasRenderingContext2D, url: string): void => {
    const image = imageFor(url);
    if (!ready(image)) return;
    const scale = Math.max(STAGE.width / image.naturalWidth, STAGE.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    target.drawImage(image, (STAGE.width - width) / 2, (STAGE.height - height) / 2, width, height);
  };

  const drawBubble = (
    target: CanvasRenderingContext2D,
    sprite: Sprite,
    imageHeight: number,
  ): void => {
    if (!sprite.bubble) return;
    const text = sprite.bubble.text;
    const width = Math.max(54, target.measureText(text).width + 20);
    const x = -width / 2;
    const y = -imageHeight / 2 - 42;
    target.beginPath();
    target.roundRect(x, y, width, 30, 10);
    target.fillStyle = '#ffffff';
    target.fill();
    target.strokeStyle = '#64748b';
    target.lineWidth = 1;
    target.stroke();
    target.fillStyle = '#1f2937';
    target.font = '14px system-ui, sans-serif';
    target.fillText(text, x + 10, y + 20);
  };

  // Pixel-accurate rotation and bubble layout are covered by the manual checklist and E2E.
  const drawSprite = (
    target: CanvasRenderingContext2D,
    sprite: Sprite,
    costumeUrl: string,
    includeBubble = true,
  ): void => {
    const image = imageFor(costumeUrl);
    if (!ready(image)) return;
    const scale = sprite.size / 100;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    target.save();
    target.translate(STAGE.width / 2 + sprite.x, STAGE.height / 2 - sprite.y);
    // Canvas rotate() is clockwise with y-down; directionToRadians is CCW math
    // convention, so negate it to draw the costume facing its Scratch direction.
    target.rotate(-directionToRadians(sprite.direction));
    target.drawImage(image, -width / 2, -height / 2, width, height);
    if (includeBubble) drawBubble(target, sprite, height);
    target.restore();
  };

  const clientToStage = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * STAGE.width - STAGE.width / 2,
      y: STAGE.height / 2 - ((clientY - rect.top) / rect.height) * STAGE.height,
    };
  };

  const stage: Stage = {
    render(): void {
      if (disposed) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.round(STAGE.width * dpr);
      const height = Math.round(STAGE.height * dpr);
      if (needsResize || canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.aspectRatio = `${STAGE.width} / ${STAGE.height}`;
        needsResize = false;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, STAGE.width, STAGE.height);

      const scene = getScene();
      if (scene.backdropUrl) drawBackdrop(context, scene.backdropUrl);
      for (const sprite of scene.sprites) {
        if (!sprite.visible) continue;
        const url = scene.costumeUrlFor(sprite);
        if (url) drawSprite(context, sprite, url);
      }
    },
    hitTest(clientX, clientY): string | null {
      const point = clientToStage(clientX, clientY);
      if (!point) return null;
      const { x: stageX, y: stageY } = point;
      const scene = getScene();
      for (let index = scene.sprites.length - 1; index >= 0; index--) {
        const sprite = scene.sprites[index]!;
        if (!sprite.visible) continue;
        const url = scene.costumeUrlFor(sprite);
        if (!url) continue;
        const image = images.get(url);
        if (!image || !ready(image)) continue;
        const halfWidth = (image.naturalWidth * sprite.size) / 200;
        const halfHeight = (image.naturalHeight * sprite.size) / 200;
        if (
          stageX >= sprite.x - halfWidth &&
          stageX <= sprite.x + halfWidth &&
          stageY >= sprite.y - halfHeight &&
          stageY <= sprite.y + halfHeight
        ) {
          return sprite.id;
        }
      }
      return null;
    },
    setPointer(clientX, clientY, down): void {
      const point = clientToStage(clientX, clientY);
      if (!point) {
        pointerState = { ...pointerState, down };
        return;
      }
      pointerState = { ...point, down };
    },
    pointer(): { x: number; y: number; down: boolean } {
      return { ...pointerState };
    },
    colorUnderSprite(spriteId, hex, tolerance = 24): boolean {
      const scene = getScene();
      const sprite = scene.sprites.find((candidate) => candidate.id === spriteId);
      if (!sprite || !sprite.visible) return false;
      const costumeUrl = scene.costumeUrlFor(sprite);
      if (!costumeUrl) return false;
      const image = images.get(costumeUrl);
      if (!image || !ready(image)) return false;

      const scale = sprite.size / 100;
      const halfWidth = (image.naturalWidth * scale) / 2;
      const halfHeight = (image.naturalHeight * scale) / 2;
      const left = Math.max(0, Math.floor(STAGE.width / 2 + sprite.x - halfWidth));
      const right = Math.min(STAGE.width, Math.ceil(STAGE.width / 2 + sprite.x + halfWidth));
      const top = Math.max(0, Math.floor(STAGE.height / 2 - sprite.y - halfHeight));
      const bottom = Math.min(STAGE.height, Math.ceil(STAGE.height / 2 - sprite.y + halfHeight));
      const width = right - left;
      const height = bottom - top;
      if (width <= 0 || height <= 0) return false;

      const offscreen = document.createElement('canvas');
      offscreen.width = STAGE.width;
      offscreen.height = STAGE.height;
      const offscreenContext = offscreen.getContext('2d');
      if (!offscreenContext) return false;
      offscreenContext.clearRect(0, 0, STAGE.width, STAGE.height);
      if (scene.backdropUrl) drawBackdrop(offscreenContext, scene.backdropUrl);
      for (const other of scene.sprites) {
        if (!other.visible || other.id === spriteId) continue;
        const otherUrl = scene.costumeUrlFor(other);
        if (otherUrl) drawSprite(offscreenContext, other, otherUrl, false);
      }

      try {
        const pixels = offscreenContext.getImageData(left, top, width, height).data;
        // MVP simplification: any matching scene-minus-self pixel inside the AABB counts.
        for (let index = 0; index < pixels.length; index += 4) {
          if (
            (pixels[index + 3] ?? 0) > 0 &&
            colorsMatch(
              pixels[index] ?? 0,
              pixels[index + 1] ?? 0,
              pixels[index + 2] ?? 0,
              hex,
              tolerance,
            )
          ) {
            return true;
          }
        }
      } catch {
        return false;
      }
      return false;
    },
    costumeNaturalOf(spriteId): { width: number; height: number } {
      const sprite = getScene().sprites.find((candidate) => candidate.id === spriteId);
      if (!sprite) return { width: 80, height: 80 };
      const url = getScene().costumeUrlFor(sprite);
      if (!url) return { width: 80, height: 80 };
      const image = images.get(url) ?? imageFor(url);
      return ready(image)
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : { width: 80, height: 80 };
    },
    showAsk(question, onSubmit): void {
      stage.hideAsk();
      const form = document.createElement('form');
      form.className = 'sprite-ask';
      const label = document.createElement('label');
      label.textContent = question;
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = t('editor.sprite.askPlaceholder');
      const button = document.createElement('button');
      button.type = 'submit';
      button.textContent = t('editor.sprite.askSubmit');
      label.append(input);
      form.append(label, button);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const answer = input.value;
        stage.hideAsk();
        onSubmit(answer);
      });
      (canvas.parentElement ?? document.body).append(form);
      askOverlay = form;
      input.focus();
    },
    hideAsk(): void {
      askOverlay?.remove();
      askOverlay = null;
    },
    thumbnail(maxW = 160): string {
      const output = document.createElement('canvas');
      output.width = maxW;
      output.height = Math.round((maxW * STAGE.height) / STAGE.width);
      const outputContext = output.getContext('2d');
      outputContext?.drawImage(canvas, 0, 0, output.width, output.height);
      return output.toDataURL('image/png');
    },
    setNeedsResize(): void {
      needsResize = true;
    },
    dispose(): void {
      disposed = true;
      stage.hideAsk();
      for (const image of images.values()) {
        image.onload = null;
        image.onerror = null;
      }
      images.clear();
    },
  };

  return stage;
}
