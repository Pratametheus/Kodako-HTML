import { STAGE, type Sprite } from './sprite';

export type Bounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function spriteBounds(
  sprite: Sprite,
  costumeNatural: { width: number; height: number },
): Bounds {
  // Collision intentionally uses an axis-aligned box; sprite rotation is ignored.
  const scale = Math.max(0, sprite.size) / 100;
  const halfWidth = (costumeNatural.width * scale) / 2;
  const halfHeight = (costumeNatural.height * scale) / 2;
  return {
    left: sprite.x - halfWidth,
    right: sprite.x + halfWidth,
    top: sprite.y + halfHeight,
    bottom: sprite.y - halfHeight,
  };
}

export function aabbOverlap(a: Bounds, b: Bounds): boolean {
  return a.left <= b.right && a.right >= b.left && a.bottom <= b.top && a.top >= b.bottom;
}

export function pointInBounds(px: number, py: number, bounds: Bounds): boolean {
  return px >= bounds.left && px <= bounds.right && py >= bounds.bottom && py <= bounds.top;
}

export function touchesEdge(bounds: Bounds): boolean {
  return (
    bounds.left <= STAGE.minX ||
    bounds.right >= STAGE.maxX ||
    bounds.bottom <= STAGE.minY ||
    bounds.top >= STAGE.maxY
  );
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function colorsMatch(
  red: number,
  green: number,
  blue: number,
  hex: string,
  tolerance = 24,
): boolean {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) return false;
  const targetRed = Number.parseInt(match[1] ?? '', 16);
  const targetGreen = Number.parseInt(match[2] ?? '', 16);
  const targetBlue = Number.parseInt(match[3] ?? '', 16);
  return (
    Math.abs(red - targetRed) <= tolerance &&
    Math.abs(green - targetGreen) <= tolerance &&
    Math.abs(blue - targetBlue) <= tolerance
  );
}
