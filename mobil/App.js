// Kahve Usulü 101 Okey — App Store / Play Store sürümü (Expo)
// Masa düzeni web sürümüyle birebir: tüm ölçüler u = ekran yüksekliği / 100
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions, Modal, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Rack, { rackGeom, slotAt } from './src/Rack';
import TileFace, { TileBack, EmptyTile, NUM_FONT } from './src/Tile';
const E = require('./src/engine');
const GM = require('./src/game');

const G = () => GM.getG();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const C = {
  amber: '#ffbb33', amber2: '#e98a0c', amberInk: '#2d1800', ink: '#f7f0e3', muted: '#bdb0dc',
  line: 'rgba(255,255,255,0.14)', panel: 'rgba(18,8,38,0.78)', good: '#4fe0a3', bad: '#ff6b5e',
};
const AV = ['#f29a32', '#c4366f', '#2389bd', '#e07d1d'];
const fmt = n => (n < 0 ? '−' + Math.abs(n) : String(n));

// ---------- küçük parçalar ----------
function Btn({ u, label, onPress, pri, sm, disabled, style }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [
      styles.btn, { minHeight: (sm ? 5.4 : 5.6) * u, paddingHorizontal: (sm ? 1.3 : 1.5) * u, borderRadius: 1.4 * u },
      pri && [styles.btnPri, { borderBottomWidth: 0.4 * u }], disabled && { opacity: 0.36 }, pressed && { transform: [{ translateY: 1 }], opacity: 0.85 }, style]}>
      <Text allowFontScaling={false} style={[styles.btnTxt, { fontSize: (sm ? 2.5 : 2.4) * u }, pri && { color: C.amberInk }]}>{label}</Text>
    </Pressable>
  );
}
function Chip({ u, kind, children }) {
  const bg = kind === 'ok' ? 'rgba(79,224,163,0.2)' : kind === 'gold' ? 'rgba(255,187,51,0.2)' : kind === 'bad' ? 'rgba(255,107,94,0.22)' : 'rgba(255,255,255,0.12)';
  const col = kind === 'ok' ? '#92f0c6' : kind === 'gold' ? C.amber : kind === 'bad' ? '#ffaaa2' : C.ink;
  return <Text allowFontScaling={false} style={{ fontSize: 2.1 * u, fontWeight: '700', color: col, backgroundColor: bg, borderRadius: 99, overflow: 'hidden', paddingHorizontal: 1.1 * u, paddingVertical: 0.3 * u }}>{children}</Text>;
}
function Avatar({ u, i, name, size }) {
  const s = size * u;
  return (
    <View style={{ width: s, height: s, borderRadius: s, backgroundColor: AV[i], borderWidth: 0.45 * u, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling={false} style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: s * 0.62 }}>{(name || '?')[0].toUpperCase()}</Text>
    </View>
  );
}
function stateChips(u, P) {
  const pp = P.penLog.reduce((a, e) => a + (e.amt > 0 ? e.amt : 0), 0), bn = P.penalty - pp;
  return (
    <>
      {!P.opened ? <Chip u={u}>Kapalı</Chip> : P.openKind === 'seri' ? <Chip u={u} kind="ok">Açtı · {P.openVal}</Chip> : <Chip u={u} kind="gold">Çift · {P.openVal}</Chip>}
      {pp ? <Chip u={u} kind="bad">Ceza +{pp}</Chip> : null}
      {bn ? <Chip u={u} kind="gold">Rekor {bn}</Chip> : null}
    </>
  );
}
// yan oyuncu kutusu (.plate)
function SidePlate({ u, i, g }) {
  const P = g.players[i], active = g.turn === i && g.phase !== 'over';
  return (
    <View style={[styles.plate, { borderRadius: 2 * u, padding: 1.1 * u, gap: 0.8 * u }, active && styles.plateOn]}>
      <Avatar u={u} i={i} name={P.name} size={6.4} />
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.nm, { fontSize: 3 * u }]}>{P.name}{g.cfg.team ? ' · Rakip' : ''}</Text>
      <View style={[styles.chips, { gap: 0.5 * u }]}>{stateChips(u, P)}</View>
      <View style={[styles.shelf, { marginHorizontal: -1.1 * u }]} />
    </View>
  );
}
// karşı oyuncu (üst şeritte, .plate.top)
function TopPlate({ u, g }) {
  const P = g.players[2], active = g.turn === 2 && g.phase !== 'over';
  return (
    <View style={[styles.plate, styles.plateTop, { height: 8 * u, borderRadius: 2 * u, paddingHorizontal: 1.4 * u, gap: 1.2 * u }, active && styles.plateOn]}>
      <Avatar u={u} i={2} name={P.name} size={6.4} />
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.nm, { fontSize: 3 * u }]}>{P.name}{g.cfg.team ? ' · Eşin' : ''}</Text>
      <View style={{ flexDirection: 'row', gap: 0.5 * u }}>{stateChips(u, P)}</View>
    </View>
  );
}
// Deste / yan taş: dokununca çeker, sürükleyince taş parmağı izler ve ıstakada bırakılan yere girer
function DrawSource({ drag, children }) {
  const d = useRef(drag); d.current = drag;
  const gesture = useMemo(() => {
    const pan = Gesture.Pan().runOnJS(true).minDistance(6).maxPointers(1).shouldCancelWhenOutside(false)
      .onStart(e => d.current && d.current.start(e.absoluteX, e.absoluteY))
      .onUpdate(e => d.current && d.current.move(e.absoluteX, e.absoluteY))
      .onEnd(e => d.current && d.current.end(e.absoluteX, e.absoluteY))
      .onFinalize(() => d.current && d.current.cancel());
    const tap = Gesture.Tap().runOnJS(true).onEnd((e, ok) => ok && d.current && d.current.tap());
    return Gesture.Race(pan, tap);
  }, []);
  if (!drag) return children;
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
// köşe kutusu: atılan taş (9u × 11u)
function Corner({ u, tile, hot, cref, style, drag }) {
  const w = 9 * u, h = 11 * u;
  return (
    <DrawSource drag={drag}>
      <View ref={cref} collapsable={false} style={[{ alignItems: 'center', borderRadius: 1.4 * u, padding: 0.3 * u }, hot && { backgroundColor: 'rgba(255,187,51,0.22)' }, style]}>
        {tile ? <TileFace tile={tile} w={w} h={h} fs={6.4 * u} glow={false} /> : <EmptyTile w={w} h={h} r={0.9 * u} />}
      </View>
    </DrawSource>
  );
}
// masadaki yeşil çuha (.mat) ve ızgarası
function Mat({ u, title, limit, children, style }) {
  const [sz, setSz] = useState(null);
  const lines = [];
  if (sz) {
    const st = 5 * u;
    for (let x = st; x < sz.w; x += st) lines.push(<View key={'v' + x} style={[styles.gridV, { left: x }]} />);
    for (let y = st; y < sz.h; y += st) lines.push(<View key={'h' + y} style={[styles.gridH, { top: y }]} />);
  }
  return (
    <View onLayout={e => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[styles.mat, { borderRadius: 2.2 * u, borderWidth: 0.5 * u }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>{lines}</View>
      <Text allowFontScaling={false} style={[styles.matTitle, { top: 0.6 * u, right: 1.2 * u, fontSize: 1.7 * u }]}>{title}</Text>
      {limit ? <View style={[styles.lim, { top: 0.5 * u, left: 1 * u, borderRadius: u, paddingHorizontal: 0.8 * u, paddingVertical: 0.15 * u }]}>
        <Text allowFontScaling={false} style={{ fontSize: 1.9 * u, color: '#cfeee8', fontWeight: '700' }}>Limit <Text style={{ color: C.amber, fontFamily: NUM_FONT, fontSize: 2.2 * u }}>{limit}</Text></Text>
      </View> : null}
      {children}
    </View>
  );
}
function MeldView({ u, m, ms, setRef }) {
  const ref = useRef(null);
  useEffect(() => { setRef(m.id, ref); return () => setRef(m.id, null); }, [m.id]);
  const w = 4.7 * u * ms, h = 6.5 * u * ms;
  return (
    <View ref={ref} collapsable={false} style={[styles.meld, { padding: 0.35 * u * ms, gap: 0.15 * u * ms, borderRadius: 0.9 * u }]}>
      {m.items.map((it, k) => <TileFace key={k} tile={it.t} w={w} h={h} fs={3.7 * u * ms} />)}
    </View>
  );
}
function CenterBox({ u, label, children, drag }) {
  return (
    <DrawSource drag={drag}>
      <View style={[styles.box, { borderRadius: 1.5 * u, paddingVertical: 0.8 * u }]}>
        {children}
        <Text allowFontScaling={false} style={[styles.boxLbl, { fontSize: 1.6 * u, marginTop: 0.7 * u }]}>{label}</Text>
      </View>
    </DrawSource>
  );
}

// ---------- oyun ekranı ----------
function Game() {
  const ins = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [, setTick] = useState(0);
  const [rackVer, setRackVer] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [handEnd, setHandEnd] = useState(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const rackRef = useRef(null), atRef = useRef(null), yanRef = useRef(null);
  const [ghost, setGhost] = useState(null);                 // sürüklenen deste/yan taşı
  const ghostPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const meldRefs = useRef({});
  const stT = useRef(null);

  const rerender = useCallback(() => setTick(t => t + 1), []);
  const bumpRack = useCallback(() => { setRackVer(v => v + 1); setTick(t => t + 1); }, []);
  const toast = useCallback((msg, kind) => {
    if (!msg) return;
    const id = Math.random();
    setToasts(a => [...a.slice(-2), { id, msg, kind: kind || 'info' }]);
    setTimeout(() => setToasts(a => a.filter(x => x.id !== id)), 3200);
  }, []);
  const feedback = useCallback((r) => {
    if (!r) return;
    if (!r.ok) {
      clearTimeout(stT.current); setStatusMsg(r.msg);
      stT.current = setTimeout(() => setStatusMsg(null), 4500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else if (r.msg) toast(r.msg, 'good');
    bumpRack();
  }, [toast, bumpRack]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    Object.assign(GM.H, {
      render: rerender,
      toast: (m, k) => toast(m, k),
      banner: (title, sub, kind) => toast(title + (sub ? ' · ' + sub : ''), kind === 'gold' ? 'good' : kind),
      sfx: (k) => { if (k === 'penalty') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
      wait: (ms) => sleep(ms),
      handEnd: (rec, last) => { setTimeout(() => setHandEnd({ rec, last }), 900); },
      turn: () => { if (G() && G().turn === 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
    });
    if (!G()) GM.newGame({ hands: 4, mode: 'katlamali' });
    bumpRack();
  }, []);

  const W = Math.max(win.width, win.height), Hh = Math.min(win.width, win.height);
  const u = Hh / 100;
  const pad = { t: u + ins.top, r: 1.6 * u + ins.right, b: 1.4 * u + ins.bottom * 0.3, l: 1.6 * u + ins.left };
  const rackW = W - pad.l - pad.r - 35 * u;
  const geom = useMemo(() => rackGeom(rackW, u), [rackW, u]);
  const setMeldRef = useCallback((id, ref) => { if (ref) meldRefs.current[id] = ref; else delete meldRefs.current[id]; }, []);

  const onDrop = useCallback((from, to, after) => { GM.hInsert(from, to, after); bumpRack(); }, [bumpRack]);
  const inRect = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const measure = (ref) => new Promise(res => {
    if (!ref || !ref.current) return res(null);
    ref.current.measureInWindow((x, y, w, h) => res({ x, y, w, h }));
  });
  // ıstakadan bırakılan taş: Attığın köşesi → at, Yan köşesi → geri bırak, per → işle
  const onDropOut = useCallback(async (tile, lx, ly) => {
    const g = G(), P = g.players[0];
    const rr = await measure(rackRef);
    if (!rr) return;
    const x = rr.x + lx, y = rr.y + ly;
    const grow = r => r && { x: r.x - 2 * u, y: r.y - 2 * u, w: r.w + 4 * u, h: r.h + 4 * u };
    const [at, yan] = await Promise.all([measure(atRef), measure(yanRef)]);
    if (inRect(grow(at), x, y)) { feedback(GM.hDiscard(tile.id)); return; }
    if (inRect(grow(yan), x, y)) { if (P.sideTile && P.sideTile.id === tile.id) feedback(GM.hReturnSide()); return; }
    const ids = Object.keys(meldRefs.current);
    const rects = await Promise.all(ids.map(id => measure(meldRefs.current[id])));
    for (let k = 0; k < ids.length; k++) {
      if (inRect(grow(rects[k]), x, y)) {
        const m = g.table.find(mm => String(mm.id) === ids[k]);
        if (!m) return;
        if (P.opened && P.openKind === 'cift' && m.kind === 'pair') feedback(GM.hProcessPairs([tile.id]));
        else feedback(GM.hProcess([tile.id], m.id));
        return;
      }
    }
  }, [u, feedback]);

  // deste / yan taşını ıstakaya sürükleyerek çekme
  const ghostRef = useRef(null);
  const drawDrag = useCallback((src) => ({
    tap: () => { const g = G(); if (g && g.turn === 0 && g.phase === 'draw') feedback(GM.hDraw(src)); },
    start: (x, y) => {
      const g = G(); if (!g || g.turn !== 0 || g.phase !== 'draw') return;
      if (src === 'side' && (g.players[0].sideReturned || !g.players[3].discards.length)) return;
      const t = src === 'side' ? g.players[3].discards[g.players[3].discards.length - 1] : null;
      ghostPos.setValue({ x: x - geom.cellW / 2, y: y - geom.tileH * 0.8 });
      ghostRef.current = { src, tile: t };
      setGhost(ghostRef.current);
      Haptics.selectionAsync().catch(() => {});
    },
    move: (x, y) => { if (ghostRef.current) ghostPos.setValue({ x: x - geom.cellW / 2, y: y - geom.tileH * 0.8 }); },
    end: async (x, y) => {
      const gh = ghostRef.current;
      ghostRef.current = null;
      if (!gh) return;
      const rr = await measure(rackRef);
      setGhost(null);
      if (!rr) return;
      const bw = 0.35 * u;
      const hit = slotAt(geom, x - rr.x - bw, y - geom.tileH * 0.3 - rr.y - bw);
      if (!hit) return;            // ıstakaya bırakılmadı: taş yerinde kalır
      const r = GM.hDraw(gh.src);
      if (r && r.ok && r.tile) {
        const S = G().players[0].slots, from = S.indexOf(r.tile);
        if (from >= 0 && from !== hit.to) GM.hInsert(from, hit.to, hit.after);
      }
      feedback(r);
    },
    cancel: () => { if (ghostRef.current) { ghostRef.current = null; setGhost(null); } },
  }), [geom, u, feedback]);
  const deckDrag = useMemo(() => drawDrag('deck'), [drawDrag]);
  const sideDrag = useMemo(() => drawDrag('side'), [drawDrag]);

  const g = G();
  if (!g) return <View style={styles.root} />;
  const P = g.players[0];
  const disc = g.turn === 0 && g.phase === 'discard';
  const canDraw = g.turn === 0 && g.phase === 'draw';
  const canSide = canDraw && !P.sideReturned;
  const lastOf = i => { const d = g.players[i].discards; return d[d.length - 1]; };
  const an = E.rackAnalysis(P.slots);
  const marks = { meld: an.meldIds, pair: an.pairIds };
  const pd = P.pend;
  const kat = g.cfg.mode === 'katlamali';
  const gbId = GM.canAnnounce(P) ? (GM.handOf(P).find(GM.isGostTwin) || {}).id : null;

  const seriOn = disc && (!P.opened || P.openKind === 'seri');
  const ciftOn = disc && (!P.opened || P.openKind === 'cift' || GM.canPairLay(P));
  const seriLbl = P.opened ? 'Seri Aç' : pd && pd.kind === 'seri' ? 'Seri Aç (' + (pd.val + an.points) + '/' + GM.seriesNeed() + ')' : 'Seri Aç (Puan: ' + an.points + ')';
  const ciftLbl = P.opened ? 'Çift Aç' : pd && pd.kind === 'cift' ? 'Çift Aç (' + (pd.val + an.pairs.length) + '/' + GM.pairsNeed() + ')' : 'Çift Aç (' + an.pairs.length + ' Çift)';
  const showRegather = (P.opened && P.openedThisTurn && P.openSnap) || P.pend || (P.opened && !P.openedThisTurn && P.turnSnap);
  const penMine = P.penLog.reduce((a, e) => a + (e.amt > 0 ? e.amt : 0), 0);
  const modeLbl = (kat ? 'Katlamalı' : 'Klasik') + (g.cfg.team ? ' · Eşli' : '') + ' · El ' + Math.min(g.hands.length + (g.phase === 'over' ? 0 : 1), g.cfg.hands) + '/' + g.cfg.hands;


  const nextHand = () => {
    const last = handEnd && handEnd.last;
    setHandEnd(null);
    if (last) GM.newGame({ hands: 4, mode: 'katlamali' }); else GM.nextHand();
    bumpRack();
  };
  const ms = 0.74;
  const series = g.table.filter(m => m.kind === 'series'), pairs = g.table.filter(m => m.kind === 'pair');

  return (
    <View style={[styles.root, { paddingTop: pad.t, paddingRight: pad.r, paddingBottom: pad.b, paddingLeft: pad.l }]}>
      <StatusBar hidden />
      <View pointerEvents="none" style={styles.glowBg} />

      {/* ---- üst şerit ---- */}
      <View style={[styles.top, { height: 8.2 * u, gap: 1.5 * u }]}>
        <View style={styles.brand}>
          <Text allowFontScaling={false} style={[styles.brandEm, { fontSize: 2.2 * u, letterSpacing: 0.3 * u, marginRight: 0.8 * u }]}>KAHVE USULÜ</Text>
          <Text allowFontScaling={false} style={[styles.brandB, { fontSize: 6.4 * u }]}>101</Text>
          <Text allowFontScaling={false} style={[styles.brandS, { fontSize: 3.6 * u, letterSpacing: 0.7 * u, marginLeft: 0.8 * u }]}>OKEY</Text>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.brandSmall, { fontSize: 2.3 * u, marginLeft: 1.2 * u }]}>{modeLbl}</Text>
        </View>
        <TopPlate u={u} g={g} />
        <View style={[styles.topActions, { gap: 0.8 * u }]}>
          <Btn u={u} sm label="Yazboz" onPress={() => setScoreOpen(true)} />
          <Btn u={u} sm label="Kurallar" onPress={() => toast('Kurallar yakında bu sürüme gelecek', 'info')} />
          <Btn u={u} sm label="Ayarlar" onPress={() => toast('Ayarlar yakında bu sürüme gelecek', 'info')} />
          <Btn u={u} sm label={sound ? 'Ses: Açık' : 'Ses: Kapalı'} onPress={() => setSound(s => !s)} />
        </View>
      </View>

      {/* ---- masa ---- */}
      <View style={[styles.board, { gap: u, marginTop: 0.8 * u }]}>
        <View style={[styles.col, { width: 17.5 * u, gap: 0.8 * u, paddingBottom: 6.5 * u }]}>
          <Corner u={u} tile={lastOf(2)} />
          <SidePlate u={u} i={3} g={g} />
        </View>
        <Mat u={u} title="SERİ PERLER" limit={kat ? String(GM.seriesNeed()) : null} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={[styles.melds, { padding: 1.2 * u, paddingTop: 3.4 * u, rowGap: u * ms, columnGap: 1.2 * u * ms }]}>
            {series.length ? series.map(m => <MeldView key={m.id} u={u} m={m} ms={ms} setRef={setMeldRef} />)
              : <Text allowFontScaling={false} style={[styles.emptyNote, { fontSize: 2.6 * u }]}>Masada henüz açılmış seri per yok.</Text>}
          </ScrollView>
        </Mat>
        <View style={[styles.mid, { width: 12 * u, gap: 1.2 * u }]}>
          <View pointerEvents="none" style={{ flex: 1, justifyContent: 'flex-end', overflow: 'hidden', gap: 0.5 * u }}>
          {toasts.slice(-2).map(t => (
            <View key={t.id} style={[styles.toast, { borderRadius: u, padding: 0.5 * u }, t.kind === 'bad' && { backgroundColor: '#7a1d22' }, t.kind === 'good' && { backgroundColor: '#145c3c' }]}>
              <Text allowFontScaling={false} numberOfLines={4} style={{ color: '#fff', fontSize: 1.8 * u, fontWeight: '700', textAlign: 'center' }}>{t.msg}</Text>
            </View>
          ))}
          </View>
          <CenterBox u={u} label="DESTE" drag={deckDrag}>
            <TileBack w={9 * u} h={11 * u} fs={6.4 * u} count={g.deck.length} hot={canDraw} />
          </CenterBox>
          <CenterBox u={u} label="GÖSTERGE">
            <TileFace tile={g.gosterge} w={9 * u} h={11 * u} fs={6.4 * u} />
          </CenterBox>
        </View>
        <Mat u={u} title="ÇİFTLER" limit={kat ? GM.pairsNeed() + ' çift' : null} style={{ width: 34 * u }}>
          <ScrollView contentContainerStyle={[styles.melds, { padding: 0.9 * u, paddingTop: 3.4 * u, gap: 0.8 * u * ms }]}>
            {pairs.map(m => <MeldView key={m.id} u={u} m={m} ms={ms} setRef={setMeldRef} />)}
          </ScrollView>
        </Mat>
        <View style={[styles.col, { width: 17.5 * u, gap: 0.8 * u, paddingBottom: 6.5 * u }]}>
          <Corner u={u} tile={lastOf(1)} />
          <SidePlate u={u} i={1} g={g} />
        </View>
      </View>

      {/* ---- benim bölümüm ---- */}
      <View style={[styles.me, { marginTop: 0.8 * u }]}>
        <View style={{ width: 17.5 * u, alignItems: 'center', marginTop: -7.5 * u }}>
          <Corner u={u} cref={yanRef} tile={lastOf(3)} hot={canSide && !!lastOf(3)} drag={sideDrag} />
        </View>
        <View style={{ width: rackW, gap: 0.5 * u, zIndex: 10 }}>
          <View style={[styles.srow, { gap: 1.2 * u }]}>
            <View style={[styles.meplate, { height: 6 * u, borderRadius: 3 * u, paddingLeft: 0.6 * u, paddingRight: 1.4 * u, gap: 0.9 * u, maxWidth: 34 * u }, g.turn === 0 && g.phase !== 'over' && styles.plateOn]}>
              <Avatar u={u} i={0} name={P.name} size={4.8} />
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.nm, { fontSize: 2.4 * u }]}>{P.name === 'Sen' ? 'Oyuncu' : P.name}</Text>
              {stateChips(u, P)}
            </View>
            {gbId ? <Btn u={u} label="Gösterge Bende" pri onPress={() => feedback(GM.announceGost(0))} /> : null}
            <View style={{ flex: 1, alignItems: statusMsg ? 'flex-start' : 'flex-end' }}>
              {statusMsg ? <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#ffc0b9', fontWeight: '700', fontSize: 2.3 * u }}>{statusMsg}</Text>
                : <Text allowFontScaling={false} style={{ color: C.amber, fontFamily: NUM_FONT, fontWeight: '700', fontSize: 2.6 * u, letterSpacing: 0.1 * u }}>Toplam {fmt(g.totals[0])}{penMine ? ' · Bu el ceza +' + penMine : ''}</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 0.7 * u }}>
              <Btn u={u} pri label={seriLbl} disabled={!(seriOn && !(pd && pd.kind !== 'seri'))} onPress={() => feedback(!P.opened ? GM.hOpen('seri', true) : GM.hLay())} />
              <Btn u={u} pri label={ciftLbl} disabled={!(ciftOn && !(pd && pd.kind !== 'cift'))} onPress={() => feedback(!P.opened ? GM.hOpen('cift', true) : GM.hProcessPairs([]))} />
              {P.opened ? <Btn u={u} label="Tümünü İşle" disabled={!disc} onPress={() => feedback(GM.hProcessAll())} /> : null}
              {showRegather ? <Btn u={u} label="Geri Topla" disabled={!disc} onPress={() => feedback(GM.hRegather())} /> : null}
            </View>
          </View>
          <View ref={rackRef} collapsable={false}>
            <Rack slots={P.slots} geom={geom} ver={rackVer} marks={marks} freshId={g.freshId} gbId={gbId}
              myTurn={g.turn === 0 && g.phase !== 'over'} onDrop={onDrop} onDropOut={onDropOut} />
          </View>
        </View>
        <View style={{ width: 17.5 * u, alignItems: 'center', marginTop: -7.5 * u }}>
          <Corner u={u} cref={atRef} tile={lastOf(0)} hot={disc} />
        </View>
      </View>

      {ghost ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, zIndex: 999, transform: [...ghostPos.getTranslateTransform(), { scale: 1.1 }], shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
          {ghost.tile ? <TileFace tile={ghost.tile} w={geom.cellW} h={geom.tileH} fs={geom.fs} />
            : <TileBack w={geom.cellW} h={geom.tileH} fs={geom.fs} count="" />}
        </Animated.View>
      ) : null}

      {/* el sonu */}
      <Modal visible={!!handEnd} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          {handEnd ? (
            <View style={[styles.modal, { borderRadius: 2.4 * u, padding: 3 * u }]}>
              <Text allowFontScaling={false} style={[styles.modalT, { fontSize: 4.2 * u }]}>{handEnd.rec.title}</Text>
              {handEnd.rec.tags.length ? <Text allowFontScaling={false} style={{ color: C.muted, textAlign: 'center', fontSize: 2.3 * u, marginBottom: u }}>{handEnd.rec.tags.join(' · ')}</Text> : null}
              {g.players.map((p, i) => {
                const r = handEnd.rec.per[i];
                return (
                  <View key={i} style={[styles.resRow, { paddingVertical: 0.9 * u }]}>
                    <Text allowFontScaling={false} style={[styles.resName, { fontSize: 2.6 * u, width: 18 * u }, i === handEnd.rec.winner && { color: C.amber }]}>{p.name === 'Sen' ? 'Oyuncu' : p.name}</Text>
                    <Text allowFontScaling={false} numberOfLines={1} style={{ flex: 1, color: C.muted, fontSize: 2 * u }}>{r.notes.join(', ')}</Text>
                    <Text allowFontScaling={false} style={{ color: '#fff', width: 12 * u, textAlign: 'right', fontWeight: '700', fontSize: 2.6 * u }}>{r.total > 0 ? '+' + r.total : fmt(r.total)}</Text>
                    <Text allowFontScaling={false} style={{ color: C.amber, width: 12 * u, textAlign: 'right', fontWeight: '800', fontSize: 2.6 * u }}>{fmt(g.totals[i])}</Text>
                  </View>
                );
              })}
              <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u, marginTop: u, textAlign: 'center' }}>El {g.hands.length} / {g.cfg.hands} · Az puan kazanır</Text>
              <View style={{ marginTop: 2 * u, alignItems: 'center' }}>
                <Btn u={u} pri label={handEnd.last ? 'Yeni Oyun' : 'Sonraki El'} onPress={nextHand} />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* yazboz */}
      <Modal visible={scoreOpen} transparent animationType="fade" supportedOrientations={['landscape']}>
        <Pressable style={styles.modalBg} onPress={() => setScoreOpen(false)}>
          <View style={[styles.modal, { borderRadius: 2.4 * u, padding: 3 * u }]}>
            <Text allowFontScaling={false} style={[styles.modalT, { fontSize: 4.2 * u }]}>Yazboz</Text>
            <View style={[styles.resRow, { paddingVertical: 0.6 * u }]}>
              <Text allowFontScaling={false} style={{ width: 10 * u, color: C.muted, fontSize: 2 * u }}>El</Text>
              {g.players.map((p, i) => <Text key={i} allowFontScaling={false} style={{ flex: 1, textAlign: 'right', color: '#fff', fontWeight: '800', fontSize: 2.4 * u }}>{p.name === 'Sen' ? 'Oyuncu' : p.name}</Text>)}
            </View>
            {g.hands.map((h, k) => (
              <View key={k} style={[styles.resRow, { paddingVertical: 0.6 * u }]}>
                <Text allowFontScaling={false} style={{ width: 10 * u, color: C.muted, fontSize: 2 * u }}>{k + 1}. el</Text>
                {h.per.map((r, i) => <Text key={i} allowFontScaling={false} style={{ flex: 1, textAlign: 'right', color: i === h.winner ? C.amber : '#fff', fontSize: 2.4 * u }}>{fmt(r.total)}</Text>)}
              </View>
            ))}
            <View style={[styles.resRow, { paddingVertical: 0.6 * u, borderBottomWidth: 0 }]}>
              <Text allowFontScaling={false} style={{ width: 10 * u, color: C.amber, fontWeight: '800', fontSize: 2.2 * u }}>Toplam</Text>
              {g.totals.map((t, i) => <Text key={i} allowFontScaling={false} style={{ flex: 1, textAlign: 'right', color: C.amber, fontWeight: '800', fontSize: 2.6 * u }}>{fmt(t)}</Text>)}
            </View>
            <View style={{ marginTop: 2 * u, alignItems: 'center' }}>
              <Btn u={u} label="Kapat" onPress={() => setScoreOpen(false)} />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Game />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#24104a' },
  glowBg: { position: 'absolute', left: '15%', right: '15%', top: '5%', height: '70%', borderRadius: 9999, backgroundColor: 'rgba(160,90,255,0.10)' },
  top: { flexDirection: 'row', alignItems: 'center' },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'baseline', minWidth: 0 },
  brandEm: { color: '#e9d3ff', fontWeight: '700', alignSelf: 'center' },
  brandB: { color: C.amber, fontFamily: NUM_FONT, fontWeight: '800', lineHeight: undefined },
  brandS: { color: C.ink, fontFamily: NUM_FONT, fontWeight: '700' },
  brandSmall: { color: C.muted, flexShrink: 1 },
  topActions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  btnPri: { backgroundColor: '#f7a624', borderColor: 'transparent', borderBottomColor: '#a85d00' },
  btnTxt: { color: C.ink, fontWeight: '700' },
  board: { flex: 1, flexDirection: 'row', minHeight: 0 },
  col: { justifyContent: 'space-between' },
  plate: { flex: 1, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, alignItems: 'center', overflow: 'hidden' },
  plateTop: { flex: 0, flexDirection: 'row' },
  plateOn: { borderColor: C.amber, shadowColor: C.amber, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  nm: { color: C.ink, fontWeight: '800', maxWidth: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  shelf: { flex: 1, alignSelf: 'stretch', borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.12)' },
  mat: { backgroundColor: '#0f3036', borderColor: '#07181b', overflow: 'hidden' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(120,235,215,0.075)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(120,235,215,0.075)' },
  matTitle: { position: 'absolute', fontWeight: '800', letterSpacing: 2, color: 'rgba(190,240,232,0.28)' },
  lim: { position: 'absolute', zIndex: 2, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,187,51,0.5)' },
  melds: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
  meld: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)' },
  emptyNote: { width: '100%', textAlign: 'center', color: 'rgba(190,240,232,0.5)' },
  mid: { justifyContent: 'flex-end' },
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  boxLbl: { fontWeight: '700', color: C.muted, letterSpacing: 0.4 },
  toast: { backgroundColor: '#2c1252', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 5 },
  me: { flexDirection: 'row', alignItems: 'flex-start' },
  srow: { flexDirection: 'row', alignItems: 'flex-end' },
  meplate: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  bannerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  banner: { backgroundColor: '#1b5e8e', alignItems: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modal: { width: '70%', backgroundColor: '#24104a', borderWidth: 1, borderColor: '#6b3fa8' },
  modalT: { color: C.amber, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  resRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  resName: { color: '#fff', fontWeight: '800' },
});
