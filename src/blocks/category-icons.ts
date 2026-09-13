// Hand-authored category glyphs for the Scratch-style toolbox rail.
//
// One tiny white glyph per toolbox category, 20x20 viewBox, single-colour
// (`fill="#fff"`), embedded as a `data:image/svg+xml,` URI. No icon library,
// no external asset.
//
// NOTE: `src/blocks/theme.css` mirrors these exact data-URI strings in
// `mask-image: url("…")` rules on `.kodako-cat-icon--<key>`. This module is the
// source of truth (the icon unit test reads it); keep the two in sync when a
// glyph changes.

export type IconKey = 'structure' | 'content' | 'style';

const svg = (body: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#fff">${body}</svg>`,
  )}`;

export const CATEGORY_ICON: Record<IconKey, string> = {
  structure: svg(
    '<path d="M8 4 3 10l5 6 1.5-1.5L6 10l3.5-4.5zM12 4l5 6-5 6-1.5-1.5L14 10l-3.5-4.5z"/>',
  ),
  content: svg('<path d="M2 4h16v12H2zm2 10 4-5 3 3 3-4 4 6z"/><circle cx="7" cy="8" r="1.6"/>'),
  style: svg('<path d="M10 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>'),
};
