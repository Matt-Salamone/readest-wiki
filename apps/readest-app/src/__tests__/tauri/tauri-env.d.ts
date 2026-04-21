interface TauriInternals {
  invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown>;
}

interface Window {
  /** Present only inside the Tauri webview (tests may bridge from `window.top`). */
  __TAURI_INTERNALS__?: TauriInternals;
}
