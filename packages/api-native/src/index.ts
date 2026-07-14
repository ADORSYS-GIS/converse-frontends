import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Linking, Platform } from 'react-native';

export async function openExternalUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  await Linking.openURL(url);
}

export async function copyToClipboard(value: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }

  await Clipboard.setStringAsync(value);
}

export async function readFromClipboard() {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    return await navigator.clipboard.readText();
  }

  return await Clipboard.getStringAsync();
}

export function isWebPlatform() {
  return Platform.OS === 'web';
}

/**
 * Triggers a warning haptic feedback — used before destructive/irreversible
 * actions like delete, revoke, or rotate. No-ops on web.
 */
export async function hapticWarning() {
  if (Platform.OS === 'web') return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/**
 * Triggers a success haptic feedback — used after a successful mutation.
 * No-ops on web.
 */
export async function hapticSuccess() {
  if (Platform.OS === 'web') return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
