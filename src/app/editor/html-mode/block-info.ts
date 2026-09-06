import * as Blockly from 'blockly/core';

export const BLOCK_INFO_HINT = 'Klik sebuah blok untuk melihat penjelasannya.';

type GetSelected = () => Blockly.Block | null;

const defaultGetSelected: GetSelected = () =>
  (Blockly as unknown as { getSelected?: () => Blockly.Block | null }).getSelected?.() ??
  (Blockly.common as unknown as { getSelected?: () => Blockly.Block | null }).getSelected?.() ??
  null;

function tooltipOf(block: Blockly.Block): string {
  const raw = (block as unknown as { tooltip?: string | (() => string) }).tooltip;
  const text = typeof raw === 'function' ? raw() : (raw ?? '');
  return typeof text === 'string' ? text.trim() : '';
}

/**
 * Mirror the selected block's tooltip into `el`. Uses click delegation on the
 * Blockly injection div (not a `SELECTED` change listener — Fase B1 showed
 * toolbox UI events don't reach `addChangeListener`), plus a workspace change
 * listener so the strip resets when the selected block is deleted.
 * Returns a disposer. `el` null → no-op, never throws.
 */
export function attachBlockInfo(
  workspace: Blockly.WorkspaceSvg,
  el: HTMLElement | null,
  getSelected: GetSelected = defaultGetSelected,
): () => void {
  if (!el) return () => {};
  const host =
    (workspace.getInjectionDiv?.() as HTMLElement | null)?.querySelector<HTMLElement>(
      '#htmlBlocklyDiv',
    ) ??
    (workspace.getInjectionDiv?.() as HTMLElement | null) ??
    null;

  const render = (): void => {
    const block = getSelected();
    const tip = block ? tooltipOf(block) : '';
    el.textContent = tip || BLOCK_INFO_HINT;
  };

  const onClick = (): void => {
    queueMicrotask(render);
  };
  const onChange = (event: Blockly.Events.Abstract): void => {
    if (event.type === Blockly.Events.BLOCK_DELETE || event.type === Blockly.Events.CLICK) {
      queueMicrotask(render);
    }
  };

  render();
  host?.addEventListener('click', onClick);
  workspace.addChangeListener?.(onChange);

  return () => {
    host?.removeEventListener('click', onClick);
    workspace.removeChangeListener?.(onChange);
  };
}
