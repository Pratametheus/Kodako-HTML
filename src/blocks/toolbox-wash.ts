import type * as Blockly from 'blockly/core';
import { CATEGORY_COLORS } from './theme';

const OPEN_ATTR = 'data-kodako-open';
const OPEN_CLASS = 'kodako-cat--open';
const KEY_RE = /kodako-cat--([a-z]+)/;

/** `#RRGGBB` (or bare `RRGGBB`) → `rgba(r, g, b, alpha)`. Junk → a neutral wash. */
export function paleWash(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return `rgba(120, 130, 150, ${alpha})`;
  const n = parseInt(match[1]!, 16); // one capture group → [1] is defined on a match
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

interface SelectableItem {
  getDiv?: () => Element | null;
}

/**
 * "Open category" visual glue. When a toolbox category is clicked, tint the
 * flyout to a pale wash of that category's colour (`--kodako-wash` on the
 * injection div), flag it with `data-kodako-open`, and put `kodako-cat--open` on
 * that category's container — CSS then merges it into the flyout and dims the
 * rest.
 *
 * Uses click delegation on the toolbox element and reads the colour from the
 * `.kodako-cat--<key>` class (via `CATEGORY_COLORS`), so it depends on neither
 * Blockly's UI-event plumbing nor a private colour API. Returns a disposer.
 * No-op / never throws when there is no toolbox.
 */
export function attachToolboxWash(workspace: Blockly.WorkspaceSvg): () => void {
  const root = workspace.getInjectionDiv() as HTMLElement | null;
  const toolbox = workspace.getToolbox();
  const toolboxDiv = root?.querySelector<HTMLElement>('.blocklyToolboxDiv') ?? null;
  if (!root || !toolbox || !toolboxDiv) return () => {};

  const clearMarks = (keep?: Element | null): void => {
    for (const el of Array.from(root.querySelectorAll(`.${OPEN_CLASS}`))) {
      if (el !== keep) el.classList.remove(OPEN_CLASS);
    }
  };

  const apply = (): void => {
    const item = toolbox.getSelectedItem() as SelectableItem | null;
    const div = item?.getDiv?.() ?? null;
    const catEl = div instanceof HTMLElement ? div : null;
    clearMarks(catEl);
    if (!catEl) {
      root.removeAttribute(OPEN_ATTR);
      root.style.removeProperty('--kodako-wash');
      return;
    }
    const key = KEY_RE.exec(catEl.className)?.[1];
    const hex = key ? CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] : undefined;
    root.style.setProperty('--kodako-wash', paleWash(hex ?? '', 0.12));
    root.setAttribute(OPEN_ATTR, 'true');
    catEl.classList.add(OPEN_CLASS);
  };

  // Blockly's own click handler updates the selection during the same click
  // (bubbling reaches us afterwards); the microtask is belt-and-braces.
  const onClick = (): void => {
    queueMicrotask(apply);
  };

  toolboxDiv.addEventListener('click', onClick);
  return () => {
    toolboxDiv.removeEventListener('click', onClick);
    clearMarks(null);
    root.removeAttribute(OPEN_ATTR);
    root.style.removeProperty('--kodako-wash');
  };
}
