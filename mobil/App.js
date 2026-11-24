// Kahve Usulü 101 Okey — App Store / Play Store sürümü (Expo)
// Masa düzeni web sürümüyle birebir: tüm ölçüler u = ekran yüksekliği / 100
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions, Modal, Animated, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEEL, tick, bump, warn, err } from './src/feel';
import { SOUND, sfx } from './src/sound';
import { HOWTO, RULES } from './src/content';
import * as L from './src/lobby';
import LobbyScreen from './src/LobbyScreen';
import LoginScreen from './src/LoginScreen';
const LOGIN_KEY = 'okey101.login';
import { GIFT_CATS, GiftIcon, curGift, giftBlock, placeGift, botLv, loadPerm } from './src/gifts';
import { C, Btn, Toggle, Pick, cyc, Coin } from './src/ui';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Rack, { rackGeom, slotAt } from './src/Rack';
import TileFace, { TileBack, EmptyTile, NUM_FONT } from './src/Tile';
const E = require('./src/engine');
const GM = require('./src/game');

const G = () => GM.getG();
const sleep = ms => new Promise(r => setTimeout(r, ms));
GM.H.wait = sleep;   // masa ekranı açılmadan da botlar acele etmesin
const AV = ['#f29a32', '#c4366f', '#2389bd', '#e07d1d'];
const fmt = n => (n < 0 ? '−' + Math.abs(n) : String(n));

// ---------- ayarlar (cihazda saklanır) ----------
const PEN_DEFS = [
  ['gosterge', 'Gösterge', 'Göstergenin eşi elinde olan elin başında söyleyip çiftte joker gibi kullanır'],
  ['rekor', 'Rekorlu', '150+ puanla ya da 7+ çiftle açana −101 rekor ödülü'],
  ['okeyCal', 'Okey çalma', 'Perdeki okeyi çalınan oyuncuya 101 ceza'],
  ['yanAc', 'Yandan taş alıp açma', 'Yandan alınan taşla açılırsa taşı atana taş×10 (çiftte ×20) ceza'],
  ['herTas', 'Her taş ceza', 'Elini açtıktan sonra yandan alıp per veya çift indirdiğin taşın sahibine taş×10 (çiftte ×20) ceza'],
];
const DEF_SET = { sound: true, vibrate: true, music: false, hands: 4, team: false, mode: 'katlamali', hard: false, pen: {}, qp: { hands: 'any', team: 'any', hard: 'any', mode: 'any', pen: {} } };
const SET_KEY = 'okey101.settings';
const gameCfg = st => ({ hands: st.hands, team: st.team, mode: st.mode, hard: st.hard, pen: { ...st.pen }, speed: 'normal' });

// ---------- tur süresi (web ile aynı: 60 sn, üst üste 2 kez dolarsa 5 sn) ----------
const TURN_SEC = 60, SLOW_SEC = 5;
const CLK = { cKey: null, cEnd: 0, bKey: null, bEnd: 0, tOut: 0, paused: false, last: 0, busy: false };
const turnSec = () => (CLK.tOut >= 2 ? SLOW_SEC : TURN_SEC);
function clockKey() {
  const g = G();
  return g && g.turn === 0 && (g.phase === 'draw' || g.phase === 'discard') ? g.handNo + ':' + g.turnNo + ':' + (g.clk || 0) : null;
}
// sırası gelenin kalan süresi (sn ve oran); bot ise bot süresi
function clockState(who) {
  const g = G(); if (!g || g.phase === 'over') return null;
  const now = Date.now();
  if (who === 'me') {
    const key = clockKey(); if (!key) return null;
    if (key !== CLK.cKey) { CLK.cKey = key; CLK.cEnd = now + turnSec() * 1000; }
    const left = Math.max(0, CLK.cEnd - now);
    return { s: Math.ceil(left / 1000), p: Math.min(1, left / (turnSec() * 1000)), left };
  }
  if (g.turn === 0) return null;
  const key = g.handNo + ':' + g.turnNo;
  if (key !== CLK.bKey) { CLK.bKey = key; CLK.bEnd = now + TURN_SEC * 1000; }
  const left = Math.max(0, CLK.bEnd - now);
  return { s: Math.ceil(left / 1000), p: Math.min(1, left / (TURN_SEC * 1000)), left };
}
// süre dolunca: desteden çek, okey ve işlek olmayan bir taş at (web'deki autoPlay)
function autoPlay(say) {
  const g = G(), P = g.players[0];
  CLK.busy = true;
  try {
    if (g.phase === 'discard' && P.sideTile && !P.sideUsed) GM.hReturnSide();
    if (g.phase === 'draw') { const r = GM.hDraw('deck'); if (!r || !r.ok) return; }
    if (g.phase === 'discard' && g.turn === 0) {
      const tiles = P.slots.filter(Boolean);
      const score = t => (t.wild ? 1000 : 0) + (g.table.length && E.isWrongDiscard(t, g.table) ? 500 : 0) + (t.id === g.freshId ? -50 : 0) - t.n;
      for (const t of tiles.slice().sort((a, b) => score(a) - score(b))) { const r = GM.hDiscard(t.id); if (r && r.ok) break; }
    }
    CLK.tOut += 1;
    say(CLK.tOut >= 2 ? 'Süren üst üste ' + CLK.tOut + ' kez doldu: artık her turda ' + SLOW_SEC + ' saniyen var. Kendin oynayınca süren 60 saniyeye döner.' : 'Süren doldu: senin yerine taş çekilip atıldı.', 'bad');
  } finally { CLK.busy = false; CLK.cKey = null; }
}
// saat çipi: kendi zamanlayıcısıyla yenilenir, masayı yeniden çizdirmez
function ClockPill({ u, who, style }) {
  const [st, setSt] = useState(() => clockState(who));
  useEffect(() => {
    const id = setInterval(() => {
      const n = clockState(who);
      setSt(o => (o && n && o.s === n.s ? o : n));
    }, 250);
    return () => clearInterval(id);
  }, [who]);
  if (!st) return null;
  const warnOn = st.s <= 10;
  return (
    <View style={[{ minWidth: 7.5 * u, borderRadius: 1.2 * u, overflow: 'hidden', backgroundColor: warnOn ? 'rgba(255,107,90,0.35)' : 'rgba(255,187,51,0.35)' }, style]}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (st.p * 100) + '%', backgroundColor: warnOn ? '#ff6b5a' : C.amber }} />
      <Text allowFontScaling={false} style={{ textAlign: 'center', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.6 * u, color: warnOn ? '#2a0600' : C.amberInk, paddingVertical: 0.55 * u, paddingHorizontal: u }}>0:{String(st.s).padStart(2, '0')}</Text>
    </View>
  );
}

