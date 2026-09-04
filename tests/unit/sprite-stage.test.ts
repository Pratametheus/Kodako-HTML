import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStage } from '../../src/runtime/sprite/stage';
import { createSprite, directionToRadians, STAGE } from '../../src/runtime/sprite/sprite';

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 80;
  naturalHeight = 80;
  width = 80;
  height = 80;
  complete = true;
  private value = '';
  set src(next: string) {
    this.value = next;
    this.onload?.();
  }
  get src(): string {
    return this.value;
  }
}

describe('sprite stage', () => {
  const drawImage = vi.fn();
  const clearRect = vi.fn();
  const rotate = vi.fn();
  const getImageData = vi.fn();
  const context = {
    clearRect,
    drawImage,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate,
    scale: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })),
    getImageData,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;

  beforeEach(() => {
    vi.stubGlobal('Image', FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,stage',
    );
    drawImage.mockClear();
    clearRect.mockClear();
    rotate.mockClear();
    getImageData.mockReset();
    getImageData.mockReturnValue({ data: new Uint8ClampedArray(80 * 80 * 4) } as ImageData);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders the backdrop and visible sprites while skipping hidden sprites', () => {
    const canvas = document.createElement('canvas');
    const visible = createSprite({ id: 'shown', name: 'Tampil', costumes: ['cat'] });
    const hidden = createSprite({
      id: 'hidden',
      name: 'Tersembunyi',
      costumes: ['cat'],
      visible: false,
    });
    const stage = createStage(canvas, () => ({
      sprites: [visible, hidden],
      backdropUrl: 'bg',
      costumeUrlFor: () => 'cat',
    }));

    stage.render();

    expect(clearRect).toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledTimes(2);
    stage.dispose();
  });

  it('hit-tests Scratch coordinates using rendered costume bounds', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 480,
      bottom: 360,
      width: 480,
      height: 360,
      toJSON: () => ({}),
    });
    const sprite = createSprite({ id: 's1', name: 'Kucing', costumes: ['cat'] });
    const stage = createStage(canvas, () => ({
      sprites: [sprite],
      backdropUrl: null,
      costumeUrlFor: () => 'cat',
    }));
    stage.render();

    expect(stage.hitTest(240, 180)).toBe('s1');
    expect(stage.hitTest(10, 10)).toBeNull();
  });

  it('rotates costumes by the negated direction so dir 0 faces +x, not mirrored', () => {
    const canvas = document.createElement('canvas');
    const render = (direction: number): number => {
      rotate.mockClear();
      const sprite = createSprite({ id: 's1', name: 'Kucing', costumes: ['cat'], direction });
      const stage = createStage(canvas, () => ({
        sprites: [sprite],
        backdropUrl: null,
        costumeUrlFor: () => 'cat',
      }));
      stage.render();
      const arg = rotate.mock.calls.at(-1)![0] as number;
      stage.dispose();
      return arg;
    };

    // Fixed code passes -directionToRadians(dir); directionToRadians(0) === +PI/2.
    expect(render(0)).toBe(-directionToRadians(0));
    expect(render(0)).toBeCloseTo(-Math.PI / 2);
    // direction 90 (facing +x, the default) => no rotation.
    expect(render(90)).toBeCloseTo(0);
  });

  it('creates a PNG thumbnail of the current canvas', () => {
    const canvas = document.createElement('canvas');
    const stage = createStage(canvas, () => ({
      sprites: [],
      backdropUrl: null,
      costumeUrlFor: () => null,
    }));

    expect(stage.thumbnail()).toMatch(/^data:image\/png/);
  });

  it('converts client coordinates to stage pointer state', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 480,
      bottom: 360,
      width: 480,
      height: 360,
      toJSON: () => ({}),
    });
    const stage = createStage(canvas, () => ({
      sprites: [],
      backdropUrl: null,
      costumeUrlFor: () => null,
    }));

    stage.setPointer(240, 180, true);
    expect(stage.pointer()).toEqual({ x: 0, y: 0, down: true });
    stage.setPointer(480, 0, false);
    expect(stage.pointer()).toEqual({ x: 240, y: 180, down: false });
  });

  it('samples visible matching colors from the scene-minus-self bounding box', () => {
    const canvas = document.createElement('canvas');
    const sprite = createSprite({ id: 's1', name: 'Kucing', costumes: ['cat'] });
    const stage = createStage(canvas, () => ({
      sprites: [sprite],
      backdropUrl: null,
      costumeUrlFor: () => 'cat',
    }));
    stage.render();
    const matching = new Uint8ClampedArray(80 * 80 * 4);
    matching.set([0xe5, 0x39, 0x35, 255]);
    getImageData.mockReturnValueOnce({ data: matching } as ImageData);
    expect(stage.colorUnderSprite('s1', '#e53935')).toBe(true);

    getImageData.mockReturnValueOnce({ data: new Uint8ClampedArray(80 * 80 * 4) } as ImageData);
    expect(stage.colorUnderSprite('s1', '#e53935')).toBe(false);
  });

  it('rasterizes the colour-sensing backdrop once per frame, then reuses the cache', () => {
    const canvas = document.createElement('canvas');
    const sprite = createSprite({ id: 's1', name: 'Kucing', costumes: ['cat'] });
    const stage = createStage(canvas, () => ({
      sprites: [sprite],
      backdropUrl: 'bg',
      costumeUrlFor: () => 'cat',
    }));
    getImageData.mockReturnValue({ data: new Uint8ClampedArray(80 * 80 * 4) } as ImageData);

    stage.render();
    drawImage.mockClear();

    for (let i = 0; i < 5; i++) stage.colorUnderSprite('s1', '#e53935');
    // One raster of the backdrop for the whole frame, no matter how many times
    // colorUnderSprite is called within it (a tight `menyentuh warna` loop).
    expect(drawImage).toHaveBeenCalledTimes(1);

    stage.render(); // bumps the frame's scene version
    drawImage.mockClear();
    stage.colorUnderSprite('s1', '#e53935');
    expect(drawImage).toHaveBeenCalledTimes(1);

    stage.dispose();
  });

  it('submits and removes a Bahasa Indonesia ask overlay', () => {
    const host = document.createElement('div');
    const canvas = document.createElement('canvas');
    host.append(canvas);
    const stage = createStage(canvas, () => ({
      sprites: [],
      backdropUrl: null,
      costumeUrlFor: () => null,
    }));
    const submitted = vi.fn();

    stage.showAsk('Nama?', submitted);
    const form = host.querySelector('form')!;
    const input = form.querySelector('input')!;
    expect(form.textContent).toContain('Nama?');
    expect(form.querySelector('button')?.textContent).toBe('Kirim');
    input.value = 'Budi';
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));

    expect(submitted).toHaveBeenCalledWith('Budi');
    expect(host.querySelector('form')).toBeNull();

    stage.showAsk('Lagi?', submitted);
    stage.hideAsk();
    expect(host.querySelector('form')).toBeNull();
  });
});

