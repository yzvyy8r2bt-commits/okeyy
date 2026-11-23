// Lobi mantığı: salonlar, masalar, çip, seviye, günlük hediye (web sürümüyle aynı kurallar)
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SALONS = [
  { id: 'cayci', name: 'Çaycı', sub: 'Yeni başlayanlar', min: 1000, max: 10000, step: 1000, hands: [1], maxIn: 25000, hue: ['#1f7a5c', '#0d3b2c'] },
  { id: 'kahveci', name: 'Kahveci', sub: 'Mahallenin müdavimleri', min: 10000, max: 50000, step: 5000, hands: [1, 2], maxIn: 150000, hue: ['#8a4b22', '#3b1c09'] },
  { id: 'usta', name: 'Usta', sub: 'Masanın ağır topları', min: 50000, max: 150000, step: 10000, hands: [1, 2, 4], maxIn: 1000000, hue: ['#3c47b8', '#161b55'] },
  { id: 'efsane', name: 'Efsane', sub: 'Sadece büyükler', min: 150000, max: 1000000, step: 50000, hands: [1, 2, 4, 8], maxIn: 10000000, hue: ['#b8860b', '#4a2d00'] },
  { id: 'kral', name: 'Kral', sub: 'Kahvenin sahibi', min: 1000000, max: 100000000, step: 1000000, hands: [1, 2, 4, 8, 12], hue: ['#a0182e', '#3d0610'] },
];
export const START_CHIPS = 50000, ENTRY_MULT = 1, TABLE_FEE = 0.07;
export const DAILY_STREAK = [10000, 15000, 20000, 25000, 30000, 35000, 50000];
export const BOT_NAMES = ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Hasan', 'Hüseyin', 'Zeynep', 'Emine', 'Mustafa', 'Ali', 'Hatice', 'Osman', 'Yusuf', 'Elif', 'İbrahim', 'Murat', 'Serkan', 'Gül', 'Kemal', 'Sevim', 'Cemil', 'Nuri', 'Recep', 'Dilek', 'Erol', 'Tülay', 'Bayram', 'Şükrü'];
export const MODE_CHIPS = [
  ['pen.rekor', 'Rekorlu', '150+ puan ya da 7+ çiftle açana −101 ödül'],
  ['pen.okeyCal', 'Okey çalma cezası', 'Okeyi çalınan oyuncuya +101 ceza'],
  ['pen.herTas', 'Her taş cezalı', 'Açtıktan sonra yandan alıp indirince: atana taş×10 (çift ×20)'],
  ['pen.yanAc', 'Yandan açma cezalı', 'Yandan alınan taşla el açılırsa: atana taş×10 (çift ×20)'],
  ['hard', 'Yardımsız', 'Per çizgileri ve ipuçları gösterilmez'],
  ['pen.gosterge', 'Gösterge', 'Eşi elinde olan başta basılı tutup söyler, çiftte joker olur'],
];

export function chipFmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
export function chipShort(n) {
  const f = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
  return n >= 1e6 ? f(n / 1e6) + ' Mn' : n >= 1000 ? f(n / 1000) + ' B' : String(n);
}
const dkey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
export const today = () => dkey(new Date());
export const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dkey(d); };
const rnd = a => a[Math.floor(Math.random() * a.length)];

// ---------- cüzdan ----------
export const W = { w: null };
const WKEY = 'okey101.wallet';
function fresh() {
  const d = new Date();
  return { chips: START_CHIPS, gift: '', gs: 0, name: 'Oyuncu', since: d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(), st: { games: 0, wins: 0, won: 0, best: 0, xp: 0 } };
}
export async function loadWallet() {
  let w = null;
  try { w = JSON.parse((await AsyncStorage.getItem(WKEY)) || 'null'); } catch (e) { w = null; }
  if (!w || typeof w.chips !== 'number') w = fresh();
  if (!w.st) w.st = fresh().st;
  if (!w.name) w.name = 'Oyuncu';
  W.w = w;
  return w;
}
export const wallet = () => W.w || (W.w = fresh());
export function saveWallet() { AsyncStorage.setItem(WKEY, JSON.stringify(wallet())).catch(() => {}); }
export function addChips(n) { const w = wallet(); w.chips = Math.max(0, Math.round(w.chips + n)); saveWallet(); }

