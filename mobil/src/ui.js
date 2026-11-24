// Ortak arayüz parçaları (masa ve lobi)
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NUM_FONT } from './Tile';
export { NUM_FONT };

export const C = {
  amber: '#ffbb33', amber2: '#e98a0c', amberInk: '#2d1800', ink: '#f7f0e3', muted: '#bdb0dc',
  line: 'rgba(255,255,255,0.14)', panel: 'rgba(18,8,38,0.78)', good: '#4fe0a3', bad: '#ff6b5e',
};

export const cyc = (arr, v, d) => { const i = arr.indexOf(v); return arr[(i + d + arr.length) % arr.length]; };

export function Btn({ u, label, onPress, pri, sm, disabled, style }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [
      styles.btn, { minHeight: (sm ? 6.6 : 7.4) * u, paddingHorizontal: (sm ? 1.6 : 2 * 1) * u, borderRadius: 1.6 * u },
      pri && [styles.btnPri, { borderBottomWidth: 0.4 * u }], disabled && { opacity: 0.36 }, pressed && { transform: [{ translateY: 1 }], opacity: 0.85 }, style]}>
      <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.btnTxt, { fontSize: (sm ? 2.8 : 2.9) * u }, pri && { color: C.amberInk }]}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ u, label, desc, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.mchip, { borderRadius: 1.2 * u, paddingHorizontal: 1.3 * u, minHeight: 6.8 * u, gap: 1.2 * u, marginBottom: 0.6 * u }, on && styles.mchipOn]}>
      <View style={[styles.box2, { width: 2.6 * u, height: 2.6 * u, borderRadius: 0.6 * u }, on && { backgroundColor: C.amber, borderColor: C.amber }]}>
        {on ? <Text allowFontScaling={false} style={{ color: C.amberInk, fontWeight: '900', fontSize: 1.9 * u }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '700', fontSize: 2.4 * u }}>{label}</Text>
        {desc ? <Text allowFontScaling={false} numberOfLines={2} style={{ color: C.muted, fontSize: 1.75 * u }}>{desc}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Pick({ u, title, val, onPrev, onNext }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0.8 * u }}>
      <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2.1 * u, flex: 1 }}>{title}</Text>
      <Btn u={u} sm label="‹" onPress={onPrev} />
      <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '800', fontSize: 2.4 * u, minWidth: 14 * u, textAlign: 'center' }}>{val}</Text>
      <Btn u={u} sm label="›" onPress={onNext} />
    </View>
  );
}

// altın çip simgesi
export function Coin({ s }) {
  return <View style={{ width: s, height: s, borderRadius: s, backgroundColor: '#ffc93c', borderWidth: Math.max(1, s * 0.09), borderColor: '#b8740a', marginRight: s * 0.35 }} />;
}

const styles = StyleSheet.create({
  btn: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  btnPri: { backgroundColor: '#f7a624', borderColor: 'transparent', borderBottomColor: '#a85d00' },
  btnTxt: { color: C.ink, fontWeight: '800' },
  mchip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.35)' },
  mchipOn: { borderColor: 'rgba(255,187,51,0.7)', backgroundColor: 'rgba(255,187,51,0.12)' },
  box2: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
});
