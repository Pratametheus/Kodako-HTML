export interface ResizableSplitOptions {
  /** `localStorage` key for the persisted left-pane fraction (0..1). */
  storageKey: string;
  /** Minimum px width of the left (first) pane. */
  minLeft: number;
  /** Minimum px width of the right (second) pane. */
  minRight: number;
  /** Left-pane fraction used when nothing is stored and on reset. */
  defaultFraction: number;
  /** Gutter width in px (must match the CSS grid track). Default 6. */
  gutter?: number;
  /** Called (rAF-throttled) whenever the split changes — e.g. `Blockly.svgResize`. */
  onResize?: () => void;
}

/**
 * Make a two-pane CSS-grid `container` horizontally resizable by dragging a
 * gutter inserted between its two element children. The helper only ever writes
 * `--split-left` (a px string) onto `container`; the stylesheet is expected to
 * do `grid-template-columns: var(--split-left, <default>) <gutter>px minmax(...)`.
 *
 * The split is persisted as a fraction of the container width in
 * `localStorage[storageKey]` and re-applied (clamped to the min widths) on mount
 * and on window resize. Drag the gutter, arrow-key it when focused, or
 * double-click it to reset to `defaultFraction`. Returns a disposer. No-op /
 * never throws when `container` is null or has fewer than two children.
 */
export function makeResizableSplit(
  container: HTMLElement | null,
  options: ResizableSplitOptions,
): () => void {
  if (!container || container.children.length < 2) return () => {};

  const gutterW = options.gutter ?? 6;
  const secondChild = container.children[1]!;

  const gutter = document.createElement('div');
  gutter.className = 'ed-split-gutter';
  gutter.setAttribute('role', 'separator');
  gutter.setAttribute('aria-orientation', 'vertical');
  gutter.setAttribute('tabindex', '0');
  gutter.setAttribute('aria-label', 'Ubah ukuran panel');
  container.insertBefore(gutter, secondChild);

  const readFraction = (): number => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(options.storageKey);
    } catch {
      stored = null;
    }
    const n = stored === null ? Number.NaN : Number.parseFloat(stored);
    return Number.isFinite(n) && n > 0 && n < 1 ? n : options.defaultFraction;
  };

  const writeFraction = (fraction: number): void => {
    try {
      localStorage.setItem(options.storageKey, String(fraction));
    } catch {
      /* storage disabled / full — a session-only split is acceptable */
    }
  };

  const clampLeft = (leftPx: number): number => {
    const total = container.clientWidth;
    const max = Math.max(options.minLeft, total - gutterW - options.minRight);
    return Math.max(options.minLeft, Math.min(leftPx, max));
  };

  let frame = 0;
  const setLeft = (leftPx: number, persist: boolean): void => {
    const clamped = Math.round(clampLeft(leftPx));
    container.style.setProperty('--split-left', `${clamped}px`);
    const total = container.clientWidth;
    if (persist && total > 0) writeFraction(clamped / total);
    if (options.onResize) {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        options.onResize?.();
      });
    }
  };

  const applyStored = (): void => {
    const total = container.clientWidth;
    if (total > 0) setLeft(readFraction() * total, false);
  };

  let dragging = false;
  const onPointerDown = (event: PointerEvent): void => {
    dragging = true;
    try {
      gutter.setPointerCapture(event.pointerId);
    } catch {
      /* capture unsupported in the test env */
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging) return;
    const rect = container.getBoundingClientRect();
    setLeft(event.clientX - rect.left, false);
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    try {
      gutter.releasePointerCapture(event.pointerId);
    } catch {
      /* not captured */
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const leftPx = Number.parseFloat(container.style.getPropertyValue('--split-left'));
    const total = container.clientWidth;
    if (Number.isFinite(leftPx) && total > 0) writeFraction(leftPx / total);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const step = event.shiftKey ? 48 : 16;
    let delta = 0;
    if (event.key === 'ArrowLeft') delta = -step;
    else if (event.key === 'ArrowRight') delta = step;
    else return;
    event.preventDefault();
    const cur = Number.parseFloat(container.style.getPropertyValue('--split-left'));
    const base = Number.isFinite(cur) ? cur : readFraction() * container.clientWidth;
    setLeft(base + delta, true);
  };

  const onDblClick = (): void => {
    const total = container.clientWidth;
    if (total > 0) setLeft(options.defaultFraction * total, false);
    writeFraction(options.defaultFraction);
  };

  const onWindowResize = (): void => applyStored();

  gutter.addEventListener('pointerdown', onPointerDown);
  gutter.addEventListener('pointermove', onPointerMove);
  gutter.addEventListener('pointerup', onPointerUp);
  gutter.addEventListener('pointercancel', onPointerUp);
  gutter.addEventListener('keydown', onKeyDown);
  gutter.addEventListener('dblclick', onDblClick);
  window.addEventListener('resize', onWindowResize);

  applyStored();

  return () => {
    gutter.removeEventListener('pointerdown', onPointerDown);
    gutter.removeEventListener('pointermove', onPointerMove);
    gutter.removeEventListener('pointerup', onPointerUp);
    gutter.removeEventListener('pointercancel', onPointerUp);
    gutter.removeEventListener('keydown', onKeyDown);
    gutter.removeEventListener('dblclick', onDblClick);
    window.removeEventListener('resize', onWindowResize);
    if (frame) cancelAnimationFrame(frame);
    gutter.remove();
  };
}