// Seviye: n'den n+1'e geçmek için n×100 DP; seviye atlayınca seviye×1000 çip
export function levelInfo(xp) { let lv = 1, need = 100, rest = xp; while (rest >= need) { rest -= need; lv++; need = lv * 100; } return { lv, rest, need }; }
export const lvReward = lv => lv * 1000;
export function addXP(n) {
  const s = wallet().st, before = levelInfo(s.xp).lv;
  s.xp += n; const after = levelInfo(s.xp).lv;
  let r = 0;
  if (after > before) { for (let v = before + 1; v <= after; v++) r += lvReward(v); addChips(r); }
  saveWallet();
  return after > before ? { lv: after, reward: r } : null;
}
// oyun sonu: her oyun +5 DP, kazanılan oyun +10 DP
export function recordGame(win, gain) {
  const s = wallet().st; s.games++;
  if (win) s.wins++;
  if (gain > 0) { s.won += gain; s.best = Math.max(s.best, gain); }
  saveWallet();
  return addXP(5 + (win ? 10 : 0));
}

export const salonEntry = s => s.min * ENTRY_MULT;
export const tooRich = s => !!s.maxIn && wallet().chips > s.maxIn;
export const canEnter = s => wallet().chips >= salonEntry(s) && !tooRich(s);
export const enterMsg = s => (tooRich(s) ? s.name + ' salonuna en fazla ' + chipFmt(s.maxIn) + ' çiple girilebilir. Daha üst bir salonda oyna.' : s.name + ' salonuna girmek için en az ' + chipFmt(salonEntry(s)) + ' çip gerekir.');
export const canSit = bet => wallet().chips >= bet * ENTRY_MULT;

// ---------- günlük hediye (7 günlük seri) ----------
export const giftReady = () => wallet().gift !== today();
export const nextGiftDay = () => { const w = wallet(); return w.gift === yesterday() ? (w.gs || 0) % 7 + 1 : 1; };
export const shownDay = () => (giftReady() ? nextGiftDay() : (wallet().gs || 1));
export function takeGift() {
  if (!giftReady()) return null;
  const day = nextGiftDay(), amt = DAILY_STREAK[day - 1], w = wallet();
  w.gs = day; w.gift = today(); addChips(amt);
  return { day, amt };
}

// ---------- masalar (botlar oturuyor) ----------
const TABLES = {};
export function genTables(si) {
  const s = SALONS[si], out = [], steps = Math.round((s.max - s.min) / s.step);
  const used = new Set();
  for (let k = 0; k < 8; k++) {
    const bet = s.min + s.step * Math.floor(Math.random() * (steps + 1) * (Math.random() < 0.6 ? 0.5 : 1));
    const seats = [null, null, null, null], filled = 1 + Math.floor(Math.random() * 3);
    const idx = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, filled);
    for (const i of idx) { let n; do { n = rnd(BOT_NAMES); } while (used.has(n) && used.size < BOT_NAMES.length - 4); used.add(n); seats[i] = n; }
    out.push({
      id: si + '-' + k + '-' + Date.now(), salon: si, bet: Math.min(bet, s.max),
      hands: rnd(s.hands), team: Math.random() < 0.3, mode: Math.random() < 0.7 ? 'katlamali' : 'klasik', hard: Math.random() < 0.3,
      pen: { gosterge: Math.random() < 0.6, rekor: Math.random() < 0.7, okeyCal: true, yanAc: Math.random() < 0.8, herTas: Math.random() < 0.6 },
      seats,
    });
  }
  return (TABLES[si] = out.sort((a, b) => a.bet - b.bet));
}
export const tablesOf = si => TABLES[si] || genTables(si);

