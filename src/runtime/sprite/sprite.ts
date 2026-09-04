export type Bubble = { kind: 'say'; text: string } | null;

export type Sprite = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  costumeIndex: number;
  costumes: string[];
  variables: Record<string, string | number>;
  bubble: Bubble;
};

export const STAGE = {
  width: 480,
  height: 360,
  minX: -240,
  maxX: 240,
  minY: -180,
  maxY: 180,
} as const;

const SIZE_MIN = 5;
const SIZE_MAX = 1000;

export function createSprite(init: Partial<Sprite> & Pick<Sprite, 'id' | 'name'>): Sprite {
  return {
    x: 0,
    y: 0,
    direction: 90,
    size: 100,
    visible: true,
    costumeIndex: 0,
    costumes: [],
    variables: {},
    bubble: null,
    ...init,
  };
}

export function normalizeDirection(dir: number): number {
  let d = ((dir % 360) + 360) % 360; // [0, 360)
  if (d > 180) d -= 360; // (-180, 180]
  if (d === -180) d = 180;
  return d;
}

export function directionToRadians(dir: number): number {
  return ((90 - dir) * Math.PI) / 180;
}

export function clampToStage(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(STAGE.minX, Math.min(STAGE.maxX, x)),
    y: Math.max(STAGE.minY, Math.min(STAGE.maxY, y)),
  };
}

export function moved(s: Sprite, steps: number): Sprite {
  const rad = directionToRadians(s.direction);
  const { x, y } = clampToStage(s.x + steps * Math.cos(rad), s.y + steps * Math.sin(rad));
  return { ...s, x, y };
}

export function turnedRight(s: Sprite, deg: number): Sprite {
  return { ...s, direction: normalizeDirection(s.direction + deg) };
}

export function turnedLeft(s: Sprite, deg: number): Sprite {
  return { ...s, direction: normalizeDirection(s.direction - deg) };
}

export function movedToXY(s: Sprite, x: number, y: number): Sprite {
  return { ...s, ...clampToStage(x, y) };
}

export function changedX(s: Sprite, dx: number): Sprite {
  return movedToXY(s, s.x + dx, s.y);
}

export function changedY(s: Sprite, dy: number): Sprite {
  return movedToXY(s, s.x, s.y + dy);
}

export function pointedInDirection(s: Sprite, deg: number): Sprite {
  return { ...s, direction: normalizeDirection(deg) };
}

export function bouncedIfOnEdge(s: Sprite): Sprite {
  const { x, y } = s;
  let direction = s.direction;
  const rad = directionToRadians(direction);
  let dx = Math.cos(rad);
  let dy = Math.sin(rad);
  let bounced = false;
  if (x <= STAGE.minX || x >= STAGE.maxX) {
    dx = -dx;
    bounced = true;
  }
  if (y <= STAGE.minY || y >= STAGE.maxY) {
    dy = -dy;
    bounced = true;
  }
  if (!bounced) return s;
  direction = normalizeDirection(90 - (Math.atan2(dy, dx) * 180) / Math.PI);
  const clamped = clampToStage(x, y);
  return { ...s, x: clamped.x, y: clamped.y, direction };
}

export function saidText(s: Sprite, text: string): Sprite {
  return { ...s, bubble: { kind: 'say', text } };
}

export function saidNothing(s: Sprite): Sprite {
  return { ...s, bubble: null };
}

export function withCostumeIndex(s: Sprite, i: number): Sprite {
  if (s.costumes.length === 0) return { ...s, costumeIndex: 0 };
  const idx = ((Math.trunc(i) % s.costumes.length) + s.costumes.length) % s.costumes.length;
  return { ...s, costumeIndex: idx };
}

export function nextCostumeOf(s: Sprite): Sprite {
  return withCostumeIndex(s, s.costumeIndex + 1);
}

export function resizedBy(s: Sprite, delta: number): Sprite {
  return { ...s, size: Math.max(SIZE_MIN, Math.min(SIZE_MAX, s.size + delta)) };
}

export function resizedTo(s: Sprite, pct: number): Sprite {
  return { ...s, size: Math.max(SIZE_MIN, Math.min(SIZE_MAX, pct)) };
}

export function shown(s: Sprite): Sprite {
  return { ...s, visible: true };
}

export function hidden(s: Sprite): Sprite {
  return { ...s, visible: false };
}

export function withVariable(s: Sprite, name: string, value: string | number): Sprite {
  return { ...s, variables: { ...s.variables, [name]: value } };
}
