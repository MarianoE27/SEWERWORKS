if (typeof window !== 'undefined' && window.fetch) {
  // Fix for georaster's cross-fetch ponyfill which throws when assigning to fetch
  // if it's a getter-only property (which it is in modern browsers).
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: originalFetch,
      writable: true,
      configurable: true
    });
  } catch (e) {
    console.warn('Failed to polyfill window.fetch', e);
  }
}
