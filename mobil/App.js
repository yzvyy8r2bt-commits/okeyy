// Kahve Usulü 101 Okey — App Store / Play Store sürümü (Expo)
// 1. aşama: masa, deste, yan taş, taş atma, el açma, işleme ve botlarla tam el
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Rack, { rackGeom } from './src/Rack';
import TileFace from './src/Tile';
const E = require('./src/engine');
const GM = require('./src/game');

const G = () => GM.getG();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function Btn({ label, onPress, tone, disabled }) {
  return (
    <Pressable disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.btn, tone === 'go' && styles.btnGo, tone === 'warn' && styles.btnWarn, (pressed || disabled) && { opacity: disabled ? 0.35 : 0.6 }]}>
      <Text style={styles.btnTxt}>{label}</Text>
    </Pressable>
  );
}

// Rakip kartı: ad, taş sayısı, açtı mı, puan
function Seat({ i, turn, small }) {
  const g = G(), P = g.players[i];
  const n = GM.handOf(P).length;
  const last = P.discards[P.discards.length - 1];
  return (
    <View style={[styles.seat, turn === i && styles.seatOn]}>
      <Text style={styles.seatName} numberOfLines={1}>{P.name}</Text>
      <Text style={styles.seatSub}>{n} taş · {g.totals[i]} puan</Text>
      {P.opened ? <Text style={styles.seatOpen}>{P.openKind === 'cift' ? P.openVal + ' çift açtı' : P.openVal + ' ile açtı'}</Text> : null}
      {small && last ? <View style={{ marginTop: 3 }}><TileFace tile={last} w={18} h={25} /></View> : null}
    </View>
  );
}

function MeldView({ m, tw, onLayoutRef }) {
  const ref = useRef(null);
  useEffect(() => { onLayoutRef(m.id, ref); return () => onLayoutRef(m.id, null); }, [m.id]);
  return (
    <View ref={ref} collapsable={false} style={[styles.meld, m.owner === 0 && styles.meldMine]}>
      {m.items.map((it, k) => (
        <View key={k} style={{ marginRight: 1 }}>
          <TileFace tile={it.t.wild ? { ...it.t, c: it.c, n: it.n } : it.t} w={tw} h={tw * 1.4} star={!!it.t.wild} />
        </View>
      ))}
    </View>
  );
}

