// Tek bir taşın görünümü (sürükleme yok, sadece çizim)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const TILE_COLORS = ['#d2232b', '#15151c', '#1b5ed8', '#e28900'];

export default function TileFace({ tile, w, h, mark, glow, star }) {
  const fs = w * 0.52;
  const fake = tile.fake;
  const color = fake ? '#7b3fa0' : TILE_COLORS[tile.c] || '#15151c';
  return (
    <View style={[styles.tile, { width: w, height: h, borderRadius: w * 0.16 }, glow && styles.glow]}>
      <View style={[styles.lip, { borderRadius: w * 0.16 }]} />
      <View style={[styles.face, { borderRadius: w * 0.16, bottom: h * 0.06 }]}>
        {fake ? (
          <Text style={[styles.num, { fontSize: fs * 0.95, color }]}>★</Text>
        ) : (
          <>
            <Text style={[styles.num, { fontSize: fs, color }]}>{tile.n}</Text>
            <View style={[styles.ring, { width: fs * 0.3, height: fs * 0.3, borderRadius: fs, backgroundColor: color }]} />
          </>
        )}
        {tile.wild && !star ? <Text style={[styles.okey, { fontSize: fs * 0.3 }]}>OKEY</Text> : null}
        {star ? <Text style={[styles.okey, { fontSize: fs * 0.38 }]}>★</Text> : null}
      </View>
      {mark ? <View style={[styles.mark, { backgroundColor: mark === 'meld' ? '#19c47a' : '#f6b73c' }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { position: 'relative' },
  glow: { borderWidth: 2, borderColor: '#ffc93c' },
  lip: { ...StyleSheet.absoluteFillObject, backgroundColor: '#8f7e5a' },
  face: {
    position: 'absolute', left: 0, right: 0, top: 0,
    backgroundColor: '#fbf3e0', borderWidth: 1, borderColor: '#bfae85',
    alignItems: 'center', justifyContent: 'center',
  },
  num: { fontWeight: '800', letterSpacing: -0.5, includeFontPadding: false },
  ring: { marginTop: 2 },
  okey: { position: 'absolute', top: 2, fontWeight: '800', color: '#7b3fa0' },
  mark: { position: 'absolute', left: '12%', right: '12%', bottom: '9%', height: 3, borderRadius: 2 },
});
