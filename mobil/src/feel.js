// Titreşim: Ayarlar'dan kapatılabilir
import * as Haptics from 'expo-haptics';
export const FEEL = { vibrate: true };
export function tick() { if (FEEL.vibrate) Haptics.selectionAsync().catch(() => {}); }
export function bump() { if (FEEL.vibrate) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }
export function warn() { if (FEEL.vibrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); }
export function err() { if (FEEL.vibrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); }
