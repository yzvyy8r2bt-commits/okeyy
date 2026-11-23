// Ses efektleri: web sürümündeki sentez seslerinden üretilmiş kısa dosyalar
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Snack .wav dosyalarını kod sanıyor; bu yüzden sesler şimdilik GitHub'dan yükleniyor
// (mağaza sürümünde uygulamanın içine gömülecek)
const BASE = 'https://raw.githubusercontent.com/yzvyy8r2bt-commits/okeyy/main/mobil/assets/sfx/';
const SRC = {};
for (const k of ['tap', 'place', 'draw', 'discard', 'open', 'penalty', 'win', 'okey']) SRC[k] = { uri: BASE + k + '.wav' };
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
