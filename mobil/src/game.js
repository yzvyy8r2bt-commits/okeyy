/* =====================================================================
   OYUN AKIŞI + BOT YAPAY ZEKASI  (DOM yok; arayüz H kancalarıyla bağlanır)
   ===================================================================== */
if (typeof module !== 'undefined' && module.exports) { Object.assign(globalThis, require('./engine')); }

const SEATS = ['Sen', 'Ahmet', 'Mehmet', 'Ayşe'];
const H = {
  render() {}, log() {}, toast() {}, banner() {}, sfx() {},
  handEnd() {}, gameEnd() {}, handStart() {}, discarded() {}, ev() {}, turn() {},
  wait() { return Promise.resolve(); }
};
let G = null;

/* ---------- Kurulum ---------- */
function newGame(cfg, opts) {
  opts = opts || {};
  const ep = (G ? G.epoch : 0) + 1;
  G = {
    epoch: ep,
    cfg: Object.assign({ mode: 'katlamali', hands: 4, team: false, speed: 'normal', pen: {} }, cfg),
    handNo: 0, hands: [], totals: [0, 0, 0, 0],
    allBots: !!opts.allBots, phase: 'menu', finished: false,
    players: [], table: [], deck: [], log: [], freshId: null
  };
  startHand();
  return G;
}
function startHand() {
  const starter = G.handNo % 4;
  const d = dealHand(starter);
  G.deck = d.deck; G.gosterge = d.gosterge; G.okey = d.okey;
  G.table = []; G.meldSeq = 1;
  G.maxSeries = 0; G.maxSeriesBy = ''; G.maxPairs = 0; G.maxPairsBy = ''; G.rec = { seri: null, cift: null };
  G.log = []; G.freshId = null; G.starter = starter;
  G.players = [0, 1, 2, 3].map(i => {
    const human = i === 0 && !G.allBots;
    return {
      i, name: (G.cfg.names && G.cfg.names[i]) || SEATS[i], human, bot: !human, hand: [], slots: null,
      opened: false, openKind: null, openVal: 0, penalty: 0, penLog: [], sideTile: null, sideUsed: false, sideRef: null, sideReturned: false, acted: false, gostSaid: false, pairsThisTurn: 0, swapThisTurn: false, openSnap: null, regathered: false, discards: [], openedThisTurn: false
    };
  });
  for (let i = 0; i < 4; i++) {
    const P = G.players[i];
    if (P.human) { P.slots = new Array(30).fill(null); shuffle(d.hands[i].slice()).forEach((t, k) => { P.slots[k] = t; }); }
    else P.hand = d.hands[i];
  }
  G.turn = starter; G.phase = 'discard'; G.turnNo = 1; G.clkTurn = 0;
  logEv(-1, 'Yeni el başladı. ' + G.players[starter].name + ' 22 taşla başlıyor.');
  H.handStart();
  H.render();
  if (G.players[G.turn].bot) continueFlow();
}