// The suite above mocks getImageData with canned buffers unrelated to what was
// actually drawn -- which is exactly why a z-order occlusion bug could ship
// undetected (see phase-3b-polish foreman review, F1). This block instead
// backs the fake 2D context with a real in-memory pixel buffer per canvas, so
// drawImage/getImageData reflect what was genuinely composited, in order.
describe('colour occlusion respects z-order (real composited raster)', () => {
  type RGBA = readonly [number, number, number, number];
  type ImageMeta = { width: number; height: number; color: RGBA };

  let registry: Map<string, ImageMeta>;

  class FakeColorImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    width = 0;
    height = 0;
    complete = true;
    color: RGBA = [0, 0, 0, 0];
    private value = '';
    set src(next: string) {
      this.value = next;
      const meta = registry.get(next);
      if (meta) {
        this.naturalWidth = meta.width;
        this.naturalHeight = meta.height;
        this.width = meta.width;
        this.height = meta.height;
        this.color = meta.color;
      }
      this.onload?.();
    }
    get src(): string {
      return this.value;
    }
  }

  // Each canvas (main + the stage's offscreen "sense" canvas) gets its own
  // independent pixel buffer, exactly like real HTMLCanvasElements do.
  function createFakeContext(): CanvasRenderingContext2D {
    const buffer = new Uint8ClampedArray(STAGE.width * STAGE.height * 4);
    let tx = 0;
    let ty = 0;
    const stack: Array<{ tx: number; ty: number }> = [];

    const setPixel = (x: number, y: number, color: RGBA): void => {
      if (x < 0 || y < 0 || x >= STAGE.width || y >= STAGE.height) return;
      const offset = (y * STAGE.width + x) * 4;
      buffer[offset] = color[0];
      buffer[offset + 1] = color[1];
      buffer[offset + 2] = color[2];
      buffer[offset + 3] = color[3];
    };

    return {
      save: () => stack.push({ tx, ty }),
      restore: () => {
        const top = stack.pop();
        if (top) {
          tx = top.tx;
          ty = top.ty;
        }
      },
      translate: (x: number, y: number) => {
        tx += x;
        ty += y;
      },
      // Every sprite in this suite uses the default direction (90 deg, i.e.
      // rotate(0) -- see the "no rotation" case above), so rotation is a
      // deliberate no-op here rather than an unmodelled gap.
      rotate: () => {},
      scale: () => {},
      setTransform: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 30 }),
      clearRect: (x: number, y: number, w: number, h: number) => {
        const left = Math.max(0, Math.floor(x));
        const top = Math.max(0, Math.floor(y));
        const right = Math.min(STAGE.width, Math.ceil(x + w));
        const bottom = Math.min(STAGE.height, Math.ceil(y + h));
        for (let py = top; py < bottom; py++) {
          for (let px = left; px < right; px++) setPixel(px, py, [0, 0, 0, 0]);
        }
      },
      drawImage: (image: unknown, dx: number, dy: number, dWidth?: number, dHeight?: number) => {
        const source = image as FakeColorImage;
        const width = Math.round(dWidth ?? source.naturalWidth);
        const height = Math.round(dHeight ?? source.naturalHeight);
        const left = Math.round(tx + dx);
        const top = Math.round(ty + dy);
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) setPixel(left + col, top + row, source.color);
        }
      },
      getImageData: (x: number, y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let row = 0; row < h; row++) {
          for (let col = 0; col < w; col++) {
            const sx = x + col;
            const sy = y + row;
            if (sx < 0 || sy < 0 || sx >= STAGE.width || sy >= STAGE.height) continue;
            const src = (sy * STAGE.width + sx) * 4;
            const dst = (row * w + col) * 4;
            data[dst] = buffer[src]!;
            data[dst + 1] = buffer[src + 1]!;
            data[dst + 2] = buffer[src + 2]!;
            data[dst + 3] = buffer[src + 3]!;
          }
        }
        return { data } as ImageData;
      },
      fillStyle: '',
      strokeStyle: '',
      font: '',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
  }

  beforeEach(() => {
    registry = new Map();
    vi.stubGlobal('Image', FakeColorImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() =>
      createFakeContext(),
    );
  });

  afterEach(() => vi.restoreAllMocks());

  const RED = '#e53935';
  const BLUE = '#1e88e5';

  function buildScene(overlapping: boolean): {
    canvas: HTMLCanvasElement;
    stage: ReturnType<typeof createStage>;
  } {
    registry.set('bg', {
      width: STAGE.width,
      height: STAGE.height,
      color: [0xe5, 0x39, 0x35, 255],
    });
    registry.set('costA', { width: 100, height: 100, color: [0, 0, 0, 0] });
    registry.set('costB', { width: 100, height: 100, color: [0x1e, 0x88, 0xe5, 255] });

    const spriteA = createSprite({ id: 'a', name: 'A', costumes: ['costA'], x: 0, y: 0 });
    // Overlapping: B's bbox fully covers A's query bbox (occludes the
    // backdrop there). Non-overlapping: B sits far to the right of A.
    const spriteB = createSprite({
      id: 'b',
      name: 'B',
      costumes: ['costB'],
      x: overlapping ? 0 : 200,
      y: 0,
    });
    const costumeFor: Record<string, string> = { a: 'costA', b: 'costB' };
    const canvas = document.createElement('canvas');
    const stage = createStage(canvas, () => ({
      sprites: [spriteA, spriteB],
      backdropUrl: 'bg',
      costumeUrlFor: (sprite) => costumeFor[sprite.id] ?? null,
    }));
    stage.render();
    return { canvas, stage };
  }

  it('does NOT report the backdrop colour when an opaque sprite occludes it', () => {
    const { stage } = buildScene(true);

    // B (blue, opaque) fully covers the backdrop (red) within A's own query
    // bounding box, so A must NOT be considered touching red there -- red is
    // hidden underneath B. This is the regression: independent backdrop/sprite
    // tests would each report their own colour and OR them together, ignoring
    // that B is drawn on top and actually hides the backdrop.
    expect(stage.colorUnderSprite('a', RED)).toBe(false);
    // B itself is genuinely visible there.
    expect(stage.colorUnderSprite('a', BLUE)).toBe(true);

    stage.dispose();
  });

  it('still detects the backdrop colour when the occluder does not overlap', () => {
    const { stage } = buildScene(false);

    expect(stage.colorUnderSprite('a', RED)).toBe(true);
    expect(stage.colorUnderSprite('a', BLUE)).toBe(false);

    stage.dispose();
  });
});
