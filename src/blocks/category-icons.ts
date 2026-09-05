// Hand-authored category glyphs for the Scratch-style toolbox rail.
//
// One tiny white glyph per toolbox category, 20x20 viewBox, single-colour
// (`fill="#fff"`), embedded as a `data:image/svg+xml,` URI. No icon library,
// no external asset — see docs/superpowers/specs/2026-09-05-scratch-familiar-editor-ux-design.md §3.
//
// NOTE: `src/blocks/theme.css` mirrors these exact data-URI strings in
// `mask-image: url("…")` rules on `.kodako-cat-icon--<key>`. This module is the
// source of truth (the icon unit test reads it); keep the two in sync when a
// glyph changes.

export type IconKey =
  | 'motion'
  | 'looks'
  | 'sound'
  | 'events'
  | 'control'
  | 'sensing'
  | 'operators'
  | 'variables'
  | 'structure'
  | 'content'
  | 'style';

const svg = (body: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#fff">${body}</svg>`,
  )}`;

export const CATEGORY_ICON: Record<IconKey, string> = {
  motion: svg('<path d="M3 10h10l-4-4 1.4-1.4L18 10l-7.6 7.4L9 16l4-4H3z"/>'),
  looks: svg('<path d="M3 4h14v9H8l-4 3v-3H3z"/>'),
  sound: svg(
    '<path d="M3 8h3l4-4v12l-4-4H3z"/><path d="M13 6q3 4 0 8" fill="none" stroke="#fff" stroke-width="1.6"/>',
  ),
  events: svg('<path d="M5 2v16H3.4V2zM6 3h10l-2.2 3L16 9H6z"/>'),
  control: svg(
    '<path d="M8 1h4v2H8zM10 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm.9 3v4l3 1.8-.9 1.5L9 11.4V7z"/>',
  ),
  sensing: svg(
    '<path d="M8.5 3a5.5 5.5 0 0 1 4.2 9l3.6 3.6-1.5 1.5L11.2 13A5.5 5.5 0 1 1 8.5 3zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>',
  ),
  operators: svg('<path d="M10 1l9 9-9 9-9-9z"/>'),
  variables: svg('<path d="M3 3h7l7 7-7 7-7-7zm4 2.5A1.7 1.7 0 1 0 7 9a1.7 1.7 0 0 0 0-3.5z"/>'),
  structure: svg(
    '<path d="M8 4 3 10l5 6 1.5-1.5L6 10l3.5-4.5zM12 4l5 6-5 6-1.5-1.5L14 10l-3.5-4.5z"/>',
  ),
  content: svg('<path d="M2 4h16v12H2zm2 10 4-5 3 3 3-4 4 6z"/><circle cx="7" cy="8" r="1.6"/>'),
  style: svg('<path d="M10 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>'),
};
