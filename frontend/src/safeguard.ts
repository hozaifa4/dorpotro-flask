// Safeguard to prevent "TypeError: Cannot set property fetch of #<Window> which has only a getter"
// which can occur in sandboxed iframe environments when third party polyfills/libraries attempt 
// to override window.fetch or globalThis.fetch.
if (typeof window !== 'undefined') {
  try {
    let currentFetch = window.fetch || globalThis.fetch;
    if (currentFetch) {
      try {
        Object.defineProperty(window, 'fetch', {
          get() { return currentFetch; },
          set(v) { currentFetch = v; },
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // Fallback to value property descriptor if setter redefine fails
        Object.defineProperty(window, 'fetch', {
          value: currentFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }

      try {
        Object.defineProperty(globalThis, 'fetch', {
          get() { return currentFetch; },
          set(v) { currentFetch = v; },
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        Object.defineProperty(globalThis, 'fetch', {
          value: currentFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
    }
  } catch (e) {
    console.warn('Could not define writable fetch sandbox safeguard:', e);
  }
}

export {};