/* ---------- Yardımcılar ---------- */
function handOf(P) { return P.human ? P.slots.filter(Boolean) : P.hand; }
function removeFromHand(P, t) {
  if (P.human) { const i = P.slots.indexOf(t); if (i >= 0) P.slots[i] = null; }
  else { const i = P.hand.indexOf(t); if (i >= 0) P.hand.splice(i, 1); }
}
function placeInRack(slots, t) {
  let last = -1;
  for (let i = 0; i < slots.length; i++) if (slots[i]) last = i;
  for (const i of [last + 2, last + 1]) if (i >= 0 && i < slots.length && !slots[i]) { slots[i] = t; return i; }
  const e = slots.findIndex(s => !s);
  if (e >= 0) { slots[e] = t; return e; }
  return -1;
}
function giveTile(P, t) {
  if (P.human) { placeInRack(P.slots, t); G.freshId = t.id; }
  else P.hand.push(t);
}
function logEv(i, text) {
  const line = (i >= 0 ? G.players[i].name + ': ' : '') + text;
  G.log.push(line); if (G.log.length > 40) G.log.shift();
  H.log(line);
}
function seriesNeed() { return G.cfg.mode === 'katlamali' ? Math.max(101, G.maxSeries + 1) : 101; }
function pairsNeed() { return G.cfg.mode === 'katlamali' ? Math.max(5, G.maxPairs + 1) : 5; }
function fail(msg) { return { ok: false, msg }; }
function tableMeldById(id) { return G.table.find(m => m.id === id); }
const PEN_DEFS = [
  ['gosterge', 'Gösterge', 'Göstergenin eşi elinde olan elin başında söyleyip çiftte joker gibi kullanır'],
  ['rekor', 'Rekorlu', '150+ puanla ya da 7+ çiftle açana −101 rekor ödülü'],
  ['okeyCal', 'Okey çalma', 'Perdeki okeyi çalınan oyuncuya 101 ceza'],
  ['yanAc', 'Yandan taş alıp açma', 'Yandan alınan taşla açılırsa taşı atana taş×10 (çiftte ×20) ceza'],
  ['herTas', 'Her taş ceza', 'Elini açtıktan sonra yandan alıp per veya çift indirdiğin taşın sahibine taş×10 (çiftte ×20) ceza']
];
const PEN_KEYS = { gosterge: 1, rekor: 1, okeyCal: 1, yanAc: 1, herTas: 1 };
function penOn(k) {
  if (k === 'yanAc' && penOn('herTas')) return true;   // Her taş cezalı açıksa yandan açma cezası da yazılır
  return !PEN_KEYS[k] || !G.cfg.pen || G.cfg.pen[k] !== false;
}
// Gösterge: ortadaki göstergenin eşi. Elin başında (ilk taş çekilmeden) söylenirse çiftte joker olur.
function isGostTwin(t) { return !!(G.gosterge && t && !t.fake && !t.wild && t.c === G.gosterge.c && t.n === G.gosterge.n); }
function canAnnounce(P) { return penOn('gosterge') && !P.acted && !P.gostSaid && handOf(P).some(isGostTwin); }
function announceGost(i) {
  const P = G.players[i];
  if (!canAnnounce(P)) return fail('Gösterge ancak elin başında, ilk taşını çekmeden söylenebilir.');
  const t = handOf(P).find(isGostTwin);
  t.gost = true; P.gostSaid = true; H.ev('gost', { i });
  logEv(i, 'Gösterge bende');
  H.toast((P.human ? 'Gösterge bende! ' + tileName(t) + ' çiftte her taşla eşleşir.' : P.name + ': Gösterge bende'), 'info');
  H.render();
  return { ok: true, msg: 'Gösterge bende' };
}
const LAST_MSG = 'Elini bitirmek için son taşını atmalısın: elinde en az bir taş kalmalı.';
// Geri alma / son taş koruması için anlık görüntü
function takeSnap(P) {
  return {
    table: G.table.map(m => Object.assign({}, m, { items: m.items.map(x => Object.assign({}, x)), lim: m.lim ? Object.assign({}, m.lim) : undefined })),
    slots: P.slots ? P.slots.slice() : null, hand: P.hand ? P.hand.slice() : null,
    f: { opened: P.opened, openKind: P.openKind, openVal: P.openVal, openedThisTurn: P.openedThisTurn, sideTile: P.sideTile, sideUsed: P.sideUsed, sideRef: P.sideRef, sideReturned: P.sideReturned, pairsThisTurn: P.pairsThisTurn, swapThisTurn: P.swapThisTurn },
    g: { meldSeq: G.meldSeq, maxSeries: G.maxSeries, maxSeriesBy: G.maxSeriesBy, maxPairs: G.maxPairs, maxPairsBy: G.maxPairsBy, freshId: G.freshId, rec: { seri: G.rec.seri ? Object.assign({}, G.rec.seri) : null, cift: G.rec.cift ? Object.assign({}, G.rec.cift) : null } },
    pl: G.players.map(p => ({ pen: p.penalty, log: p.penLog.slice(), vals: p.penLog.map(e => Object.assign({}, e)) }))
  };
}
// açık olan oyuncunun bu turdaki ilk masa işleminden önceki hali (Geri Topla için)
function markTurn(P, snap) { if (P.opened && !P.openedThisTurn && !P.turnSnap && G.phase === 'discard') P.turnSnap = snap || takeSnap(P); }
function restoreSnap(P, s) {
  G.table = s.table.map(m => Object.assign({}, m, { items: m.items.map(x => Object.assign({}, x)), lim: m.lim ? Object.assign({}, m.lim) : undefined }));
  if (s.slots) P.slots = s.slots.slice();
  if (s.hand) P.hand = s.hand.slice();
  Object.assign(P, s.f); Object.assign(G, s.g); G.rec = { seri: s.g.rec.seri ? Object.assign({}, s.g.rec.seri) : null, cift: s.g.rec.cift ? Object.assign({}, s.g.rec.cift) : null };
  G.players.forEach((p, k) => {
    const o = s.pl[k]; p.penalty = o.pen; p.penLog = o.log.slice();
    p.penLog.forEach((e, j) => Object.assign(e, o.vals[j]));
  });
}
// Rekor ödülü: 150+ puanla ya da 7+ çiftle açan en yüksek açana −101 yazılır
const REC_MIN = { seri: 150, cift: 7 };
function awardRecord(P, kind, val) {
  if (!penOn('rekor')) return;
  if (val < REC_MIN[kind]) return;
  const cur = G.rec[kind];
  if (cur && val <= cur.val) return;
  if (cur) {
    const V = G.players[cur.by], k = V.penLog.indexOf(cur.entry);
    if (k >= 0) { V.penLog.splice(k, 1); V.penalty -= cur.entry.amt; }
    logEv(P.i, V.name + ' rekor ödülünü kaybetti');
  }
  const label = kind === 'seri' ? 'Rekor ödülü (' + val + ' puan)' : 'Rekor ödülü (' + val + ' çift)';
  addPenalty(P, 'record', label, -101);
  G.rec[kind] = { by: P.i, val, entry: P.penLog[P.penLog.length - 1] };
  H.ev('record', { i: P.i, kind });
  logEv(P.i, 'REKOR: ' + val + (kind === 'seri' ? ' puan' : ' çift') + ' (−101)');
  H.toast((P.human ? 'Rekor ödülü senin: ' : P.name + ' rekor ödülünü aldı: ') + val + (kind === 'seri' ? ' puan' : ' çift') + ' (−101)' + (cur ? ' · ' + G.players[cur.by].name + ' ödülü kaybetti' : ''), 'good');
  H.sfx('okey');
}
function addPenalty(P, kind, label, amt, tileId) {
  P.penLog.push({ k: kind, label, amt, tileId: tileId || 0 });
  P.penalty += amt;
  if (amt > 0) H.ev('penalty', { i: P.i, amt });
}
// Yandan alınan taş kullanıldı
function noteUse(P, tile) {
  if (!P.sideTile || P.sideUsed || P.sideTile !== tile) return;
  P.sideUsed = true; P.sideRef = null;
}
// Birden çok taş: bu taşlardan biri yandan alınansa (3) açılışta ceza + (4) kullanıldı
function openCharge(P, tiles, kind, gate, pairs) {
  gate = gate || 'yanAc';
  if (!P.sideTile || P.sideUsed || !tiles.includes(P.sideTile) || !penOn(gate)) return;
  // yandan alınan taş göstergeyle çift yapıldıysa ceza yok
  if (pairs && pairs.some(p => p.includes(P.sideTile) && p.some(x => x !== P.sideTile && x.gost))) return;
  const V = G.players[(P.i + 3) % 4], t = P.sideTile;
  const mul = kind === 'cift' ? 20 : 10;
  let amt = t.n * mul;
  if (P.sideRef && P.sideRef.entry && V.penLog.includes(P.sideRef.entry)) {
    // işlek taş zaten ×10'a çevrildi; çiftte fark kadar ekle
    amt = kind === 'cift' ? t.n * 10 : 0;
    if (amt) { P.sideRef.entry.amt += amt; V.penalty += amt; P.sideRef.entry.label = 'Yandan taşı açıldı (' + t.n + '×20)'; }
  } else {
    addPenalty(V, 'side', (gate === 'herTas' ? 'Her taş ceza (' : 'Yandan taşı açıldı (') + t.n + '×' + mul + ')', amt);
  }
  if (!amt) return;
  logEv(P.i, V.name + ' oyuncusuna yandan alınan taşı ' + (gate === 'herTas' ? 'indirdiği' : 'açtığı') + ' için +' + amt + ' ceza');
  H.toast((P.human ? 'Yandan aldığın taşı ' : P.name + ' yandan aldığı taşı ') + (gate === 'herTas' ? 'indirdi' : 'açtı') + ': ' + V.name + ' +' + amt + ' ceza', 'bad');
  H.sfx('penalty');
}
// Elde (rakip eli dahil) taşın bir çiftte yer alabileceği çiftleri kur
function pairsWith(hand, tile) {
  const rest = hand.filter(x => x !== tile);
  let partner = null;
  if (!pj(tile)) partner = rest.find(x => !pj(x) && x.c === tile.c && x.n === tile.n) || rest.find(x => x.gost) || rest.find(x => x.wild);
  else partner = rest.find(x => !pj(x)) || rest.find(x => pj(x));
  if (!partner) return null;
  const rem = rest.filter(x => x !== partner);
  return [[tile, partner]].concat(bestPairs(rem).pairs);
}
// Elinde (taş dahil) yandan alınan taşı bu turda kullanma imkanı var mı?
function canUseSide(P, tile) {
  const cur = handOf(P), hand = cur.includes(tile) ? cur : cur.concat([tile]);
  if (!P.opened) {
    const bs = bestSeries(hand, tile);
    if (bs.usesMust && bs.value >= seriesNeed()) return true;
    const pw = pairsWith(hand, tile);
    return !!(pw && pw.length >= pairsNeed());
  }
  if (P.openKind === 'cift') return !!pairsWith(hand, tile) || G.table.some(m => (m.kind === 'series' && extOpts(P, m, tile)) || (!tile.wild && findSwapIdx(m, tile) >= 0));
  for (const m of G.table) {
    if (!tile.wild && findSwapIdx(m, tile) >= 0) return true;
    if (m.kind !== 'series') continue;
    if (extOpts(P, m, tile)) return true;
  }
  return bestSeries(hand, tile).usesMust;
}
function sideMsg(P, tile) {
  const nm = tileName(tile);
  if (!P.opened) return nm + ' taşını yandan alırsan onunla elini açman gerekir; elindeki taşlarla bunu yapamazsın. Desteden çekmelisin.';
  if (P.openKind === 'cift') return nm + ' taşını yandan alırsan onunla çift indirmen gerekir; elinde eşi yok. Desteden çekmelisin.';
  return nm + ' taşını yandan alırsan onu bir pere işlemen ya da yeni per indirmen gerekir; bunu yapamazsın. Desteden çekmelisin.';
}
// Tur süresi: el açma / işleme / per-çift indirme / okey alma süreyi baştan başlatır
// süre bir turda yalnızca bir kez yenilenir (ilk açma / işleme / okey alma)
function bumpClock() { if (G.clkTurn === G.turnNo) return; G.clkTurn = G.turnNo; G.clk = (G.clk || 0) + 1; }
// Açtığı turda, okey/gösterge çalmadan indirdiği her per/çift açılış sayısına eklenir (limit buna göre yükselir)
function growOpen(P, kind, add) {
  if (!P.openedThisTurn || P.swapThisTurn || !add) return;
  if (kind === 'seri' && P.openKind === 'seri') {
    P.openVal += add;
    if (P.openVal > G.maxSeries) { G.maxSeries = P.openVal; G.maxSeriesBy = P.name; }
    awardRecord(P, 'seri', P.openVal);
  } else if (kind === 'cift' && P.openKind === 'cift') {
    if (P.openVal > G.maxPairs) { G.maxPairs = P.openVal; G.maxPairsBy = P.name; }
    awardRecord(P, 'cift', P.openVal);
  }
}
// Açık eldeki perleri masaya indir (yeni per). Yandan alınan taş içindeyse kullanılmış sayılır.
function layMelds(i, melds) {
  const P = G.players[i];
  openCharge(P, melds.reduce((a, m) => a.concat(m.items.map(x => x.t)), []), 'seri', 'herTas');
  for (const a of melds) {
    for (const it of a.items) { removeFromHand(P, it.t); noteUse(P, it.t); }
    G.table.push({ id: G.meldSeq++, owner: i, kind: 'series', type: a.type, items: a.items.map(x => Object.assign({ by: i }, x)) });
  }
  bumpClock();
  growOpen(P, 'seri', melds.reduce((s, a) => s + (a.value || a.items.reduce((v, x) => v + (x.p || x.n || 0), 0)), 0));
  logEv(i, melds.length + ' per indirdi');
}

