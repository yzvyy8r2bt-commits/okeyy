// Istaka: 2 sıra x 15 yuva. Dokunmayı telefonun yerel jest sistemi (gesture-handler)
// yakalar; taşın konumu React'i yeniden çizmeden doğrudan güncellenir.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import TileFace from './Tile';

export const COLS = 15;
export const ROWS = 2;

// Web'deki .rackbox / .rrow ölçüleri (u = ekran yüksekliği / 100)
export function rackGeom(width, u) {
  const bw = 0.35 * u, padX = 1 * u, padY = 0.9 * u;   // çerçeve ve iç boşluk
  const rowH = 12.8 * u, rowGap = 0.8 * u, rpx = 0.4 * u, rpy = 0.5 * u, gap = 0.25 * u;
  const inner = width - 2 * (bw + padX);
  const cellW = (inner - 2 * rpx - gap * (COLS - 1)) / COLS;
  const tileH = rowH - 2 * rpy - 0.6 * u;
  const ox = padX, oy = padY;   // çocuklar çerçevenin içinden konumlanır
  const height = 2 * (bw + padY) + ROWS * rowH + rowGap;
  return { u, width, height, cellW, tileH, gap, rowH, rowGap, rpx, rpy, ox, oy, fs: 6.8 * u };
}

function slotXY(g, slot) {
  const r = Math.floor(slot / COLS), c = slot % COLS;
  return { x: g.ox + g.rpx + c * (g.cellW + g.gap), y: g.oy + r * (g.rowH + g.rowGap) + g.rpy };
}

function DraggableTile({ tile, slot, geom, ver, mark, fresh, gb, onDrop, onDropOut }) {
  const p0 = slotXY(geom, slot);
  const pos = useRef(new Animated.ValueXY(p0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const cur = useRef({ ...p0 });
  const st = useRef({ x: 0, y: 0 });
  const [up, setUp] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    const id = pos.addListener(v => { cur.current = v; });
    return () => pos.removeListener(id);
  }, []);

  // yuva değişince (dizme, araya sokma, kayma) yumuşakça yerine git
  useEffect(() => {
    if (dragging.current) return;
    Animated.timing(pos, { toValue: slotXY(geom, slot), duration: 150, useNativeDriver: false }).start();
  }, [slot, geom, ver]);

  const pan = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .maxPointers(1)
    .onBegin(() => {
      dragging.current = true;
      pos.stopAnimation();
      st.current = { ...cur.current };
      setUp(true);
      Animated.timing(lift, { toValue: 1, duration: 70, useNativeDriver: false }).start();
      Haptics.selectionAsync().catch(() => {});
    })
    .onUpdate((e) => {
      pos.setValue({ x: st.current.x + e.translationX, y: st.current.y + e.translationY });
    })
    .onEnd(() => {
      const { x, y } = cur.current;
      const cx = x + geom.cellW / 2, cy = y + geom.tileH / 2;
      if (onDropOut && (cy < 0 || cx < 0 || cx > geom.width)) {   // ıstakanın dışına bırakıldı: at / yan / işle
        Animated.spring(pos, { toValue: slotXY(geom, slot), friction: 7, tension: 140, useNativeDriver: false }).start();
        onDropOut(tile, cx, cy);
        return;
      }
      const step = geom.cellW + geom.gap;
      const raw = (x + geom.cellW / 2 - geom.ox - geom.rpx) / step;
      let col = Math.floor(raw);
      let after = raw - col > 0.5;
      if (col < 0) { col = 0; after = false; }
      if (col > COLS - 1) { col = COLS - 1; after = true; }
      const row = y + geom.tileH / 2 < geom.oy + geom.rowH + geom.rowGap / 2 ? 0 : 1;
      const to = row * COLS + col;
      if (to === slot) {
        Animated.spring(pos, { toValue: slotXY(geom, slot), friction: 7, tension: 140, useNativeDriver: false }).start();
      } else onDrop(slot, to, after);
    })
    .onFinalize(() => {
      dragging.current = false;
      Animated.timing(lift, { toValue: 0, duration: 120, useNativeDriver: false }).start(() => setUp(false));
    }), [slot, geom, onDrop, onDropOut, tile]);

  const style = {
    transform: [
      { translateX: pos.x },
      { translateY: Animated.add(pos.y, Animated.multiply(lift, -geom.tileH * 0.12)) },
      { scale: Animated.add(1, Animated.multiply(lift, 0.1)) },
    ],
    zIndex: up ? 100 : 1,
    elevation: up ? 12 : 2,
    shadowOpacity: up ? 0.55 : 0.25,
    shadowRadius: up ? 10 : 2,
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.tileWrap, style]}>
        <TileFace tile={tile} w={geom.cellW} h={geom.tileH} fs={geom.fs} mark={mark} glow={fresh} gb={gb} />
      </Animated.View>
    </GestureDetector>
  );
}

export default function Rack({ slots, geom, ver, marks, freshId, gbId, myTurn, onDrop, onDropOut }) {
  const g = geom;
  const rows = [0, 1].map(r => (
    <View key={'r' + r} style={[styles.row, { left: g.ox, right: g.ox, top: g.oy + r * (g.rowH + g.rowGap), height: g.rowH, borderRadius: g.u }]} />
  ));
  const holes = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const p = slotXY(g, i);
    holes.push(<View key={'h' + i} style={[styles.hole, { left: p.x, top: p.y, width: g.cellW, height: g.tileH + 0.6 * g.u, borderRadius: 0.7 * g.u }]} />);
  }
  const tiles = [];
  slots.forEach((t, i) => {
    if (!t) return;
    tiles.push(
      <DraggableTile key={t.id} tile={t} slot={i} geom={g} ver={ver}
        mark={marks.meld.has(t.id) ? 'meld' : marks.pair.has(t.id) ? 'pair' : null}
        fresh={t.id === freshId} gb={t.id === gbId} onDrop={onDrop} onDropOut={onDropOut} />,
    );
  });
  return (
    <View style={[styles.rack, { width: g.width, height: g.height, borderRadius: 2.2 * g.u, borderWidth: 0.35 * g.u }, myTurn && styles.rackOn]}>
      <View style={[styles.rim, { height: 0.35 * g.u, borderTopLeftRadius: 2.2 * g.u, borderTopRightRadius: 2.2 * g.u }]} />
      {rows}
      {holes}
      {tiles}
    </View>
  );
}

const styles = StyleSheet.create({
  rack: { backgroundColor: '#43203a', borderColor: '#1b0a17', shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  rackOn: { borderColor: '#ffbb33', shadowColor: '#ffbb33', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: 'rgba(255,187,51,0.45)' },
  row: { position: 'absolute', backgroundColor: 'rgba(14,4,12,0.55)' },
  hole: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.25)' },
  tileWrap: {
    position: 'absolute', left: 0, top: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
  },
});
