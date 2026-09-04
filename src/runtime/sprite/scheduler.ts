import type { DurationRequest } from './api';
import type { ThreadInterpreter } from './interpreter';
import { setAnswer, type RuntimeContext } from './runtime-context';
import { movedToXY, saidNothing } from './sprite';

export type SchedulerThread = {
  id: string;
  spriteId: string;
  interp: ThreadInterpreter;
  hatBlockId: string;
  parkedUntil?: number;
  glide?: {
    start: number;
    secs: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  };
  sayUntil?: number;
  waitingOnBroadcast?: string;
  awaitingSound?: boolean;
  awaitingAnswer?: boolean;
};

type AnimationWindow = Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame'> & {
  performance: Pick<Performance, 'now'>;
};

export type Scheduler = {
  start(threads: { spriteId: string; hatBlockId: string; interp: ThreadInterpreter }[]): void;
  stopSprite(spriteId: string): void;
  stopOthers(spriteId: string, keepThreadId: string): void;
  stopAll(): void;
  tick(nowMs: number): void;
  isRunning(): boolean;
  attach(win?: AnimationWindow): () => void;
  readonly threads: readonly SchedulerThread[];
};

export function createScheduler(opts: {
  ctx: RuntimeContext;
  render: () => void;
  onHighlight: (blockId: string | null) => void;
  onBroadcastDone?: (message: string) => void;
  playSound?: (soundUrl: string, spriteId: string) => Promise<void>;
  onAsk?: (question: string, submit: (answer: string) => void) => void;
  onAskCancel?: () => void;
  maxStepsPerFrame?: number;
}): Scheduler {
  let threads: SchedulerThread[] = [];
  let sequence = 0;
  const maxSteps = opts.maxStepsPerFrame ?? 200_000;
  const broadcastReceivers = new Map<string, Set<string>>();
  const askQueue: string[] = [];
  let activeAskThreadId: string | undefined;

  const openNextAsk = (): void => {
    if (activeAskThreadId) return;
    while (askQueue.length > 0) {
      const threadId = askQueue.shift();
      const thread = threads.find((candidate) => candidate.id === threadId);
      if (!thread || !thread.awaitingAnswer || thread.interp.pending?.kind !== 'ask') continue;
      activeAskThreadId = thread.id;
      const submit = (answer: string): void => {
        if (activeAskThreadId !== thread.id) return;
        setAnswer(opts.ctx, answer);
        thread.awaitingAnswer = false;
        activeAskThreadId = undefined;
        openNextAsk();
      };
      (opts.onAsk ?? ((_question, done) => done('')))(thread.interp.pending.question, submit);
      return;
    }
  };

  const resumeTimedWork = (thread: SchedulerThread, nowMs: number): boolean => {
    if (thread.awaitingSound) return false;
    if (
      thread.awaitingSound === false &&
      thread.interp.state === 'parked' &&
      thread.interp.pending?.kind === 'playUntilDone'
    ) {
      thread.awaitingSound = undefined;
      thread.interp.resume();
      return true;
    }

    if (thread.awaitingAnswer) return false;
    if (
      thread.awaitingAnswer === false &&
      thread.interp.state === 'parked' &&
      thread.interp.pending?.kind === 'ask'
    ) {
      thread.awaitingAnswer = undefined;
      thread.interp.resume();
      return true;
    }

    if (thread.glide) {
      const glide = thread.glide;
      const elapsed = Math.max(0, nowMs - glide.start);
      const duration = Math.max(0, glide.secs * 1000);
      const progress = duration === 0 ? 1 : Math.min(1, elapsed / duration);
      const sprite = opts.ctx.sprites.get(thread.spriteId);
      if (sprite) {
        opts.ctx.sprites.set(
          thread.spriteId,
          movedToXY(
            sprite,
            glide.fromX + (glide.toX - glide.fromX) * progress,
            glide.fromY + (glide.toY - glide.fromY) * progress,
          ),
        );
      }
      if (progress < 1) return false;
      thread.glide = undefined;
      thread.interp.resume();
      return true;
    }

    if (thread.waitingOnBroadcast) {
      const receiverIds = broadcastReceivers.get(thread.id) ?? new Set<string>();
      const liveIds = new Set(threads.map((candidate) => candidate.id));
      if ([...receiverIds].some((id) => liveIds.has(id))) return false;
      broadcastReceivers.delete(thread.id);
      thread.waitingOnBroadcast = undefined;
      thread.interp.resume();
      return true;
    }

    if (thread.interp.state === 'parked' && thread.interp.pending?.kind === 'yield') {
      thread.interp.resume();
      return true;
    }

    if (thread.parkedUntil !== undefined) {
      if (nowMs < thread.parkedUntil) return false;
      thread.parkedUntil = undefined;
      if (thread.sayUntil !== undefined) {
        const sprite = opts.ctx.sprites.get(thread.spriteId);
        if (sprite) opts.ctx.sprites.set(thread.spriteId, saidNothing(sprite));
        thread.sayUntil = undefined;
      }
      if (thread.interp.state === 'parked') thread.interp.resume();
    }
    return true;
  };

  const capturePending = (
    thread: SchedulerThread,
    request: DurationRequest,
    nowMs: number,
  ): void => {
    switch (request.kind) {
      case 'wait':
        thread.parkedUntil = nowMs + Math.max(0, request.seconds) * 1000;
        break;
      case 'sayFor':
        thread.sayUntil = nowMs + Math.max(0, request.seconds) * 1000;
        thread.parkedUntil = thread.sayUntil;
        break;
      case 'glide':
        thread.glide = {
          start: nowMs,
          secs: request.seconds,
          fromX: request.fromX,
          fromY: request.fromY,
          toX: request.toX,
          toY: request.toY,
        };
        break;
      case 'broadcastWait': {
        thread.waitingOnBroadcast = request.message;
        const before = new Set(threads.map((candidate) => candidate.id));
        opts.onBroadcastDone?.(request.message);
        broadcastReceivers.set(
          thread.id,
          new Set(threads.filter((candidate) => !before.has(candidate.id)).map(({ id }) => id)),
        );
        break;
      }
      case 'playUntilDone': {
        thread.awaitingSound = true;
        try {
          const completion = (opts.playSound ?? (() => Promise.resolve()))(
            request.soundUrl,
            thread.spriteId,
          );
          void completion.then(
            () => {
              thread.awaitingSound = false;
            },
            () => {
              thread.awaitingSound = false;
            },
          );
        } catch {
          thread.awaitingSound = false;
        }
        break;
      }
      case 'ask':
        thread.awaitingAnswer = true;
        askQueue.push(thread.id);
        openNextAsk();
        break;
      case 'yield':
        break;
    }
  };

  const scheduler: Scheduler = {
    start(incoming): void {
      threads.push(
        ...incoming.map((thread) => ({
          ...thread,
          id: `thread_${++sequence}`,
        })),
      );
    },
    stopSprite(spriteId): void {
      threads = threads.filter((thread) => thread.spriteId !== spriteId);
    },
    stopOthers(spriteId, keepThreadId): void {
      threads = threads.filter(
        (thread) => thread.spriteId !== spriteId || thread.id === keepThreadId,
      );
    },
    stopAll(): void {
      threads = [];
      broadcastReceivers.clear();
      askQueue.length = 0;
      activeAskThreadId = undefined;
      opts.onAskCancel?.();
      opts.onHighlight(null);
    },
    tick(nowMs): void {
      for (const thread of [...threads]) {
        if (!threads.includes(thread)) continue;
        if (!resumeTimedWork(thread, nowMs)) continue;

        let steps = 0;
        while (thread.interp.state === 'running' && steps < maxSteps) {
          thread.interp.step();
          steps++;
        }
        if (thread.interp.state === 'parked' && thread.interp.pending) {
          capturePending(thread, thread.interp.pending, nowMs);
        } else if (thread.interp.state === 'running' && steps >= maxSteps) {
          thread.parkedUntil = nowMs;
        }
      }
      threads = threads.filter((thread) => thread.interp.state !== 'done');
      opts.render();
    },
    isRunning: () => threads.length > 0,
    attach(win: AnimationWindow = window): () => void {
      let active = true;
      let frame = 0;
      const loop = (): void => {
        if (!active || !scheduler.isRunning()) return;
        scheduler.tick(win.performance.now());
        if (active && scheduler.isRunning()) frame = win.requestAnimationFrame(loop);
      };
      frame = win.requestAnimationFrame(loop);
      return () => {
        active = false;
        win.cancelAnimationFrame(frame);
      };
    },
    get threads(): readonly SchedulerThread[] {
      return threads;
    },
  };

  return scheduler;
}
