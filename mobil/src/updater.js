// Uzaktan güncelleme (OTA): açılışta yeni sürüm var mı bakar, yaklaşık boyutunu bulur, indirir
import { Platform } from 'react-native';
let U = null;
try { U = require('expo-updates'); } catch (e) { U = null; }   // Snack / web'de yok

// güncelleme gönderilirken boyutlar buraya yazılır (bayt, sıkıştırılmış indirme boyutu)
const SIZE_URL = 'https://yzvyy8r2bt-commits.github.io/okeyy/guncelleme.json';

async function sizeMB() {
  try {
    const res = await fetch(SIZE_URL + '?t=' + Date.now(), { cache: 'no-store' });
    const j = await res.json();
    const b = Number(j[Platform.OS]);
    return b > 0 ? b / (1024 * 1024) : null;
  } catch (e) { return null; }
}

// { mb } döner (mb bilinmiyorsa null), güncelleme yoksa ya da süre dolarsa null
export async function checkUpdate(timeoutMs = 6000) {
  if (!U || !U.isEnabled || (typeof __DEV__ !== 'undefined' && __DEV__)) return null;
  const late = new Promise(r => setTimeout(() => r(null), timeoutMs));
  const job = (async () => {
    const r = await U.checkForUpdateAsync();
    if (!r || !r.isAvailable) return null;
    return { mb: await sizeMB() };
  })().catch(() => null);
  return Promise.race([job, late]);
}

// yalnız indirir; yeni sürüm oyun kapatılıp açılınca devreye girer
export async function downloadUpdate() {
  const r = await U.fetchUpdateAsync();
  return !!(r && r.isNew !== false);
}

export const fmtMB = (mb) => (Math.max(0.1, Math.round(mb * 10) / 10)).toFixed(1).replace('.', ',') + ' MB';
