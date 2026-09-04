import {
  bouncedIfOnEdge,
  changedX,
  changedY,
  hidden,
  moved,
  movedToXY,
  nextCostumeOf,
  pointedInDirection,
  resizedBy,
  resizedTo,
  saidNothing,
  saidText,
  shown,
  turnedLeft,
  turnedRight,
  withCostumeIndex,
  withVariable,
  type Sprite,
} from './sprite';
import {
  isKeyDown,
  resetTimer,
  timerSeconds,
  updateSprite,
  type RuntimeContext,
} from './runtime-context';

export type DurationRequest =
  | { kind: 'wait'; seconds: number }
  | {
      kind: 'glide';
      seconds: number;
      toX: number;
      toY: number;
      fromX: number;
      fromY: number;
    }
  | { kind: 'sayFor'; seconds: number }
  | { kind: 'yield' }
  | { kind: 'broadcastWait'; message: string };

export type StopScope = 'all' | 'this' | 'others';

export type SpriteApi = {
  sync: Record<string, (...args: unknown[]) => unknown>;
  async: Record<string, (...args: unknown[]) => DurationRequest>;
};

type ApiHooks = {
  onBroadcast: (message: string) => void;
  onStop: (scope: StopScope, spriteId: string) => void;
  onHighlight: (blockId: string) => void;
};

const numberArg = (value: unknown): number => Number(value) || 0;
const stringArg = (value: unknown): string => String(value ?? '');

type CompareOp = 'lt' | 'eq' | 'gt';

/**
 * Scratch-style comparison: coerce numerically when both operands look numeric,
 * otherwise compare as strings. `eq` uses loose equality on the coerced values.
 */
export function cmp(a: unknown, b: unknown, op: CompareOp): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    if (op === 'lt') return na < nb;
    if (op === 'gt') return na > nb;
    return na === nb;
  }
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  if (op === 'lt') return sa < sb;
  if (op === 'gt') return sa > sb;
  // Both operands are already coerced to strings, so loose/strict are equivalent.
  return sa === sb;
}

export function buildApi(ctx: RuntimeContext, spriteId: string, hooks: ApiHooks): SpriteApi {
  const current = (): Sprite => {
    const sprite = ctx.sprites.get(spriteId);
    if (!sprite) throw new Error(`Sprite "${spriteId}" tidak ditemukan.`);
    return sprite;
  };
  const mutate = (operation: (sprite: Sprite) => Sprite): void => {
    updateSprite(ctx, spriteId, operation(current()));
  };
  const say = (text: unknown): void => mutate((sprite) => saidText(sprite, stringArg(text)));

  const sync: SpriteApi['sync'] = {
    highlightBlock: (id) => hooks.onHighlight(stringArg(id)),
    move: (steps) => mutate((sprite) => moved(sprite, numberArg(steps))),
    turnRight: (degrees) => mutate((sprite) => turnedRight(sprite, numberArg(degrees))),
    turnLeft: (degrees) => mutate((sprite) => turnedLeft(sprite, numberArg(degrees))),
    gotoXY: (x, y) => mutate((sprite) => movedToXY(sprite, numberArg(x), numberArg(y))),
    changeX: (dx) => mutate((sprite) => changedX(sprite, numberArg(dx))),
    changeY: (dy) => mutate((sprite) => changedY(sprite, numberArg(dy))),
    pointInDirection: (degrees) =>
      mutate((sprite) => pointedInDirection(sprite, numberArg(degrees))),
    bounceIfOnEdge: () => mutate(bouncedIfOnEdge),
    say,
    sayClear: () => mutate(saidNothing),
    switchCostume: (selection) => {
      const value = stringArg(selection);
      mutate((sprite) => {
        const parsed = Number(value);
        const index = Number.isInteger(parsed) ? parsed : sprite.costumes.indexOf(value);
        return index >= 0 ? withCostumeIndex(sprite, index) : sprite;
      });
    },
    nextCostume: () => mutate(nextCostumeOf),
    changeSize: (delta) => mutate((sprite) => resizedBy(sprite, numberArg(delta))),
    setSize: (percent) => mutate((sprite) => resizedTo(sprite, numberArg(percent))),
    show: () => mutate(shown),
    hide: () => mutate(hidden),
    broadcast: (message) => hooks.onBroadcast(stringArg(message)),
    stop: (scope) => hooks.onStop(stringArg(scope) as StopScope, spriteId),
    getVar: (name) => current().variables[stringArg(name)] ?? 0,
    setVar: (name, value) =>
      mutate((sprite) =>
        withVariable(
          sprite,
          stringArg(name),
          typeof value === 'number' || typeof value === 'string' ? value : stringArg(value),
        ),
      ),
    changeVar: (name, delta) => {
      const key = stringArg(name);
      mutate((sprite) =>
        withVariable(sprite, key, numberArg(sprite.variables[key]) + numberArg(delta)),
      );
    },
    isKeyPressed: (key) => isKeyDown(ctx, stringArg(key)),
    timer: () => timerSeconds(ctx),
    resetTimer: () => resetTimer(ctx),
    cmp: (a, b, op) => cmp(a, b, stringArg(op) as CompareOp),
  };

  const async: SpriteApi['async'] = {
    wait: (seconds) => ({ kind: 'wait', seconds: numberArg(seconds) }),
    glide: (seconds, x, y) => {
      const sprite = current();
      return {
        kind: 'glide',
        seconds: numberArg(seconds),
        toX: numberArg(x),
        toY: numberArg(y),
        fromX: sprite.x,
        fromY: sprite.y,
      };
    },
    sayForSecs: (text, seconds) => {
      say(text);
      return { kind: 'sayFor', seconds: numberArg(seconds) };
    },
    frameYield: () => ({ kind: 'yield' }),
    __yield__: () => ({ kind: 'yield' }),
    broadcastAndWait: (message) => ({
      kind: 'broadcastWait',
      message: stringArg(message),
    }),
  };

  return { sync, async };
}