// masaya oturunca oyun ayarı: boş yerlere bot gelir
export function tableCfg(t, myName) {
  const names = t.seats.filter(Boolean).slice();
  const pool = BOT_NAMES.filter(n => !names.includes(n));
  while (names.length < 3) { const n = rnd(pool); pool.splice(pool.indexOf(n), 1); names.push(n); }
  return { mode: t.mode, hands: t.hands, team: t.team, speed: 'normal', hard: t.hard, pen: { ...t.pen }, names: [myName || 'Sen', names[0], names[1], names[2]] };
}
export function modeList(pen) {
  const p = pen || {}, on = k => p[k] !== false;
  return [['Rekorlu', on('rekor')], ['Okey çalma cezası', on('okeyCal')], ['Her taş cezalı', on('herTas')], ['Yandan açma cezalı', on('yanAc')], ['Gösterge', on('gosterge')]];
}
export function tableTags(t) {
  return [t.team ? 'Eşli' : 'Tek', t.hands + ' El', t.mode === 'katlamali' ? 'Katlamalı' : 'Klasik', t.hard ? 'Yardımsız' : 'Yardımlı'];
}
export function payInfo(t) {
  const fee = Math.round(TABLE_FEE * 100), pot = t.bet * 4;
  if (t.team) {
    const half = pot / 2, cut = Math.round(half * TABLE_FEE);
    return '🏆 Kazanan takımdaki iki oyuncu ortadaki çipi paylaşır, her biri ' + chipFmt(half - cut) + ' çip alır. Bu paydan %' + fee + ' masa ücreti düşülmüştür.';
  }
  const win = pot - t.bet, cut = Math.round(win * TABLE_FEE);
  return '🏆 Birinci ortadaki çiplerin kalanını kazanır. Kazancından %' + fee + ' masa ücreti kesilir, eline ' + chipFmt(win - cut) + ' çip geçer.\n🥈 İkinci yatırdığı ' + chipFmt(t.bet) + ' çipi geri alır.';
}

// Hemen Oyna: tüm çipi tek masaya yatırmamak için bahsi çipin 1/5'ini geçmeyen en yüksek salon
export function quickPick(st) {
  let si = -1;
  for (let i = SALONS.length - 1; i >= 0; i--) if (canEnter(SALONS[i]) && SALONS[i].min * 5 <= wallet().chips) { si = i; break; }
  if (si < 0) for (let i = SALONS.length - 1; i >= 0; i--) if (canEnter(SALONS[i])) { si = i; break; }
  if (si < 0) return null;
  const s = SALONS[si], lim = Math.max(s.min, wallet().chips / 5);
  const ok = tablesOf(si).filter(t => canSit(t.bet) && t.bet <= lim && t.seats.some(x => !x));
  if (ok.length) return rnd(ok);
  return { id: 'q' + Date.now(), salon: si, bet: s.min, hands: s.hands.includes(st.hands) ? st.hands : rnd(s.hands), team: !!st.team, mode: st.mode || 'katlamali', hard: !!st.hard, pen: { ...(st.pen || {}) }, seats: [null, null, null, null] };
}

// Ödül: 1. ortadakinden (2.'nin iadesi düşüldükten sonra) kalanı alır, 2. bahsini geri alır, kazanandan %7 masa ücreti
export function payouts(totals, bet, team) {
  const pot = bet * 4, pay = [0, 0, 0, 0], fee = [0, 0, 0, 0];
  const cut = (i, amt) => { const f = Math.round(amt * TABLE_FEE); fee[i] = f; pay[i] = amt - f; };
  if (team) {
    const A = totals[0] + totals[2], B = totals[1] + totals[3];
    if (A === B) return { pay: [bet, bet, bet, bet], fee };
    (A < B ? [0, 2] : [1, 3]).forEach(i => cut(i, pot / 2));
    return { pay, fee };
  }
  const order = [0, 1, 2, 3].sort((a, b) => totals[a] - totals[b]);
  const best = totals[order[0]], firsts = order.filter(i => totals[i] === best);
  if (firsts.length > 1) { firsts.forEach(i => cut(i, Math.round(pot / firsts.length))); return { pay, fee }; }
  const rest = order.filter(i => totals[i] !== best), second = totals[rest[0]], seconds = rest.filter(i => totals[i] === second);
  seconds.forEach(i => { pay[i] = Math.round(bet / seconds.length); });
  cut(order[0], pot - bet);
  return { pay, fee };
}
