import { createNoopAudioEngine, type AudioEngine } from './audio';
import type { Sprite } from './sprite';

export type RuntimeContext = {
  sprites: Map<string, Sprite>;
  keysDown: Set<string>;
  timerOrigin: number;
  now: () => number;
  getStageSprites: () => Sprite[];
  mouse: { x: number; y: number; down: boolean };
  answer: string;
  audio: AudioEngine;
};

export type RuntimeContextOptions = {
  now?: () => number;
  audio?: AudioEngine;
};

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function cloneSprite(sprite: Sprite): Sprite {
  return {
    ...sprite,
    costumes: [...sprite.costumes],
    variables: { ...sprite.variables },
    bubble: sprite.bubble ? { ...sprite.bubble } : null,
  };
}

export function createRuntimeContext(
  sprites: Sprite[],
  opts: RuntimeContextOptions | (() => number) = {},
): RuntimeContext {
  const options: RuntimeContextOptions = typeof opts === 'function' ? { now: opts } : opts;
  const now = options.now ?? (() => Date.now());
  const map = new Map(sprites.map((sprite) => [sprite.id, cloneSprite(sprite)]));
  return {
    sprites: map,
    keysDown: new Set(),
    timerOrigin: now(),
    now,
    getStageSprites: () => [...map.values()],
    mouse: { x: 0, y: 0, down: false },
    answer: '',
    audio: options.audio ?? createNoopAudioEngine(),
  };
}

export function timerSeconds(ctx: RuntimeContext): number {
  return (ctx.now() - ctx.timerOrigin) / 1000;
}

export function resetTimer(ctx: RuntimeContext): void {
  ctx.timerOrigin = ctx.now();
}

export function setKey(ctx: RuntimeContext, key: string, down: boolean): void {
  const normalized = normalizeKey(key);
  if (down) ctx.keysDown.add(normalized);
  else ctx.keysDown.delete(normalized);
}

export function isKeyDown(ctx: RuntimeContext, key: string): boolean {
  return ctx.keysDown.has(normalizeKey(key));
}

export function updateSprite(ctx: RuntimeContext, id: string, next: Sprite): void {
  ctx.sprites.set(id, next);
}

export function setMouse(ctx: RuntimeContext, x: number, y: number, down: boolean): void {
  ctx.mouse = { x, y, down };
}

export function setAnswer(ctx: RuntimeContext, value: string): void {
  ctx.answer = value;
}