/* ---------- Temel hamleler (insan ve bot ortak) ---------- */
function drawFromDeck(i) {
  const P = G.players[i]; P.acted = true;
  const t = G.deck.pop();
  giveTile(P, t); G.phase = 'discard';
  return t;
}
function takeSide(i) {
  const P = G.players[i], prev = G.players[(i + 3) % 4]; P.acted = true;
  const t = prev.discards.pop();
  giveTile(P, t); G.phase = 'discard';
  P.sideTile = t; P.sideUsed = false; P.sideRef = null;
  const e = prev.penLog.find(x => x.k === 'wrong' && x.tileId === t.id);
  if (e) {
    // işlek/okey taşı yandan alındı: atanın 101 cezası taş×10'a düşer, alana ceza yok
    P.sideRef = { victim: prev.i, entry: e, old: { k: e.k, label: e.label, amt: e.amt } };
    const na = t.n * 10;
    prev.penalty += na - e.amt; e.amt = na; e.k = 'side'; e.label = 'İşlek taş yandan alındı (' + t.n + '×10)';
    logEv(i, prev.name + ' işlek taşı yandan alındı: ceza ' + na);
    H.toast(prev.name + ' cezası 101 yerine ' + na + ' oldu (' + t.n + '×10)', 'good');
  }
  return t;
}
// Yandan alınan taşı kullanamayınca geri bırak (ceza yok ya da yanlış açma cezasıyla)
function returnSide(P) {
  const t = P.sideTile, prev = G.players[(P.i + 3) % 4];
  if (P.slots) { const k = P.slots.indexOf(t); if (k >= 0) P.slots[k] = null; }
  else { const k = P.hand.indexOf(t); if (k >= 0) P.hand.splice(k, 1); }
  prev.discards.push(t);
  if (P.sideRef && prev.penLog.includes(P.sideRef.entry)) {
    const e = P.sideRef.entry, o = P.sideRef.old;
    prev.penalty += o.amt - e.amt; e.amt = o.amt; e.k = o.k; e.label = o.label;
  }
  P.sideTile = null; P.sideUsed = false; P.sideRef = null; P.sideReturned = true;
  G.phase = 'draw';
}
function openSeries(i, melds) {
  const P = G.players[i];
  let pts = 0;
  openCharge(P, melds.reduce((a, m) => a.concat(m.items.map(x => x.t)), []), 'seri');
  for (const a of melds) {
    pts += a.value;
    for (const it of a.items) { removeFromHand(P, it.t); noteUse(P, it.t); }
    G.table.push({ id: G.meldSeq++, owner: i, kind: 'series', type: a.type, items: a.items.map(x => Object.assign({ by: i }, x)) });
  }
  P.opened = true; P.openKind = 'seri'; P.openVal = pts; P.openedThisTurn = true; bumpClock(); H.ev('open', { i, kind: 'seri', val: pts });
  if (pts > G.maxSeries) { G.maxSeries = pts; G.maxSeriesBy = P.name; }
  awardRecord(P, 'seri', pts);
  logEv(i, 'El açtı: ' + melds.length + ' per, ' + pts + ' puan');
  return pts;
}
function openPairs(i, pairs) {
  const P = G.players[i];
  openCharge(P, pairs.reduce((a, p) => a.concat(p), []), 'cift', undefined, pairs);
  for (const pr of pairs) {
    for (const t of pr) { removeFromHand(P, t); noteUse(P, t); }
    G.table.push({ id: G.meldSeq++, owner: i, kind: 'pair', type: 'pair', items: pr.map(t => ({ t, c: t.c, n: t.n })) });
  }
  P.opened = true; P.openKind = 'cift'; P.openedThisTurn = true; bumpClock(); H.ev('open', { i, kind: 'cift', val: pairs.length });
  P.openVal = pairs.length;
  if (pairs.length > G.maxPairs) { G.maxPairs = pairs.length; G.maxPairsBy = P.name; }
  awardRecord(P, 'cift', pairs.length);
  logEv(i, 'Çift açtı: ' + pairs.length + ' çift');
  return pairs.length;
}
function addPairs(i, pairs) {
  const P = G.players[i];
  openCharge(P, pairs.reduce((a, p) => a.concat(p), []), P.openKind === 'cift' ? 'cift' : 'seri', 'herTas', pairs);
  for (const pr of pairs) {
    for (const t of pr) { removeFromHand(P, t); noteUse(P, t); }
    G.table.push({ id: G.meldSeq++, owner: i, kind: 'pair', type: 'pair', items: pr.map(t => ({ t, c: t.c, n: t.n })) });
  }
  bumpClock();
  if (P.openKind === 'cift') { P.openVal += pairs.length; growOpen(P, 'cift', pairs.length); }
  logEv(i, pairs.length + ' çift ' + (P.openKind === 'cift' ? 'işledi' : 'indirdi'));
}
// Çift açan oyuncu: bir turda bir serinin her ucuna (sağ/sol) en fazla 2 taş işleyebilir
function sideCount(P, m, side) {
  const l = m.lim;
  return l && l.turn === G.turnNo && l.by === P.i ? l[side] : 0;
}
function extOpts(P, m, t) {
  const o = extendOptions(m, t);
  if (!o) return null;
  if (P.openKind !== 'cift' || m.type !== 'run') return o;
  const f = o.filter(x => sideCount(P, m, x.side) < 2);
  return f.length ? f : null;
}
const LIMIT_MSG = 'Çift açtığın için bir turda bir perin her ucuna en fazla 2 taş işleyebilirsin. Kalanı sonraki turda işlersin.';
function processTile(i, t, m, opt) {
  const P = G.players[i]; bumpClock(); H.ev('process', { i });
  removeFromHand(P, t);
  applyExtend(m, t, opt);
  const added = m.items.find(x => x.t === t); if (added) added.by = i;
  if (P.openKind === 'cift' && m.type === 'run') {
    if (!m.lim || m.lim.turn !== G.turnNo || m.lim.by !== i) m.lim = { turn: G.turnNo, by: i, lo: 0, hi: 0 };
    m.lim[opt.side]++;
  }
  openCharge(P, [t], 'seri', 'herTas');
  noteUse(P, t);
}
// Atış. Yanlışa atma cezasını burada keser.
function doDiscard(i, tile) {
  const P = G.players[i];
  removeFromHand(P, tile);
  const finishing = handOf(P).length === 0;
  const wrong = !finishing && penOn('islek') && isWrongDiscard(tile, G.table);
  const okeyThrow = !finishing && !wrong && !!tile.wild && penOn('okeyAt');
  H.discarded(i);
  tile.gost = false;                         // atılan gösterge sıradan taşa döner
  P.discards.push(tile);
  G.lastDiscard = { by: i, id: tile.id };
  logEv(i, 'taş attı: ' + tileName(tile));
  if (wrong) {
    addPenalty(P, 'wrong', 'Yanlışa atma', 101, tile.id);
    const who = P.human ? 'Yanlışa taş attın!' : P.name + ' yanlışa taş attı!';
    H.toast(who + ' ' + tileName(tile) + ' masadaki bir pere işleniyordu. +101 ceza', 'bad');
    H.banner('YANLIŞA TAŞ ATILDI', P.name + ' · +101 ceza', 'bad');
    H.sfx('penalty');
    logEv(i, 'YANLIŞA ATTI: ' + tileName(tile) + ' (+101 ceza)');
  }
  if (!finishing) {
    const left = handOf(P).length;
    if (left >= 1 && left <= 3) {
      H.toast(P.human ? 'Elinde ' + left + ' taş kaldı' : P.name + ' oyuncusunun ' + left + ' taşı kaldı', 'info');
      logEv(i, left + ' taşı kaldı');
    }
  }
  if (okeyThrow) {
    addPenalty(P, 'wrong', 'Okey attı', 101, tile.id);
    H.toast((P.human ? 'Okey attın!' : P.name + ' okey attı!') + ' +101 ceza', 'bad');
    H.banner('OKEY ATILDI', P.name + ' · +101 ceza', 'bad');
    H.sfx('penalty');
    logEv(i, 'OKEY ATTI (+101 ceza)');
  }
  if (finishing) {
    finishHand(i, { okey: !!tile.wild, elden: P.openedThisTurn });
    return 'finish';
  }
  return wrong ? 'wrong' : 'ok';
}
function advanceTurn() {
  G.turn = (G.turn + 1) % 4; G.phase = 'draw'; G.turnNo++;
  G.players.forEach(p => { p.openedThisTurn = false; p.sideTile = null; p.sideUsed = false; p.sideRef = null; p.sideReturned = false; p.openSnap = null; p.turnSnap = null; p.regathered = false; p.pairsThisTurn = 0; p.swapThisTurn = false; p.pend = null; });
  if (!G.deck.length) { endHandDraw(); return; }
  H.render();
  H.turn(G.turn);
}

