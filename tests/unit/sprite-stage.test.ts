import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStage } from '../../src/runtime/sprite/stage';
import { createSprite, directionToRadians } from '../../src/runtime/sprite/sprite';

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
