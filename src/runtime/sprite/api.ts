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
import { BUILTIN_SOUNDS, resolveAssetUrl } from './assets';
import { aabbOverlap, distance, pointInBounds, spriteBounds, touchesEdge } from './sensing';

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
  | { kind: 'broadcastWait'; message: string }
  | { kind: 'playUntilDone'; soundUrl: string }
  | { kind: 'ask'; question: string };

export type StopScope = 'all' | 'this' | 'others';

export type SpriteApi = {
  sync: Record<string, (...args: unknown[]) => unknown>;
  async: Record<string, (...args: unknown[]) => DurationRequest>;
};

export type ApiHooks = {
  onBroadcast: (message: string) => void;
  onStop: (scope: StopScope, spriteId: string) => void;
  onHighlight: (blockId: string) => void;
  onPlaySound?: (soundUrl: string, spriteId: string) => void;
  onStopAllSounds?: () => void;
  onVolumeChange?: (spriteId: string, percent: number) => void;
  costumeNaturalOf?: (spriteId: string) => { width: number; height: number };
  spriteByName?: (name: string) => Sprite | null;
  colorUnderSprite?: (spriteId: string, hex: string) => boolean;
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
  const naturalOf = (id: string): { width: number; height: number } =>
    hooks.costumeNaturalOf?.(id) ?? { width: 80, height: 80 };
  const spriteNamed = (name: string): Sprite | null =>
    hooks.spriteByName?.(name) ??
    [...ctx.sprites.values()].find((sprite) => sprite.name === name) ??
    null;
  const soundUrl = (selection: unknown): string => {
    const value = stringArg(selection);
    const builtin = BUILTIN_SOUNDS.find((sound) => sound.id === value || sound.name === value);
    if (builtin) return builtin.url;
    const selectedId =
      Object.entries(ctx.assets).find(([id, asset]) => id === value || asset.name === value)?.[0] ??
      value;
    return resolveAssetUrl(selectedId, ctx.assets) ?? '';
  };

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
    playSound: (selection) => {
      const url = soundUrl(selection);
      if (url) (hooks.onPlaySound ?? ((sound, id) => ctx.audio.play(sound, id)))(url, spriteId);
    },
    stopAllSounds: () => (hooks.onStopAllSounds ?? (() => ctx.audio.stopAll()))(),
    changeVolume: (delta) => {
      ctx.audio.changeVolume(spriteId, numberArg(delta));
      hooks.onVolumeChange?.(spriteId, ctx.audio.getVolume(spriteId));
    },
    setVolume: (percent) => {
      ctx.audio.setVolume(spriteId, Math.min(100, Math.max(0, numberArg(percent))));
      hooks.onVolumeChange?.(spriteId, ctx.audio.getVolume(spriteId));
    },
    isTouching: (target) => {
      const self = current();
      const selfBounds = spriteBounds(self, naturalOf(spriteId));
      const value = stringArg(target);
      if (value === 'edge') return touchesEdge(selfBounds);
      if (value === 'pointer') return pointInBounds(ctx.mouse.x, ctx.mouse.y, selfBounds);
      const other = spriteNamed(value);
      return other ? aabbOverlap(selfBounds, spriteBounds(other, naturalOf(other.id))) : false;
    },
    isTouchingColor: (hex) => hooks.colorUnderSprite?.(spriteId, stringArg(hex)) ?? false,
    isMouseDown: () => ctx.mouse.down,
    mouseX: () => ctx.mouse.x,
    mouseY: () => ctx.mouse.y,
    distanceTo: (target) => {
      const self = current();
      if (stringArg(target) === 'pointer') {
        return distance(self.x, self.y, ctx.mouse.x, ctx.mouse.y);
      }
      const other = spriteNamed(stringArg(target));
      return other ? distance(self.x, self.y, other.x, other.y) : 0;
    },
    answer: () => ctx.answer,
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
    playSoundUntilDone: (selection) => ({
      kind: 'playUntilDone',
      soundUrl: soundUrl(selection),
    }),
    ask: (question) => ({ kind: 'ask', question: stringArg(question) }),
  };

  return { sync, async };
}
