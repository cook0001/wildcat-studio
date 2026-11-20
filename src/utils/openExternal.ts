import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Opens an external web link using Tauri plugin-opener if in desktop mode,
 * or standard window.open fallback if in browser mode.
 */
export async function openExternalLink(url: string): Promise<void> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      await openUrl(url);
      return;
    } catch {
      // Fall through to window.open
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
