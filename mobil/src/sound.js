// Ses efektleri: web sürümündeki sentez seslerinden üretilmiş kısa dosyalar
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SRC = {
  tap: require('../assets/sfx/tap.wav'),
  place: require('../assets/sfx/place.wav'),
  draw: require('../assets/sfx/draw.wav'),
  discard: require('../assets/sfx/discard.wav'),
  open: require('../assets/sfx/open.wav'),
  penalty: require('../assets/sfx/penalty.wav'),
  win: require('../assets/sfx/win.wav'),
  okey: require('../assets/sfx/okey.wav'),
};
export const SOUND = { on: true };
const P = {};
let ready = false;
function init() {
  if (ready) return;
  ready = true;
  try { setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {}); } catch (e) { /* yok */ }
  for (const k in SRC) {
    try { P[k] = [createAudioPlayer(SRC[k]), createAudioPlayer(SRC[k])]; P[k].i = 0; } catch (e) { P[k] = null; }
  }
}
// üst üste çalabilsin diye her ses için iki çalar sırayla kullanılır
export function sfx(k) {
  if (!SOUND.on) return;
  init();
  const a = P[k]; if (!a) return;
  const p = a[a.i]; a.i = (a.i + 1) % a.length;
  try { p.seekTo(0); p.play(); } catch (e) { /* yok say */ }
}
