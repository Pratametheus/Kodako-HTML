type Listener<T> = (payload: T) => void;

export class EventBus<M extends Record<string, unknown>> {
  private listeners = new Map<keyof M, Set<Listener<unknown>>>();

  on<K extends keyof M>(type: K, fn: Listener<M[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn as Listener<unknown>);
    return () => this.off(type, fn);
  }

  off<K extends keyof M>(type: K, fn: Listener<M[K]>): void {
    this.listeners.get(type)?.delete(fn as Listener<unknown>);
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    for (const fn of this.listeners.get(type) ?? []) {
      (fn as Listener<M[K]>)(payload);
    }
  }
}
