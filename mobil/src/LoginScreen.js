// Giriş ekranı: logo + Apple / Facebook / Email / Misafir düğmeleri.
// Şimdilik yalnız "Misafir Girişi" çalışır; diğerleri online sürümde açılacak.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { NUM_FONT } from './ui';
import { tick, bump } from './feel';
import { FEATURES } from './config';

// tavandan sarkan ampuller: [x %, ip uzunluğu (u), gecikme]
const BULBS = [[4, 8, 0], [13, 20, 400], [22, 6, 900], [31, 15, 200], [69, 14, 700], [78, 5, 300], [87, 19, 1100], [96, 9, 500]];

function Bulb({ u, x, len, delay }) {
  const glow = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.55, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    a.start(); return () => a.stop();
  }, []);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: x + '%', alignItems: 'center' }}>
      <View style={{ width: 1, height: len * u, backgroundColor: 'rgba(255,255,255,0.35)' }} />
      <View style={{ width: 1.8 * u, height: 1.6 * u, backgroundColor: '#2a2230', borderTopLeftRadius: 0.4 * u, borderTopRightRadius: 0.4 * u }} />
      <Animated.View style={{ opacity: glow, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 9 * u, height: 9 * u, borderRadius: 5 * u, backgroundColor: 'rgba(255,200,90,0.16)' }} />
        <View style={{ width: 3 * u, height: 4 * u, borderRadius: 1.6 * u, backgroundColor: '#ffe7a3', borderWidth: 0.3 * u, borderColor: '#ffd062' }} />
      </Animated.View>
    </View>
  );
}

// logo taşı (okey taşı gibi): krem zemin, renkli rakam
function LogoTile({ u, n, color, tilt }) {
  return (
    <View style={{ width: 15 * u, height: 21 * u, borderRadius: 2 * u, backgroundColor: '#fbf3df', borderWidth: 0.5 * u, borderColor: '#d8c9a2', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: tilt + 'deg' }],
      shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 1.2 * u, shadowOffset: { width: 0, height: 0.8 * u }, elevation: 8 }}>
      <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 14 * u, color, marginTop: -1 * u }}>{n}</Text>
      <View style={{ position: 'absolute', bottom: 2 * u, width: 2.4 * u, height: 2.4 * u, borderRadius: 1.2 * u, backgroundColor: color, opacity: 0.85 }} />
    </View>
  );
}

function Logo({ u }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 1.4 * u, alignItems: 'flex-end' }}>
        <LogoTile u={u} n="1" color="#d9302b" tilt={-8} />
        <LogoTile u={u} n="0" color="#1d1d24" tilt={0} />
        <LogoTile u={u} n="1" color="#1f6fd6" tilt={8} />
      </View>
      {/* kurdele */}
      <View style={{ marginTop: -5 * u, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: -5.5 * u, top: 2 * u, width: 9 * u, height: 7.4 * u, backgroundColor: '#8e1712', transform: [{ skewY: '-8deg' }] }} />
        <View style={{ position: 'absolute', right: -5.5 * u, top: 2 * u, width: 9 * u, height: 7.4 * u, backgroundColor: '#8e1712', transform: [{ skewY: '8deg' }] }} />
        <View style={{ paddingHorizontal: 4.5 * u, height: 9 * u, justifyContent: 'center', backgroundColor: '#c8261f', borderRadius: 1.2 * u, borderWidth: 0.5 * u, borderColor: '#f3d9a8',
          shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 1 * u, shadowOffset: { width: 0, height: 0.6 * u }, elevation: 9 }}>
          <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 6.4 * u, color: '#fff6e3', letterSpacing: 0.5 * u,
            textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 0.4 * u }, textShadowRadius: 0.4 * u }}>KAHVE USULÜ OKEY</Text>
        </View>
      </View>
    </View>
  );
}

function LoginBtn({ u, bg, edge, icon, iconBox, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, height: 10.5 * u, borderRadius: 1.8 * u, backgroundColor: '#0c0612', padding: 0.5 * u, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 1.4 * u, backgroundColor: bg, borderBottomWidth: 0.9 * u, borderBottomColor: edge, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.16)' }} />
        {icon ? (
          <View style={{ width: 8.5 * u, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.3)' }}>
            {iconBox || <Text allowFontScaling={false} style={{ color: '#fff', fontWeight: '900', fontSize: 5 * u }}>{icon}</Text>}
          </View>
        ) : null}
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'center', paddingHorizontal: 1 * u, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.3 * u, color: '#fff',
          textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 0.3 * u }, textShadowRadius: 0.3 * u }}>{label}</Text>
      </View>
    </Pressable>
  );
}

