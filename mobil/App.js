// Kahve Usulü 101 Okey — App Store / Play Store sürümü (Expo)
// 1. aşama: ıstaka + akıcı taş sürükleme denemesi
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Rack, { rackGeom, COLS, ROWS } from './src/Rack';
import TileFace from './src/Tile';
const E = require('./src/engine');

function newDeal() {
  const d = E.dealHand(0);
  const slots = new Array(COLS * ROWS).fill(null);
  E.shuffle(d.hands[0].slice()).forEach((t, k) => { slots[k] = t; });
  return { slots, gosterge: d.gosterge, okey: d.okey };
}

// web sürümündeki hArrange ile aynı mantık
function arrange(slots, kind) {
  const tiles = slots.filter(Boolean);
  let groups;
  if (kind === 'seri') {
    const plan = E.bestSeries(tiles);
    groups = plan.melds.map(m => m.items.map(i => i.t));
    if (plan.leftover.length) groups.push(E.sortTiles(plan.leftover));
  } else if (kind === 'cift') {
    const bp = E.bestPairs(tiles);
    groups = bp.pairs.slice();
    if (bp.leftover.length) groups.push(E.sortTiles(bp.leftover));
  } else groups = E.groupByColor(tiles);
  return E.arrangeSlots(groups);
}

function Btn({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}>
      <Text style={styles.btnTxt}>{label}</Text>
    </Pressable>
  );
}

function Game() {
  const ins = useSafeAreaInsets();
  const [game, setGame] = useState(newDeal);
  const [ver, setVer] = useState(0);
  const win = useWindowDimensions();

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  // yatay ekranda: ıstaka tüm genişliği, ekran yüksekliğinin en fazla %58'ini kullanır
  const W = Math.max(win.width, win.height), Hh = Math.min(win.width, win.height);
  const rackW = W - ins.left - ins.right - 16;
  const geom = useMemo(() => rackGeom(rackW, Hh * 0.58), [rackW, Hh]);
  const gw = Math.min(W * 0.045, Hh * 0.09);

  const onDrop = useCallback((from, to, after) => {
    setGame(g => {
      const s = g.slots.slice();
      insertSlots(s, from, to, after);
      return { ...g, slots: s };
    });
    setVer(v => v + 1);
  }, []);

  const doArrange = (kind) => { setGame(g => ({ ...g, slots: arrange(g.slots, kind) })); setVer(v => v + 1); };

  const an = useMemo(() => E.rackAnalysis(game.slots), [game.slots]);
  const marks = { meld: an.meldIds, pair: an.pairIds };

  return (
    <View style={[styles.root, { paddingLeft: ins.left + 8, paddingRight: ins.right + 8, paddingTop: ins.top + 6, paddingBottom: Math.max(ins.bottom, 6) }]}>
      <StatusBar hidden />
      <View style={styles.table}>
        <View style={styles.info}>
          <Text style={styles.title}>Kahve Usulü 101 Okey</Text>
          <Text style={styles.sub}>Sürükleme denemesi · taşları parmağınla taşı</Text>
          <Text style={styles.score}>Seri: <Text style={styles.scoreN}>{an.points}</Text>   Çift: <Text style={styles.scoreN}>{an.pairs.length}</Text></Text>
        </View>
        <View style={styles.gost}>
          <Text style={styles.gostLbl}>GÖSTERGE</Text>
          <TileFace tile={game.gosterge} w={gw} h={gw * 1.42} />
        </View>
        <View style={styles.btns}>
          <Btn label="Seri Diz" onPress={() => doArrange('seri')} />
          <Btn label="Çift Diz" onPress={() => doArrange('cift')} />
          <Btn label="Renk Diz" onPress={() => doArrange('renk')} />
          <Btn label="Yeni El" onPress={() => { setGame(newDeal()); setVer(v => v + 1); }} />
        </View>
      </View>
      <View style={styles.rackArea}>
        <Rack slots={game.slots} geom={geom} ver={ver} marks={marks} onDrop={onDrop} />
      </View>
    </View>
  );
}

// engine.js'de olmayan, web sürümünden alınan araya sokma işlemi
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
  S[from] = a;
  const b = S[s]; S[s] = a; S[from] = b;
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
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0f5a4f', borderRadius: 16, paddingHorizontal: 14, marginBottom: 8,
    borderWidth: 2, borderColor: '#0a3d36',
  },
  info: { flex: 1 },
  title: { color: '#f6b73c', fontSize: 18, fontWeight: '800' },
  sub: { color: '#bfe9e1', fontSize: 12, marginTop: 2 },
  score: { color: '#e4dcf5', fontSize: 15, marginTop: 6 },
  scoreN: { color: '#fff', fontWeight: '800' },
  gost: { alignItems: 'center', marginHorizontal: 12 },
  gostLbl: { color: 'rgba(190,240,232,0.7)', fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 1 },
  btns: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  btn: { backgroundColor: '#3b1a6b', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#6b3fa8' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rackArea: { alignItems: 'center', justifyContent: 'flex-end' },
});
