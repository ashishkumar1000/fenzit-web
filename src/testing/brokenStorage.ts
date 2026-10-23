// Replaces window.localStorage with a stub whose chosen method throws, the way
// a browser refuses storage (private mode, quota). Spying on the happy-dom
// storage object does not intercept, so the whole object is swapped. Restore
// with restoreStorage(); tests should also restore in afterEach.

type StorageMethod = "getItem" | "setItem" | "removeItem";

let savedDescriptor: PropertyDescriptor | undefined;

function brokenStorage(failing: StorageMethod): Storage {
  const refuse = (): never => {
    throw new DOMException("storage refused in this test", "SecurityError");
  };
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: failing === "getItem" ? refuse : (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: failing === "removeItem" ? refuse : (key) => void store.delete(key),
    setItem: failing === "setItem" ? refuse : (key, value) => void store.set(key, String(value)),
  };
}

/** Swaps in a storage whose `failing` method refuses. Only one swap at a time. */
export function breakStorage(failing: StorageMethod): void {
  if (savedDescriptor === undefined) {
    let proto: object | null = window;
    while (proto !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, "localStorage");
      if (descriptor !== undefined) {
        savedDescriptor = descriptor;
        break;
      }
      proto = Object.getPrototypeOf(proto);
    }
  }
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: brokenStorage(failing),
  });
}

/** Puts the browser's real storage back. */
export function restoreStorage(): void {
  if (savedDescriptor !== undefined) {
    Object.defineProperty(window, "localStorage", savedDescriptor);
    savedDescriptor = undefined;
  }
}
