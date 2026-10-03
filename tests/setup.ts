// Under Node 22+, Node defines globalThis.localStorage.
// Because 'localStorage' is already in globalThis, Vitest's jsdom environment skips copying it from dom.window.
// Here we wire it properly from the underlying JSDOM instance (globalThis.jsdom.window.localStorage).
type GlobalWithJsdom = typeof globalThis & {
  jsdom?: {
    window?: {
      localStorage?: Storage;
    };
  };
};

const jsdomWindow = (globalThis as GlobalWithJsdom).jsdom?.window;
const storage =
  jsdomWindow?.localStorage ??
  (() => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    };
  })();

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
}
