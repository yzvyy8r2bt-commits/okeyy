// Istaka: 2 sıra x 15 yuva. Taşlar UI thread'inde (Reanimated) sürüklenir,
// böylece parmak takibi JavaScript'i beklemeden 60/120 fps akar.
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';
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
  'worklet';
  const r = Math.floor(slot / COLS), c = slot % COLS;
  return { x: g.pad + c * (g.cellW + g.gap), y: g.pad + r * (g.tileH + g.rowGap) };
}

function hapticLift() { Haptics.selectionAsync().catch(() => {}); }

function DraggableTile({ tile, slot, geom, ver, mark, onDrop }) {
  const p0 = slotXY(geom, slot);
  const x = useSharedValue(p0.x);
  const y = useSharedValue(p0.y);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const lift = useSharedValue(0);

  // yuva değişince (dizme, araya sokma, kayma) yumuşakça yerine git
  useEffect(() => {
    const p = slotXY(geom, slot);
    x.value = withTiming(p.x, { duration: 160 });
    y.value = withTiming(p.y, { duration: 160 });
  }, [slot, geom, ver]);

  const pan = useMemo(() => Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .onBegin(() => {
      sx.value = x.value; sy.value = y.value;
      lift.value = withTiming(1, { duration: 70 });
      runOnJS(hapticLift)();
    })
    .onUpdate((e) => {
      x.value = sx.value + e.translationX;
      y.value = sy.value + e.translationY;
    })
    .onEnd(() => {
      const step = geom.cellW + geom.gap;
      const cx = x.value + geom.cellW / 2 - geom.pad;
      const raw = cx / step;
      let col = Math.floor(raw);
      let after = raw - col > 0.5;
      if (col < 0) { col = 0; after = false; }
      if (col > COLS - 1) { col = COLS - 1; after = true; }
      const cy = y.value + geom.tileH / 2;
      const row = cy < geom.pad + geom.tileH + geom.rowGap / 2 ? 0 : 1;
      const to = row * COLS + col;
      if (to === slot) {
        const p = slotXY(geom, slot);
        x.value = withSpring(p.x, { damping: 22, stiffness: 320 });
        y.value = withSpring(p.y, { damping: 22, stiffness: 320 });
      } else {
        runOnJS(onDrop)(slot, to, after);
      }
    })
    .onFinalize(() => {
      lift.value = withTiming(0, { duration: 120 });
    }), [slot, geom, onDrop]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value - lift.value * geom.tileH * 0.12 },
      { scale: 1 + lift.value * 0.1 },
    ],
    zIndex: lift.value > 0 ? 100 : 1,
    elevation: lift.value > 0 ? 12 : 2,
    shadowOpacity: 0.25 + lift.value * 0.35,
    shadowRadius: 2 + lift.value * 8,
  }));

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
