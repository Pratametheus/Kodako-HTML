import type * as Blockly from 'blockly/core';
import { generateThreads, type ThreadCode } from '../../blocks/sprite/generator';
import { buildApi } from './api';
import { createThreadInterpreter } from './interpreter';
import { setKey, type RuntimeContext } from './runtime-context';
import type { Scheduler } from './scheduler';
import type { Stage } from './stage';

export type SpriteProgram = { spriteId: string; workspace: Blockly.Workspace };

export type SpriteEvents = {
  greenFlag(): void;
  spriteClicked(spriteId: string): void;
  keyDown(key: string): void;
  keyUp(key: string): void;
  broadcast(message: string): void;
  broadcastAndWait(message: string, done: () => void): void;
  hasLiveThreadsForMessage(message: string): boolean;
  rebuild(programs: SpriteProgram[]): void;
};

const normalizeKey = (key: string): string => (key.length === 1 ? key.toLowerCase() : key);

export function createSpriteEvents(opts: {
  ctx: RuntimeContext;
  scheduler: Scheduler;
  onHighlight: (id: string | null) => void;
  stage?: Pick<Stage, 'colorUnderSprite' | 'costumeNaturalOf'>;
}): SpriteEvents {
  const programs = new Map<string, ThreadCode[]>();

  const matching = (
    predicate: (code: ThreadCode, spriteId: string) => boolean,
  ): { spriteId: string; code: ThreadCode }[] => {
    const result: { spriteId: string; code: ThreadCode }[] = [];
    for (const [spriteId, codes] of programs) {
      for (const code of codes) if (predicate(code, spriteId)) result.push({ spriteId, code });
    }
    return result;
  };

  const startCodes = (items: { spriteId: string; code: ThreadCode }[], dedupe = false): void => {
    for (const { spriteId, code } of items) {
      if (
        dedupe &&
        opts.scheduler.threads.some(
          (thread) => thread.spriteId === spriteId && thread.hatBlockId === code.blockId,
        )
      ) {
        continue;
      }

      let currentThreadId = '';
      const api = buildApi(opts.ctx, spriteId, {
        onBroadcast: (message) => events.broadcast(message),
        onStop: (scope, stoppedSpriteId) => {
          if (scope === 'all') opts.scheduler.stopAll();
          else if (scope === 'others') opts.scheduler.stopOthers(stoppedSpriteId, currentThreadId);
        },
        onHighlight: (id) => opts.onHighlight(id),
        onPlaySound: (url, id) => opts.ctx.audio.play(url, id),
        onStopAllSounds: () => opts.ctx.audio.stopAll(),
        onVolumeChange: () => {},
        colorUnderSprite: (id, hex) => opts.stage?.colorUnderSprite(id, hex) ?? false,
        costumeNaturalOf: (id) => opts.stage?.costumeNaturalOf(id) ?? { width: 80, height: 80 },
        spriteByName: (name) =>
          [...opts.ctx.sprites.values()].find((sprite) => sprite.name === name) ?? null,
      });
      const before = new Set(opts.scheduler.threads.map((thread) => thread.id));
      opts.scheduler.start([
        {
          spriteId,
          hatBlockId: code.blockId,
          interp: createThreadInterpreter(code.code, api),
        },
      ]);
      currentThreadId = opts.scheduler.threads.find((thread) => !before.has(thread.id))?.id ?? '';
    }
  };

  const events: SpriteEvents = {
    greenFlag(): void {
      opts.scheduler.stopAll();
      startCodes(matching((code) => code.hatType === 'green_flag'));
    },
    spriteClicked(spriteId): void {
      startCodes(
        matching((code, ownerId) => ownerId === spriteId && code.hatType === 'clicked'),
        true,
      );
    },
    keyDown(key): void {
      setKey(opts.ctx, key, true);
      const normalized = normalizeKey(key);
      startCodes(
        matching((code) => code.hatType === 'key' && normalizeKey(code.key ?? '') === normalized),
        true,
      );
    },
    keyUp(key): void {
      setKey(opts.ctx, key, false);
    },
    broadcast(message): void {
      startCodes(matching((code) => code.hatType === 'receive' && code.message === message));
    },
    broadcastAndWait(message, done): void {
      events.broadcast(message);
      if (!events.hasLiveThreadsForMessage(message)) {
        done();
        return;
      }
      const poll = (): void => {
        if (events.hasLiveThreadsForMessage(message)) globalThis.setTimeout(poll, 16);
        else done();
      };
      globalThis.setTimeout(poll, 16);
    },
    hasLiveThreadsForMessage(message): boolean {
      const hatIds = new Set(
        matching((code) => code.hatType === 'receive' && code.message === message).map(
          ({ code }) => code.blockId,
        ),
      );
      return opts.scheduler.threads.some((thread) => hatIds.has(thread.hatBlockId));
    },
    rebuild(nextPrograms): void {
      programs.clear();
      for (const program of nextPrograms) {
        const existing = programs.get(program.spriteId) ?? [];
        programs.set(program.spriteId, [...existing, ...generateThreads(program.workspace)]);
      }
    },
  };

  return events;
}