function Game() {
  const ins = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [, setTick] = useState(0);
  const [rackVer, setRackVer] = useState(0);
  const [toast, setToast] = useState(null);
  const [banner, setBanner] = useState(null);
  const [handEnd, setHandEnd] = useState(null);
  const rackRef = useRef(null), atRef = useRef(null), yanRef = useRef(null);
  const meldRefs = useRef({});
  const toastT = useRef(null), bannerT = useRef(null);

  const rerender = useCallback(() => setTick(t => t + 1), []);
  const bumpRack = useCallback(() => { setRackVer(v => v + 1); setTick(t => t + 1); }, []);

  const say = useCallback((msg, kind) => {
    if (!msg) return;
    clearTimeout(toastT.current);
    setToast({ msg, kind: kind || 'info' });
    toastT.current = setTimeout(() => setToast(null), kind === 'bad' ? 4200 : 2800);
  }, []);
  const feedback = useCallback((r) => {
    if (!r) return;
    if (!r.ok) { say(r.msg, 'bad'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); }
    else if (r.msg) say(r.msg, 'good');
    bumpRack();
  }, [say, bumpRack]);

  // oyun motorunu arayüze bağla
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    Object.assign(GM.H, {
      render: rerender,
      toast: (m, k) => say(m, k),
      banner: (title, sub, kind) => {
        clearTimeout(bannerT.current);
        setBanner({ title, sub, kind });
        bannerT.current = setTimeout(() => setBanner(null), 1700);
      },
      sfx: (k) => { if (k === 'penalty') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
      wait: (ms) => sleep(ms),
      handEnd: (rec, last) => { setTimeout(() => setHandEnd({ rec, last }), 900); },
      turn: () => { if (G() && G().turn === 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
    });
    if (!G()) GM.newGame({ hands: 4, mode: 'katlamali' });
    bumpRack();
  }, []);

  const g = G();
  const W = Math.max(win.width, win.height), Hh = Math.min(win.width, win.height);
  const rackW = W - ins.left - ins.right - 12;
  const geom = useMemo(() => rackGeom(rackW, Hh * 0.4), [rackW, Hh]);
  const setMeldRef = useCallback((id, ref) => { if (ref) meldRefs.current[id] = ref; else delete meldRefs.current[id]; }, []);
  if (!g) return <View style={styles.root} />;
  const P = g.players[0];
  const myTurn = g.turn === 0 && g.phase !== 'over';
  const canDraw = myTurn && g.phase === 'draw';
  const prev = g.players[3];
  const yanTop = prev.discards[prev.discards.length - 1];
  const myLast = P.discards[P.discards.length - 1];
  const an = E.rackAnalysis(P.slots);
  const marks = { meld: an.meldIds, pair: an.pairIds };
  const tableTw = Math.max(15, Math.min(22, Hh * 0.05));
  const bigTw = Math.min(W * 0.042, Hh * 0.085);

  const status = g.phase === 'over' ? 'El bitti'
    : !myTurn ? 'Sıra: ' + g.players[g.turn].name
    : canDraw ? 'Sıra sende: desteye ya da yan taşa dokun'
    : P.pend ? 'Açılışı tamamla ya da Geri Topla'
    : 'Bir taş at: taşı "At" kutusuna sürükle';

  const onDrop = (from, to, after) => { GM.hInsert(from, to, after); bumpRack(); };

  const inRect = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const measure = (ref) => new Promise(res => {
    if (!ref || !ref.current) return res(null);
    ref.current.measureInWindow((x, y, w, h) => res({ x, y, w, h }));
  });

  // ıstakadan yukarı bırakılan taş: At kutusu → at, Yan kutusu → geri bırak, per → işle
  const onDropOut = async (tile, lx, ly) => {
    const rr = await measure(rackRef);
    if (!rr) return;
    const x = rr.x + lx, y = rr.y + ly;
    const [at, yan] = await Promise.all([measure(atRef), measure(yanRef)]);
    if (inRect(at, x, y)) { feedback(GM.hDiscard(tile.id)); return; }
    if (inRect(yan, x, y)) {
      if (P.sideTile && P.sideTile.id === tile.id) feedback(GM.hReturnSide());
      return;
    }
    const ids = Object.keys(meldRefs.current);
    const rects = await Promise.all(ids.map(id => measure(meldRefs.current[id])));
    for (let k = 0; k < ids.length; k++) {
      const r = rects[k];
      if (r && inRect({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 }, x, y)) {
        const m = g.table.find(mm => String(mm.id) === ids[k]);
        if (!m) return;
        if (P.opened && P.openKind === 'cift' && m.kind === 'pair') feedback(GM.hProcessPairs([tile.id]));
        else feedback(GM.hProcess([tile.id], m.id));
        return;
      }
    }
  };

  const arrange = (k) => { GM.hArrange(k); bumpRack(); };
  const openSeri = () => feedback(!P.opened ? GM.hOpen('seri', true) : GM.hLay());
  const openCift = () => feedback(!P.opened ? GM.hOpen('cift', true) : GM.hProcessPairs([]));

  const nextHand = () => {
    const last = handEnd && handEnd.last;
    setHandEnd(null);
    if (last) GM.newGame({ hands: 4, mode: 'katlamali' }); else GM.nextHand();
    bumpRack();
  };

  return (
    <View style={[styles.root, { paddingLeft: ins.left + 6, paddingRight: ins.right + 6, paddingTop: ins.top + 4, paddingBottom: Math.max(ins.bottom, 4) }]}>
      <StatusBar hidden />
      <View style={styles.table}>
        {/* sol: önceki oyuncu ve yan taşı */}
        <View style={styles.side}>
          <Seat i={3} turn={g.turn} />
          <Pressable ref={yanRef} collapsable={false} onPress={() => canDraw && feedback(GM.hDraw('side'))}
            style={[styles.drop, canDraw && yanTop && styles.dropHot]}>
            <Text style={styles.dropLbl}>YAN</Text>
            {yanTop ? <TileFace tile={yanTop} w={bigTw} h={bigTw * 1.42} /> : <View style={[styles.empty, { width: bigTw, height: bigTw * 1.42 }]} />}
          </Pressable>
        </View>

        {/* orta: karşı oyuncu, masadaki perler, deste ve gösterge */}
        <View style={styles.center}>
          <View style={styles.topRow}>
            <Seat i={2} turn={g.turn} small />
            <View style={styles.deckRow}>
              <Pressable onPress={() => canDraw && feedback(GM.hDraw('deck'))} style={[styles.deck, { width: bigTw, height: bigTw * 1.42 }, canDraw && styles.deckHot]}>
                <Text style={styles.deckN}>{g.deck.length}</Text>
              </Pressable>
              <View style={{ alignItems: 'center', marginLeft: 8 }}>
                <TileFace tile={g.gosterge} w={bigTw * 0.8} h={bigTw * 0.8 * 1.42} />
                <Text style={styles.tiny}>GÖSTERGE</Text>
              </View>
            </View>
          </View>
          <ScrollView style={styles.melds} contentContainerStyle={styles.meldsIn}>
            {g.table.length === 0 ? <Text style={styles.tiny}>Masada henüz per yok</Text> : null}
            {g.table.map(m => <MeldView key={m.id} m={m} tw={tableTw} onLayoutRef={setMeldRef} />)}
          </ScrollView>
        </View>

        {/* sağ: sonraki oyuncu ve taş atma kutusu */}
        <View style={styles.side}>
          <Seat i={1} turn={g.turn} small />
          <View ref={atRef} collapsable={false} style={[styles.drop, myTurn && g.phase === 'discard' && styles.dropHot]}>
            <Text style={styles.dropLbl}>AT</Text>
            {myLast ? <TileFace tile={myLast} w={bigTw} h={bigTw * 1.42} /> : <View style={[styles.empty, { width: bigTw, height: bigTw * 1.42 }]} />}
          </View>
        </View>
      </View>

      {/* durum ve düğmeler */}
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.status, myTurn && { color: '#f6b73c' }]} numberOfLines={1}>{status}</Text>
          <Text style={styles.score} numberOfLines={1}>
            Seri {an.points} · Çift {an.pairs.length} · Açmak için {GM.seriesNeed()} / {GM.pairsNeed()} çift{P.penalty ? ' · Ceza ' + P.penalty : ''} · Toplam {g.totals[0]}
          </Text>
        </View>
        <Btn label="Seri Diz" onPress={() => arrange('seri')} />
        <Btn label="Çift Diz" onPress={() => arrange('cift')} />
        {GM.canAnnounce(P) ? <Btn label="Gösterge" tone="go" onPress={() => feedback(GM.announceGost(0))} /> : null}
        <Btn label={P.opened ? 'Per İndir' : 'Seri Aç'} tone="go" disabled={!myTurn} onPress={openSeri} />
        <Btn label={P.opened ? 'Çift İndir' : 'Çift Aç'} tone="go" disabled={!myTurn} onPress={openCift} />
        {P.opened ? <Btn label="İşle" tone="go" disabled={!myTurn} onPress={() => feedback(GM.hProcessAll())} /> : null}
        {(P.openedThisTurn || P.pend) ? <Btn label="Geri Topla" tone="warn" onPress={() => feedback(GM.hRegather())} /> : null}
      </View>

      <View ref={rackRef} collapsable={false} style={{ alignSelf: 'center' }}>
        <Rack slots={P.slots} geom={geom} ver={rackVer} marks={marks} freshId={g.freshId} onDrop={onDrop} onDropOut={onDropOut} />
      </View>

      {banner ? (
        <View pointerEvents="none" style={styles.bannerWrap}>
          <View style={[styles.banner, banner.kind === 'bad' && { backgroundColor: '#8e1f24' }, banner.kind === 'gold' && { backgroundColor: '#a86b00' }]}>
            <Text style={styles.bannerT}>{banner.title}</Text>
            {banner.sub ? <Text style={styles.bannerS}>{banner.sub}</Text> : null}
          </View>
        </View>
      ) : null}
      {toast ? (
        <View pointerEvents="none" style={[styles.toast, toast.kind === 'bad' && { backgroundColor: '#7a1d22' }, toast.kind === 'good' && { backgroundColor: '#145c3c' }]}>
          <Text style={styles.toastT}>{toast.msg}</Text>
        </View>
      ) : null}

      <Modal visible={!!handEnd} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          {handEnd ? (
            <View style={styles.modal}>
              <Text style={styles.modalT}>{handEnd.rec.title}</Text>
              {handEnd.rec.tags.length ? <Text style={styles.modalTags}>{handEnd.rec.tags.join(' · ')}</Text> : null}
              {G().players.map((p, i) => {
                const r = handEnd.rec.per[i];
                return (
                  <View key={i} style={styles.resRow}>
                    <Text style={[styles.resName, i === handEnd.rec.winner && { color: '#f6b73c' }]}>{p.name}</Text>
                    <Text style={styles.resNote} numberOfLines={1}>{r.notes.join(', ')}</Text>
                    <Text style={styles.resPts}>{r.total > 0 ? '+' + r.total : r.total}</Text>
                    <Text style={styles.resTot}>{G().totals[i]}</Text>
                  </View>
                );
              })}
              <Text style={styles.tiny}>El {G().hands.length} / {G().cfg.hands} · Az puan kazanır</Text>
              <View style={{ marginTop: 10, alignItems: 'center' }}>
                <Btn label={handEnd.last ? 'Yeni Oyun' : 'Sonraki El'} tone="go" onPress={nextHand} />
              </View>
            </View>
          ) : null}
        </View>
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
  root: { flex: 1, backgroundColor: '#170a2e' },
  table: {
    flex: 1, flexDirection: 'row', backgroundColor: '#0f5a4f', borderRadius: 14, padding: 6,
    borderWidth: 2, borderColor: '#0a3d36',
  },
  side: { width: '17%', justifyContent: 'space-between', alignItems: 'center' },
  center: { flex: 1, marginHorizontal: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deckRow: { flexDirection: 'row', alignItems: 'center' },
  seat: { alignSelf: 'stretch', backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 6, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  seatOn: { borderColor: '#f6b73c', backgroundColor: 'rgba(246,183,60,0.18)' },
  seatName: { color: '#fff', fontWeight: '800', fontSize: 12 },
  seatSub: { color: '#bfe9e1', fontSize: 10 },
  seatOpen: { color: '#7df0b5', fontSize: 10, fontWeight: '700' },
  drop: { alignItems: 'center', padding: 4, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', borderStyle: 'dashed', minWidth: '80%' },
  dropHot: { borderColor: '#f6b73c', backgroundColor: 'rgba(246,183,60,0.15)' },
  dropLbl: { color: 'rgba(190,240,232,0.8)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  empty: { borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.25)' },
  deck: { borderRadius: 7, backgroundColor: '#ececf0', borderWidth: 1, borderColor: '#a9a9b4', alignItems: 'center', justifyContent: 'center' },
  deckHot: { borderColor: '#f6b73c', borderWidth: 2.5 },
  deckN: { fontWeight: '800', color: '#14141a', fontSize: 14 },
  tiny: { color: 'rgba(190,240,232,0.7)', fontSize: 9, fontWeight: '700', marginTop: 2 },
  melds: { flex: 1, marginTop: 4 },
  meldsIn: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  meld: { flexDirection: 'row', padding: 3, marginRight: 5, marginBottom: 5, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.22)' },
  meldMine: { backgroundColor: 'rgba(246,183,60,0.22)' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  status: { color: '#e4dcf5', fontSize: 13, fontWeight: '700' },
  score: { color: '#a99bc9', fontSize: 10 },
  btn: { backgroundColor: '#3b1a6b', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: '#6b3fa8' },
  btnGo: { backgroundColor: '#155e45', borderColor: '#23a06f' },
  btnWarn: { backgroundColor: '#6b3a10', borderColor: '#c9771f' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  bannerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  banner: { backgroundColor: '#1b5e8e', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, alignItems: 'center' },
  bannerT: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  bannerS: { color: '#fff', fontSize: 13, marginTop: 2 },
  toast: { position: 'absolute', top: 10, alignSelf: 'center', maxWidth: '70%', backgroundColor: '#2c1252', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  toastT: { color: '#fff', fontSize: 13, textAlign: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modal: { width: '70%', backgroundColor: '#24104a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#6b3fa8' },
  modalT: { color: '#f6b73c', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  modalTags: { color: '#e4dcf5', fontSize: 12, textAlign: 'center', marginTop: 2, marginBottom: 6 },
  resRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  resName: { color: '#fff', fontWeight: '800', width: 80, fontSize: 13 },
  resNote: { color: '#a99bc9', flex: 1, fontSize: 11 },
  resPts: { color: '#fff', width: 60, textAlign: 'right', fontWeight: '700' },
  resTot: { color: '#f6b73c', width: 60, textAlign: 'right', fontWeight: '800' },
});
