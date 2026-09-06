export interface ParallaxOptions {
  reducedMotion: boolean;
}

/**
 * Attach an rAF-throttled `scroll` listener that writes a `--parallax-y` custom
 * property onto each node — a small negative fraction of `window.scrollY`,
 * scaled by the node's `data-parallax-depth` (default `0.1`). No-op under
 * reduced motion or with no nodes. Returns a cleanup function that removes the
 * listener.
 */
export function initParallax(
  nodes: Iterable<HTMLElement>,
  options: ParallaxOptions,
): () => void {
  const list = Array.from(nodes);
  if (options.reducedMotion || list.length === 0) {
    return () => {};
  }

  let frame = 0;

  const apply = (): void => {
    frame = 0;
    const y = window.scrollY;
    for (const node of list) {
      const depth = Number(node.dataset.parallaxDepth ?? '0.1');
      node.style.setProperty('--parallax-y', `${(-y * depth).toFixed(1)}px`);
    }
  };

  const onScroll = (): void => {
    if (frame) return;
    frame = window.requestAnimationFrame(apply);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  apply();

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (frame) window.cancelAnimationFrame(frame);
  };
}
