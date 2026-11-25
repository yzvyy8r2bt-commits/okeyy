// Lobi mantığı: salonlar, masalar, çip, seviye, günlük hediye (web sürümüyle aynı kurallar)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEV_NAME } from './media';

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
  ['pen.rekor', 'Rekorlu', '151+ seri ya da 7 çift −101, 161+ ya da 8+ çift −202 ödül'],
  ['pen.okeyCal', 'Okey çalma cezası', 'Okeyi çalınan oyuncuya +101 ceza'],
  ['pen.herTas', 'Her taş cezalı', 'Açtıktan sonra yandan alıp indirince: atana taş×10 (çift ×20)'],
  ['pen.yanAc', 'Yandan açma cezalı', 'Yandan alınan taşla el açılırsa: atana taş×10 (çift ×20)'],
  ['hard', 'Yardımsız', 'Per çizgileri ve ipuçları gösterilmez'],
  ['pen.gosterge', 'Gösterge', 'Eşi elinde olan başta söyler, çiftte joker olur (4+ elde ×10 ödül)'],
];

// misafir kimliği: C + 6 rakam (ör. C37274815)
export function guestName() { return 'C' + String(Math.floor(10000000 + Math.random() * 90000000)); }
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
  return { chips: START_CHIPS, gift: '', gs: 0, name: guestName(), since: d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(), st: { games: 0, wins: 0, won: 0, best: 0, xp: 0 } };
}
export async function loadWallet() {
  let w = null;
  try { w = JSON.parse((await AsyncStorage.getItem(WKEY)) || 'null'); } catch (e) { w = null; }
  if (!w || typeof w.chips !== 'number') w = fresh();
  if (!w.st) w.st = fresh().st;
  // misafir adı değiştirilemez ve herkese ayrı verilir (ör. C37274815)
  if (w.name === 'C323107') w.name = 'C03031903';
  if (!/^C\d{8}$/.test(w.name || '')) w.name = guestName();
  if (DEV_NAME) w.name = DEV_NAME;   // yalnız Expo Go denemesinde
  W.w = w;
  saveWalletNow(w);
  return w;
}
function saveWalletNow(w) { AsyncStorage.setItem(WKEY, JSON.stringify(w)).catch(() => {}); }
export const wallet = () => W.w || (W.w = fresh());
export function saveWallet() { AsyncStorage.setItem(WKEY, JSON.stringify(wallet())).catch(() => {}); }
export function addChips(n) { if (MODE.offline) return; const w = wallet(); w.chips = Math.max(0, Math.round(w.chips + n)); saveWallet(); }

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
  if (MODE.offline) return null;
  const s = wallet().st; s.games++;
  if (win) s.wins++;
  if (gain > 0) { s.won += gain; s.best = Math.max(s.best, gain); }
  saveWallet();
  return addXP(5 + (win ? 10 : 0));
}

export const salonEntry = s => s.min * ENTRY_MULT;
// çevrimdışı oyun: çip yok, bütün salon ve masalar açık, ilerleme (istatistik, görev, seviye) sayılmaz
export const MODE = { offline: false };
export const tooRich = s => !MODE.offline && !!s.maxIn && wallet().chips > s.maxIn;
export const canEnter = s => MODE.offline || (wallet().chips >= salonEntry(s) && !tooRich(s));
export const enterMsg = s => (tooRich(s) ? s.name + ' salonuna en fazla ' + chipFmt(s.maxIn) + ' çiple girilebilir. Daha üst bir salonda oyna.' : s.name + ' salonuna girmek için en az ' + chipFmt(salonEntry(s)) + ' çip gerekir.');
export const canSit = bet => MODE.offline || wallet().chips >= bet * ENTRY_MULT;

