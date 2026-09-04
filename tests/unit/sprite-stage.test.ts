import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStage } from '../../src/runtime/sprite/stage';
import { createSprite } from '../../src/runtime/sprite/sprite';

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
  const context = {
    clearRect,
    drawImage,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })),
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

  it('creates a PNG thumbnail of the current canvas', () => {
    const canvas = document.createElement('canvas');
    const stage = createStage(canvas, () => ({
      sprites: [],
      backdropUrl: null,
      costumeUrlFor: () => null,
    }));

    expect(stage.thumbnail()).toMatch(/^data:image\/png/);
  });
});
