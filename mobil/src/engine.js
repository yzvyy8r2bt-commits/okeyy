'use strict';
/* =====================================================================
   101 OKEY MOTORU  (saf mantık, DOM yok)
   Taş: {id, c:0-3, n:1-13, fake:bool, wild:bool}
   c: 0 Kırmızı, 1 Siyah, 2 Mavi, 3 Sarı
   wild  = gerçek Okey (joker)  -> her taşın yerine geçer
   fake  = Sahte Okey           -> okey taşının yüzüyle (c,n) doğal taş gibi davranır
   ===================================================================== */
const COLOR_NAMES = ['Kırmızı', 'Siyah', 'Mavi', 'Sarı'];
const COLS = 15;            // ıstaka sütunu
const ROWS = 2;             // ıstaka sırası
let RNG = Math.random;
function setRng(f) { RNG = f; }
function rand() { return RNG(); }
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(RNG() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function tileName(t) {
  if (t.fake) return 'Sahte Okey';
  return COLOR_NAMES[t.c] + ' ' + t.n;
}
function faceName(c, n) { return COLOR_NAMES[c] + ' ' + n; }

/* ---------- Deste ve dağıtım ---------- */
function makeDeck() {
  const tiles = []; let id = 0;
  for (let copy = 0; copy < 2; copy++)
    for (let c = 0; c < 4; c++)
      for (let n = 1; n <= 13; n++)
        tiles.push({ id: id++, c, n, fake: false, wild: false });
  tiles.push({ id: id++, c: -1, n: 0, fake: true, wild: false });
  tiles.push({ id: id++, c: -1, n: 0, fake: true, wild: false });
  return tiles; // 106 taş
}

// starter 22 taş, diğerleri 21 taş. Kalan: 106 - 1 (gösterge) - 85 = 20
function dealHand(starter) {
  const deck = shuffle(makeDeck());
  let g;
  for (;;) {
    g = deck.pop();
    if (!g.fake) break;                       // gösterge sahte okey olamaz
    deck.splice(Math.floor(RNG() * (deck.length + 1)), 0, g);
  }
  const okey = { c: g.c, n: g.n === 13 ? 1 : g.n + 1 };
  g.wild = false;
  for (const t of deck) {
    if (t.fake) { t.c = okey.c; t.n = okey.n; t.wild = false; }
    else t.wild = (t.c === okey.c && t.n === okey.n);
  }
  const hands = [];
  for (let i = 0; i < 4; i++) {
    const cnt = i === starter ? 22 : 21;
    hands.push(deck.splice(deck.length - cnt, cnt));
  }
  return { deck, gosterge: g, okey, hands };
}

/* ---------- Per analizi ---------- */
// Seri (aynı renk ardışık). 1 yalnızca başta (1-2-3) olabilir, 12-13-1 geçersiz; 1 her zaman 1 puan.
function analyzeRun(tiles) {
  const len = tiles.length;
  if (len < 3 || len > 13) return null;
  const wilds = tiles.filter(t => t.wild);
  const real = tiles.filter(t => !t.wild);
  if (real.length < 1) return null;
  const color = real[0].c;
  for (const t of real) if (t.c !== color) return null;
  const pos = real.map(t => ({ t, p: t.n })).sort((a, b) => a.p - b.p);
  for (let i = 1; i < pos.length; i++) if (pos[i].p === pos[i - 1].p) return null;
  const mn = pos[0].p, mx = pos[pos.length - 1].p;
  const gaps = (mx - mn + 1) - pos.length;
  if (gaps > wilds.length) return null;
  let extra = wilds.length - gaps, lo = mn, hi = mx;
  const addHi = Math.min(extra, 13 - hi); hi += addHi; extra -= addHi;
  const addLo = Math.min(extra, lo - 1); lo -= addLo; extra -= addLo;
  if (extra > 0) return null;
  const byP = new Map(pos.map(x => [x.p, x.t]));
  const wq = wilds.slice();
  const items = [];
  for (let p = lo; p <= hi; p++) items.push({ t: byP.get(p) || wq.shift(), c: color, n: p, p });
  return { kind: 'series', type: 'run', items, value: items.reduce((s, i) => s + i.p, 0) };
}
// Küt (aynı sayı, farklı renkler), 3 veya 4 taş
function analyzeSet(tiles) {
  const len = tiles.length;
  if (len < 3 || len > 4) return null;
  const real = tiles.filter(t => !t.wild), wilds = tiles.filter(t => t.wild);
  if (!real.length) return null;
  const n = real[0].n;
  for (const t of real) if (t.n !== n) return null;
  const cols = real.map(t => t.c);
  if (new Set(cols).size !== cols.length) return null;
  const missing = [0, 1, 2, 3].filter(c => !cols.includes(c));
  if (wilds.length > missing.length) return null;
  const items = real.map(t => ({ t, c: t.c, n }));
  wilds.forEach((w, i) => items.push({ t: w, c: missing[i], n }));
  items.sort((a, b) => a.c - b.c);
  return { kind: 'series', type: 'set', items, value: n * len };
}
function analyzeMeld(tiles) {
  const r = analyzeRun(tiles), s = analyzeSet(tiles);
  if (r && s) return r.value >= s.value ? r : s;
  return r || s;
}
// Yan yana duran bir grubu en iyi şekilde perlere böl (aradaki tek taşları atlayabilir)
function parseGroup(g) {
  // Yan yana duran grubun TÜM taşları perlere bölünebilmeli; araya karışan alakasız (okey olmayan) taş varsa grup per sayılmaz.
  // Okey (joker) taşı artıkta kalabilir: ör. 4'lü küte ya da 13'lük seriye bitişik fazladan okey peri bozmaz.
  const n = g.length;
  const dp = new Array(n + 1).fill(-1), from = new Array(n + 1).fill(null);
  dp[0] = 0;
  for (let i = 1; i <= n; i++) {
    if (g[i - 1].wild && dp[i - 1] >= 0) { dp[i] = dp[i - 1]; from[i] = { skip: true }; }
    for (let j = i - 3; j >= 0 && i - j <= 13; j--) {
      if (dp[j] < 0) continue;
      const a = analyzeMeld(g.slice(j, i));
      if (a && dp[j] + a.value > dp[i]) { dp[i] = dp[j] + a.value; from[i] = { j, a }; }
    }
  }
  if (n === 0 || dp[n] < 0) return { melds: [], value: 0 };
  const melds = []; let i = n;
  while (i > 0) { const f = from[i]; if (f.skip) i--; else { melds.unshift(f.a); i = f.j; } }
  return { melds, value: dp[n] };
}
/* ---------- Çift ---------- */
// Çiftte joker gibi davranan taş: okey ya da "gösterge bende" denmiş gösterge
function pj(t) { return !!(t && (t.wild || t.gost)); }
function isPair(a, b) {
  if (pj(a) || pj(b)) return true;
  return a.c === b.c && a.n === b.n;
}
function parsePairsInGroup(g) {
  // Yan yana grubun tüm taşları ikişerli çift olmalı; alakasız (okey olmayan) taş varsa grup çift sayılmaz, artıkta kalan okey sorun olmaz
  const pairs = []; let i = 0;
  while (i < g.length) {
    if (i + 1 < g.length && isPair(g[i], g[i + 1])) { pairs.push([g[i], g[i + 1]]); i += 2; }
    else if (pj(g[i])) i++;
    else return [];
  }
  return pairs;
}
function bestPairs(tiles) {
  const byFace = new Map(), wilds = [], pairs = [], singles = [];
  for (const t of tiles) {
    if (pj(t)) { wilds.push(t); continue; }
    const k = t.c * 13 + t.n;
    if (!byFace.has(k)) byFace.set(k, []);
    byFace.get(k).push(t);
  }
  for (const arr of byFace.values()) {
    while (arr.length >= 2) pairs.push([arr.pop(), arr.pop()]);
    if (arr.length) singles.push(arr[0]);
  }
  singles.sort((a, b) => b.n - a.n);
  const w = wilds.slice();
  while (w.length && singles.length) pairs.push([singles.shift(), w.pop()]);
  if (w.length >= 2) pairs.push([w.pop(), w.pop()]);
  return { pairs, leftover: singles.concat(w) };
}

/* ---------- Istaka analizi (yan yana duran gruplar = per) ---------- */
function rackAnalysis(slots) {
  const melds = [], pairs = [];
  let points = 0;
  const meldIds = new Set(), pairIds = new Set();
  for (let r = 0; r < slots.length / COLS; r++) {
    let g = [];
    const flush = () => {
      if (!g.length) return;
      const pr = parseGroup(g);
      for (const m of pr.melds) { melds.push(m); points += m.value; for (const it of m.items) meldIds.add(it.t.id); }
      for (const p of parsePairsInGroup(g)) { pairs.push(p); pairIds.add(p[0].id); pairIds.add(p[1].id); }
      g = [];
    };
    for (let c = 0; c < COLS; c++) {
      const t = slots[r * COLS + c];
      if (t) g.push(t); else flush();
    }
    flush();
  }
  return { melds, points, pairs, meldIds, pairIds };
}

/* ---------- En iyi seri dizilimi (DFS + önbellek) ---------- */
function bestSeries(tiles, must) {
  const mustWild = !!(must && must.wild), mustIdx = must && !must.wild ? must.c * 13 + must.n - 1 : -1;
  const w0 = tiles.filter(t => t.wild).length;
  const counts = new Array(52).fill(0);
  const pool = []; for (let i = 0; i < 52; i++) pool.push([]);
  const wildPool = [];
  for (const t of tiles) {
    if (t.wild) wildPool.push(t);
    else { const i = t.c * 13 + t.n - 1; counts[i]++; pool[i].push(t); }
  }
  const memo = new Map(), choice = new Map();
  const firstIdx = () => { for (let i = 0; i < 52; i++) if (counts[i] > 0) return i; return -1; };
  const keyOf = w => counts.join('') + '|' + w;

  function candidates(f, w) {
    const c = Math.floor(f / 13), n = f % 13 + 1;
    const out = [];
    // --- küt ---
    const avail = [];
    for (let c2 = c + 1; c2 < 4; c2++) if (counts[c2 * 13 + n - 1] > 0) avail.push(c2);
    const m = avail.length;
    for (let mask = 0; mask < (1 << m); mask++) {
      const cols = [c];
      for (let b = 0; b < m; b++) if (mask & (1 << b)) cols.push(avail[b]);
      const k = cols.length;
      for (let wu = Math.max(0, 3 - k); wu <= Math.min(w, 4 - k); wu++) {
        if (k + wu < 3) continue;
        const missing = [0, 1, 2, 3].filter(x => !cols.includes(x));
        const items = cols.map(cc => ({ c: cc, n, idx: cc * 13 + n - 1 }));
        for (let q = 0; q < wu; q++) items.push({ c: missing[q], n, wild: true });
        items.sort((a, b) => a.c - b.c);
        out.push({ type: 'set', items, wilds: wu, value: n * (k + wu) });
      }
    }
    // --- seri (f en küçük gerçek taş) ---
    for (let a = n; a >= Math.max(1, n - w); a--) {
      let wu = n - a;
      const items = [];
      for (let p = a; p < n; p++) items.push({ c, n: p, p, wild: true });
      items.push({ c, n, p: n, idx: f });
      const used = new Map([[f, 1]]);
      const record = () => {
        if (items.length >= 3) {
          let v = 0; for (const it of items) v += it.p;
          out.push({ type: 'run', items: items.map(x => Object.assign({}, x)), wilds: wu, value: v });
        }
      };
      record();
      for (let p = n + 1; p <= 13; p++) {
        const nn = p, idx = c * 13 + nn - 1;
        const have = counts[idx] - (used.get(idx) || 0);
        if (have > 0) { items.push({ c, n: nn, p, idx }); used.set(idx, (used.get(idx) || 0) + 1); }
        else if (wu < w) { items.push({ c, n: nn, p, wild: true }); wu++; }
        else break;
        record();
      }
    }
    return out;
  }

  function solve(w) {
    const f = firstIdx();
    if (f < 0) return 0;
    const k = keyOf(w);
    const hit = memo.get(k);
    if (hit !== undefined) return hit;
    counts[f]--; let best = solve(w); counts[f]++;
    let bestCh = null;
    for (const cand of candidates(f, w)) {
      for (const it of cand.items) if (it.idx !== undefined) counts[it.idx]--;
      let bonus = 0;
      if (mustIdx >= 0 && cand.items.some(it => it.idx === mustIdx)) bonus = 1000;
      else if (mustWild && cand.wilds > 0) bonus = 1000 * cand.wilds;
      const v = cand.value + 0.001 * cand.items.length + bonus + solve(w - cand.wilds);
      for (const it of cand.items) if (it.idx !== undefined) counts[it.idx]++;
      if (v > best) { best = v; bestCh = cand; }
    }
    memo.set(k, best); choice.set(k, bestCh);
    return best;
  }
  solve(w0);
  // yeniden kur
  const melds = []; const left = []; let w = w0;
  for (;;) {
    const f = firstIdx();
    if (f < 0) break;
    const ch = choice.get(keyOf(w));
    if (!ch) { counts[f]--; left.push(f); continue; }
    for (const it of ch.items) if (it.idx !== undefined) counts[it.idx]--;
    w -= ch.wilds;
    melds.push(ch);
  }
  let total = 0, usesMust = false;
  for (const ch of melds) if ((mustIdx >= 0 && ch.items.some(it => it.idx === mustIdx)) || (mustWild && ch.wilds > 0)) usesMust = true;
  const out = melds.map(ch => {
    const items = ch.items.map(it => {
      const t = it.wild ? wildPool.pop() : pool[it.idx].pop();
      const o = { t, c: it.c, n: it.n };
      if (it.p !== undefined) o.p = it.p;
      return o;
    });
    total += ch.value;
    return { kind: 'series', type: ch.type, items, value: ch.value };
  });
  const leftover = [];
  for (const idx of left) leftover.push(pool[idx].pop());
  for (const wl of wildPool) leftover.push(wl);
  return { value: total, melds: out, leftover, usesMust };
}

/* ---------- İşleme / okey çalma ---------- */
function runBounds(m) {
  let lo = 99, hi = 0;
  for (const it of m.items) { if (it.p < lo) lo = it.p; if (it.p > hi) hi = it.p; }
  return [lo, hi];
}
// Taş, bu serinin ucuna / küte eklenebilir mi? Seçenekleri döndürür.
function extendOptions(m, t) {
  if (m.kind !== 'series') return null;
  if (m.type === 'run') {
    if (m.items.length >= 13) return null;
    const [lo, hi] = runBounds(m), color = m.items[0].c, opts = [];
    if (t.wild) {
      if (hi < 13) opts.push({ side: 'hi', p: hi + 1 });
      if (lo > 1) opts.push({ side: 'lo', p: lo - 1 });
    } else {
      if (t.c !== color) return null;
      if (hi < 13 && t.n === hi + 1) opts.push({ side: 'hi', p: hi + 1 });
      if (lo > 1 && t.n === lo - 1) opts.push({ side: 'lo', p: lo - 1 });
    }
    return opts.length ? opts : null;
  }
  if (m.items.length >= 4) return null;
  const n = m.items[0].n, cols = m.items.map(i => i.c);
  if (t.wild) {
    const miss = [0, 1, 2, 3].find(c => !cols.includes(c));
    return miss === undefined ? null : [{ side: 'set', c: miss }];
  }
  if (t.n !== n || cols.includes(t.c)) return null;
  return [{ side: 'set', c: t.c }];
}
function applyExtend(m, t, opt) {
  if (m.type === 'run') {
    const color = m.items[0].c;
    m.items.push({ t, c: color, n: opt.p, p: opt.p });
    m.items.sort((a, b) => a.p - b.p);
  } else {
    m.items.push({ t, c: opt.c, n: m.items[0].n });
    m.items.sort((a, b) => a.c - b.c);
  }
}
// Perdeki jokerin yerine gerçek taşı koyabilir mi?
function canSwapAt(m, idx, t) {
  const it = m.items[idx];
  if (!it || t.wild) return false;
  if (m.kind === 'pair') {                       // çiftteki okey ya da gösterge: eşi olan taşla alınır
    if (!pj(it.t) || t.gost) return false;
    const o = m.items[1 - idx];
    return !!o && !pj(o.t) && t.c === o.t.c && t.n === o.t.n;
  }
  if (!it.t.wild) return false;
  if (m.kind !== 'series') return false;
  if (m.type === 'run') return t.c === it.c && t.n === it.n;
  const n = m.items[0].n;
  if (t.n !== n) return false;
  return !m.items.some((o, k) => k !== idx && o.c === t.c);
}
function findSwapIdx(m, t) {
  for (let i = 0; i < m.items.length; i++) if (canSwapAt(m, i, t)) return i;
  return -1;
}
function doSwap(m, idx, t) {
  const it = m.items[idx], joker = it.t;
  it.t = t;
  if (m.type === 'set') { it.c = t.c; m.items.sort((a, b) => a.c - b.c); }
  return joker;
}
// Yanlışa atma: atılan taş masadaki herhangi bir açık seriye işlenebiliyorsa
function isWrongDiscard(tile, table) {
  // işlek: perlere eklenebilen ya da masadaki okeyin yerini tutan (okeyi çaldıran) taş
  for (const m of table) if ((m.kind === 'series' && extendOptions(m, tile)) || (!tile.wild && findSwapIdx(m, tile) >= 0)) return true;
  return false;
}

/* ---------- Istaka yerleşimi ---------- */
function layoutGroups(groups, gap) {
  const total = COLS * ROWS, slots = new Array(total).fill(null);
  let pos = 0;
  for (const g of groups) {
    if (!g.length) continue;
    const rowStart = Math.floor(pos / COLS) * COLS;
    const remaining = rowStart + COLS - pos;
    if (g.length > remaining && g.length <= COLS && pos % COLS !== 0) pos = rowStart + COLS;
    for (const t of g) { if (pos >= total) return null; slots[pos++] = t; }
    if (gap) pos++;
  }
  return slots;
}
function arrangeSlots(groups) {
  return layoutGroups(groups, true) || layoutGroups(groups, false) ||
    (() => { const s = new Array(COLS * ROWS).fill(null); let i = 0; for (const g of groups) for (const t of g) s[i++] = t; return s; })();
}
function sortTiles(tiles) {
  return tiles.slice().sort((a, b) => (a.c - b.c) || (a.n - b.n) || (a.id - b.id));
}
function groupByColor(tiles) {
  const g = [[], [], [], []];
  for (const t of sortTiles(tiles)) g[t.c].push(t);
  return g.filter(x => x.length);
}

/* ---------- Bot yardımcıları ---------- */
function partnerScore(t, hand) {
  let s = 0; const seen = new Set();
  for (const u of hand) {
    if (u === t || u.wild) continue;
    if (u.c === t.c) {
      const d = Math.abs(u.n - t.n);
      if (d === 0) s += 3;
      else if (d === 1) s += 3;
      else if (d === 12) s += 2;
      else if (d === 2 || d === 11) s += 1.5;
    } else if (u.n === t.n && !seen.has(u.c)) { s += 2; seen.add(u.c); }
  }
  return s;
}

/* ---------- Puanlama ---------- */
// players: [{opened, hand:[tiles], penalty}]
function scoreHand(players, winner, opts) {
  const draw = !!opts.draw;
  const mult = draw ? 1 : (opts.elden ? 2 : 1) * (opts.okey ? 2 : 1);
  const lmult = draw ? 1 : mult * (opts.cift ? 2 : 1);
  return players.map((p, i) => {
    const notes = []; let base = 0;
    if (!draw && opts.team && i === (winner + 2) % 4) {
      const pn = ['Eşi bitirdi 0']; let pp = 0;
      for (const x of (p.penLog || [])) { pp += x.amt; pn.push(x.label + ' +' + x.amt); }
      return { base: 0, pen: pp, total: pp, notes: pn };
    }
    if (!draw && i === winner) {
      const wm = mult * (opts.cift ? 2 : 1);
      base = -101 * wm;
      notes.push(wm > 1 ? 'Bitirdi −101 ×' + wm : 'Bitirdi −101');
    } else if (!p.opened) {
      base = 202 * lmult;
      notes.push(lmult > 1 ? 'El açamadı 202 ×' + lmult : 'El açamadı 202');
    } else {
      let sum = 0, ok = 0;
      for (const t of p.hand) { sum += t.n; if (t.wild) ok++; }
      const extra = ok * 101;
      const pm = p.cift ? 2 * lmult : lmult;
      base = (sum + extra) * pm;
      notes.push('Kalan taş ' + sum);
      if (ok) notes.push('Elde okey +' + extra);
      if (pm > 1) notes.push((p.cift ? 'Çift açtı ' : '') + '×' + pm);
      if (p.cift && !draw && sum > 100) { base += 101; notes.push('Çiftte yüzü geçti +101'); }   // çift açan, rakip bitirince 100'ü geçen sayıyla kaldıysa
    }
    let pen = 0;
    for (const e of (p.penLog || [])) { pen += e.amt; notes.push(e.amt < 0 ? e.label + ' −' + (-e.amt) : e.label + ' +' + e.amt); }
    return { base, pen, total: base + pen, notes };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COLOR_NAMES, COLS, ROWS, setRng, rand, mulberry, shuffle, tileName, faceName, makeDeck, dealHand,
    analyzeRun, analyzeSet, analyzeMeld, parseGroup, isPair, pj, parsePairsInGroup, bestPairs,
    rackAnalysis, bestSeries, runBounds, extendOptions, applyExtend, canSwapAt, findSwapIdx, doSwap,
    isWrongDiscard, layoutGroups, arrangeSlots, sortTiles, groupByColor, partnerScore, scoreHand
  };
}
