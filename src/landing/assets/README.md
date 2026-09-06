# Kodako landing illustration assets

Every illustration in this directory is original, hand-authored vector artwork,
dedicated to the public domain under CC0 1.0 Universal. This manifest is also CC0.
No third-party artwork, fonts, traced references, or raster images are included.

| File                   | viewBox       | Intended display size | Description                                                                  |
| ---------------------- | ------------- | --------------------- | ---------------------------------------------------------------------------- |
| `logo-kodako.svg`      | `0 0 64 64`   | 24–64 px square       | Overlapping blue and purple rounded code blocks with a transparent K cutout. |
| `logo-kodako-mono.svg` | `0 0 64 64`   | 16–32 px square       | Ink-only version of the same silhouette and transparent K cutout.            |
| `block-blue.svg`       | `0 0 120 64`  | 120 × 64 px           | Blue stack block with an angle-bracket mark.                                 |
| `block-green.svg`      | `0 0 120 64`  | 120 × 64 px           | Green stack block with a brace mark.                                         |
| `block-amber.svg`      | `0 0 120 64`  | 120 × 64 px           | Amber stack block with a play mark.                                          |
| `block-orange.svg`     | `0 0 120 64`  | 120 × 64 px           | Orange stack block with an angle-bracket mark.                               |
| `block-magenta.svg`    | `0 0 120 64`  | 120 × 64 px           | Magenta stack block with a brace mark.                                       |
| `block-sky.svg`        | `0 0 120 64`  | 120 × 64 px           | Sky-blue stack block with a play mark.                                       |
| `block-c-1.svg`        | `0 0 120 96`  | 120 × 96 px           | Orange C-shaped wrapper with an open nesting mouth on the right.             |
| `block-c-2.svg`        | `0 0 120 96`  | 120 × 96 px           | Magenta C-shaped wrapper with an open nesting mouth on the right.            |
| `mascot-wave.svg`      | `0 0 200 240` | 200 × 240 px          | Full-figure coder kid in a blue hoodie, waving with an open hand.            |
| `mascot-peek.svg`      | `0 0 200 240` | 200 × 240 px          | Matching head, shoulders, and one hand above an empty lower 40%.             |
| `mascot-point.svg`     | `0 0 200 240` | 200 × 240 px          | Three-quarter coder kid pointing toward the viewer's lower-right.            |
| `tool-paintbrush.svg`  | `0 0 48 48`   | 32–48 px square       | Diagonal brush with a magenta bristle tip.                                   |
| `tool-scissors.svg`    | `0 0 48 48`   | 32–48 px square       | Open scissors with blue ring handles.                                        |
| `tool-pencil.svg`      | `0 0 48 48`   | 32–48 px square       | Diagonal amber pencil with an outlined tip and eraser.                       |
| `tool-ruler.svg`       | `0 0 48 48`   | 32–48 px square       | Rounded sky-blue ruler with alternating measurement ticks.                   |
| `tool-sparkle.svg`     | `0 0 48 48`   | 32–48 px square       | Amber four-point sparkle with two small line twinkles.                       |
| `tool-bolt.svg`        | `0 0 48 48`   | 32–48 px square       | Orange lightning bolt with two short energy strokes.                         |

## Drawing assumptions

- The palette restriction takes precedence over introducing darker hex values.
  Block top-edge shadows use a flat 12%-opacity ink overlay; hair uses a flat
  40%-opacity ink overlay over the hair fill, producing approximately 10–11%
  darker hair channels. Each affected fill has only one shadow tone.
- The prescribed logo K is transparent negative space, not added lettering.
  The hoodie angle brackets are the explicitly requested chest motif; all marks
  are paths, not text or font glyphs.
- Outline attributes are inherited from each SVG root, including rounded joins
  and caps. White code marks use the requested 70% opacity.
- The SVG namespace URI is metadata, not an external resource. The colour logo's
  clip-path reference is local to the file; no asset fetches external resources.
- Display sizes describe the full viewBox, including the intentionally empty
  lower portion of the peek pose. The README has no viewBox or display size.
