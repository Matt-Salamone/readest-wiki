import { AppService } from '@/types/system';
import { READEST_NODE_BASE_URL, READEST_WEB_BASE_URL } from './constants';

declare global {
  interface Window {
    __READEST_CLI_ACCESS?: boolean;
    /** Present only inside the Tauri webview (Tauri v2). */
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauriAppPlatform = () => process.env['NEXT_PUBLIC_APP_PLATFORM'] === 'tauri';

/** True when this JS is running inside the Tauri webview (false in a normal browser tab). */
export const isTauriRuntime = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.__TAURI_INTERNALS__ != null;
};

/** Tauri desktop/mobile shell: correct build flag and actual Tauri APIs available. */
export const isTauriShell = (): boolean => isTauriAppPlatform() && isTauriRuntime();
export const isWebAppPlatform = () => process.env['NEXT_PUBLIC_APP_PLATFORM'] === 'web';
export const hasCli = () => window.__READEST_CLI_ACCESS === true;
export const isPWA = () => window.matchMedia('(display-mode: standalone)').matches;
export const getBaseUrl = () => process.env['NEXT_PUBLIC_API_BASE_URL'] ?? READEST_WEB_BASE_URL;
export const getNodeBaseUrl = () =>
  process.env['NEXT_PUBLIC_NODE_BASE_URL'] ?? READEST_NODE_BASE_URL;

export const isMacPlatform = () =>
  typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const getCommandPaletteShortcut = () => (isMacPlatform() ? '⌘⇧P' : 'Ctrl+Shift+P');

/**
 * Same-origin `/api` for local Next `pages/api` routes. Applies to `pnpm dev-web`
 * and `pnpm tauri dev` when `NEXT_PUBLIC_API_BASE_URL` is unset, so sync uses the
 * same Supabase project as this dev server (not the default web.readest.com host).
 */
const useRelativeDevAPI = () =>
  process.env['NODE_ENV'] === 'development' &&
  (isWebAppPlatform() || isTauriAppPlatform()) &&
  !process.env['NEXT_PUBLIC_API_BASE_URL'];

export const getAPIBaseUrl = () => (useRelativeDevAPI() ? '/api' : `${getBaseUrl()}/api`);

// For Node.js API that currently not supported in some edge runtimes
export const getNodeAPIBaseUrl = () => (useRelativeDevAPI() ? '/api' : `${getNodeBaseUrl()}/api`);

export interface EnvConfigType {
  getAppService: () => Promise<AppService>;
}

let nativeAppService: AppService | null = null;
const getNativeAppService = async () => {
  if (!nativeAppService) {
    const { NativeAppService } = await import('@/services/nativeAppService');
    nativeAppService = new NativeAppService();
    await nativeAppService.init();
  }
  return nativeAppService;
};

let webAppService: AppService | null = null;
const getWebAppService = async () => {
  if (!webAppService) {
    const { WebAppService } = await import('@/services/webAppService');
    webAppService = new WebAppService();
    await webAppService.init();
  }
  return webAppService;
};

const environmentConfig: EnvConfigType = {
  getAppService: async () => {
    // Email magic links / confirm links open in the system browser: same bundle may have
    // NEXT_PUBLIC_APP_PLATFORM=tauri but window.__TAURI_INTERNALS__ is undefined — use web service.
    if (isTauriShell()) {
      return getNativeAppService();
    }
    return getWebAppService();
  },
};

export default environmentConfig;
