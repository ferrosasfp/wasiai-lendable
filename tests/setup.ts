// vitest setup — polyfill jsdom gaps used by client components.
// CD-24: do NOT read process.env directly here; tests use vi.stubEnv().

if (typeof window !== "undefined") {
  // matchMedia stub — install-prompt + responsive components use it.
  if (typeof window.matchMedia === "undefined") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
}
