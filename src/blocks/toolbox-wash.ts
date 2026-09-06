import * as Blockly from 'blockly/core';

const OPEN_CLASS = 'kodako-cat--open';

/** `#RRGGBB` (or bare `RRGGBB`) → `rgba(r, g, b, alpha)`. Junk → a neutral wash. */
export function paleWash(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return `rgba(120, 130, 150, ${alpha})`;
  const n = parseInt(match[1]!, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

interface ColouredItem {
  getColour?: () => string;
  getDiv?: () => Element | null;
}

/**
 * "Open category" visual glue. On `TOOLBOX_ITEM_SELECT`, tint the flyout to a
 * pale wash of the selected category's colour (`--kodako-wash` on the injection
 * div), flag it with `data-open`, and put `kodako-cat--open` on that category's
 * container (CSS then merges it into the flyout and dims the rest). Returns a
 * disposer. No-op when the workspace has no toolbox; never throws.
 */
export function attachToolboxWash(workspace: Blockly.WorkspaceSvg): () => void {
  const root = workspace.getInjectionDiv() as HTMLElement | null;
  const toolbox = workspace.getToolbox();
  if (!root || !toolbox) return () => {};

  const clearOpen = (): void => {
    for (const el of Array.from(root.querySelectorAll(`.${OPEN_CLASS}`))) {
      el.classList.remove(OPEN_CLASS);
    }
  };
  const clearAll = (): void => {
    clearOpen();
    root.removeAttribute('data-open');
    root.style.removeProperty('--kodako-wash');
  };

  const onEvent = (event: Blockly.Events.Abstract): void => {
    if (event.type !== Blockly.Events.TOOLBOX_ITEM_SELECT) return;
    clearOpen();
    const item = toolbox.getSelectedItem() as ColouredItem | null;
    if (!item || typeof item.getColour !== 'function') {
      root.removeAttribute('data-open');
      root.style.removeProperty('--kodako-wash');
      return;
    }
    root.style.setProperty('--kodako-wash', paleWash(item.getColour(), 0.12));
    root.setAttribute('data-open', 'true');
    const div = item.getDiv?.();
    (div instanceof HTMLElement ? div : div?.closest?.('.kodako-cat'))?.classList.add(OPEN_CLASS);
  };

  workspace.addChangeListener(onEvent);
  return () => {
    workspace.removeChangeListener(onEvent);
    clearAll();
  };
}
