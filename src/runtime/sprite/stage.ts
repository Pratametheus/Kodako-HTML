import { directionToRadians, STAGE, type Sprite } from './sprite';

export type Scene = {
  sprites: Sprite[];
  backdropUrl: string | null;
  costumeUrlFor: (sprite: Sprite) => string | null;
};

export type Stage = {
  render(): void;
  hitTest(clientX: number, clientY: number): string | null;
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

  const drawBackdrop = (url: string): void => {
    const image = imageFor(url);
    if (!ready(image)) return;
    const scale = Math.max(STAGE.width / image.naturalWidth, STAGE.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (STAGE.width - width) / 2, (STAGE.height - height) / 2, width, height);
  };

  const drawBubble = (sprite: Sprite, imageHeight: number): void => {
    if (!sprite.bubble) return;
    const text = sprite.bubble.text;
    const width = Math.max(54, context.measureText(text).width + 20);
    const x = -width / 2;
    const y = -imageHeight / 2 - 42;
    context.beginPath();
    context.roundRect(x, y, width, 30, 10);
    context.fillStyle = '#ffffff';
    context.fill();
    context.strokeStyle = '#64748b';
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = '#1f2937';
    context.font = '14px system-ui, sans-serif';
    context.fillText(text, x + 10, y + 20);
  };

  // Pixel-accurate rotation and bubble layout are covered by the manual checklist and E2E.
  const drawSprite = (sprite: Sprite, costumeUrl: string): void => {
    const image = imageFor(costumeUrl);
    if (!ready(image)) return;
    const scale = sprite.size / 100;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.save();
    context.translate(STAGE.width / 2 + sprite.x, STAGE.height / 2 - sprite.y);
    context.rotate(directionToRadians(sprite.direction));
    context.drawImage(image, -width / 2, -height / 2, width, height);
    drawBubble(sprite, height);
    context.restore();
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
      if (scene.backdropUrl) drawBackdrop(scene.backdropUrl);
      for (const sprite of scene.sprites) {
        if (!sprite.visible) continue;
        const url = scene.costumeUrlFor(sprite);
        if (url) drawSprite(sprite, url);
      }
    },
    hitTest(clientX, clientY): string | null {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const stageX = ((clientX - rect.left) / rect.width) * STAGE.width - STAGE.width / 2;
      const stageY = STAGE.height / 2 - ((clientY - rect.top) / rect.height) * STAGE.height;
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
      for (const image of images.values()) {
        image.onload = null;
        image.onerror = null;
      }
      images.clear();
    },
  };

  return stage;
}