/* ---------- El sonu ---------- */
function finishHand(winner, info) {
  if (G.phase === 'over') return;
  G.phase = 'over';
  const elden = !!info.elden && G.players.every((p, k) => k === winner || !p.opened), okey = !!info.okey; // elden = kafa: kimse açmadan, açtığı turda bitirmek
  const mult = (elden ? 2 : 1) * (okey ? 2 : 1);
  const cift = G.players[winner].openKind === 'cift';
  H.ev('finish', { i: winner, elden, okey, cift });
  const res = scoreHand(G.players.map(p => ({ opened: p.opened, cift: p.openKind === 'cift', hand: handOf(p), penLog: p.penLog })), winner, { elden, okey, cift, team: !!G.cfg.team });
  const W = G.players[winner];
  const tags = [];
  if (elden) tags.push('Kafa ×2');
  if (okey) tags.push('Okey atarak bitme ×2');
  if (cift) tags.push('Çift bitirdi: rakipler ×2');
  if (G.cfg.team) tags.push('Eşli: ' + G.players[(winner + 2) % 4].name + ' 0 yazıldı');
  const rec = {
    no: G.hands.length + 1, kind: elden && okey ? 'elden+okey' : elden ? 'elden' : okey ? 'okey' : 'normal',
    winner, mult, cift, tags, draw: false, per: res,
    title: W.name + ' eli bitirdi',
    penalties: G.players.map(p => p.penalty)
  };
  G.hands.push(rec);
  res.forEach((r, i) => { G.totals[i] += r.total; });
  if (okey && elden) H.banner('OKEY KAFA!', W.name + ' · puanlar ×4', 'gold');
  else if (okey) H.banner('OKEY ATARAK BİTTİ!', W.name + ' · puanlar ×2', 'gold');
  else if (elden) H.banner('KAFA!', W.name + ' · puanlar ×2', 'gold');
  else if (cift) H.banner('ÇİFTLE BİTTİ!', W.name + ' · rakiplerin puanı ×2', 'gold');
  if (okey || elden || cift) H.sfx('okey'); else H.sfx('win');
  logEv(winner, 'ELİ BİTİRDİ' + (tags.length ? ' (' + tags.join(', ') + ')' : ''));
  H.render();
  H.handEnd(rec, G.hands.length >= G.cfg.hands);
}
function endHandDraw() {
  if (G.phase === 'over') return;
  G.phase = 'over';
  const res = scoreHand(G.players.map(p => ({ opened: p.opened, cift: p.openKind === 'cift', hand: handOf(p), penLog: p.penLog })), null, { draw: true });
  const rec = {
    no: G.hands.length + 1, kind: 'draw', winner: null, mult: 1, tags: ['Taşlar bitti'], draw: true, per: res,
    title: 'Taşlar bitti, kimse bitiremedi', penalties: G.players.map(p => p.penalty)
  };
  G.hands.push(rec);
  res.forEach((r, i) => { G.totals[i] += r.total; });
  logEv(-1, 'Taşlar bitti.');
  H.sfx('draw');
  H.render();
  H.handEnd(rec, G.hands.length >= G.cfg.hands);
}
function nextHand() {
  if (G.hands.length >= G.cfg.hands) { G.finished = true; H.gameEnd(); return; }
  G.handNo++;
  startHand();
}

