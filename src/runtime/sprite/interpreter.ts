import Interpreter, { type InterpreterObject } from 'js-interpreter';
import type { DurationRequest, SpriteApi } from './api';

export type ThreadState = 'running' | 'parked' | 'done';

export type ThreadInterpreter = {
  step(): void;
  state: ThreadState;
  pending: DurationRequest | null;
  resume(): void;
};

function asyncArity(name: string, fallback: number): number {
  return (
    {
      wait: 1,
      glide: 3,
      sayForSecs: 2,
      frameYield: 0,
      __yield__: 0,
      broadcastAndWait: 1,
    }[name] ?? fallback
  );
}

export function createThreadInterpreter(code: string, api: SpriteApi): ThreadInterpreter {
  const entry = /function (hat_\w+)\(/.exec(code)?.[1];
  if (!entry) throw new Error('Fungsi awal skrip sprite tidak ditemukan.');

  let state: ThreadState = 'running';
  let pending: DurationRequest | null = null;
  let resumeCallback: (() => void) | null = null;

  const interpreter = new Interpreter(
    `${code}\n${entry}();`,
    (interp: Interpreter, scope: InterpreterObject) => {
      for (const [name, fn] of Object.entries(api.sync)) {
        const wrapped = (...pseudoArgs: unknown[]): unknown => {
          const nativeArgs = pseudoArgs.map((arg) => interp.pseudoToNative(arg));
          return interp.nativeToPseudo(fn(...nativeArgs));
        };
        interp.setProperty(scope, name, interp.createNativeFunction(wrapped));
      }

      const asyncFunctions = { ...api.async, __yield__: api.async.frameYield };
      for (const [name, fn] of Object.entries(asyncFunctions)) {
        if (!fn) continue;
        const invoke = (args: unknown[]): void => {
          const callback = args.pop();
          if (typeof callback !== 'function') {
            throw new Error(`Callback async untuk ${name} tidak tersedia.`);
          }
          const nativeArgs = args.map((arg) => interp.pseudoToNative(arg));
          pending = fn(...nativeArgs);
          state = 'parked';
          resumeCallback = callback as () => void;
        };
        const wrapped = (() => {
          switch (asyncArity(name, fn.length)) {
            case 0:
              return (callback: unknown) => invoke([callback]);
            case 1:
              return (a: unknown, callback: unknown) => invoke([a, callback]);
            case 2:
              return (a: unknown, b: unknown, callback: unknown) => invoke([a, b, callback]);
            case 3:
              return (a: unknown, b: unknown, c: unknown, callback: unknown) =>
                invoke([a, b, c, callback]);
            default:
              throw new Error(`Arity async untuk ${name} tidak didukung.`);
          }
        })();
        interp.setProperty(scope, name, interp.createAsyncFunction(wrapped));
      }
    },
  );

  return {
    step(): void {
      if (state !== 'running') return;
      const hasMore = interpreter.step();
      if (!hasMore && state === 'running') state = 'done';
    },
    get state(): ThreadState {
      return state;
    },
    set state(next: ThreadState) {
      state = next;
    },
    get pending(): DurationRequest | null {
      return pending;
    },
    set pending(next: DurationRequest | null) {
      pending = next;
    },
    resume(): void {
      if (state !== 'parked' || !resumeCallback) return;
      const callback = resumeCallback;
      resumeCallback = null;
      pending = null;
      state = 'running';
      callback();
    },
  };
}