// ---------- günlük hediye (7 günlük seri) ----------
export const giftReady = () => wallet().gift !== today();
export const nextGiftDay = () => { const w = wallet(); return w.gift === yesterday() ? (w.gs || 0) % 7 + 1 : 1; };
export const shownDay = () => (giftReady() ? nextGiftDay() : (wallet().gs || 1));
export function takeGift() {
  if (!giftReady()) return null;
  const day = nextGiftDay(), amt = DAILY_STREAK[day - 1], w = wallet();
  w.gs = day; w.gift = today(); addChips(amt);
  bump('gift'); const msgs = checkTasks();
  return { day, amt, msgs };
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
  const p = pen || {}, on = k => p[k] !== false || (k === 'yanAc' && p.herTas !== false);
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

// Hemen Oyna: tüm çipi tek masaya yatırmamak için bahsi çipin 1/5'ini geçmeyen en yüksek salon;
// Ayarlar'daki "Hemen Oyna ayarlarına" uyan masa seçilir, yoksa o özelliklerle yeni masa açılır (web ile aynı)
const QP_PEN_KEYS = ['rekor', 'okeyCal', 'herTas', 'yanAc', 'gosterge'];
export function quickPick(st) {
  const q = { hands: 'any', team: 'any', hard: 'any', mode: 'any', pen: {}, ...(st.qp || {}) };
  const any = v => v === 'any' || v === undefined;
  const penOk = pen => QP_PEN_KEYS.every(k => any(q.pen[k]) || ((pen || {})[k] !== false) === q.pen[k]);
  let si = -1;
  for (let i = SALONS.length - 1; i >= 0; i--) if (canEnter(SALONS[i]) && SALONS[i].min * 5 <= wallet().chips) { si = i; break; }
  if (si < 0) for (let i = SALONS.length - 1; i >= 0; i--) if (canEnter(SALONS[i])) { si = i; break; }
  if (si < 0) return null;
  const s = SALONS[si], lim = Math.max(s.min, wallet().chips / 5);
  const hands = any(q.hands) ? null : (s.hands.filter(h => h <= q.hands).pop() || s.hands[0]);
  const ok = tablesOf(si).filter(t => canSit(t.bet) && t.bet <= lim && t.seats.some(x => !x) &&
    (hands === null || t.hands === hands) && (any(q.team) || t.team === q.team) && (any(q.hard) || t.hard === q.hard) && (any(q.mode) || t.mode === q.mode) && penOk(t.pen));
  if (ok.length) return rnd(ok);
  const pen = { ...(st.pen || {}) };
  QP_PEN_KEYS.forEach(k => { if (q.pen[k] === true || q.pen[k] === false) pen[k] = q.pen[k]; });
  return { id: 'q' + Date.now(), salon: si, bet: s.min, hands: hands === null ? rnd(s.hands) : hands, team: any(q.team) ? false : q.team, mode: any(q.mode) ? 'katlamali' : q.mode, hard: any(q.hard) ? false : q.hard, pen, seats: [null, null, null, null] };
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

// ---------- görevler (web sürümüyle aynı zincirler ve ödüller) ----------
export const TASK_CATS = [
  { id: 'oyun', name: 'Oyun' }, { id: 'acma', name: 'El Açma' }, { id: 'bitirme', name: 'Bitirme' },
  { id: 'okey', name: 'Okey & Gösterge' }, { id: 'salon', name: 'Salonlar' }, { id: 'usta', name: 'Ustalık' }
];
// [kimlik, kategori, sayaç, hedefler, zorluk (1 kolay · 2 orta · 3 zor), simge, başlık, açıklama ({n} = hedef)]
export const CHAINS = [
  ['masa', 'oyun', 'games', [1, 5, 10, 25, 50, 100, 250, 500, 1000], 1, '☕', 'Kahvehane Sakini', '{n} oyun bitir.'],
  ['kazan', 'oyun', 'wins', [1, 3, 10, 25, 50, 100, 250, 500], 2, '🏅', 'Galibiyet Defteri', '{n} oyun kazan.'],
  ['seri', 'oyun', 'streak', [2, 3, 5, 7, 10], 3, '🔥', 'Durdurulamaz', 'Üst üste {n} oyun kazan.'],
  ['takim', 'oyun', 'wins_esli', [1, 5, 10, 25, 50, 100], 2, '🤝', 'Can Yoldaşı', 'Eşli oyunda {n} kez kazan.'],
  ['katla', 'oyun', 'wins_kat', [1, 5, 15, 40, 100, 250], 2, '📈', 'Katla Katla', 'Katlamalı oyunda {n} kez kazan.'],
  ['klasik', 'oyun', 'wins_klasik', [1, 5, 15, 40, 100, 250], 2, '🎴', 'Eski Usul', 'Klasik 101\'de {n} kez kazan.'],
  ['yardimsiz', 'oyun', 'wins_hard', [1, 5, 15, 40, 100], 3, '🐺', 'Gözü Kapalı', 'Yardımsız modda {n} kez kazan.'],
  ['acan', 'acma', 'open_seri', [10, 20, 30, 50, 100, 250, 500, 1000], 1, '🃏', 'Per Ustası', '{n} kez seri el aç.'],
  ['ciftac', 'acma', 'open_cift', [5, 10, 20, 40, 80, 150, 300], 1, '👯', 'İkiz Taşlar', '{n} kez çift aç.'],
  ['yuzelli', 'acma', 'open150', [1, 5, 15, 40, 100, 250], 2, '💯', 'Yüz Elli Hanesi', '150 ve üzeri puanla {n} kez el aç.'],
  ['ikiyuz', 'acma', 'open200', [1, 3, 10, 25, 50], 3, '🚀', 'İki Yüz Hanesi', '200 ve üzeri puanla {n} kez el aç.'],
  ['yedicift', 'acma', 'open_cift7', [1, 5, 15, 40, 100], 2, '7️⃣', 'Yedi Kardeş', '7 ve üzeri çiftle {n} kez aç.'],
  ['rekor', 'acma', 'record', [1, 5, 15, 40, 100], 2, '🏆', 'Tahtanın Rekoru', '{n} kez rekor ödülü al.'],
  ['isle', 'acma', 'process', [50, 100, 250, 500, 1000, 2500, 5000], 1, '🧱', 'Taş Döşeyen', 'Perlere toplam {n} taş işle.'],
  ['bitir', 'bitirme', 'finish', [1, 5, 10, 25, 50, 100, 250], 1, '✋', 'Son Taş', '{n} el bitir.'],
  ['dugun', 'bitirme', 'finish_cift', [1, 5, 10, 25, 50, 100], 2, '💍', 'Çiftle Veda', 'Çift açıp {n} el bitir.'],
  ['okeyat', 'bitirme', 'finish_okey', [1, 3, 10, 25, 50], 3, '🌟', 'Okeyle Veda', 'Okey atarak {n} el bitir.'],
  ['kafa', 'bitirme', 'finish_kafa', [1, 3, 10, 25], 3, '💥', 'Kafadan Bitir', 'Kimse açmadan {n} kez kafa at.'],
  ['okeykafa', 'bitirme', 'finish_okeykafa', [1, 3, 10], 3, '⚡', 'Şimşek Kafa', 'Kafa atarken okeyle {n} kez bitir.'],
  ['avci', 'okey', 'swap', [1, 3, 10, 25, 50, 100, 250], 2, '🎯', 'Okey Kapan', 'Masadan {n} kez okey çal.'],
  ['gosterge', 'okey', 'gost', [1, 3, 10, 25, 50, 100], 1, '👁', 'Göz Kulak', '{n} kez "Gösterge bende" de.'],
  ['cayci', 'salon', 'g_cayci', [5, 10, 25, 50, 100], 1, '🫖', 'Çay Ocağı', 'Çaycı salonunda {n} oyun oyna.'],
  ['kahveci', 'salon', 'g_kahveci', [5, 10, 25, 50, 100, 250], 1, '☕', 'Türk Kahvesi', 'Kahveci salonunda {n} oyun oyna.'],
  ['ustasalon', 'salon', 'g_usta', [5, 10, 25, 50, 100], 2, '🎩', 'Ustaların Masası', 'Usta salonunda {n} oyun oyna.'],
  ['efsane', 'salon', 'w_efsane', [1, 5, 10, 25, 50], 3, '🔥', 'Altın Masa', 'Efsane salonunda {n} oyun kazan.'],
  ['kral', 'salon', 'w_kral', [1, 3, 10, 25], 3, '🦁', 'Tahtın Sahibi', 'Kral salonunda {n} oyun kazan.'],
  ['kazanc', 'usta', 'won', [10000, 50000, 100000, 500000, 1000000, 10000000, 100000000], 2, '💰', 'Çip Kesesi', 'Masalardan toplam {n} çip kazan.'],
  ['seviye', 'usta', 'level', [5, 10, 20, 30, 50], 3, '⭐', 'Merdiven', '{n}. seviyeye ulaş.'],
  ['comert', 'usta', 'gift_sent', [1, 5, 25, 100, 500], 1, '💝', 'Gönlü Zengin', 'Masadakilere {n} hediye gönder.'],
  ['gunluk', 'usta', 'gift', [1, 7, 30, 100, 365], 1, '🎁', 'Her Sabah Bir Çay', '{n} kez günlük hediye al.']
];
export const DIFF = { 1: { dp: 20, chip: 1000, name: 'Kolay' }, 2: { dp: 40, chip: 2500, name: 'Orta' }, 3: { dp: 80, chip: 5000, name: 'Zor' } };
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
// aşama k (0'dan): DP ve çip her aşamada büyür
export function stageReward(diff, k) {
  const d = DIFF[diff];
  return { dp: Math.round(d.dp * Math.pow(1.6, k) / 5) * 5, chip: Math.round(d.chip * Math.pow(1.8, k) / 500) * 500 };
}
export function tstate() { const st = wallet().st; if (!st.c) st.c = {}; if (!st.stage) st.stage = {}; return st; }
export function bump(key, n) { const st = tstate(); st.c[key] = (st.c[key] || 0) + (n || 1); }
function setMax(key, v) { const st = tstate(); st.c[key] = Math.max(st.c[key] || 0, v); }
export function chainVal(ch) { const st = tstate(); return ch[2] === 'level' ? levelInfo(st.xp).lv : ch[2] === 'won' ? (st.won || 0) : (st.c[ch[2]] || 0); }
export function checkTasks() {
  const msgs = [];
  const st = tstate();
  let guard = 0, again = true;
  while (again && guard++ < 20) {               // seviye görevi DP ile tetiklenebilir: birkaç tur dön
    again = false;
    for (const ch of CHAINS) {
      let k = st.stage[ch[0]] || 0;
      while (k < ch[3].length && chainVal(ch) >= ch[3][k]) {
        const r = stageReward(ch[4], k);
        st.stage[ch[0]] = ++k;
        addChips(r.chip); addXP(r.dp); again = true;
        msgs.push('Görev: ' + ch[6] + ' ' + ROMAN[k - 1] + ' tamamlandı · +' + r.dp + ' DP · +' + chipFmt(r.chip) + ' çip');
      }
    }
  }
  saveWallet();
  return msgs;
}

// oyun içi olaylar (sadece masadaki sen) — web ile aynı
export function taskEv(name, d) {
  if (MODE.offline) return [];
  if (!d || d.i !== 0) return [];
  if (name === 'open') {
    if (d.kind === 'cift') { bump('open_cift'); if (d.val >= 7) bump('open_cift7'); }
    else { bump('open_seri'); if (d.val >= 150) bump('open150'); if (d.val >= 200) bump('open200'); }
  }
  else if (name === 'swap' && !d.gost) bump('swap');
  else if (name === 'gost') bump('gost');
  else if (name === 'record') bump('record');
  else if (name === 'process') bump('process');
  else if (name === 'finish') {
    bump('finish');
    if (d.cift) bump('finish_cift');
    if (d.okey) bump('finish_okey');
    if (d.elden) bump('finish_kafa');
    if (d.elden && d.okey) bump('finish_okeykafa');
  } else return [];
  return checkTasks();
}
// oyun sonu
export function taskGame(salonId, win, cfg) {
  if (MODE.offline) return [];
  const st = tstate();
  bump('games'); bump('g_' + salonId);
  if (win) {
    bump('wins'); bump('w_' + salonId);
    if (cfg.team) bump('wins_esli');
    bump(cfg.mode === 'katlamali' ? 'wins_kat' : 'wins_klasik');
    if (cfg.hard) bump('wins_hard');
    st.streak = (st.streak || 0) + 1; setMax('streak', st.streak);
  } else st.streak = 0;
  return checkTasks();
}

// ---------- oyun süresi ödülleri (web ile aynı): sadece masada oyun oynarken süre işler ----------
export const PT_GOALS = [
  [60, 1000], [600, 2000], [1800, 5000], [3600, 10000], [7200, 25000], [14400, 50000], [25200, 75000],
  [36000, 100000], [43200, 150000], [86400, 250000], [129600, 375000], [172800, 500000], [345600, 750000],
  [604800, 1000000], [1209600, 2000000], [2592000, 5000000]
];
export function ptLabel(s) {
  if (s < 3600) return (s / 60) + ' dakika';
  if (s < 604800) return (s / 3600) + ' saat';
  if (s === 604800) return '1 hafta'; if (s === 1209600) return '2 hafta'; if (s === 2592000) return '1 ay';
  return (s / 86400) + ' gün';
}
export function ptFmt(s) { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? h + ' sa ' + m + ' dk' : m ? m + ' dk ' + x + ' sn' : x + ' sn'; }
export function ptState() { const w = wallet(); if (!w.pt) w.pt = { sec: 0, got: 0 }; return w.pt; }
let ptSaveN = 0;
// her saniye çağrılır (masada, oyun sürerken); kazanılan ödüllerin mesajlarını döndürür
export function ptTick(dt) {
  if (MODE.offline) return [];
  const p = ptState(), msgs = []; p.sec += dt;
  while (p.got < PT_GOALS.length && p.sec >= PT_GOALS[p.got][0]) {
    const g = PT_GOALS[p.got]; p.got++;
    addChips(g[1]);
    msgs.push('Oyun süresi ödülü: ' + ptLabel(g[0]) + ' oynadın · +' + chipFmt(g[1]) + ' çip');
    if (p.got >= PT_GOALS.length) {             // tüm hedefler bitti: en baştan yeniden başlar
      p.sec = 0; p.got = 0; p.round = (p.round || 1) + 1;
      msgs.push('Tüm süre ödüllerini topladın! Ödüller ' + p.round + '. tur için en baştan başladı.');
      break;
    }
  }
  if (msgs.length || ++ptSaveN % 15 === 0) saveWallet();
  return msgs;
}

// ---------- ödüllü reklam (web ile aynı kurallar; şimdilik deneme reklamı, mağaza sürümünde AdMob) ----------
export const AD_REWARD = 5000, AD_DAILY = 5, AD_COOL = 3 * 60 * 1000, AD_LEN = 15;
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
export function adState() { const w = wallet(); if (!w.ad || w.ad.day !== todayKey()) w.ad = { day: todayKey(), n: 0, last: 0 }; return w.ad; }
export function adLeft() { return Math.max(0, AD_DAILY - adState().n); }
export function adWait() { return Math.max(0, adState().last + AD_COOL - Date.now()); }
export function adClaim() { const s = adState(); s.n++; s.last = Date.now(); addChips(AD_REWARD); saveWallet(); }

/* ---------- arkadaşlar / engellenenler (yerel) ---------- */
const SKEY = 'okey101.social';
let SOC = { friends: [], blocked: [], reports: [] };
AsyncStorage.getItem(SKEY).then(v => { try { const o = JSON.parse(v || 'null'); if (o) SOC = { friends: o.friends || [], blocked: o.blocked || [], reports: o.reports || [] }; } catch (e) {} }).catch(() => {});
export function social() { return SOC; }
export function toggleSocial(key, name) {
  const has = SOC[key].includes(name);
  SOC = { ...SOC, [key]: has ? SOC[key].filter(x => x !== name) : SOC[key].concat(name) };
  AsyncStorage.setItem(SKEY, JSON.stringify(SOC)).catch(() => {});
  return SOC;
}
// bot oyuncuların görünen istatistikleri: isme göre sabit (her açılışta aynı)
export function botStats(name) {
  let h = 7; for (const c of name) h = (h * 131 + c.charCodeAt(0)) % 1000003;
  const r = k => ((h * (k * 2654435761 % 1000)) % 1000) / 1000;
  const games = 150 + Math.floor(r(1) * 4800);
  return { games, winPct: 18 + Math.floor(r(2) * 22), finish: Math.floor(games * (0.18 + r(3) * 0.2)), okey: Math.floor(games * (0.02 + r(4) * 0.05)), best: 151 + Math.floor(r(5) * 120) };
}
// bildirimler şimdilik cihazda saklanır; online sürümde sunucuya gönderilecek
export function addReport(name, why) {
  SOC = { ...SOC, reports: (SOC.reports || []).concat({ name, why, at: Date.now() }).slice(-50) };
  AsyncStorage.setItem(SKEY, JSON.stringify(SOC)).catch(() => {});
}
