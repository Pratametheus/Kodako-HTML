declare module 'js-interpreter' {
  export interface InterpreterObject {
    [key: string]: unknown;
  }
  export type InitFunc = (interpreter: Interpreter, globalObject: InterpreterObject) => void;

  export default class Interpreter {
    constructor(code: string, initFunc?: InitFunc);
    /** Execute one step. Returns true while more steps remain. */
    step(): boolean;
    /** Run until done or blocked on an async native fn. Returns true if blocked/paused. */
    run(): boolean;
    createNativeFunction(fn: (...args: unknown[]) => unknown): InterpreterObject;
    createAsyncFunction(fn: (...args: unknown[]) => void): InterpreterObject;
    setProperty(obj: InterpreterObject, name: string, value: unknown): void;
    getProperty(obj: InterpreterObject, name: string): unknown;
    nativeToPseudo(native: unknown): unknown;
    pseudoToNative(pseudo: unknown): unknown;
    getGlobalScope(): InterpreterObject;
    paused_: boolean;
  }
}
