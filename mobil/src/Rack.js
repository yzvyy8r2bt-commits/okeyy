// Istaka: 2 sıra x 15 yuva. Dokunmayı telefonun yerel jest sistemi (gesture-handler)
// yakalar; taşın konumu React'i yeniden çizmeden doğrudan güncellenir.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import TileFace from './Tile';

export const COLS = 15;
export const ROWS = 2;

export function rackGeom(width, maxHeight) {
  const pad = Math.max(6, width * 0.012);
  const gap = Math.max(2, width * 0.003);
  let cellW = (width - pad * 2 - gap * (COLS - 1)) / COLS;
  let tileH = cellW * 1.42;
  const rowGap = pad * 0.9;
  const needH = pad * 2 + tileH * ROWS + rowGap;
  if (maxHeight && needH > maxHeight) {   // kısa ekranda taşı yüksekliğe sığdır
    tileH = (maxHeight - pad * 2 - rowGap) / ROWS;
  }
  const height = pad * 2 + tileH * ROWS + rowGap;
  return { width, height, pad, gap, cellW, tileH, rowGap };
}

function slotXY(g, slot) {
  const r = Math.floor(slot / COLS), c = slot % COLS;
  return { x: g.pad + c * (g.cellW + g.gap), y: g.pad + r * (g.tileH + g.rowGap) };
}

function DraggableTile({ tile, slot, geom, ver, mark, onDrop }) {
  const p0 = slotXY(geom, slot);
  const pos = useRef(new Animated.ValueXY(p0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const cur = useRef({ ...p0 });
  const st = useRef({ x: 0, y: 0 });
  const [up, setUp] = useState(false);

  useEffect(() => {
    const id = pos.addListener(v => { cur.current = v; });
    return () => pos.removeListener(id);
  }, []);

  // yuva değişince (dizme, araya sokma, kayma) yumuşakça yerine git
  useEffect(() => {
    Animated.timing(pos, { toValue: slotXY(geom, slot), duration: 150, useNativeDriver: false }).start();
  }, [slot, geom, ver]);

  const pan = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .maxPointers(1)
    .onBegin(() => {
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
      const step = geom.cellW + geom.gap;
      const raw = (x + geom.cellW / 2 - geom.pad) / step;
      let col = Math.floor(raw);
      let after = raw - col > 0.5;
      if (col < 0) { col = 0; after = false; }
      if (col > COLS - 1) { col = COLS - 1; after = true; }
      const row = y + geom.tileH / 2 < geom.pad + geom.tileH + geom.rowGap / 2 ? 0 : 1;
      const to = row * COLS + col;
      if (to === slot) {
        Animated.spring(pos, { toValue: slotXY(geom, slot), friction: 7, tension: 140, useNativeDriver: false }).start();
      } else onDrop(slot, to, after);
    })
    .onFinalize(() => {
      Animated.timing(lift, { toValue: 0, duration: 120, useNativeDriver: false }).start(() => setUp(false));
    }), [slot, geom, onDrop]);

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
        <TileFace tile={tile} w={geom.cellW} h={geom.tileH} mark={mark} />
      </Animated.View>
    </GestureDetector>
  );
}

export default function Rack({ slots, geom, ver, marks, onDrop }) {
  const holes = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const p = slotXY(geom, i);
    holes.push(
      <View key={'h' + i} style={[styles.hole, {
        left: p.x, top: p.y, width: geom.cellW, height: geom.tileH, borderRadius: geom.cellW * 0.16,
      }]} />,
    );
  }
  const tiles = [];
  slots.forEach((t, i) => {
    if (!t) return;
    tiles.push(
      <DraggableTile key={t.id} tile={t} slot={i} geom={geom} ver={ver}
        mark={marks.meld.has(t.id) ? 'meld' : marks.pair.has(t.id) ? 'pair' : null}
        onDrop={onDrop} />,
    );
  });
  return (
    <View style={[styles.rack, { width: geom.width, height: geom.height }]}>
      <View style={[styles.shelf, { top: geom.pad * 0.4, height: geom.tileH + geom.pad * 1.2 }]} />
      <View style={[styles.shelf, { top: geom.pad + geom.tileH + geom.rowGap - geom.pad * 0.6, height: geom.tileH + geom.pad * 1.2 }]} />
      {holes}
      {tiles}
    </View>
  );
}

const styles = StyleSheet.create({
  rack: {
    backgroundColor: '#4a2236', borderRadius: 14, borderWidth: 3, borderColor: '#1b0a17',
  },
  shelf: { position: 'absolute', left: 4, right: 4, borderRadius: 10, backgroundColor: 'rgba(14,4,12,0.55)' },
  hole: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.25)' },
  tileWrap: {
    position: 'absolute', left: 0, top: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
  },
});