/* ---------- İnsan hamleleri ---------- */
function humanTurnErr(needPhase) {
  if (!G || G.phase === 'over') return fail('El bitti.');
  if (G.players[0].bot) return fail('Bot oyunu.');
  if (G.turn !== 0) return fail('Sıra ' + G.players[G.turn].name + ' oyuncusunda, biraz bekle.');
  if (needPhase === 'draw' && G.phase !== 'draw') return fail('Bu turda zaten taş çektin. Şimdi bir taş atmalısın.');
  if (needPhase === 'discard' && G.phase !== 'discard') return fail('Önce yerden çekmeli ya da yandan taş almalısın.');
  return null;
}
function hDraw(src) {
  const e = humanTurnErr('draw'); if (e) return e;
  if (src === 'side') {
    const prev = G.players[3];
    if (!prev.discards.length) return fail('Yandan alınacak taş yok. ' + prev.name + ' henüz taş atmadı.');
    const top = prev.discards[prev.discards.length - 1];
    const t = takeSide(0);
    logEv(0, 'yandan aldı: ' + tileName(t));
    H.sfx('draw'); H.render();
    return { ok: true, tile: t, msg: 'Yandan aldın: ' + tileName(t) };
  }
  if (!G.deck.length) { endHandDraw(); return { ok: true }; }
  const t = drawFromDeck(0);
  logEv(0, 'yerden çekti');
  H.sfx('draw'); H.render();
  return { ok: true, tile: t, msg: 'Çektin: ' + tileName(t) };
}
function openPlanInfo(prefer, strict) {
  const P = G.players[0];
  const an = rackAnalysis(P.slots);
  const needS = seriesNeed(), needP = pairsNeed();
  // Katlamalıda: tek taş kalacak şekilde (işlek yapmadan) eli bitirebiliyorsan rakibin sayısı aranmaz, 101 yeter
  const laid = an.melds.reduce((a, m) => a + m.items.length, 0);
  const finishOpen = G.cfg.mode === 'katlamali' && an.melds.length > 0 && an.points >= 101 && handOf(P).length - laid === 1;
  const sOK = (an.points >= needS && an.melds.length > 0) || finishOpen;
  const pOK = an.pairs.length >= needP;
  let kind = null;
  if (strict) kind = prefer === 'cift' ? (pOK ? 'cift' : null) : (sOK ? 'seri' : null);
  else if (prefer === 'cift') kind = pOK ? 'cift' : (sOK ? 'seri' : null);
  else kind = sOK ? 'seri' : (pOK ? 'cift' : null);
  return { an, needS, needP, sOK, pOK, kind };
}
function hOpen(prefer, strict) {
  const e = humanTurnErr('discard'); if (e) return e;
  const P = G.players[0];
  const snap0 = takeSnap(P);
  if (P.opened) return fail('Elini zaten açtın.');
  const want = prefer === 'cift' ? 'cift' : 'seri';
  if (P.pend && P.pend.kind !== want) return fail('Önce başladığın ' + (P.pend.kind === 'cift' ? 'çift' : 'seri') + ' açılışını tamamla ya da Geri Topla.');
  const pl = openPlanInfo(prefer, strict);
  // Parça parça açılış: limit tutmuyorsa indirilenler bekler; aynı turda indirilenler toplanır
  const cur = want === 'cift' ? pl.an.pairs.length : pl.an.points;
  if (P.pend || (!pl.kind && cur > 0 && !(want === 'seri' && pl.pOK && !strict))) {
    if (!cur) return fail(want === 'cift' ? 'Istakada indirilecek çift yok.' : 'Istakada indirilecek per yok.');
    const pend0 = P.pend ? Object.assign({}, P.pend, { tiles: P.pend.tiles.slice(), pairs: P.pend.pairs.slice() }) : null;
    if (!P.pend) P.pend = { kind: want, val: 0, snap: snap0, tiles: [], pairs: [] };
    const pd = P.pend;
    if (want === 'seri') {
      for (const a of pl.an.melds) {
        for (const it of a.items) { removeFromHand(P, it.t); pd.tiles.push(it.t); }
        G.table.push({ id: G.meldSeq++, owner: 0, kind: 'series', type: a.type, items: a.items.map(x => Object.assign({ by: 0 }, x)) });
      }
    } else {
      for (const pr of pl.an.pairs) {
        for (const t of pr) { removeFromHand(P, t); pd.tiles.push(t); }
        pd.pairs.push(pr);
        G.table.push({ id: G.meldSeq++, owner: 0, kind: 'pair', type: 'pair', items: pr.map(t => ({ t, c: t.c, n: t.n })) });
      }
    }
    pd.val += cur; bumpClock();
    if (handOf(P).length === 0) { restoreSnap(P, snap0); P.pend = pend0; H.render(); return fail(LAST_MSG); }
    const need = want === 'cift' ? pairsNeed() : seriesNeed();
    const finishOpen = want === 'seri' && G.cfg.mode === 'katlamali' && pd.val >= 101 && handOf(P).length === 1;
    if (pd.val >= need || finishOpen) {
      // açılış tamam
      P.opened = true; P.openKind = want; P.openVal = pd.val; P.openedThisTurn = true; H.ev('open', { i: 0, kind: want, val: pd.val });
      if (want === 'seri') {
        openCharge(P, pd.tiles, 'seri');
        if (pd.val > G.maxSeries) { G.maxSeries = pd.val; G.maxSeriesBy = P.name; }
        awardRecord(P, 'seri', pd.val);
        H.banner('EL AÇTIN', pd.val + ' puan', 'good');
      } else {
        openCharge(P, pd.tiles, 'cift', undefined, pd.pairs);
        if (pd.val > G.maxPairs) { G.maxPairs = pd.val; G.maxPairsBy = P.name; }
        awardRecord(P, 'cift', pd.val);
        H.banner('ÇİFT AÇTIN', pd.val + ' çift', 'good');
      }
      pd.tiles.forEach(t => noteUse(P, t));
      logEv(0, (want === 'seri' ? 'El açtı: ' + pd.val + ' puan' : 'Çift açtı: ' + pd.val + ' çift'));
      P.openSnap = pd.snap; P.pend = null;
      H.sfx('open'); H.render();
      return { ok: true, msg: want === 'seri' ? 'Elini açtın: ' + P.openVal + ' puan.' : 'Çift açtın: ' + P.openVal + ' çift.', kind: want };
    }
    H.sfx('open'); H.render();
    return { ok: true, msg: 'Açılış ' + pd.val + '/' + need + (want === 'cift' ? ' çift' : '') + ': taş atmadan bir ' + (want === 'cift' ? 'çift' : 'per') + ' daha indir. Tamamlamadan taş atarsan yanlış açma cezası (+101) yazılır; düzeltmek için Geri Topla.', pending: true };
  }
  if (!pl.kind) {
    const sideFail = () => {
      if (!P.sideTile || P.sideUsed) {
        if (!penOn('yanlisAcma')) return '';
        addPenalty(P, 'badopen', 'Yanlış el açma', 101);
        H.toast('Yanlış el açma! +101 ceza', 'bad');
        H.banner('YANLIŞ EL AÇMA', '+101 ceza', 'bad'); H.sfx('penalty');
        logEv(0, 'yanlış el açtı (+101 ceza)');
        return ' Yanlış el açtığın için +101 ceza yedin.';
      }
      const nm = tileName(P.sideTile);
      returnSide(P);
      if (!penOn('yanlisAcma')) return ' Yandan aldığın taş geri bırakıldı.';
      addPenalty(P, 'badopen', 'Yanlış el açma', 101);
      H.toast('Yanlış el açma! Yandan aldığın taş geri gitti, +101 ceza', 'bad');
      H.banner('YANLIŞ EL AÇMA', '+101 ceza', 'bad'); H.sfx('penalty');
      logEv(0, 'yanlış el açtı (+101 ceza), ' + nm + ' geri bırakıldı');
      return ' Yandan aldığın taşla yanlış el açtığın için +101 ceza yedin, taş geri bırakıldı.';
    };
    if (prefer === 'cift') {
      let m = 'Çift açmak için en az ' + pl.needP + ' çift dizmelisin (şu an ' + pl.an.pairs.length + ').';
      if (G.cfg.mode === 'katlamali' && G.maxPairs > 0) m = 'Katlamalı: ' + G.maxPairsBy + ' ' + G.maxPairs + ' çiftle açtı. En az ' + pl.needP + ' çift gerekli (şu an ' + pl.an.pairs.length + ').';
      return fail(m + sideFail());
    }
    let m = 'El açmak için perlerin toplamı en az ' + pl.needS + ' olmalı (şu an ' + pl.an.points + ').';
    if (G.cfg.mode === 'katlamali' && G.maxSeries > 0) m = 'Katlamalı: ' + G.maxSeriesBy + ' ' + G.maxSeries + ' puanla açtı. Elini açmak için en az ' + pl.needS + ' puan gerekli (şu an ' + pl.an.points + ').';
    if (pl.an.points === 0) m += ' Önce ıstakada en az 3 taşlı per dizmelisin.';
    return fail(m + sideFail());
  }
  let msg;
  if (pl.kind === 'seri') {
    const pts = openSeries(0, pl.an.melds);
    msg = 'Elini açtın: ' + pts + ' puan.';
    H.banner('EL AÇTIN', pts + ' puan', 'good');
  } else {
    const n = openPairs(0, pl.an.pairs);
    msg = 'Çift açtın: ' + n + ' çift. Artık çift ve seri perlere işleyebilirsin (bir turda perin her ucuna en fazla 2 taş).';
    H.banner('ÇİFT AÇTIN', n + ' çift', 'good');
  }
  H.sfx('open');
  if (handOf(P).length === 0) { restoreSnap(P, snap0); H.render(); return fail(LAST_MSG); }
  P.openSnap = snap0;
  H.render();
  return { ok: true, msg, kind: pl.kind };
}
// Seçili taşları işle. meldId verilmezse uygun ilk pere işler.
function hProcess(tileIds, meldId) {
  const e = humanTurnErr('discard'); if (e) return e;
  const P = G.players[0];
  const snap0 = takeSnap(P);
  if (!P.opened) return fail('Önce elini açmalısın, sonra taş işleyebilirsin.');
  markTurn(P, snap0);
  if (!tileIds.length) return fail('İşlemek için önce rafından bir taş seç.');
  let count = 0, lastErr = '';
  for (const id of tileIds) {
    const t = P.slots.find(x => x && x.id === id);
    if (!t) continue;
    let done = false, blocked = false;
    const melds = meldId ? [tableMeldById(meldId)].filter(Boolean) : G.table;
    for (const m of melds) {
      if (m.kind !== 'series') continue;
      const o = extOpts(P, m, t);
      if (o) { processTile(0, t, m, o[0]); count++; done = true; logEv(0, tileName(t) + ' işledi'); break; }
      if (extendOptions(m, t)) blocked = true;
    }
    if (!done && blocked) lastErr = LIMIT_MSG;
    else if (!done) lastErr = tileName(t) + (meldId ? ' bu pere işlenemez.' : ' için uygun bir per yok.');
  }
  if (!count) return fail(lastErr || 'İşlenecek taş bulunamadı.');
  H.sfx('open');
  if (handOf(P).length === 0) { restoreSnap(P, snap0); H.render(); return fail(LAST_MSG); }
  H.render();
  return { ok: true, count, msg: count + ' taş işlendi.' + (lastErr ? ' ' + lastErr : '') };
}
function hLay() {
  const e = humanTurnErr('discard'); if (e) return e;
  const P = G.players[0];
  const snap0 = takeSnap(P);
  if (!P.opened) return fail('Önce elini açmalısın.');
  markTurn(P, snap0);
  if (P.openKind === 'cift') return hProcessPairs();
  const an = rackAnalysis(P.slots);
  if (!an.melds.length) return fail('Istakada indirilecek per yok. En az 3 taşlı bir per dizmelisin.');
  layMelds(0, an.melds);
  H.sfx('open');
  if (handOf(P).length === 0) { restoreSnap(P, snap0); H.render(); return fail(LAST_MSG); }
  H.render();
  return { ok: true, msg: an.melds.length + ' per indirdin.' };
}
// Perdeki okeyi gerçek taşla değiş: okeyi perde bırakan oyuncuya 101 ceza yazılır
function swapOkey(i, m, idx, t) {
  G.players[i].swapThisTurn = true; bumpClock(); H.ev('swap', { i, gost: !!m.items[idx].t.gost });
  const it = m.items[idx];
  const by = it.by !== undefined ? it.by : m.owner;
  const joker = doSwap(m, idx, t);
  if (joker.gost) {
    logEv(i, 'göstergeyi aldı (' + tileName(t) + ' koydu)');
    H.toast(G.players[i].human ? 'Göstergeyi aldın: çiftte her taşla eşleşir' : G.players[i].name + ' göstergeyi aldı', 'info');
    return joker;
  }
  if (by !== i && G.cfg.team && by === (i + 2) % 4) {
    logEv(i, 'eşinin okeyini çaldı (ceza yok)');
    H.toast((G.players[i].human ? 'Eşinin okeyini aldın: ceza yok' : G.players[i].name + ' eşinin okeyini aldı: ceza yok'), 'good');
  } else if (by !== i && penOn('okeyCal')) {
    const V = G.players[by];
    addPenalty(V, 'okey', 'Okeyi çalındı', 101);
    logEv(i, V.name + ' oyuncusunun okeyini çaldı (+101 ceza)');
    H.toast((G.players[i].human ? 'Okey çaldın: ' : G.players[i].name + ' okey çaldı: ') + V.name + ' +101 ceza', V.human ? 'bad' : 'good');
    H.sfx('penalty');
  }
  return joker;
}
// Tümünü işle: ıstakadaki işlenebilen tüm (okey olmayan) taşları perlere işler
function hProcessAll() {
  const e = humanTurnErr('discard'); if (e) return e;
  const P = G.players[0];
  const snap0 = takeSnap(P);
  if (!P.opened) return fail('Önce elini açmalısın, sonra taş işleyebilirsin.');
  markTurn(P, snap0);
  let count = 0, changed = true, guard = 0;
  while (changed && guard++ < 60) {
    changed = false;
    for (const t of P.slots.filter(Boolean)) {
      if (t.wild) continue;
      for (const m of G.table) {
        if (m.kind !== 'series') continue;
        const o = extOpts(P, m, t);
        if (o) { processTile(0, t, m, o[0]); logEv(0, tileName(t) + ' işledi'); count++; changed = true; break; }
      }
      if (changed) break;
    }
  }
  if (!count) return fail(P.openKind === 'cift' ? 'İşlenebilecek taş yok (bir turda perin her ucuna en fazla 2 taş işlenir).' : 'İşlenebilecek taş yok.');
  H.sfx('open');
  if (handOf(P).length === 0) { restoreSnap(P, snap0); H.render(); return fail(LAST_MSG); }
  H.render();
  return { ok: true, count, msg: count + ' taş işlendi.' };
}
function hSwap(tileId, meldId, idx) {
  const e = humanTurnErr(null); if (e) return e;
  const P = G.players[0];
  if (!P.opened) return fail('Okey ya da gösterge almak için önce elini açmalısın.');
  markTurn(P);
  const t = P.slots.find(x => x && x.id === tileId);
  const m = tableMeldById(meldId);
  if (!t || !m) return fail('Taş veya per bulunamadı.');
  if (!canSwapAt(m, idx, t)) {
    const it = m.items[idx], o = m.kind === 'pair' ? m.items[1 - idx] : it;
    return fail((it.t.gost ? 'Göstergeyi' : 'Okeyi') + ' almak için yerine tam olarak ' + faceName(o.c, o.n) + ' taşını koymalısın.');
  }
  const joker = swapOkey(0, m, idx, t);
  removeFromHand(P, t); noteUse(P, t);
  giveTile(P, joker);
  logEv(0, 'okey çaldı (' + tileName(t) + ' koydu)');
  H.sfx('open');
  H.render();
  return { ok: true, msg: 'Okey aldın! Yerine ' + tileName(t) + ' konuldu.' };
}
// Masada hem seri hem çift açan varsa seri açan da çift indirebilir
function canPairLay(P) { return !!P.opened && P.openKind === 'seri' && G.players.some(p => p !== P && p.opened && p.openKind === 'cift'); }
function hProcessPairs(tileIds) {
  const e = humanTurnErr('discard'); if (e) return e;
  const P = G.players[0];
  const snap0 = takeSnap(P);
  if (!P.opened) return fail('Önce elini çift olarak açmalısın.');
  markTurn(P, snap0);
  if (P.openKind !== 'cift' && !canPairLay(P)) return fail('Seri açtığın için çift indiremezsin (masada çift açan yoksa); taşları perlere işle.');
  let pairs;
  if (tileIds && tileIds.length) {
    const tiles = tileIds.map(id => P.slots.find(x => x && x.id === id)).filter(Boolean);
    if (tiles.length < 2) return fail('Çift işlemek için en az iki taş seç.');
    pairs = bestPairs(tiles).pairs;
    if (!pairs.length) return fail('Seçtiğin taşlar çift oluşturmuyor (aynı renk ve sayı olmalı).');
  } else {
    pairs = rackAnalysis(P.slots).pairs;
    if (!pairs.length) return fail('İşlenecek çift yok. Istakada yan yana iki aynı taş dizmelisin.');
  }
  let note = '';
  if (P.openKind !== 'cift') {
    // seri açan bir turda en fazla 2 çift indirebilir
    const room = 2 - (P.pairsThisTurn || 0);
    if (room <= 0) return fail('Seri açan oyuncu bir turda en fazla 2 çift indirebilir. Sıra tekrar sana gelince 2 çift daha indirebilirsin.');
    if (P.sideTile && !P.sideUsed) {
      const k = pairs.findIndex(pr => pr.includes(P.sideTile));
      if (k > 0) pairs.unshift(pairs.splice(k, 1)[0]);
    }
    if (pairs.length > room) { pairs = pairs.slice(0, room); note = ' (bir turda en fazla 2 çift)'; }
    P.pairsThisTurn = (P.pairsThisTurn || 0) + pairs.length;
  }
  addPairs(0, pairs);
  H.sfx('open');
  if (handOf(P).length === 0) { restoreSnap(P, snap0); H.render(); return fail(LAST_MSG); }
  H.render();
  return { ok: true, msg: pairs.length + ' çift ' + (P.openKind === 'cift' ? 'işlendi' : 'indirildi') + '.' + note };
}
function hDiscard(tileId) {
  const e = humanTurnErr('discard'); if (e) return e;
  const P = G.players[0];
  let t = P.slots.find(x => x && x.id === tileId);
  if (!t) return fail('Taş bulunamadı.');
  if (P.pend) {                                  // açılış tamamlanmadan taş atıldı: geri alınır, +101
    const pd = P.pend; P.pend = null;
    restoreSnap(P, pd.snap);
    const pen = penOn('yanlisAcma');
    if (pen) { addPenalty(P, 'badopen', 'Yanlış el açma', 101); H.banner('YANLIŞ EL AÇMA', '+101 ceza', 'bad'); H.sfx('penalty'); }
    logEv(0, 'açılışı tamamlayamadı' + (pen ? ' (+101 ceza)' : ''));
    if (P.sideTile && !P.sideUsed) {
      returnSide(P); H.render();
      return fail('Açılışını tamamlamadan taş atamazsın' + (pen ? ': +101 ceza yedin' : '') + '. Yandan aldığın taş geri bırakıldı, desteden çekmelisin.');
    }
    H.toast('Açılış tamamlanmadı' + (pen ? ': +101 ceza' : ''), 'bad');
    t = P.slots.find(x => x && x.id === tileId);
    if (!t) { H.render(); return fail('Taş bulunamadı.'); }
  }
  if (P.sideTile && !P.sideUsed) {
    const nm = tileName(P.sideTile);
    return fail(!P.opened ? 'Yandan aldığın ' + nm + ' taşıyla önce elini açmalısın. Açamayacaksan taşı Yan kutusuna geri sürükle.'
      : P.openKind === 'cift' ? 'Yandan aldığın ' + nm + ' taşıyla önce çift indirmelisin. Kullanamayacaksan taşı Yan kutusuna geri sürükle.'
      : 'Yandan aldığın ' + nm + ' taşını önce işlemeli ya da per indirmelisin. Kullanamayacaksan taşı Yan kutusuna geri sürükle.');
  }
  if (P.regathered && !P.opened && penOn('yanlisAcma')) {
    addPenalty(P, 'badopen', 'Yanlış el açma', 101);
    H.toast('Elini geri toplayıp yeniden açamadın: +101 ceza', 'bad'); H.sfx('penalty');
    logEv(0, 'geri topladığı eli yeniden açamadı (+101 ceza)');
    P.regathered = false;
  }
  const r = doDiscard(0, t);
  H.sfx('discard');
  if (r === 'finish') return { ok: true, finished: true };
  advanceTurn();
  continueFlow();
  return { ok: true, wrong: r === 'wrong' };
}
function hReturnSide() {
  const e = humanTurnErr('discard'); if (e) return e;
  const P = G.players[0];
  if (!P.sideTile || P.sideUsed) return fail('Geri bırakılacak yandan alınmış taş yok.');
  const nm = tileName(P.sideTile);
  returnSide(P);
  logEv(0, 'yandan aldığı taşı geri bıraktı: ' + nm);
  H.sfx('discard'); H.render();
  return { ok: true, msg: nm + ' geri bırakıldı. Bu turda desteden çekmelisin.' };
}
// Geri Topla: bu turda açılan el (ve sonrasındaki işlemler) geri alınır
function hRegather() {
  const e = humanTurnErr('discard'); if (e) return e;
  const P = G.players[0];
  if (P.pend) {
    restoreSnap(P, P.pend.snap); P.pend = null; P.regathered = true;
    logEv(0, 'elini geri topladı'); H.sfx('discard'); H.render();
    return { ok: true, msg: 'Elini geri topladın. Düzeltip yeniden açabilirsin.' + (penOn('yanlisAcma') ? ' Açamadan taş atarsan +101 ceza yersin.' : '') };
  }
  if (P.opened && !P.openedThisTurn && P.turnSnap) {   // önceden açık: bu turda işlenen/indirilen taşlar geri gelir, ceza yok
    restoreSnap(P, P.turnSnap); P.turnSnap = null;
    logEv(0, 'bu turdaki işlemlerini geri topladı'); H.sfx('discard'); H.render();
    return { ok: true, msg: 'Bu turda işlediğin taşlar ıstakana geri geldi. İstediğin gibi yeniden oynayabilirsin.' };
  }
  if (!P.opened || !P.openedThisTurn || !P.openSnap) return fail('Geri toplanacak bu turda yapılmış bir işlem yok.');
  restoreSnap(P, P.openSnap);
  P.openSnap = null; P.regathered = true;
  logEv(0, 'elini geri topladı');
  H.sfx('discard'); H.render();
  return { ok: true, msg: 'Elini geri topladın. Düzeltip yeniden açabilirsin.' + (penOn('yanlisAcma') ? ' Açamazsan +101 ceza yersin.' : '') };
}
function hArrange(kind) {
  if (!G || G.players[0].bot) return;
  const P = G.players[0], tiles = handOf(P);
  let groups;
  if (kind === 'seri') {
    const side = P.sideTile && !P.sideUsed ? P.sideTile : undefined;
    const plan = bestSeries(tiles, side);
    if (side) forceTileIn(plan, side);
    groups = plan.melds.map(m => m.items.map(i => i.t));
    if (plan.leftover.length) groups.push(sortTiles(plan.leftover));
  } else if (kind === 'cift') {
    const sd = P.sideTile && !P.sideUsed ? P.sideTile : null;
    const pw = sd ? pairsWith(tiles, sd) : null;
    const bp = pw ? { pairs: pw, leftover: tiles.filter(t => !pw.some(p => p.includes(t))) } : bestPairs(tiles);
    groups = bp.pairs.slice();
    if (bp.leftover.length) groups.push(sortTiles(bp.leftover));
  } else groups = groupByColor(tiles);
  P.slots = arrangeSlots(groups);
}
// Taşı bir yuvaya araya sokarak bırak: komşular boşluğa doğru kayar (değiş-tokuş yok)
function hInsert(from, s, after) { insertSlots(G.players[0].slots, from, s, after); }
// taşı s yuvasının soluna/sağına yerleştir (dolu ise komşuları en yakın boşluğa kaydırır); saf dizi işlemi
function insertSlots(S, from, s, after) {
  const a = S[from];
  if (!a || from === s) return;
  S[from] = null;
  const row = Math.floor(s / COLS), lo = row * COLS, hi = lo + COLS - 1;
  if (!S[s]) { S[s] = a; return; }
  const left = after ? s : s - 1, right = after ? s + 1 : s;
  if (right <= hi && !S[right]) { S[right] = a; return; }
  if (left >= lo && !S[left]) { S[left] = a; return; }
  let eR = -1, eL = -1;
  for (let k = right; k <= hi; k++) if (!S[k]) { eR = k; break; }
  for (let k = left; k >= lo; k--) if (!S[k]) { eL = k; break; }
  const dR = eR >= 0 ? eR - right : 99, dL = eL >= 0 ? left - eL : 99;
  const sameRow = Math.floor(from / COLS) === row;
  const goLeft = sameRow ? from < s : dL < dR;
  if (eR >= 0 && !goLeft) { for (let k = eR; k > right; k--) S[k] = S[k - 1]; S[right] = a; return; }
  if (eL >= 0) { for (let k = eL; k < left; k++) S[k] = S[k + 1]; S[left] = a; return; }
  S[from] = a; // satır dolu: yer değiştir
  const b = S[s]; S[s] = a; S[from] = b;
}
function hMove(from, to) {
  const P = G.players[0];
  if (from === to || !P.slots[from]) return;
  const a = P.slots[from]; P.slots[from] = P.slots[to]; P.slots[to] = a;
}

