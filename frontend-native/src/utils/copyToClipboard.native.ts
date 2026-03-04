/**
 * Native: use expo-clipboard (only bundled on native, so no PasteButton web resolution).
 */
import * as Clipboard from 'expo-clipboard';

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
