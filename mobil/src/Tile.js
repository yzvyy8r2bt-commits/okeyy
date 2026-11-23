// Taş görünümü — web sürümündeki .tile ile aynı ölçü ve renkler
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export const TILE_COLORS = ['#d2232b', '#15151c', '#1b5ed8', '#e28900'];
export const NUM_FONT = Platform.select({ ios: 'AvenirNextCondensed-Heavy', default: undefined });

// Sahte okey simgesi (web'deki FAKE_SVG'nin karşılığı)
function FakeIcon({ s }) {
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: s, height: s, borderRadius: s, borderWidth: s * 0.1, borderColor: '#7a3fc4' }} />
      <View style={{ position: 'absolute', width: s * 0.58, height: s * 0.58, borderRadius: s, borderWidth: s * 0.1, borderColor: '#e9a21b' }} />
      <View style={{ width: s * 0.26, height: s * 0.26, backgroundColor: '#12a597', transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

// w,h: taş boyutu; fs: rakam yazı boyutu
export default function TileFace({ tile, w, h, fs, mark, glow, gb }) {
  fs = fs || w * 0.7;
  const lip = Math.max(1.5, h * 0.045);
  const r = Math.max(3, w * 0.12);
  const color = TILE_COLORS[tile.c] || '#15151c';
  return (
    <View style={{ width: w, height: h }}>
      <View style={[styles.lip, { borderRadius: r, top: lip }]} />
      <View style={[styles.face, { borderRadius: r, bottom: lip }, glow && styles.glow]}>
        {tile.fake ? <FakeIcon s={fs * 0.9} /> : (
          <>
            {/* rakamın görünen yüksekliği kadar kutu: yazı tipinin üst/alt boşluğu ortalamayı bozmasın */}
            <View style={{ height: fs * 0.74, alignItems: 'center', overflow: 'visible' }}>
              <Text allowFontScaling={false} style={[styles.num, { fontSize: fs, lineHeight: fs * 1.02, marginTop: fs * 0.02, color }]}>{tile.n}</Text>
            </View>
            <View style={{
              width: fs * 0.3, height: fs * 0.3, borderRadius: fs, marginTop: fs * 0.14,
              backgroundColor: color, borderWidth: Math.max(1, fs * 0.06), borderColor: 'rgba(255,255,255,0.55)',
            }} />
          </>
        )}
        {gb ? <Text style={[styles.gb, { fontSize: fs * 0.26 }]}>G</Text> : null}
      </View>
      {mark ? <View style={[styles.mark, { bottom: h * 0.08, backgroundColor: mark === 'meld' ? '#19c47a' : '#e98a0c' }]} /> : null}
    </View>
  );
}

// Deste: arkası dönük taş ve kalan sayısı
export function TileBack({ w, h, fs, count, hot }) {
  const lip = Math.max(1.5, h * 0.045);
  const r = Math.max(3, w * 0.12);
  const c = fs * 0.62;
  return (
    <View style={{ width: w, height: h }}>
      <View style={[styles.lip, { borderRadius: r, top: lip, backgroundColor: '#a9a9b4' }]} />
      <View style={[styles.face, { borderRadius: r, bottom: lip, backgroundColor: '#f3f3f6', borderColor: '#c9c9d2' }, hot && styles.hot]}>
        <View style={{ width: c * 1.45, height: c * 1.45, borderRadius: c, backgroundColor: '#dcdce2', alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={[styles.num, { fontSize: c, color: '#14141a' }]}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

export function EmptyTile({ w, h, r }) {
  return <View style={{ width: w, height: h, borderRadius: r || w * 0.12, backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' }} />;
}

const styles = StyleSheet.create({
  lip: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#8f7e5a' },
  face: {
    position: 'absolute', left: 0, right: 0, top: 0,
    backgroundColor: '#f8f0dc', borderWidth: 1, borderColor: '#bfae85',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  glow: { borderWidth: 2, borderColor: '#62c8ff' },
  hot: { borderWidth: 2, borderColor: '#ffbb33' },
  num: { fontFamily: NUM_FONT, fontWeight: '800', letterSpacing: -0.5, includeFontPadding: false, textAlign: 'center' },
  gb: { position: 'absolute', left: '6%', top: '4%', fontWeight: '800', color: '#2d1800', backgroundColor: '#ffbb33', borderRadius: 3, paddingHorizontal: 2, overflow: 'hidden' },
  mark: { position: 'absolute', left: '10%', right: '10%', height: 3, borderRadius: 2 },
});
