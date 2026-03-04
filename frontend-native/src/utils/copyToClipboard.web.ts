/**
 * Web: use native Clipboard API so we never load expo-clipboard (avoids missing ExpoClipboardPasteButton.web).
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
}