// ---------- küçük parçalar ----------
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
// hediye yeri: üzerindeki hediye ya da "Hediye" düğmesi
function GiftSlot({ u, cur, size, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ alignItems: 'center', justifyContent: 'center' }}>
      {cur ? <GiftIcon name={cur.em} size={size * u} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 * u, borderWidth: 1, borderColor: 'rgba(255,187,51,0.55)', backgroundColor: 'rgba(255,187,51,0.12)', borderRadius: 2 * u, paddingHorizontal: 1.1 * u, paddingVertical: 0.4 * u }}>
          <GiftIcon name="Kalp" size={2.6 * u} />
          <Text allowFontScaling={false} style={{ color: '#ffe39a', fontWeight: '800', fontSize: 1.9 * u }}>Hediye</Text>
        </View>
      )}
    </Pressable>
  );
}
// yan oyuncu kutusu (.plate)
function SidePlate({ u, i, g, cur, onGift }) {
  const P = g.players[i], active = g.turn === i && g.phase !== 'over';
  return (
    <View style={{ flex: 1 }}>
    {active ? <ClockPill u={u} who="bot" style={{ position: 'absolute', top: -1.3 * u, right: -u, zIndex: 4, minWidth: 6.4 * u }} /> : null}
    <View style={[styles.plate, { borderRadius: 2 * u, padding: 1.1 * u, gap: 0.8 * u }, active && styles.plateOn]}>
      <Avatar u={u} i={i} name={P.name} size={6.4} />
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.nm, { fontSize: 3 * u }]}>{P.name}{g.cfg.team ? ' · Rakip' : ''}</Text>
      <View style={[styles.chips, { gap: 0.5 * u }]}>{stateChips(u, P)}</View>
      <View style={[styles.shelf, { marginHorizontal: -1.1 * u, alignItems: 'center', justifyContent: 'center' }]}><GiftSlot u={u} cur={cur} size={9} onPress={onGift} /></View>
    </View>
    </View>
  );
}
// karşı oyuncu (üst şeritte, .plate.top)
function TopPlate({ u, g, cur, onGift }) {
  const P = g.players[2], active = g.turn === 2 && g.phase !== 'over';
  return (
    <View style={[styles.plate, styles.plateTop, { height: 8 * u, borderRadius: 2 * u, paddingHorizontal: 1.4 * u, gap: 1.2 * u }, active && styles.plateOn]}>
      <Avatar u={u} i={2} name={P.name} size={6.4} />
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.nm, { fontSize: 3 * u }]}>{P.name}{g.cfg.team ? ' · Eşin' : ''}</Text>
      <View style={{ flexDirection: 'row', gap: 0.5 * u }}>{stateChips(u, P)}</View>
      {active ? <ClockPill u={u} who="bot" /> : null}
      <View style={{ alignSelf: 'stretch', justifyContent: 'center', borderLeftWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.14)', paddingLeft: u, minWidth: 8 * u, alignItems: 'center' }}>
        <GiftSlot u={u} cur={cur} size={6.6} onPress={onGift} />
      </View>
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
// ıstakanın yanındaki boy boy dizme düğmesi (yardımlı oyun)
function DizBtn({ u, label, h, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ position: 'absolute', bottom: 0, width: 13 * u, height: h, borderRadius: 1.8 * u,
      backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderBottomWidth: 0.5 * u, borderBottomColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.8, transform: [{ translateY: 1 }] }]}>
      <Text allowFontScaling={false} style={{ color: C.ink, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.4 * u, textAlign: 'center', lineHeight: 4.2 * u, letterSpacing: 0.15 * u }}>{label}</Text>
    </Pressable>
  );
}
function Corner({ u, tile, hot, cref, style, drag, over }) {
  const w = 9 * u, h = 11 * u;
  return (
    <DrawSource drag={drag}>
      <View ref={cref} collapsable={false} style={[{ alignItems: 'center', borderRadius: 1.4 * u, padding: 0.3 * u }, hot && { backgroundColor: 'rgba(255,187,51,0.22)' }, over && { backgroundColor: 'rgba(255,187,51,0.5)', borderWidth: 0.35 * u, borderColor: '#ffbb33', transform: [{ scale: 1.08 }] }, style]}>
        {tile ? <TileFace tile={tile} w={w} h={h} fs={6.4 * u} glow={false} /> : <EmptyTile w={w} h={h} r={0.9 * u} />}
      </View>
    </DrawSource>
  );
}
// masadaki yeşil çuha (.mat) ve ızgarası
function Mat({ u, title, limit, side, children, style }) {
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
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 1.8 * u }]}>{lines}</View>
      <Text allowFontScaling={false} style={[styles.matTitle, { top: 0.6 * u, right: 1.2 * u, fontSize: 1.7 * u }]}>{title}</Text>
      {limit ? (   // açma limiti: masanın üst kenarına oturan yuvarlak rozet; taşların başladığı yerin üstünde kalır
        <View pointerEvents="none" style={[styles.limWrap, { top: -2.6 * u, left: 1.6 * u, flexDirection: 'column' }]}>
          <View style={[styles.limPill, { height: 5 * u, minWidth: 8 * u, borderRadius: 2.5 * u, borderWidth: 0.35 * u, paddingHorizontal: 1.2 * u }]}>
            <Text allowFontScaling={false} style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.4 * u, includeFontPadding: false }}>{limit}</Text>
          </View>
          <View style={[styles.limTip, { width: 1.4 * u, height: 1.4 * u, marginTop: -0.9 * u }]} />
        </View>
      ) : null}
      {children}
    </View>
  );
}
function MeldView({ u, m, ms, setRef, over }) {
  const ref = useRef(null);
  useEffect(() => { setRef(m.id, ref); return () => setRef(m.id, null); }, [m.id]);
  const w = 4.7 * u * ms, h = 6.5 * u * ms;
  return (
    <View ref={ref} collapsable={false} style={[styles.meld, { padding: 0.35 * u * ms, gap: 0.15 * u * ms, borderRadius: 0.9 * u, borderWidth: 0.3 * u, borderColor: 'transparent' }, over && { borderColor: '#ffbb33', backgroundColor: 'rgba(255,187,51,0.3)' }]}>
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


// ---------- ayarlar ve kurallar pencereleri (lobi ve masa ortak) ----------
const QP_HANDS = ['any', 1, 2, 4, 8, 12];
const ANY = 'Fark etmez';
const QP_PEN = [['rekor', 'Rekorlu'], ['okeyCal', 'Okey çalma cezası'], ['herTas', 'Her taş cezalı'], ['yanAc', 'Yandan açma cezalı'], ['gosterge', 'Gösterge']];
const qpOf = st => ({ hands: 'any', team: 'any', hard: 'any', mode: 'any', pen: {}, ...(st.qp || {}) });
// açma/kapama düğmesi (web'deki st-sw)
function Switch({ u, on, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ width: 9 * u, height: 4.6 * u, borderRadius: 3 * u, backgroundColor: on ? '#4fe0a3' : 'rgba(255,255,255,0.18)', padding: 0.5 * u, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 3.6 * u, height: 3.6 * u, borderRadius: 2 * u, backgroundColor: '#fff' }} />
    </Pressable>
  );
}
function StRow({ u, ic, label, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 1.1 * u, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', gap: 1.2 * u }}>
      <Text allowFontScaling={false} style={{ fontSize: 3 * u, width: 4 * u, textAlign: 'center' }}>{ic}</Text>
      <Text allowFontScaling={false} style={{ flex: 1, color: C.ink, fontWeight: '800', fontSize: 2.7 * u }}>{label}</Text>
      {children}
    </View>
  );
}
function StPick({ u, title, val, onPrev, onNext }) {
  return (
    <View style={{ marginBottom: 0.8 * u }}>
      <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2 * u, textAlign: 'center', marginBottom: 0.4 * u }}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0.8 * u }}>
        <Btn u={u} sm label="‹" onPress={onPrev} />
        <View style={{ flex: 1, height: 6.6 * u, borderRadius: u, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={{ color: C.ink, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3 * u }}>{val}</Text>
        </View>
        <Btn u={u} sm label="›" onPress={onNext} />
      </View>
    </View>
  );
}
// ---------- ayarlar ve kurallar pencereleri (lobi ve masa ortak) — web'deki düzen ----------
function SettingsModal({ u, visible, set, saveSet, onClose, onRules, onHowto, onLogout }) {
  const q = qpOf(set);
  const putQ = (k, v) => saveSet({ ...set, qp: { ...q, [k]: v } });
  const tri = [undefined, true, false];   // fark etmez → olsun → olmasın
  return (
    <Modal visible={visible} transparent animationType="fade" supportedOrientations={['landscape']}>
      <View style={styles.modalBg}>
        <View style={[styles.modal, { width: '84%', maxHeight: '94%', borderRadius: 2.4 * u, padding: 2.4 * u }]}>
          <Text allowFontScaling={false} style={{ color: C.amber, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 6 * u, letterSpacing: 0.3 * u, marginBottom: u }}>AYARLAR</Text>
          <ScrollView>
            <View style={{ flexDirection: 'row', gap: 2 * u }}>
              <View style={[styles.stBox, { borderRadius: 1.6 * u, padding: 1.6 * u }]}>
                <Text allowFontScaling={false} style={[styles.stBoxH, { fontSize: 3 * u }]}>GENEL AYARLAR</Text>
                <StRow u={u} ic="♫" label="Müzik"><Switch u={u} on={!!set.music} onPress={() => saveSet({ ...set, music: !set.music })} /></StRow>
                <StRow u={u} ic="🔊" label="Ses efektleri"><Switch u={u} on={set.sound !== false} onPress={() => saveSet({ ...set, sound: !(set.sound !== false) })} /></StRow>
                <StRow u={u} ic="📳" label="Titreşim"><Switch u={u} on={set.vibrate !== false} onPress={() => saveSet({ ...set, vibrate: !(set.vibrate !== false) })} /></StRow>
                <StRow u={u} ic="🌐" label="Dil"><Text allowFontScaling={false} style={{ color: C.muted, fontWeight: '800', fontSize: 2.7 * u }}>Türkçe</Text></StRow>
              </View>
              <View style={[styles.stBox, { borderRadius: 1.6 * u, padding: 1.6 * u }]}>
                <Text allowFontScaling={false} style={[styles.stBoxH, { fontSize: 3 * u }]}>HEMEN OYNA AYARLARI</Text>
                <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u, textAlign: 'center', marginBottom: u }}>Hemen Oyna dediğinde masa bu özelliklerle seçilir ya da açılır.</Text>
                <StPick u={u} title="El sayısı" val={q.hands === 'any' ? ANY : q.hands + ' El'} onPrev={() => putQ('hands', cyc(QP_HANDS, q.hands, -1))} onNext={() => putQ('hands', cyc(QP_HANDS, q.hands, 1))} />
                <StPick u={u} title="Tek / Eşli" val={q.team === 'any' ? ANY : q.team ? 'Eşli' : 'Tek'} onPrev={() => putQ('team', cyc(['any', false, true], q.team, -1))} onNext={() => putQ('team', cyc(['any', false, true], q.team, 1))} />
                <StPick u={u} title="Yardımlı / Yardımsız" val={q.hard === 'any' ? ANY : q.hard ? 'Yardımsız' : 'Yardımlı'} onPrev={() => putQ('hard', cyc(['any', false, true], q.hard, -1))} onNext={() => putQ('hard', cyc(['any', false, true], q.hard, 1))} />
                <StPick u={u} title="Katlamalı / Klasik" val={q.mode === 'any' ? ANY : q.mode === 'katlamali' ? 'Katlamalı' : 'Klasik'} onPrev={() => putQ('mode', cyc(['any', 'katlamali', 'klasik'], q.mode, -1))} onNext={() => putQ('mode', cyc(['any', 'katlamali', 'klasik'], q.mode, 1))} />
                <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2 * u, textAlign: 'center', marginTop: 0.4 * u }}>Oyun modları <Text style={{ fontSize: 1.6 * u }}>(dokun: fark etmez → olsun → olmasın)</Text></Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 0.6 * u, marginTop: 0.6 * u }}>
                  {QP_PEN.map(([k, n]) => {
                    const v = q.pen[k] === 'any' ? undefined : q.pen[k];
                    const st = v === undefined ? styles.qpAny : v ? styles.qpOn : styles.qpOff;
                    return (
                      <Pressable key={k} onPress={() => { const nv = cyc(tri, v, 1), np = { ...q.pen, [k]: nv }; if (k === 'herTas' && nv === true) np.yanAc = true; putQ('pen', np); }} style={[styles.qp, st, { width: '48%', borderRadius: u, paddingVertical: 0.8 * u }]}>
                        <Text allowFontScaling={false} style={{ fontWeight: '800', fontSize: 1.8 * u, textAlign: 'center', color: v === undefined ? '#cfc4ee' : v ? '#7ef0b5' : '#ff9a9a', textDecorationLine: v === false ? 'line-through' : 'none' }}>{v === undefined ? '' : v ? '✓ ' : '✕ '}{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 1.2 * u, marginTop: 1.6 * u }}>
            <Btn u={u} pri label="Tamam" onPress={onClose} style={{ flex: 1 }} />
            <Btn u={u} label="Kurallar" onPress={onRules} style={{ flex: 1 }} />
            <Btn u={u} label="Nasıl Oynanır?" onPress={onHowto} style={{ flex: 1.3 }} />
            {onLogout ? <Btn u={u} label="Çıkış Yap" onPress={onLogout} style={{ flex: 1 }} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
function RulesModal({ u, visible, onClose, howto }) {
  return (
      <Modal visible={visible} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { width: '86%', maxHeight: '92%', borderRadius: 2.4 * u, padding: 2.4 * u }]}>
            <Text allowFontScaling={false} style={[styles.modalT, { fontSize: 4.2 * u }]}>{howto ? 'Nasıl Oynanır?' : 'Kurallar'}</Text>
            <ScrollView>
              {howto ? HOWTO.map((t, k) => <Text key={'h' + k} allowFontScaling={false} style={[styles.ruleLi, { fontSize: 2.4 * u, marginTop: 0.9 * u }]}>• {t}</Text>)
                : RULES.map((sec, k) => (
                <View key={k}>
                  <Text allowFontScaling={false} style={[styles.stH, { fontSize: 2.6 * u, marginTop: 1.6 * u }]}>{sec.t}</Text>
                  {sec.i.map((t, j) => <Text key={j} allowFontScaling={false} style={[styles.ruleLi, { fontSize: 2.2 * u, marginTop: 0.6 * u }]}>• {t}</Text>)}
                </View>
              ))}
            </ScrollView>
            <View style={{ alignItems: 'center', marginTop: 1.6 * u }}>
              <Btn u={u} pri label={howto ? 'Geri' : 'Kapat'} onPress={onClose} />
            </View>
          </View>
        </View>
      </Modal>
  );
}

// göstergenin üstünde masanın özellikleri (101 Plus'taki gibi kutucuklar)
function TableInfo({ u, g }) {
  // sadece masanın dört özelliği; oyun modları masa menüsünde (Ayarlar) görünür
  const c = g.cfg;
  const boxes = [[c.team ? 'EŞLİ' : 'TEK'], [c.hands + ' EL'], [c.hard ? 'YARDIMSIZ' : 'YARDIMLI', false, !c.hard], [c.mode === 'katlamali' ? 'KATLAMALI' : 'KLASİK', c.mode === 'katlamali']];
  return (
    <View pointerEvents="none" style={{ flex: 1, minHeight: 0, justifyContent: 'center', gap: 0.6 * u }}>
      {boxes.map(([t, red, green]) => (
        <View key={t} style={{ height: 3.4 * u, borderRadius: 0.9 * u, backgroundColor: red ? '#8e1f2c' : green ? '#17734a' : 'rgba(6,10,30,0.75)', borderWidth: 1, borderColor: red ? '#c0394a' : green ? '#3fd08c' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0.5 * u }}>
          <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.3 * u }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}
// göstergenin üstündeki bildirim: tek bildirim, kutuya sığana kadar yazı küçülür (web'deki gibi)
function ToastBox({ u, toast }) {
  const [box, setBox] = useState(null);
  let fs = 2.2 * u;
  if (box && toast) {
    const pad = 0.6 * u, w = box.w - 2 * pad, h = box.h - 2 * pad;
    const fits = f => {
      const cpl = Math.max(1, Math.floor(w / (f * 0.56)));            // satır başına yaklaşık harf
      const words = toast.msg.split(' ');
      let lines = 1, cur = 0;
      for (const wd of words) { const n = wd.length; if (cur && cur + 1 + n > cpl) { lines++; cur = n; } else cur += (cur ? 1 : 0) + n; lines += Math.floor(Math.max(0, n - 1) / cpl); }
      return lines * f * 1.22 <= h;
    };
    while (fs > 0.9 * u && !fits(fs)) fs -= 0.1 * u;
  }
  return (
    <View pointerEvents="none" onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ flex: 1, justifyContent: 'flex-end', overflow: 'hidden' }}>
      {toast && box ? (
        <View key={toast.id} style={[styles.toast, { borderRadius: u, padding: 0.6 * u, maxHeight: box.h }, toast.kind === 'bad' && { backgroundColor: '#7a1d22' }, toast.kind === 'good' && { backgroundColor: '#145c3c' }]}>
          <Text allowFontScaling={false} style={{ color: '#fff', fontSize: fs, lineHeight: fs * 1.2, fontWeight: '700', textAlign: 'center' }}>{toast.msg}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------- oyun ekranı ----------
function Game({ set, saveSet, table, onLeave, onAgain }) {
  const ins = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [, setTick] = useState(0);
  const [rackVer, setRackVer] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [statusKind, setStatusKind] = useState('bad');
  const [handEnd, setHandEnd] = useState(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settle, setSettle] = useState(null);       // oyun sonu çip hesabı
  const [tmpGifts, setTmpGifts] = useState({});     // bu oyunluk hediyeler
  const [giftFor, setGiftFor] = useState(null);     // hediye penceresi açık olan oyuncu
  const [gcat, setGcat] = useState('kahve');
  const tmpRef = useRef({}); tmpRef.current = tmpGifts;
  const rackRef = useRef(null), atRef = useRef(null), yanRef = useRef(null);
  const [ghost, setGhost] = useState(null);                 // sürüklenen deste/yan taşı
  const ghostPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const meldRefs = useRef({});
  const stT = useRef(null);
  const helped = useRef(null);   // yardımlı: bu el için ıstaka dizildi mi

  const rerender = useCallback(() => setTick(t => t + 1), []);
  const bumpRack = useCallback(() => { setRackVer(v => v + 1); setTick(t => t + 1); }, []);
  const toast = useCallback((msg, kind) => {
    if (!msg) return;
    // ortadaki bildirim kutusu kaldırıldı: sadece uyarılar ıstakanın üstündeki durum satırında görünür
    if (kind !== 'bad' && kind !== 'task') return;
    clearTimeout(stT.current); setStatusMsg(msg); setStatusKind(kind);
    stT.current = setTimeout(() => setStatusMsg(null), 4500);
  }, []);
  // oyun süresi ödülleri: sadece masada, oyun sürerken, uygulama öndeyken ve oyuncu kendisi oynarken işler
  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now(), dt = Math.min(5, (now - last) / 1000); last = now;
      const gg = G();
      if (!gg || gg.phase === 'over' || AppState.currentState !== 'active' || (CLK.tOut || 0) >= 2) return;
      L.ptTick(dt).forEach(m => toast(m, 'task'));
    }, 1000);
    return () => { clearInterval(id); L.saveWallet(); };
  }, []);
  const feedback = useCallback((r) => {
    if (!r) return;
    if (!r.ok) {
      clearTimeout(stT.current); setStatusMsg(r.msg);
      stT.current = setTimeout(() => setStatusMsg(null), 4500);
      err();
    } else if (r.msg) toast(r.msg, 'good');
    bumpRack();
  }, [toast, bumpRack]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    Object.assign(GM.H, {
      render: rerender,
      toast: (m, k) => toast(m, k),
      banner: () => {},   // büyük duyurular kaldırıldı (cezalar oyuncu kutularında görünür)
      sfx: (k) => { sfx(k); if (k === 'penalty') warn(); },
      wait: (ms) => sleep(ms),
      ev: (name, d) => {
        if (name === 'penalty' && d && d.amt >= 101) giftReact('penalty', d.i); else if (name === 'finish' && d) giftReact('win', d.i);
        L.taskEv(name, d).forEach(m => toast(m, 'task'));   // görevler
      },
      handEnd: (rec, last) => { setTimeout(() => setHandEnd({ rec, last }), 900); },
      turn: () => { if (G() && G().turn === 0) { bump(); sfx('turn'); } },   // sıra sende: ayrı ses
    });
    bumpRack();
  }, []);

  // pencere açıkken süre durur; süre dolunca otomatik oyna
  useEffect(() => { CLK.paused = !!(giftFor !== null || settle || handEnd || scoreOpen || setOpen || rulesOpen || menuOpen); }, [giftFor, settle, handEnd, scoreOpen, setOpen, rulesOpen, menuOpen]);
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now(), dt = now - (CLK.last || now); CLK.last = now;
      if (CLK.paused) { CLK.cEnd += dt; CLK.bEnd += dt; return; }
      const n = clockState('me');
      if (n && n.left <= 0 && !CLK.busy && !ghostRef.current) { autoPlay(toast); bumpRack(); }
    }, 250);
    return () => clearInterval(id);
  }, []);

  const W = Math.max(win.width, win.height), Hh = Math.min(win.width, win.height);
  const u = Hh / 100;
  const pad = { t: u + ins.top, r: 1.6 * u + ins.right, b: 1.4 * u + ins.bottom * 0.3, l: 1.6 * u + ins.left };
  const rackW = W - pad.l - pad.r - 35 * u;
  const geom = useMemo(() => rackGeom(rackW, u), [rackW, u]);
  const setMeldRef = useCallback((id, ref) => { if (ref) meldRefs.current[id] = ref; else delete meldRefs.current[id]; }, []);

  const onGost = useCallback(() => { feedback(GM.announceGost(0)); }, [feedback]);
  const onDrop = useCallback((from, to, after) => { GM.hInsert(from, to, after); sfx('place'); bumpRack(); }, [bumpRack]);
  const inRect = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const measure = (ref) => new Promise(res => {
    if (!ref || !ref.current) return res(null);
    ref.current.measureInWindow((x, y, w, h) => res({ x, y, w, h }));
  });
  // sürüklenen taş ıstakadan çıkınca: üstüne geldiği per ya da Attığın köşesi parlar
  const [over, setOver] = useState(null);
  const overRef = useRef(null);
  const hovRects = useRef(null);
  const setOv = (v) => { if (overRef.current !== v) { overRef.current = v; setOver(v); } };
  const onHoverOut = useCallback((lx, ly) => {
    if (lx === null || lx === undefined) { hovRects.current = null; setOv(null); return; }
    const hr = hovRects.current;
    if (!hr) {          // ilk çıkışta yerleri bir kez ölç
      hovRects.current = 'busy';
      const ids = Object.keys(meldRefs.current);
      Promise.all([measure(rackRef), measure(atRef), ...ids.map(id => measure(meldRefs.current[id]))]).then(([rk, at, ...rs]) => {
        hovRects.current = { rk, at, melds: ids.map((id, k) => [id, rs[k]]) };
      });
      return;
    }
    if (hr === 'busy' || !hr.rk) return;
    const x = hr.rk.x + lx, y = hr.rk.y + ly;
    const grow = r => r && { x: r.x - 2 * u, y: r.y - 2 * u, w: r.w + 4 * u, h: r.h + 4 * u };
    if (inRect(grow(hr.at), x, y)) { setOv('at'); return; }
    for (const [id, r] of hr.melds) if (inRect(grow(r), x, y)) { setOv(id); return; }
    setOv(null);
  }, [u]);
  // ıstakadan bırakılan taş: Attığın köşesi → at, Yan köşesi → geri bırak, per → işle
  const onDropOut = useCallback(async (tile, lx, ly) => {
    const g = G(), P = g.players[0];
    const rr = await measure(rackRef);
    if (!rr) return;
    const x = rr.x + lx, y = rr.y + ly;
    const grow = r => r && { x: r.x - 2 * u, y: r.y - 2 * u, w: r.w + 4 * u, h: r.h + 4 * u };
    const [at, yan] = await Promise.all([measure(atRef), measure(yanRef)]);
    if (inRect(grow(at), x, y)) { const r = GM.hDiscard(tile.id); if (r && r.ok) CLK.tOut = 0; feedback(r); return; }
    if (inRect(grow(yan), x, y)) { if (P.sideTile && P.sideTile.id === tile.id) feedback(GM.hReturnSide()); return; }
    const ids = Object.keys(meldRefs.current);
    const rects = await Promise.all(ids.map(id => measure(meldRefs.current[id])));
    for (let k = 0; k < ids.length; k++) {
      if (inRect(grow(rects[k]), x, y)) {
        const m = g.table.find(mm => String(mm.id) === ids[k]);
        if (!m) return;
        // okeyin (ya da göstergenin) üstüne bırakıldıysa: okeyi çal
        const ms = 0.74, step = (4.7 + 0.15) * u * ms, r = rects[k];
        const idx = Math.max(0, Math.min(m.items.length - 1, Math.floor((x - r.x - 0.35 * u * ms) / step)));
        const it = m.items[idx];
        if (it && (it.t.wild || it.t.gost)) { const sr = GM.hSwap(tile.id, m.id, idx); if (sr && sr.ok) { feedback(sr); return; } }
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
      if (src === 'side' && !g.players[3].discards.length) return;
      const t = src === 'side' ? g.players[3].discards[g.players[3].discards.length - 1] : null;
      ghostPos.setValue({ x: x - geom.cellW / 2, y: y - geom.tileH * 0.8 });
      ghostRef.current = { src, tile: t };
      setGhost(ghostRef.current);
      tick();
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

  // ---------- hediyeler ----------
  const nameOf = i => { const gg = G(); return gg ? gg.players[i].name : ''; };
  const giftOf = i => curGift(nameOf(i), tmpRef.current[i]);
  const putGift = (i, item, cat) => { const t = placeGift(nameOf(i), item, cat); setTmpGifts(o => ({ ...o, [i]: t })); };
  const botGift = useCallback((from, catId) => {
    const gg = G(); if (!gg) return;
    const cat = GIFT_CATS.find(c => c.id === catId) || GIFT_CATS[0];
    const ok = cat.items.filter(x => !giftBlock(giftOf(0), cat, x[2]));
    if (!ok.length) return;
    const it = ok[Math.floor(Math.random() * ok.length)];
    putGift(0, it, cat);
    toast(gg.players[from].name + ' sana ' + it[0] + ' gönderdi', catId === 'takil' ? 'bad' : 'good');
  }, [toast]);
  const giftReact = useCallback((kind, who) => {
    const gg = G(); if (!gg) return;
    if (kind === 'penalty' && who === 0 && Math.random() < 0.55) setTimeout(() => botGift(1 + Math.floor(Math.random() * 3), 'takil'), 1200);
    else if (kind === 'penalty' && who > 0 && Math.random() < 0.25) {
      setTimeout(() => {
        const cat = GIFT_CATS[3], it = cat.items[Math.floor(Math.random() * cat.items.length)];
        if (!giftBlock(giftOf(who), cat, it[2])) putGift(who, it, cat);
      }, 1200);
    } else if (kind === 'win' && who === 0 && Math.random() < 0.5) setTimeout(() => botGift(1 + Math.floor(Math.random() * 3), Math.random() < 0.5 ? 'kahve' : 'gonul'), 1500);
  }, [botGift]);
  const sendGift = (i, cat, it) => {
    if (L.wallet().chips < it[2]) { toast('Bu hediye için yeterli çipin yok.', 'bad'); return; }
    const why = giftBlock(giftOf(i), cat, it[2]);
    if (why) { toast(why === 'Kalıcı hediyesi var' ? 'Bu oyuncunun üzerinde kalıcı hediye var. Sadece Kalıcı bölümünden hediye gönderebilirsin.' : 'Oyuncunun üzerindeki hediyeden daha pahalı bir hediye seçmelisin.', 'bad'); return; }
    L.addChips(-it[2]); setGiftFor(null);
    L.bump('gift_sent'); L.checkTasks().forEach(m => toast(m, 'task'));
    putGift(i, it, cat); sfx('tap');
    toast(nameOf(i) + ' oyuncusuna ' + it[0] + ' gönderdin', 'info');
    if (Math.random() < 0.35) setTimeout(() => botGift(i, cat.id === 'takil' ? 'takil' : 'kahve'), 2200 + Math.random() * 1500);
  };

  const g = G();
  if (!g) return <View style={styles.root} />;
  const P = g.players[0];
  // yardımlı oyun: okey taşları ters durur (çekilen okey de), el başında ıstaka seri dizili gelir
  if (!g.cfg.hard && g.phase !== 'over') {
    P.slots.forEach(t => { if (t && t.wild && !t._am) { t.mark = true; t._am = true; } });
    const hk = g.epoch + ':' + g.hands.length;
    if (helped.current !== hk && !P.opened) { helped.current = hk; GM.hArrange('seri'); }
  }
  const disc = g.turn === 0 && g.phase === 'discard';
  const canDraw = g.turn === 0 && g.phase === 'draw';
  const canSide = canDraw;
  const lastOf = i => { const d = g.players[i].discards; return d[d.length - 1]; };
  const prevOf = i => { const d = g.players[i].discards; return d[d.length - 2]; };   // sürüklerken alttaki taş görünür
  const an = E.rackAnalysis(P.slots);
  const hard = !!g.cfg.hard;
  const marks = hard ? { meld: new Set(), pair: new Set() } : { meld: an.meldIds, pair: an.pairIds };
  // yardımlı: işlek taşlar (atarsan 101 ceza) kırmızı ünlemle görünür
  const hwIds = !hard && g.table.length ? new Set(GM.handOf(P).filter(t => E.isWrongDiscard(t, g.table)).map(t => t.id)) : null;
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


  const leave = (flash) => { const gg = G(); if (gg) { gg.phase = 'over'; gg.epoch++; } onLeave(flash); };
  const nextHand = () => {
    const last = handEnd && handEnd.last;
    setHandEnd(null);
    if (!last) { GM.nextHand(); bumpRack(); return; }
    // oyun bitti: çip hesabı (bir kez)
    const gg = G(), r = L.payouts(gg.totals, table.bet, !!gg.cfg.team), win = r.pay[0], net = win - table.bet;
    L.addChips(win);
    const up = L.recordGame(net > 0, net);
    L.taskGame(L.SALONS[table.salon].id, net > 0, gg.cfg);
    setSettle({ r, net, up });
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
        <TopPlate u={u} g={g} cur={giftOf(2)} onGift={() => setGiftFor(2)} />
        <View style={[styles.topActions, { gap: 0.8 * u }]}>
          <Btn u={u} sm label="Yazboz" onPress={() => setScoreOpen(true)} />
          <Btn u={u} sm label="Kurallar" onPress={() => setRulesOpen('rules')} />
          <Btn u={u} sm label="Ayarlar" onPress={() => (table ? setMenuOpen(true) : setSetOpen(true))} />
          <Btn u={u} sm label={set.sound ? 'Ses: Açık' : 'Ses: Kapalı'} onPress={() => saveSet({ ...set, sound: !set.sound })} />
        </View>
      </View>

      {/* ---- masa ---- */}
      <View style={[styles.board, { gap: u, marginTop: 0.8 * u }]}>
        <View style={[styles.col, { width: 17.5 * u, gap: 0.8 * u, paddingBottom: 6.5 * u }]}>
          <Corner u={u} tile={lastOf(2)} />
          <SidePlate u={u} i={3} g={g} cur={giftOf(3)} onGift={() => setGiftFor(3)} />
        </View>
        <Mat u={u} title="SERİ PERLER" limit={kat ? String(GM.seriesNeed()) : null} side="left" style={{ flex: 1, zIndex: 3 }}>
          <ScrollView contentContainerStyle={[styles.melds, { padding: 1.2 * u, paddingTop: 3.4 * u, rowGap: u * ms, columnGap: 1.2 * u * ms }]}>
            {series.length ? series.map(m => <MeldView key={m.id} u={u} m={m} ms={ms} setRef={setMeldRef} over={over === String(m.id)} />)
              : <Text allowFontScaling={false} style={[styles.emptyNote, { fontSize: 2.6 * u }]}>Masada henüz açılmış seri per yok.</Text>}
          </ScrollView>
        </Mat>
        <View style={[styles.mid, { width: 12 * u, gap: 0.8 * u }]}>
          <TableInfo u={u} g={g} />
          <CenterBox u={u} label="DESTE" drag={deckDrag}>
            <TileBack w={9 * u} h={11 * u} fs={6.4 * u} count={g.deck.length} hot={canDraw} />
          </CenterBox>
          <CenterBox u={u} label="GÖSTERGE">
            <TileFace tile={g.gosterge} w={9 * u} h={11 * u} fs={6.4 * u} />
          </CenterBox>
        </View>
        <Mat u={u} title="ÇİFTLER" limit={kat ? String(GM.pairsNeed()) : null} side="right" style={{ width: 34 * u, zIndex: 3 }}>
          {/* çiftler üç sütunda: her sütun yukarıdan aşağı dolar */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 3 * u, bottom: u, left: '33.3%', width: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', top: 3 * u, bottom: u, left: '66.6%', width: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />
          <ScrollView contentContainerStyle={{ flexDirection: 'row', paddingTop: 3.4 * u, paddingBottom: 0.8 * u }}>
            {[0, 1, 2].map(c => {
              const cap = Math.max(7, Math.ceil(pairs.length / 3));
              return (
                <View key={c} style={{ width: '33.33%', alignItems: 'center', gap: 0.8 * u * ms }}>
                  {pairs.slice(c * cap, (c + 1) * cap).map(m => <MeldView key={m.id} u={u} m={m} ms={ms} setRef={setMeldRef} over={over === String(m.id)} />)}
                </View>
              );
            })}
          </ScrollView>
        </Mat>
        <View style={[styles.col, { width: 17.5 * u, gap: 0.8 * u, paddingBottom: 6.5 * u }]}>
          <Corner u={u} tile={lastOf(1)} />
          <SidePlate u={u} i={1} g={g} cur={giftOf(1)} onGift={() => setGiftFor(1)} />
        </View>
      </View>

      {/* ---- benim bölümüm ---- */}
      <View style={[styles.me, { marginTop: 0.8 * u }]}>
        <View style={{ width: 17.5 * u, alignItems: 'center', marginTop: -7.5 * u, alignSelf: 'stretch' }}>
          <Corner u={u} cref={yanRef} tile={ghost && ghost.src === 'side' ? prevOf(3) : lastOf(3)} hot={canSide && !!lastOf(3)} drag={sideDrag} />
          {disc && P.sideTile && !P.sideUsed ? (
            <Btn u={u} label="Geri Bırak" onPress={() => feedback(GM.hReturnSide())}
              style={{ marginTop: 0.8 * u, width: 15.5 * u, paddingHorizontal: 0.6 * u, backgroundColor: 'rgba(255,187,51,0.18)', borderColor: 'rgba(255,187,51,0.7)' }} />
          ) : null}
          {!hard ? <DizBtn u={u} label={'SERİ\nDİZ'} h={geom.height - (disc && P.sideTile && !P.sideUsed ? 9 * u : 0)} onPress={() => { GM.hArrange('seri'); bumpRack(); tick(); }} /> : null}
        </View>
        <View style={{ width: rackW, gap: 0.5 * u, zIndex: 10 }}>
          <View style={[styles.srow, { gap: 1.2 * u }]}>
            <View style={[styles.meplate, { height: 6 * u, borderRadius: 3 * u, paddingLeft: 0.6 * u, paddingRight: 1.4 * u, gap: 0.9 * u, flexShrink: 0 }, g.turn === 0 && g.phase !== 'over' && styles.plateOn]}>
              <Avatar u={u} i={0} name={P.name} size={4.8} />
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.nm, { fontSize: 2.4 * u }]}>{L.wallet().name}</Text>
              {stateChips(u, P)}
            </View>
            {giftOf(0) ? (
              <Pressable onPress={() => setGiftFor(0)} style={{ width: 6.6 * u, height: 6.6 * u, borderRadius: 1.2 * u, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: -0.6 * u }}>
                <GiftIcon name={giftOf(0).em} size={6.2 * u} />
              </Pressable>
            ) : null}
            <ClockPill u={u} who="me" style={{ alignSelf: 'center' }} />
            <View style={{ flex: 1, alignItems: statusMsg ? 'flex-start' : 'flex-end' }}>
              {statusMsg ? <Text allowFontScaling={false} numberOfLines={2} style={{ color: statusKind === 'task' ? '#7ef0b5' : '#ffc0b9', fontWeight: '700', fontSize: 2.3 * u }}>{statusMsg}</Text>
                : <Text allowFontScaling={false} style={{ color: C.amber, fontFamily: NUM_FONT, fontWeight: '700', fontSize: 2.6 * u, letterSpacing: 0.1 * u }}>Toplam {fmt(g.totals[0])}{penMine ? ' · Bu el ceza +' + penMine : ''}</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 0.7 * u }}>
              <Btn u={u} pri label={seriLbl} disabled={!(seriOn && !(pd && pd.kind !== 'seri'))} onPress={() => feedback(!P.opened ? GM.hOpen('seri', true) : GM.hLay())} />
              <Btn u={u} pri label={ciftLbl} disabled={!(ciftOn && !(pd && pd.kind !== 'cift'))} onPress={() => feedback(!P.opened ? GM.hOpen('cift', true) : GM.hProcessPairs([]))} />
              {P.opened && !hard ? <Btn u={u} label="Tümünü İşle" disabled={!disc} onPress={() => feedback(GM.hProcessAll())} /> : null}
              {showRegather ? <Btn u={u} label="Geri Topla" disabled={!disc} onPress={() => feedback(GM.hRegather())} /> : null}
            </View>
          </View>
          <View ref={rackRef} collapsable={false}>
            <Rack slots={P.slots} geom={geom} ver={rackVer} marks={marks} freshId={g.freshId} gbId={gbId} hwIds={hwIds}
              myTurn={g.turn === 0 && g.phase !== 'over'} onDrop={onDrop} onDropOut={onDropOut} onGost={onGost} onHoverOut={onHoverOut} />
          </View>
        </View>
        <View style={{ width: 17.5 * u, alignItems: 'center', marginTop: -7.5 * u, alignSelf: 'stretch' }}>
          <Corner u={u} cref={atRef} tile={lastOf(0)} hot={disc} over={over === 'at'} />
          {!hard ? <DizBtn u={u} label={'ÇİFT\nDİZ'} h={geom.height} onPress={() => { GM.hArrange('cift'); bumpRack(); tick(); }} /> : null}
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
                    <Text allowFontScaling={false} style={[styles.resName, { fontSize: 2.6 * u, width: 18 * u }, i === handEnd.rec.winner && { color: C.amber }]}>{i === 0 ? L.wallet().name : p.name}</Text>
                    <Text allowFontScaling={false} numberOfLines={1} style={{ flex: 1, color: C.muted, fontSize: 2 * u }}>{r.notes.join(', ')}</Text>
                    <Text allowFontScaling={false} style={{ color: '#fff', width: 12 * u, textAlign: 'right', fontWeight: '700', fontSize: 2.6 * u }}>{r.total > 0 ? '+' + r.total : fmt(r.total)}</Text>
                    <Text allowFontScaling={false} style={{ color: C.amber, width: 12 * u, textAlign: 'right', fontWeight: '800', fontSize: 2.6 * u }}>{fmt(g.totals[i])}</Text>
                  </View>
                );
              })}
              <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u, marginTop: u, textAlign: 'center' }}>El {g.hands.length} / {g.cfg.hands} · Az puan kazanır</Text>
              <View style={{ marginTop: 2 * u, alignItems: 'center' }}>
                <Btn u={u} pri label={handEnd.last ? 'Sonucu Gör' : 'Sonraki El'} onPress={nextHand} />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={!!settle} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          {settle ? (() => {
            const order = [0, 1, 2, 3].sort((a, b) => g.totals[a] - g.totals[b]);
            const best = g.totals[order[0]];
            const mine = g.cfg.team ? ((g.totals[0] + g.totals[2]) < (g.totals[1] + g.totals[3]) ? 'Tebrikler, takımınız oyunu kazandı!' : (g.totals[0] + g.totals[2]) === (g.totals[1] + g.totals[3]) ? 'Berabere bitti.' : 'Rakip takım oyunu kazandı.')
              : g.totals[0] === best ? 'Tebrikler, oyunu sen kazandın!' : g.players[order[0]].name + ' oyunu kazandı.';
            const po = [0, 1, 2, 3].sort((a, b) => settle.r.pay[b] - settle.r.pay[a]);
            return (
              <View style={[styles.modal, { borderRadius: 2.4 * u, padding: 3 * u }]}>
                <Text allowFontScaling={false} style={[styles.modalT, { fontSize: 4.2 * u }]}>Oyun Bitti</Text>
                <Text allowFontScaling={false} style={{ color: C.muted, textAlign: 'center', fontSize: 2.3 * u }}>{mine}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginVertical: 1.4 * u }}>
                  <Coin s={4 * u} />
                  <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 4.4 * u, color: settle.net > 0 ? C.good : settle.net < 0 ? '#ff8a7a' : C.ink }}>{settle.net > 0 ? '+' + L.chipFmt(settle.net) : settle.net < 0 ? '−' + L.chipFmt(-settle.net) : '±0'} çip</Text>
                  <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2.2 * u, marginLeft: 1.4 * u }}>Bakiye: {L.chipFmt(L.wallet().chips)}</Text>
                </View>
                {po.map(i => (
                  <View key={i} style={[styles.resRow, { paddingVertical: 0.7 * u }, i === 0 && { backgroundColor: 'rgba(255,187,51,0.1)' }]}>
                    <Text allowFontScaling={false} style={[styles.resName, { fontSize: 2.4 * u, flex: 1 }]}>{i === 0 ? L.wallet().name : g.players[i].name}</Text>
                    <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u, marginRight: 2 * u }}>{settle.r.fee[i] ? 'masa ücreti −' + L.chipFmt(settle.r.fee[i]) : settle.r.pay[i] && settle.r.pay[i] <= table.bet ? 'bahis iadesi' : ''}</Text>
                    <Text allowFontScaling={false} style={{ color: settle.r.pay[i] ? C.good : C.muted, fontWeight: '800', fontSize: 2.4 * u, width: 14 * u, textAlign: 'right' }}>{settle.r.pay[i] ? '+' + L.chipFmt(settle.r.pay[i]) : '0'}</Text>
                  </View>
                ))}
                {settle.up ? <Text allowFontScaling={false} style={{ color: C.amber, textAlign: 'center', fontSize: 2.4 * u, fontWeight: '800', marginTop: u }}>SEVİYE {settle.up.lv} · Seviye ödülü: +{L.chipFmt(settle.up.reward)} çip</Text> : null}
                <Text allowFontScaling={false} style={{ color: C.muted, textAlign: 'center', fontSize: 1.9 * u, marginTop: u }}>{g.cfg.team ? 'Kazanan takım ortadaki çipleri paylaşır. Kazananların payından %7 masa ücreti kesilir.' : 'Birinci, ortadaki çiplerin kalanını alır ve kazancından %7 masa ücreti kesilir. İkinci, yatırdığı çipi geri alır.'}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: u, marginTop: 2 * u }}>
                  <Btn u={u} pri label="Aynı Masada Tekrar" onPress={() => { setSettle(null); onAgain(); }} />
                  <Btn u={u} label="Lobiye Dön" onPress={() => { setSettle(null); leave(null); }} />
                  <Btn u={u} label="Yazboz" onPress={() => setScoreOpen(true)} />
                </View>
              </View>
            );
          })() : null}
        </View>
      </Modal>

      <Modal visible={giftFor !== null} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          {giftFor !== null ? (() => {
            const i = giftFor, P = g.players[i], cur = giftOf(i), cat = GIFT_CATS.find(c => c.id === gcat) || GIFT_CATS[0];
            const curName = cur ? cur.em : '';
            const mp = !cur ? '' : cur.kind === 'oz' ? 'Üzerinde kalıcı hediye var (' + curName + '). Bu oyuncuya sadece Kalıcı bölümünden hediye gönderebilirsin.'
              : 'Üzerinde ' + L.chipFmt(cur.p) + ' çiplik bir hediye var (' + curName + '). Ondan daha pahalı bir hediye ya da Kalıcı hediye gönderebilirsin.';
            const nm = i === 0 ? L.wallet().name : P.name;
            return (
              <View style={[styles.modal, { width: '88%', maxHeight: '94%', borderRadius: 2.4 * u, padding: 2.2 * u }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.2 * u }}>
                  <Avatar u={u} i={i} name={nm} size={6} />
                  <View style={{ flex: 1 }}>
                    <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '800', fontSize: 3 * u }}>{nm}{g.cfg.team && i ? (i === 2 ? ' · Eşin' : ' · Rakip') : ''}</Text>
                    <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u }}>Seviye {i === 0 ? L.levelInfo(L.wallet().st.xp).lv : botLv(P.name)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,201,60,0.45)', borderRadius: 3 * u, paddingVertical: 0.6 * u, paddingHorizontal: 1.3 * u }}>
                    <Coin s={2.4 * u} /><Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.6 * u, color: '#ffe39a' }}>{L.chipFmt(L.wallet().chips)}</Text>
                  </View>
                </View>
                {i === 0 ? (
                  <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2.1 * u, marginTop: u }}>{cur ? 'Üzerindeki hediye: ' + cur.em : ''}</Text>
                ) : (
                  <>
                    {mp ? <Text allowFontScaling={false} style={{ color: '#ffe39a', fontSize: 1.9 * u, marginTop: u }}>{mp}</Text> : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0.6 * u, marginTop: 1.2 * u }}>
                      {GIFT_CATS.map(c => (
                        <Pressable key={c.id} onPress={() => setGcat(c.id)} style={{ paddingHorizontal: 1.4 * u, paddingVertical: 0.7 * u, borderRadius: u, backgroundColor: c.id === cat.id ? C.amber : 'rgba(255,255,255,0.1)' }}>
                          <Text allowFontScaling={false} style={{ fontWeight: '800', fontSize: 2.1 * u, color: c.id === cat.id ? C.amberInk : C.ink }}>{c.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <ScrollView style={{ marginTop: 1.2 * u }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: u }}>
                      {cat.items.slice().sort((a, b) => a[2] - b[2]).map(it => {
                        const why = giftBlock(cur, cat, it[2]), off = !!why || L.wallet().chips < it[2];
                        return (
                          <Pressable key={it[0]} disabled={off} onPress={() => sendGift(i, cat, it)} style={[{ width: 15 * u, alignItems: 'center', paddingVertical: u, borderRadius: 1.4 * u, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.3)' }, off && { opacity: 0.4 }]}>
                            <Text allowFontScaling={false} numberOfLines={1} style={{ color: C.ink, fontWeight: '700', fontSize: 1.8 * u }}>{it[0]}</Text>
                            <GiftIcon name={it[0]} size={8 * u} />
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Coin s={1.8 * u} /><Text allowFontScaling={false} style={{ color: '#ffe39a', fontWeight: '800', fontSize: 1.9 * u }}>{L.chipShort(it[2])}</Text></View>
                            {why ? <Text allowFontScaling={false} style={{ color: '#ffb3a8', fontSize: 1.4 * u }}>{why}</Text> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.8 * u, marginTop: u }}>{cat.forever ? 'Kalıcı hediyeler süresizdir: başka biri farklı bir kalıcı hediye gönderene kadar oyuncunun kutusunda kalır. Her biri 1 milyon çip.' : cat.perm ? 'Günlük hediyeler 24 saat boyunca oyuncunun kutusunda durur; aynı oyuncuyla başka masada karşılaşırsan da görünür.' : 'Hediye oyun bitene kadar oyuncunun kutusunda durur. Takılmalık hediyelerle dalga geçmek serbest!'}</Text>
                  </>
                )}
                <View style={{ alignItems: 'center', marginTop: 1.4 * u }}><Btn u={u} pri label="Kapat" onPress={() => setGiftFor(null)} /></View>
              </View>
            );
          })() : null}
        </View>
      </Modal>

      <SettingsModal u={u} visible={setOpen} set={set} saveSet={saveSet} onClose={() => setSetOpen(false)} onRules={() => { setSetOpen(false); setRulesOpen('rules'); }} onHowto={() => { setSetOpen(false); setRulesOpen('howto'); }}
        onLogout={() => { setSetOpen(false); AsyncStorage.removeItem(LOGIN_KEY).catch(() => {}); setScreen('login'); }} />
      <RulesModal u={u} visible={!!rulesOpen} howto={rulesOpen === 'howto'} onClose={() => { const h = rulesOpen === 'howto'; setRulesOpen(false); if (h) setSetOpen(true); }} />
      <Modal visible={menuOpen} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          {table ? (
            <View style={[styles.modal, { borderRadius: 2.4 * u, padding: 3 * u }]}>
              <Text allowFontScaling={false} style={[styles.modalT, { fontSize: 4.2 * u }]}>Masa</Text>
              <Text allowFontScaling={false} style={{ color: C.muted, textAlign: 'center', fontSize: 2.2 * u }}>Bahis {L.chipFmt(table.bet)} çip · {L.tableTags(table).join(' · ')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 0.6 * u, marginTop: u }}>
                {L.modeList(table.pen).map(([n, on]) => (
                  <Text key={n} allowFontScaling={false} style={{ fontSize: 1.9 * u, fontWeight: '700', color: on ? '#7ef0b5' : '#ff9a9a', borderWidth: 1, borderColor: on ? 'rgba(126,240,181,0.55)' : 'rgba(255,120,120,0.45)', borderRadius: u, paddingHorizontal: u, paddingVertical: 0.4 * u }}>{on ? '✓ ' : '✕ '}{n}</Text>
                ))}
              </View>
              <Text allowFontScaling={false} style={{ color: C.muted, textAlign: 'center', fontSize: 2.1 * u, marginTop: 1.4 * u }}>Oyun bitmeden masadan kalkarsan ortaya koyduğun {L.chipFmt(table.bet)} çip geri gelmez.</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: u, marginTop: 2 * u }}>
                <Btn u={u} pri label="Oyuna Dön" onPress={() => setMenuOpen(false)} />
                <Btn u={u} label="Ayarlar" onPress={() => { setMenuOpen(false); setSetOpen(true); }} />
                <Btn u={u} label="Kurallar" onPress={() => { setMenuOpen(false); setRulesOpen('rules'); }} />
                <Btn u={u} label="Masadan Kalk" style={{ backgroundColor: 'rgba(255,107,94,0.25)', borderColor: 'rgba(255,107,94,0.6)' }} onPress={() => { setMenuOpen(false); L.recordGame(false, 0); leave({ m: 'Masadan kalktın: ' + L.chipFmt(table.bet) + ' çip gitti', bad: true }); }} />
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
              {g.players.map((p, i) => <Text key={i} allowFontScaling={false} style={{ flex: 1, textAlign: 'right', color: '#fff', fontWeight: '800', fontSize: 2.4 * u }}>{i === 0 ? L.wallet().name : p.name}</Text>)}
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

// ---------- uygulama: lobi ↔ masa ----------
function Root() {
  const ins = useSafeAreaInsets();
  const win = useWindowDimensions();
  const u = Math.min(win.width, win.height) / 100;
  const [ready, setReady] = useState(false);
  const [set, setSet] = useState(DEF_SET);
  const [screen, setScreen] = useState('login');
  const [table, setTable] = useState(null);
  const [flash, setFlash] = useState(null);
  const [setOpen, setSetOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    Promise.all([AsyncStorage.getItem(SET_KEY).catch(() => null), L.loadWallet().catch(() => null), loadPerm().catch(() => null), AsyncStorage.getItem(LOGIN_KEY).catch(() => null)]).then(([v, , , lg]) => {
      if (lg) setScreen('lobby');
      let st = DEF_SET;
      try { if (v) st = { ...DEF_SET, ...JSON.parse(v) }; } catch (e) { /* bozuk kayıt */ }
      FEEL.vibrate = st.vibrate !== false; SOUND.on = st.sound !== false;
      setSet(st); setReady(true);
    });
  }, []);
  const saveSet = (st) => { setSet(st); FEEL.vibrate = st.vibrate !== false; SOUND.on = st.sound !== false; AsyncStorage.setItem(SET_KEY, JSON.stringify(st)).catch(() => {}); };
  const start = (t, cfg) => { CLK.tOut = 0; CLK.cKey = null; setTable(t); GM.newGame(cfg); setScreen('game'); };

  if (!ready) return <View style={styles.root} />;
  if (screen === 'login') {
    return (
      <>
        <StatusBar hidden />
        <LoginScreen u={u} ins={ins} onHelp={() => setRulesOpen('howto')}
          onGuest={() => { AsyncStorage.setItem(LOGIN_KEY, 'guest').catch(() => {}); setScreen('lobby'); }} />
        <RulesModal u={u} visible={!!rulesOpen} howto={rulesOpen === 'howto'} onClose={() => setRulesOpen(false)} />
      </>
    );
  }
  if (screen === 'game' && table) {
    return <Game key={table.id + ':' + GM.getG().epoch} set={set} saveSet={saveSet} table={table}
      onLeave={(f) => { setScreen('lobby'); setFlash(f ? { ...f, at: Date.now() } : null); }}
      onAgain={() => {
        const s = L.SALONS[table.salon];
        if (!L.canEnter(s)) { setScreen('lobby'); setFlash({ m: L.enterMsg(s), bad: true, at: Date.now() }); return; }
        if (!L.canSit(table.bet)) { setScreen('lobby'); setFlash({ m: 'Aynı masa için yeterli çipin kalmadı.', bad: true, at: Date.now() }); return; }
        L.addChips(-table.bet); start(table, L.tableCfg(table, 'Sen'));
      }} />;
  }
  return (
    <>
      <StatusBar hidden />
      <LobbyScreen u={u} ins={ins} set={set} saveSet={saveSet} onStart={start} flash={flash} openSettings={() => setSetOpen(true)}
        onLogout={() => { AsyncStorage.removeItem(LOGIN_KEY).catch(() => {}); setScreen('login'); }} />
      <SettingsModal u={u} visible={setOpen} set={set} saveSet={saveSet} onClose={() => setSetOpen(false)} onRules={() => { setSetOpen(false); setRulesOpen('rules'); }} onHowto={() => { setSetOpen(false); setRulesOpen('howto'); }} />
      <RulesModal u={u} visible={!!rulesOpen} howto={rulesOpen === 'howto'} onClose={() => { const h = rulesOpen === 'howto'; setRulesOpen(false); if (h) setSetOpen(true); }} />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Root />
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
  mat: { backgroundColor: '#0f3036', borderColor: '#07181b' },
  limWrap: { position: 'absolute', zIndex: 5, flexDirection: 'row', alignItems: 'center' },
  limPill: { backgroundColor: '#24489c', borderColor: '#a9c2ff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  limTip: { backgroundColor: '#a9c2ff', transform: [{ rotate: '45deg' }], zIndex: -1 },
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
  stH: { color: C.amber, fontWeight: '800' },
  stBox: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.25)' },
  stBoxH: { color: C.amber, fontFamily: NUM_FONT, fontWeight: '800', textAlign: 'center', letterSpacing: 1, marginBottom: 6 },
  qp: { borderWidth: 1 },
  qpAny: { borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(0,0,0,0.35)' },
  qpOn: { borderColor: 'rgba(126,240,181,0.55)', backgroundColor: 'rgba(40,140,90,0.25)' },
  qpOff: { borderColor: 'rgba(255,120,120,0.45)', backgroundColor: 'rgba(140,40,40,0.22)' },
  ruleLi: { color: C.ink, lineHeight: undefined },
  mchip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.35)' },
  mchipOn: { borderColor: 'rgba(255,187,51,0.7)', backgroundColor: 'rgba(255,187,51,0.12)' },
  box2: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
});
