// Ses efektleri: web sürümündeki sentez seslerinden üretilmiş kısa dosyalar
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { SFX, MUSIC } from './media';
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

// arka plan müziği: kahvehane havasında, Hicaz makamında bağlama/ud tınısı + darbuka (kendi üretimimiz, telifsiz)
// sadece lobide çalar: masada oyun başlayınca susar, masadan kalkınca yeniden çalar
let MP = null;
const MS = { on: false, app: true, game: false };
function syncMusic() {
  const play = MS.on && MS.app && !MS.game;
  try {
    if (play && !MP) { init(); MP = createAudioPlayer(MUSIC); MP.loop = true; MP.volume = 0.5; }
    if (!MP) return;
    if (play) MP.play(); else MP.pause();
  } catch (e) { /* ses çalınamadı */ }
}
export function setMusic(on) { MS.on = !!on; syncMusic(); }
export function musicActive(active) { MS.app = !!active; syncMusic(); }
export function musicInGame(inGame) { MS.game = !!inGame; syncMusic(); }
