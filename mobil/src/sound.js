// Ses efektleri: web sürümündeki sentez seslerinden üretilmiş kısa dosyalar
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { SFX } from './media';
const SRC = SFX;
export const SOUND = { on: true };
const P = {};
let ready = false;
function init() {
  if (ready) return;
  ready = true;
  try { setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {}); } catch (e) { /* yok */ }
  for (const k in SRC) {
    try { P[k] = [0, 1, 2].map(() => createAudioPlayer(SRC[k])); P[k].i = 0; } catch (e) { P[k] = null; }
  }
}
// üst üste çalabilsin diye her ses için üç çalar sırayla kullanılır
export function sfx(k) {
  if (!SOUND.on) return;
  init();
  const a = P[k]; if (!a) return;
  const p = a[a.i]; a.i = (a.i + 1) % a.length;
  // başa sarma beklenmeden çalınırsa bitmiş çalar sessiz kalıyordu (her iki seste bir ses kayboluyordu)
  try {
    const r = p.seekTo(0);
    if (r && r.then) r.then(() => p.play(), () => p.play()); else p.play();
  } catch (e) { try { p.play(); } catch (e2) { /* yok say */ } }
}