export default function LoginScreen({ u, ins, onGuest, onOffline, onHelp }) {
  const [msg, setMsg] = useState(null);
  const t = useRef(null);
  const soon = (what) => {
    tick();
    clearTimeout(t.current);
    setMsg(what + ' online sürümde açılacak. Şimdilik misafir olarak oynayabilirsin.');
    t.current = setTimeout(() => setMsg(null), 3200);
  };
  useEffect(() => () => clearTimeout(t.current), []);
  const padX = Math.max(ins.left, ins.right, 3 * u);

  return (
    <View style={styles.root}>
      {/* arka plan: koyu mor, altta masa kenarı */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#24104a' }]} />
      <View style={{ position: 'absolute', left: '-20%', right: '-20%', top: '-30%', height: '110%', borderRadius: 999, backgroundColor: 'rgba(120,80,220,0.22)' }} />
      {BULBS.map(([x, len, d], k) => <Bulb key={k} u={u} x={x} len={len} delay={d} />)}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 22 * u, backgroundColor: '#0f5a3a', borderTopWidth: 1.6 * u, borderTopColor: '#6b3a1c' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 22 * u, height: 0.6 * u, backgroundColor: '#a5683a' }} />

      {/* yardım */}
      <Pressable onPress={onHelp} style={{ position: 'absolute', top: Math.max(ins.top, 2.4 * u), right: padX + 1 * u, width: 9 * u, height: 9 * u, borderRadius: 4.5 * u, backgroundColor: '#1d2f6b', borderWidth: 0.6 * u, borderColor: '#0b1433', alignItems: 'center', justifyContent: 'center' }}>
        <Text allowFontScaling={false} style={{ color: '#c9d6ff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 5.6 * u }}>?</Text>
      </Pressable>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 18 * u }}>
        <Logo u={u} />
        {FEATURES.onlineLogin ? <Pressable onPress={() => { bump(); onOffline(); }} style={({ pressed }) => [{ marginTop: 4.5 * u, flexDirection: 'row', alignItems: 'center', gap: 1.2 * u, height: 8 * u, paddingHorizontal: 4 * u, borderRadius: 4 * u,
          backgroundColor: '#14806a', borderWidth: 0.4 * u, borderColor: '#0a4a3d', borderBottomWidth: 0.9 * u }, pressed && { transform: [{ scale: 0.96 }] }]}>
          <Text allowFontScaling={false} style={{ fontSize: 3.6 * u }}>📴</Text>
          <View>
            <Text allowFontScaling={false} style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.2 * u, letterSpacing: 0.15 * u }}>ÇEVRİMDIŞI OYNA</Text>
            <Text allowFontScaling={false} style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 1.7 * u }}>Çipsiz · bütün salonlar ve masalar açık</Text>
          </View>
        </Pressable> : null}
      </View>

      {msg ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 19 * u, alignItems: 'center' }}>
          <Text allowFontScaling={false} style={{ color: '#fff', backgroundColor: 'rgba(0,0,0,0.7)', overflow: 'hidden', borderRadius: 1.4 * u, paddingHorizontal: 2 * u, paddingVertical: 1 * u, fontSize: 2.4 * u, fontWeight: '700' }}>{msg}</Text>
        </View>
      ) : null}

      {FEATURES.onlineLogin ? (
      <View style={{ position: 'absolute', left: padX + 6 * u, right: padX + 6 * u, bottom: Math.max(ins.bottom, 5.5 * u), flexDirection: 'row', gap: 2.4 * u }}>
        <LoginBtn u={u} bg="#26262b" edge="#0d0d10" icon="" iconBox={<AppleMark u={u} />} label="APPLE İLE GİRİŞ YAP" onPress={() => soon('Apple ile giriş')} />
        <LoginBtn u={u} bg="#1f7fe0" edge="#0f4f99" icon="f" label="FACEBOOK İLE BAĞLAN" onPress={() => soon('Facebook ile giriş')} />
        <LoginBtn u={u} bg="#8a3ddb" edge="#55208f" icon="@" label="EMAİL İLE BAĞLAN" onPress={() => soon('Email ile giriş')} />
        <LoginBtn u={u} bg="#f39a12" edge="#a85d00" label="MİSAFİR GİRİŞİ" onPress={() => { bump(); onGuest(); }} />
      </View>
      ) : (
      <View style={{ position: 'absolute', left: padX + 24 * u, right: padX + 24 * u, bottom: Math.max(ins.bottom, 5.5 * u), flexDirection: 'row', gap: 3 * u }}>
        <LoginBtn u={u} bg="#14806a" edge="#0a4a3d" icon="📴" iconBox={<Text allowFontScaling={false} style={{ fontSize: 4 * u }}>📴</Text>} label="ÇEVRİMDIŞI OYNA" onPress={() => { bump(); onOffline(); }} />
        <LoginBtn u={u} bg="#f39a12" edge="#a85d00" label="MİSAFİR GİRİŞİ" onPress={() => { bump(); onGuest(); }} />
      </View>
      )}
    </View>
  );
}

// basit elma işareti (Apple logosu yerine, yazı tipiyle)
function AppleMark({ u }) {
  return <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 5 * u, marginTop: -0.4 * u }}>{''}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#170a2e', overflow: 'hidden' },
});
