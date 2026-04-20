import type { AppService } from '@/types/system';

/**
 * Use the platform `ask` dialog when available so delete runs only after the user confirms
 * (Tauri `window.confirm` can return before the user acts in some webview configurations).
 */
export async function confirmWikiDeletion(
  appService: AppService | null | undefined,
  message: string,
): Promise<boolean> {
  if (appService) {
    return appService.ask(message);
  }
  return window.confirm(message);
}
