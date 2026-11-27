// Uzaktan güncelleme (OTA) kontrolü: açılışta yeni sürüm var mı bakar, boyutunu yaklaşık hesaplar
let U = null;
try { U = require('expo-updates'); } catch (e) { U = null; }   // Snack / web'de yok

// { mb } döner (mb bilinmiyorsa null), güncelleme yoksa ya da süre dolarsa null
export async function checkUpdate(timeoutMs = 5000) {
  if (!U || !U.isEnabled || (typeof __DEV__ !== 'undefined' && __DEV__)) return null;
  const late = new Promise(r => setTimeout(() => r(null), timeoutMs));
  const job = (async () => {
    const r = await U.checkForUpdateAsync();
    if (!r || !r.isAvailable) return null;
    let mb = null;
    try {
      const m = r.manifest || {};
      const urls = [];
      if (m.launchAsset && m.launchAsset.url) urls.push(m.launchAsset.url);
      else if (m.bundleUrl) urls.push(m.bundleUrl);
      let total = 0;
      for (const url of urls) {
        const res = await fetch(url, { method: 'HEAD' });
        const len = Number(res.headers.get('content-length'));
        if (len > 0) total += len;
      }
      if (total > 0) mb = total / (1024 * 1024);
    } catch (e) { mb = null; }
    return { mb };
  })().catch(() => null);
  return Promise.race([job, late]);
}

// indirir ve uygulamayı yeni sürümle yeniden başlatır
export async function applyUpdate() {
  await U.fetchUpdateAsync();
  await U.reloadAsync();
}

export const fmtMB = (mb) => (Math.max(0.1, Math.round(mb * 10) / 10)).toFixed(1).replace('.', ',') + ' MB';