/* ---------- Bot ---------- */
function botDelay() {
  const f = G.cfg.speed === 'fast';
  return (f ? 400 : 800) + Math.floor(rand() * (f ? 200 : 400));
}
function countPairsOf(hand) { return bestPairs(hand).pairs.length; }

function botChooseDraw(P) {
  const prev = G.players[(P.i + 3) % 4];
  const side = prev.discards[prev.discards.length - 1];
  if (!side) return 'deck';
  if (!canUseSide(P, side)) return 'deck';
  if (side.wild) return 'side';
  if (P.opened) {
    if (G.table.some(m => extOpts(P, m, side))) return 'side';
  }
  if (!P.opened || P.openKind === 'seri') {
    const base = bestSeries(P.hand).value;
    const withSide = bestSeries(P.hand.concat([side])).value;
    if (withSide > base) return 'side';
  }
  if (!P.opened) {
    const p0 = countPairsOf(P.hand);
    if (p0 >= 3 && countPairsOf(P.hand.concat([side])) > p0) return 'side';
  }
  if (partnerScore(side, P.hand) >= 6) return 'side';
  return 'deck';
}
// Plan, yandan alınan taşın kimliğini içersin (aynı yüzlü başka taşı onunla değiştir)
function forceTileIn(plan, tile) {
  if (plan.melds.some(m => m.items.some(x => x.t === tile))) return;
  for (const m of plan.melds) for (const x of m.items) {
    if (x.t !== tile && x.t.wild === tile.wild && x.t.c === tile.c && x.t.n === tile.n) { x.t = tile; return; }
    if (x.t.wild && tile.wild) { x.t = tile; return; }
  }
}
function botTryOpen(P) {
  const side = P.sideTile && !P.sideUsed ? P.sideTile : null;
  const plan = bestSeries(P.hand, side || undefined);
  const laidB = plan.melds.reduce((a, m) => a + m.items.length, 0);
  const finishOpen = G.cfg.mode === 'katlamali' && plan.value >= 101 && P.hand.length - laidB === 1;
  if (plan.melds.length && (plan.value >= seriesNeed() || finishOpen) && (!side || plan.usesMust)) {
    if (side) forceTileIn(plan, side);
    openSeries(P.i, plan.melds); return 'seri';
  }
  if (side) {
    const pw = pairsWith(P.hand, side);
    if (pw && pw.length >= pairsNeed()) { openPairs(P.i, pw); return 'cift'; }
    return null;
  }
  const pr = bestPairs(P.hand);
  if (pr.pairs.length >= pairsNeed()) { openPairs(P.i, pr.pairs); return 'cift'; }
  return null;
}
// Eli açık bot, yandan aldığı taşı işleyemediyse yeni per / çift indirir
function botLaySide(P) {
  const t = P.sideTile;
  if (!t || P.sideUsed) return;
  if (P.openKind === 'cift') {
    const pw = pairsWith(P.hand, t);
    if (pw) addPairs(P.i, [pw[0]]);
    return;
  }
  const plan = bestSeries(P.hand, t);
  if (!plan.usesMust) return;
  forceTileIn(plan, t);
  const ms = plan.melds.filter(m => m.items.some(x => x.t === t));
  if (ms.length) layMelds(P.i, ms);
}
function botProcessLimited(P) {
  const s = takeSnap(P);
  const n = botProcess(P, true);
  if (P.hand.length === 0) { restoreSnap(P, s); return 0; }
  return n;
}
function botProcess(P, keep) {
  let count = 0;
  if (P.openKind === 'cift') {
    const sd = P.sideTile && !P.sideUsed ? P.sideTile : null;
    const direct = sd && G.table.some(m => m.kind === 'series' && extOpts(P, m, sd));
    if (!direct) {
      const pw = sd ? pairsWith(P.hand, sd) : null;
      const pr = pw ? { pairs: pw } : bestPairs(P.hand);
      if (pr.pairs.length) { addPairs(P.i, pr.pairs); count = pr.pairs.length; }
    }
  }
  // Yandan alınan taş doğrudan işlenemiyorsa, diğer taşlar seçenekleri tüketmeden yeni per indir
  if (P.sideTile && !P.sideUsed) {
    const t = P.sideTile;
    const direct = G.table.some(m => extOpts(P, m, t) || (!t.wild && findSwapIdx(m, t) >= 0));
    if (!direct) { botLaySide(P); count++; }
  }
  let changed = true, guard = 0;
  while (changed && guard++ < 60) {
    if (keep && P.hand.length <= 1) break;
    changed = false;
    // 1) doğal taşları işle
    const hs = P.hand.slice();
    if (P.sideTile && !P.sideUsed) { const k = hs.indexOf(P.sideTile); if (k > 0) { hs.splice(k, 1); hs.unshift(P.sideTile); } }
    for (const t of hs) {
      if (t.wild && t !== P.sideTile) continue;
      for (const m of G.table) {
        const o = extOpts(P, m, t);
        if (o) { processTile(P.i, t, m, o[0]); count++; changed = true; break; }
      }
      if (changed) break;
    }
    if (changed) continue;
    // 2) okey çal
    {
    const hs2 = P.hand.slice();
    if (P.sideTile && !P.sideUsed) { const k = hs2.indexOf(P.sideTile); if (k > 0) { hs2.splice(k, 1); hs2.unshift(P.sideTile); } }
    for (const t of hs2) {
      if (t.wild) continue;
      for (const m of G.table) {
        const idx = findSwapIdx(m, t);
        if (idx >= 0) {
          const joker = swapOkey(P.i, m, idx, t);
          removeFromHand(P, t); noteUse(P, t); P.hand.push(joker);
          logEv(P.i, 'okey çaldı (' + tileName(t) + ' koydu)');
          count++; changed = true; break;
        }
      }
      if (changed) break;
    }
    }
    if (changed) continue;
    // 3) elindeki okeyi işle
    for (const t of P.hand.slice()) {
      if (!t.wild) continue;
      for (const m of G.table) {
        const o = extOpts(P, m, t);
        if (o) { processTile(P.i, t, m, o[0]); count++; changed = true; break; }
      }
      if (changed) break;
    }
  }
  if (count) logEv(P.i, count + ' taş işledi');
  return count;
}
function botPickDiscard(P) {
  const hand = P.hand;
  if (hand.length === 1) return hand[0];
  const slip = rand() < 0.08;                       // dikkatsizlik: yanlışa atma ihtimali
  const plan = P.openKind === 'cift' ? { leftover: hand.slice() } : bestSeries(hand);
  const score = t => partnerScore(t, hand) + (t.wild ? 1000 : 0);
  const sorter = (a, b) => (score(a) - score(b)) || (b.n - a.n);
  let cands = plan.leftover.slice();
  if (!cands.length) cands = hand.slice();
  cands.sort(sorter);
  if (!slip) {
    const safe = cands.filter(t => !isWrongDiscard(t, G.table));
    if (safe.length) return safe[0];
    const any = hand.slice().sort(sorter).filter(t => !isWrongDiscard(t, G.table));
    if (any.length) return any[0];
  }
  return cands[0];
}
async function botTurn(i) {
  const ep = G.epoch, P = G.players[i];
  const alive = () => ep === G.epoch && G.phase !== 'over';
  await H.wait(botDelay()); if (!alive()) return;
  if (canAnnounce(P)) announceGost(i);
  if (G.phase === 'draw') {
    if (!G.deck.length) { endHandDraw(); return; }
    const ch = botChooseDraw(P);
    if (ch === 'side') { const t = takeSide(i); logEv(i, 'yandan aldı: ' + tileName(t)); }
    else { drawFromDeck(i); logEv(i, 'yerden taş çekti'); }
    H.sfx('draw'); H.render();
    await H.wait(botDelay()); if (!alive()) return;
  }
  if (!P.opened) {
    const snapB = takeSnap(P);
    let k = botTryOpen(P);
    if (k && P.hand.length === 0) { restoreSnap(P, snapB); k = null; }
    if (k) {
      H.sfx('open');
      H.banner(P.name + ' EL AÇTI', k === 'seri' ? P.openVal + ' puan' : P.openVal + ' çift', 'info');
      H.render();
      await H.wait(botDelay()); if (!alive()) return;
    }
  }
  if (P.opened) {
    const snapP = takeSnap(P);
    let n = botProcess(P);
    if (n && P.hand.length === 0) { restoreSnap(P, snapP); n = botProcessLimited(P); }
    if (n) {
      H.sfx('open'); H.render();
      await H.wait(botDelay()); if (!alive()) return;
    }
  }
  if (P.opened && P.sideTile && !P.sideUsed) {
    const snapL = takeSnap(P);
    botLaySide(P);
    if (P.hand.length === 0) restoreSnap(P, snapL);
    if (P.sideUsed) { H.sfx('open'); H.render(); await H.wait(botDelay()); if (!alive()) return; }
  }
  if (P.sideTile && !P.sideUsed) {
    // son taş kuralı yüzünden kullanamadı: taşı geri bırakıp desteden çeker (ceza yok)
    returnSide(P);
    if (G.deck.length) { drawFromDeck(i); logEv(i, 'yerden taş çekti'); }
    else { endHandDraw(); return; }
  }
  const t = botPickDiscard(P);
  const r = doDiscard(i, t);
  if (r === 'finish') return;
  H.sfx('discard'); H.render();
  advanceTurn();
}
async function continueFlow() {
  const ep = G.epoch;
  while (ep === G.epoch && G.phase !== 'over' && G.players[G.turn].bot) {
    await botTurn(G.turn);
  }
  if (ep === G.epoch) H.render();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { H, newGame, nextHand, getG: () => G, startHand, hDraw, hOpen, hProcess, hSwap, hProcessPairs, hProcessAll, hLay, canPairLay, hRegather, hReturnSide, hDiscard, hArrange, hMove, hInsert,
    doDiscard, finishHand, endHandDraw, openSeries, openPairs, addPairs, layMelds, takeSide, drawFromDeck, announceGost, canAnnounce, isGostTwin, openCharge, botTurn, continueFlow, seriesNeed, pairsNeed, handOf, advanceTurn };
}
