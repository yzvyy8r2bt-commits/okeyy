// Lobi ekranı: salonlar, masalar, masa açma, bekleme, günlük hediye, profil (web sürümünün düzeni)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { C, Btn, Toggle, Coin, NUM_FONT } from './ui';
import * as L from './lobby';
import { FEATURES } from './config';

const GOLD = '#ffe39a';
const pfB = u => ({ color: C.ink, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.8 * u });
const cLbl = u => ({ color: C.muted, fontWeight: '800', fontSize: 2.2 * u, letterSpacing: 0.15 * u, marginBottom: 0.6 * u });

function Av({ u, name, size, sm }) {
  const s = size * u;
  return (
    <View style={{ width: s, height: s, borderRadius: s, backgroundColor: sm ? '#e0a03a' : '#f7a624', alignItems: 'center', justifyContent: 'center', borderWidth: 0.4 * u, borderColor: 'rgba(255,255,255,0.12)' }}>
      <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: s * 0.5, color: C.amberInk }}>{(name || '?')[0].toLocaleUpperCase('tr-TR')}</Text>
    </View>
  );
}
function Seg({ u, opts, val, onPick }) {
  return (
    <View style={[styles.seg, { borderRadius: 1.2 * u, padding: 0.3 * u }]}>
      {opts.map(([v, label]) => (
        <Pressable key={String(v)} onPress={() => onPick(v)} style={[{ paddingHorizontal: 1.4 * u, paddingVertical: 0.8 * u, borderRadius: u }, val === v && { backgroundColor: C.amber }]}>
          <Text allowFontScaling={false} style={{ fontSize: 2.2 * u, fontWeight: '700', color: val === v ? C.amberInk : C.ink }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
// web'deki gibi eşit genişlikte bölmeli seçici (Masa Aç)
function SegFull({ u, opts, val, onPick }) {
  return (
    <View style={[styles.seg, { borderRadius: 1.4 * u, padding: 0.5 * u, flexDirection: 'row' }]}>
      {opts.map(([v, label]) => (
        <Pressable key={String(v)} onPress={() => onPick(v)} style={[{ flex: 1, height: 6.6 * u, borderRadius: 1.2 * u, alignItems: 'center', justifyContent: 'center' }, val === v && { backgroundColor: C.amber }]}>
          <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: 2.8 * u, fontWeight: '800', color: val === v ? C.amberInk : C.ink, paddingHorizontal: 0.4 * u }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
// bahis kaydırıcısı (web'deki range)
function BetSlider({ u, min, max, step, value, onChange }) {
  const [w, setW] = useState(0);
  const cb = useRef(onChange); cb.current = onChange;
  const geo = useRef({ w: 0, min, max, step }); geo.current = { w, min, max, step };
  const knob = 6 * u;
  const pick = (x) => {
    const g = geo.current; if (!g.w || g.max <= g.min) return;
    const f = Math.max(0, Math.min(1, (x - knob / 2) / (g.w - knob)));
    cb.current(g.min + Math.round(f * (g.max - g.min) / g.step) * g.step);
  };
  const gesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Pan().runOnJS(true).minDistance(0).onBegin(e => pick(e.x)).onUpdate(e => pick(e.x)),
    Gesture.Tap().runOnJS(true).onEnd(e => pick(e.x))), []);
  const f = max > min ? (value - min) / (max - min) : 0;
  return (
    <GestureDetector gesture={gesture}>
      <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ height: 5 * u, justifyContent: 'center' }}>
        <View style={{ height: 1.1 * u, borderRadius: u, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
        <View style={{ position: 'absolute', left: f * Math.max(0, w - knob), width: knob, height: 3.6 * u, borderRadius: 2 * u, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }} />
      </View>
    </GestureDetector>
  );
}
// "Her taş cezalı" açılınca "Yandan açma cezalı" da açılır (tersi değil)
export function linkPen(pen, k, val) {
  const p = { ...pen, [k]: val };
  if (k === 'herTas' && val === true) p.yanAc = true;
  return p;
}
function Dlg({ u, visible, children, wide }) {
  return (
    <Modal visible={visible} transparent animationType="fade" supportedOrientations={['landscape']}>
      <View style={styles.modalBg}>
        <View style={[styles.modal, { width: wide ? '86%' : '62%', maxHeight: '94%', borderRadius: 2.4 * u, padding: 2.4 * u }]}>{children}</View>
      </View>
    </Modal>
  );
}
const H2 = ({ u, children }) => <Text allowFontScaling={false} style={{ color: C.amber, fontWeight: '900', fontSize: 4 * u, textAlign: 'center' }}>{children}</Text>;
const Sub = ({ u, children, style }) => <Text allowFontScaling={false} style={[{ color: C.muted, fontSize: 2.1 * u, textAlign: 'center', marginTop: 0.6 * u }, style]}>{children}</Text>;

export default function LobbyScreen({ u, ins, set, saveSet, onStart, openSettings, flash, onLogout }) {
  const [, setTick] = useState(0);
  const re = () => setTick(t => t + 1);
  const [view, setView] = useState('home');
  const [salon, setSalon] = useState(0);
  const F0 = { team: 'all', mode: 'all', hands: 'all', hard: 'all', pen: {} };
  const [filter, setFilter] = useState(F0);
  const [fOpen, setFOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [gift, setGift] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [adOpen, setAdOpen] = useState(false);
  const [adPlay, setAdPlay] = useState(null);   // deneme reklamı: kalan saniye
  const [prof, setProf] = useState(false);
  const [ptab, setPtab] = useState('stat');
  const [logoutAsk, setLogoutAsk] = useState(false);
  const [tcat, setTcat] = useState('oyun');
  const [rename, setRename] = useState(null);
  const [create, setCreate] = useState(null);     // { bet, mode, team, hands, hard, pen }
  const [wait, setWait] = useState(null);         // { t, cfg, left }
  const msgT = useRef(null);
  const w = L.wallet(), lv = L.levelInfo(w.st.xp);

  const say = (m, bad) => { clearTimeout(msgT.current); setMsg({ m, bad }); msgT.current = setTimeout(() => setMsg(null), 3500); };
  useEffect(() => { if (flash) say(flash.m, flash.bad); }, [flash]);

  // reklam bekleme süresi geri saysın (lobi ve reklam penceresi)
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), adOpen ? 1000 : 30000); return () => clearInterval(id); }, [adOpen]);
  useEffect(() => {
    if (adPlay === null || adPlay <= 0) return;
    const id = setTimeout(() => setAdPlay(x => (x === null ? null : x - 1)), 1000);
    return () => clearTimeout(id);
  }, [adPlay]);
  const adBtn = (() => {
    const wt = L.adWait(), left = L.adLeft();
    if (!left) return { label: '▶ Reklam: yarın', dis: true };
    if (wt) return { label: '▶ ' + Math.ceil(wt / 60000) + ' dk sonra' };
    return { label: '▶ Reklam · +' + L.chipShort(L.AD_REWARD) };
  })();
  const pt = L.ptState(), ptG = L.PT_GOALS[pt.got], ptPct = ptG ? Math.min(100, Math.round(pt.sec * 100 / ptG[0])) : 100;

  // masaya oturunca 10 sn bekleme (bu sürede çip düşmeden kalkılabilir)
  useEffect(() => {
    if (!wait) return;
    if (wait.left <= 0) { start(); return; }
    const id = setTimeout(() => setWait(x => x && { ...x, left: x.left - 1 }), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  const sitAt = (t) => {
    if (!L.canSit(t.bet)) { say('Bu masaya oturmak için en az ' + L.chipFmt(t.bet * L.ENTRY_MULT) + ' çip gerekir.', true); return; }
    setCreate(null);
    setWait({ t, cfg: L.tableCfg(t, 'Sen'), left: 10 });
  };
  const start = () => {
    const x = wait; setWait(null); if (!x) return;
    if (!L.canSit(x.t.bet)) { say('Bu masa için yeterli çipin yok.', true); return; }
    L.addChips(-x.t.bet);
    onStart(x.t, x.cfg);
  };
  const quick = () => {
    const t = L.quickPick(set);
    if (!t) { say('Çipin hiçbir salona yetmiyor. Günlük hediyeni al.', true); return; }
    sitAt(t);
  };
  const enterSalon = (i) => {
    if (!L.canEnter(L.SALONS[i])) { say(L.enterMsg(L.SALONS[i]), true); return; }
    setSalon(i); setView('salon');
  };
  const openCreate = () => {
    const s = L.SALONS[salon];
    if (!L.canSit(s.min)) { say('Masa açmak için yeterli çipin yok.', true); return; }
    setCreate({ bet: s.min, mode: set.mode, team: set.team, hands: s.hands.includes(set.hands) ? set.hands : s.hands[s.hands.length - 1], hard: set.hard, pen: { ...set.pen } });
  };

  // ---------- üst şerit ----------
  const top = (
    <View style={[styles.top, { minHeight: 7 * u, gap: 2 * u }]}>
      <Pressable onPress={() => setProf(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: u }}>
        <Av u={u} name={w.name} size={6} />
        <View>
          <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '800', fontSize: 2.8 * u }}>{w.name}</Text>
          <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u }}>Seviye {lv.lv}</Text>
        </View>
      </Pressable>
      <View style={[styles.brand, { gap: 0.8 * u }]}>
        <Text allowFontScaling={false} style={{ color: '#e9d3ff', fontWeight: '700', fontSize: 2 * u, letterSpacing: 0.28 * u, alignSelf: 'center' }}>KAHVE USULÜ</Text>
        <Text allowFontScaling={false} style={{ color: C.amber, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 5.6 * u }}>101</Text>
        <Text allowFontScaling={false} style={{ color: C.ink, fontFamily: NUM_FONT, fontWeight: '700', fontSize: 3.2 * u, letterSpacing: 0.6 * u }}>OKEY</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: u }}>
        {L.MODE.offline ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0.8 * u, minHeight: 6.6 * u, paddingHorizontal: 1.8 * u, borderRadius: 1.6 * u, backgroundColor: '#14806a', borderWidth: 1, borderColor: '#3fd0a8' }}>
            <Text allowFontScaling={false} style={{ fontSize: 2.6 * u }}>📴</Text>
            <View>
              <Text allowFontScaling={false} style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.4 * u }}>ÇEVRİMDIŞI</Text>
              <Text allowFontScaling={false} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 1.5 * u, fontWeight: '700' }}>Çipsiz · her yer açık</Text>
            </View>
          </View>
        ) : <>
        {FEATURES.ads ? <Btn u={u} sm label={adBtn.label} disabled={adBtn.dis} onPress={() => setAdOpen(true)} style={{ paddingHorizontal: 1.4 * u }} /> : null}
        <Pressable onPress={() => setPtOpen(true)} style={({ pressed }) => [styles.ptBtn, { minHeight: 6.6 * u, borderRadius: 1.6 * u, paddingHorizontal: 1.2 * u, gap: 0.8 * u }, pressed && { opacity: 0.85 }]}>
          <Text allowFontScaling={false} style={{ fontSize: 2.6 * u }}>⏱</Text>
          <View style={{ gap: 0.4 * u }}>
            <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '700', fontSize: 1.6 * u }}>{ptG ? L.ptLabel(ptG[0]) + ' → +' + L.chipShort(ptG[1]) : 'Hepsi alındı'}</Text>
            <View style={{ height: 0.7 * u, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}><View style={{ width: ptPct + '%', height: '100%', backgroundColor: C.good }} /></View>
          </View>
        </Pressable>
        <View style={[styles.chips, { borderRadius: 3 * u, paddingVertical: u, paddingHorizontal: 1.6 * u }]}>
          <Coin s={3 * u} />
          <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3 * u, color: GOLD }}>{L.chipFmt(w.chips)}</Text>
        </View>
        <Btn u={u} sm pri={L.giftReady()} label={L.giftReady() ? 'Günlük Hediye · ' + L.nextGiftDay() + '. gün' : 'Hediye Alındı'} onPress={() => setGift(true)} />
        </>}
        <Btn u={u} sm label="Ayarlar" onPress={openSettings} />
      </View>
    </View>
  );

  // ---------- salonlar ----------
  const home = (
    <>
      <View style={[styles.salons, { gap: 1.8 * u }]}>
        {L.SALONS.map((s, i) => {
          const ok = L.canEnter(s);
          return (
            <Pressable key={s.id} onPress={() => enterSalon(i)} style={[styles.salon, { backgroundColor: s.hue[0], borderRadius: 2.6 * u, paddingVertical: 2 * u, paddingHorizontal: 1.8 * u, gap: 0.8 * u }, !ok && { opacity: 0.55 }]}>
              <View style={[styles.salonDark, { backgroundColor: s.hue[1] }]} />
              <View style={[styles.salonDot, { width: 26 * u, height: 26 * u, borderRadius: 13 * u, right: -7 * u, bottom: -6 * u }]} />
              <Text allowFontScaling={false} style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 4.6 * u }}>{s.name}</Text>
              <Text allowFontScaling={false} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 2 * u, marginBottom: 'auto' }}>{s.sub}</Text>
              {[['Bahis', L.chipShort(s.min) + ' – ' + L.chipShort(s.max)], ['Giriş', L.chipShort(L.salonEntry(s)) + (s.maxIn ? ' – ' + L.chipShort(s.maxIn) : ' +')], ['El sayısı', s.hands.join(' · ')]].map(([k, v]) => (
                <View key={k}>
                  <Text allowFontScaling={false} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 1.7 * u, letterSpacing: 0.15 * u }}>{k.toLocaleUpperCase('tr-TR')}</Text>
                  <Text allowFontScaling={false} style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '700', fontSize: 2.7 * u }}>{v}</Text>
                </View>
              ))}
              <Text allowFontScaling={false} style={[{ marginTop: 0.6 * u, fontWeight: '700', fontSize: 2.1 * u, paddingVertical: 0.6 * u, paddingHorizontal: 1.4 * u, borderRadius: 2 * u, overflow: 'hidden' },
                ok ? { backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff' } : { backgroundColor: 'rgba(0,0,0,0.45)', color: '#ffb3a8' }]}>
                {ok ? 'Masalara bak' : L.tooRich(s) ? 'Çipin bu salon için fazla' : 'Yetersiz çip'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.bottom, { gap: 1.4 * u }]}>
        <Btn u={u} pri label="Hemen Oyna" onPress={quick} style={{ minWidth: 34 * u }} />
      </View>
    </>
  );

  // ---------- masalar ----------
  const s = L.SALONS[salon];
  const penOn = (pen, k) => (pen || {})[k] !== false || (k === 'yanAc' && (pen || {}).herTas !== false);
  const fit = t => (filter.team === 'all' || (filter.team === 'esli') === t.team) && (filter.mode === 'all' || filter.mode === t.mode) &&
    (filter.hands === 'all' || filter.hands === t.hands) && (filter.hard === 'all' || (filter.hard === 'yardimsiz') === !!t.hard) &&
    Object.keys(filter.pen).every(k => filter.pen[k] === undefined || penOn(t.pen, k) === filter.pen[k]);
  const list = L.tablesOf(salon).filter(t => t.seats.some(x => !x) && fit(t));
  const fCount = ['team', 'mode', 'hands', 'hard'].filter(k => filter[k] !== 'all').length + Object.values(filter.pen).filter(v => v !== undefined).length;
  const tableCard = (t) => {
    const ok = L.canSit(t.bet);
    const seat = (i, pos) => t.seats[i]
      ? <View key={i} style={[styles.seat, pos]}><Av u={u} name={t.seats[i]} size={4.4} sm /><Text allowFontScaling={false} numberOfLines={1} style={{ color: '#e7fffb', fontSize: 1.6 * u, maxWidth: 12 * u }}>{t.seats[i]}</Text></View>
      : <Pressable key={i} disabled={!ok} onPress={() => sitAt(t)} style={[styles.seat, pos, styles.free, { width: 7.2 * u, height: 7.2 * u, borderRadius: 7.2 * u }, !ok && { backgroundColor: '#3b4a48' }]}>
          <Text allowFontScaling={false} style={{ fontWeight: '800', fontSize: 1.9 * u, color: ok ? '#052b1e' : '#9fb3ae' }}>Otur</Text>
        </Pressable>;
    return (
      <View key={t.id} style={{ width: '23.6%', height: 30 * u, marginBottom: 1.6 * u }}>
        <View style={[styles.felt, { borderRadius: 15 * u, borderWidth: 0.9 * u }, !ok && { opacity: 0.6 }]}>
          {seat(2, { top: 0.8 * u, alignSelf: 'center' })}
          {seat(3, { left: 1.2 * u, top: '35%' })}
          {seat(1, { right: 1.2 * u, top: '35%' })}
          {seat(0, { bottom: 0.8 * u, alignSelf: 'center' })}
          <View style={[styles.mid, { gap: 0.6 * u }]}>
            <View style={[styles.bet, { borderRadius: 2 * u, paddingVertical: 0.5 * u, paddingHorizontal: 1.2 * u }]}>
              {L.MODE.offline ? <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.6 * u, color: '#7ef0c8' }}>Çipsiz</Text>
                : <><Coin s={2.6 * u} /><Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.8 * u, color: GOLD }}>{L.chipShort(t.bet)}</Text></>}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 0.4 * u }}>
              {L.tableTags(t).concat(t.pen.gosterge ? ['Gösterge'] : []).map(x => (
                <Text key={x} allowFontScaling={false} style={{ fontSize: 1.45 * u, fontWeight: '700', color: C.ink, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 0.7 * u, paddingVertical: 0.2 * u, borderRadius: u, overflow: 'hidden' }}>{x}</Text>
              ))}
            </View>
          </View>
        </View>
        {!ok ? <Text allowFontScaling={false} style={{ position: 'absolute', bottom: -1.2 * u, alignSelf: 'center', fontSize: 1.5 * u, color: '#ffb3a8', backgroundColor: '#1a0b36', paddingHorizontal: 0.8 * u, borderRadius: u, overflow: 'hidden' }}>Bu masa için {L.chipShort(t.bet * L.ENTRY_MULT)} çip gerekir</Text> : null}
      </View>
    );
  };
  const salonView = (
    <>
      <View style={[styles.sh, { gap: 1.6 * u }]}>
        <Btn u={u} sm label="‹ Salonlar" onPress={() => setView('home')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.2 * u }}>
          <Btn u={u} sm label="◀" disabled={salon <= 0} onPress={() => enterSalon(salon - 1)} />
          <View style={{ alignItems: 'center', minWidth: 22 * u }}>
            <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.6 * u, color: C.amber }}>{s.name}</Text>
            <Text allowFontScaling={false} style={{ fontSize: 1.8 * u, color: C.muted }}>Bahis {L.chipShort(s.min)} – {L.chipShort(s.max)}</Text>
          </View>
          <Btn u={u} sm label="▶" disabled={salon >= L.SALONS.length - 1} onPress={() => enterSalon(salon + 1)} />
        </View>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: u }}>
          <Btn u={u} pri={fCount > 0} label={fCount ? 'Masa Filtrele · ' + fCount : '⚙ Masa Filtrele'} onPress={() => setFOpen(true)} />
          {fCount ? <Btn u={u} label="Temizle" onPress={() => setFilter(F0)} /> : null}
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 0.4 * u }}>
        {list.length ? list.map(tableCard) : <Text allowFontScaling={false} style={{ width: '100%', textAlign: 'center', color: 'rgba(190,240,232,0.5)', fontSize: 2.6 * u, marginTop: 6 * u }}>Bu filtrede boş yeri olan masa yok. Masa açabilirsin.</Text>}
      </ScrollView>
      <View style={[styles.bottom, { gap: 1.4 * u }]}>
        <Btn u={u} label="Yenile" onPress={() => { L.genTables(salon); re(); }} />
        <Btn u={u} pri label="Masa Aç" onPress={openCreate} />
        <Btn u={u} pri label="Hemen Oyna" onPress={quick} style={{ minWidth: 34 * u }} />
      </View>
    </>
  );

  // ---------- pencereler ----------
  const ready = L.giftReady(), day = L.shownDay();
  const cs = create && L.SALONS[salon];
  const maxOk = cs ? Math.max(cs.min, Math.min(cs.max, Math.floor(w.chips / L.ENTRY_MULT / cs.step) * cs.step)) : 0;
  const pct = w.st.games ? Math.round(w.st.wins * 100 / w.st.games) : 0;

  return (
    <View style={[styles.root, { paddingTop: 1.4 * u + ins.top, paddingRight: 2 * u + ins.right, paddingBottom: 1.6 * u + ins.bottom, paddingLeft: 2 * u + ins.left, gap: 1.6 * u }]}>
      {top}
      {view === 'home' ? home : salonView}
      {msg ? (
        <View pointerEvents="none" style={[styles.msg, { top: 9 * u, borderRadius: 1.4 * u, paddingVertical: u, paddingHorizontal: 2 * u }, msg.bad && { backgroundColor: '#7a1d22' }]}>
          <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 2.3 * u, fontWeight: '700', textAlign: 'center' }}>{msg.m}</Text>
        </View>
      ) : null}

      {/* günlük hediye */}
      <Dlg u={u} visible={gift} wide>
        <H2 u={u}>Günlük Hediye</H2>
        <Sub u={u}>Her gün art arda gel, hediyen büyüsün! Bir günü kaçırırsan 1. günden başlarsın; 7. günden sonra seri yeniden başlar.</Sub>
        <View style={{ flexDirection: 'row', gap: u, marginVertical: 2 * u }}>
          {L.DAILY_STREAK.map((v, k) => {
            const d = k + 1, done = d < day || (!ready && d === day), cur = ready && d === day;
            return (
              <View key={d} style={[styles.dg, { flex: d === 7 ? 1.4 : 1, borderRadius: 1.4 * u, paddingVertical: 1.2 * u, gap: 0.6 * u }, cur && { borderColor: C.amber, backgroundColor: 'rgba(255,187,51,0.15)' }, done && { opacity: 0.5 }]}>
                <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.7 * u }}>{d}. gün</Text>
                <Coin s={(d === 7 ? 4.6 : 3.6) * u} />
                <Text allowFontScaling={false} style={{ color: GOLD, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.6 * u }}>{L.chipShort(v)}</Text>
                <Text allowFontScaling={false} style={{ color: done ? C.good : C.amber, fontSize: 1.6 * u, fontWeight: '700' }}>{done ? 'Alındı ✓' : cur ? 'Bugün' : ' '}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.mrow}>
          {ready ? <Btn u={u} pri label={'+' + L.chipFmt(L.DAILY_STREAK[day - 1]) + ' çip al'} onPress={() => { const r = L.takeGift(); setGift(false); if (r) say('Günlük hediye (' + r.day + '. gün): +' + L.chipFmt(r.amt) + ' çip' + (r.msgs && r.msgs.length ? ' · ' + r.msgs[0] : '')); }} />
            : <Btn u={u} disabled label="Yarın yine gel" />}
          <Btn u={u} label="Kapat" onPress={() => setGift(false)} />
        </View>
      </Dlg>

      {/* profil — web'deki düzen: kart, sekmeler (İstatistikler · Görevler · Seviye) */}
      <Modal visible={prof} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { width: '76%', maxHeight: '96%', borderRadius: 2.4 * u, padding: 2.4 * u }]}>
            <View style={{ flexDirection: 'row', gap: 2 * u }}>
              <View style={[styles.pfCard, { flex: 1.6, borderRadius: 2 * u, padding: 1.6 * u, gap: 2 * u }]}>
                <View style={{ width: 16 * u, height: 16 * u, borderRadius: 2 * u, backgroundColor: '#f7a624', alignItems: 'center', justifyContent: 'center' }}>
                  <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 9 * u, color: C.amberInk }}>{w.name[0].toLocaleUpperCase('tr-TR')}</Text>
                </View>
                <View style={{ flex: 1, gap: 0.6 * u }}>
                  {[
                    ['İSİM', <><Text allowFontScaling={false} style={pfB(u)}>{w.name}</Text><Btn u={u} sm label="Değiştir" style={{ marginLeft: 'auto', minHeight: 4 * u }} onPress={() => setRename(w.name)} /></>],
                    ['ÇİP', <><Coin s={2.6 * u} /><Text allowFontScaling={false} style={pfB(u)}>{L.chipFmt(w.chips)}</Text></>],
                    ['SEVİYE', <><Text allowFontScaling={false} style={[pfB(u), { marginRight: u }]}>{lv.lv}</Text>
                      <View style={{ flex: 1, height: 1.2 * u, borderRadius: u, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}><View style={{ width: Math.round(lv.rest * 100 / lv.need) + '%', height: '100%', backgroundColor: C.amber }} /></View>
                      <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.7 * u, marginLeft: u }}>{lv.rest}/{lv.need}</Text></>],
                    ['BAŞLANGIÇ', <Text allowFontScaling={false} style={pfB(u)}>{w.since}</Text>],
                  ].map(([k, v]) => (
                    <View key={k} style={[styles.pfRow2, { borderRadius: u, paddingHorizontal: 1.2 * u, minHeight: 4.8 * u }]}>
                      <Text allowFontScaling={false} style={{ width: 14 * u, color: '#b9a6ff', fontWeight: '800', fontSize: 1.9 * u, letterSpacing: 0.1 * u }}>{k}</Text>
                      {v}
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 0.8 * u, alignContent: 'flex-start' }}>
                {[['stat', 'İstatistikler'], ['tasks', 'Görevler'], ['level', 'Seviye']].map(([id, t]) => (
                  <Btn key={id} u={u} pri={ptab === id} label={t} onPress={() => setPtab(id)} style={{ width: '31.5%', paddingHorizontal: 0.4 * u }} />
                ))}
                {(FEATURES.onlineTabs ? ['Sıralamalar', 'Hediye Yolla', 'Arkadaşlar'] : []).map(t => (
                  <View key={t} style={[styles.soon, { width: '31.5%', minHeight: 7 * u, borderRadius: 1.6 * u }]}>
                    <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ color: C.ink, fontWeight: '800', fontSize: 2.3 * u }}>{t}</Text>
                    <Text allowFontScaling={false} style={{ color: C.muted, fontWeight: '600', fontSize: 1.5 * u }}>Online sürümde</Text>
                  </View>
                ))}
              </View>
            </View>
            <ScrollView style={{ marginTop: 1.4 * u, flexGrow: 0 }}>
              {ptab === 'stat' ? (
                <View style={{ flexDirection: 'row', gap: 1.2 * u }}>
                  {[['OYNADIĞI OYUN', w.st.games], ['KAZANDIĞI OYUN', w.st.wins], ['GALİBİYET YÜZDESİ', '%' + pct], ['EN BÜYÜK KAZANÇ', L.chipShort(w.st.best)]].map(([k, v]) => (
                    <View key={k} style={[styles.pfStat, { flex: 1, borderRadius: 1.4 * u, padding: 1.2 * u }]}>
                      <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ color: '#b9a6ff', fontWeight: '800', fontSize: 1.8 * u, letterSpacing: 0.08 * u }}>{k}</Text>
                      <Text allowFontScaling={false} style={{ color: C.ink, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 5 * u }}>{v}</Text>
                    </View>
                  ))}
                </View>
              ) : ptab === 'level' ? (
                <View style={[styles.pfCard, { borderRadius: 2 * u, padding: 2 * u, gap: 2.4 * u, alignItems: 'center' }]}>
                  <View style={{ width: 16 * u, height: 16 * u, alignItems: 'center', justifyContent: 'center' }}>
                    <Text allowFontScaling={false} style={{ position: 'absolute', fontSize: 16 * u, lineHeight: 17 * u, color: C.amber }}>★</Text>
                    <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 5 * u, color: C.amberInk, marginTop: 1.6 * u }}>{lv.lv}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text allowFontScaling={false} style={{ color: C.ink, fontSize: 2.4 * u, marginBottom: u }}>Seviye atlamak için <Text style={{ color: C.good, fontWeight: '800' }}>{lv.need - lv.rest} deneyim puanına (DP)</Text> daha ihtiyacın var.</Text>
                    <View style={{ height: 2.2 * u, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}><View style={{ width: Math.round(lv.rest * 100 / lv.need) + '%', height: '100%', backgroundColor: '#4f8cff' }} /></View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 0.6 * u }}>
                      <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '700', fontSize: 2 * u }}>Seviye {lv.lv}</Text>
                      <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '700', fontSize: 2 * u }}>{lv.rest} / {lv.need} DP</Text>
                      <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '700', fontSize: 2 * u }}>Seviye {lv.lv + 1}</Text>
                    </View>
                    <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u, marginTop: u }}>DP görevlerden gelir: kolay görevler az, zor görevler çok DP verir ve her aşamada ödül büyür. Her oyun +5, kazanılan oyun +10 DP. Her seviye bir öncekinden 100 DP daha zordur.</Text>
                  </View>
                  <View style={{ alignItems: 'center', gap: 0.6 * u }}>
                    <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.8 * u }}>Seviye ödülü</Text>
                    <Coin s={5 * u} />
                    <Text allowFontScaling={false} style={{ color: GOLD, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.2 * u }}>{L.chipFmt(L.lvReward(lv.lv + 1))}</Text>
                  </View>
                </View>
              ) : (() => {
                const st = L.tstate();
                const total = L.CHAINS.reduce((a, c) => a + c[3].length, 0), done = L.CHAINS.reduce((a, c) => a + (st.stage[c[0]] || 0), 0);
                return (
                  <View>
                    <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2.1 * u, marginBottom: 0.8 * u }}>Tamamlanan aşama: <Text style={{ color: C.ink, fontWeight: '800' }}>{done} / {total}</Text></Text>
                    <View style={{ flexDirection: 'row', gap: 0.8 * u, marginBottom: u }}>
                      {L.TASK_CATS.map(c => {
                        const ch = L.CHAINS.filter(x => x[1] === c.id), d = ch.reduce((a, x) => a + (st.stage[x[0]] || 0), 0), t = ch.reduce((a, x) => a + x[3].length, 0);
                        return (
                          <Pressable key={c.id} onPress={() => setTcat(c.id)} style={{ flex: 1, borderRadius: 1.2 * u, paddingVertical: 1.1 * u, alignItems: 'center', backgroundColor: tcat === c.id ? C.amber : 'rgba(255,255,255,0.08)' }}>
                            <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2 * u, color: tcat === c.id ? C.amberInk : 'rgba(255,255,255,0.6)', letterSpacing: 0.1 * u }}>{c.name.toLocaleUpperCase('tr-TR')} <Text style={{ fontSize: 1.5 * u }}>{d}/{t}</Text></Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: u }}>
                      {L.CHAINS.filter(c => c[1] === tcat).map(ch => {
                        const k = st.stage[ch[0]] || 0, n = ch[3].length, all = k >= n, tgt = ch[3][Math.min(k, n - 1)];
                        const v = Math.min(L.chainVal(ch), tgt), r = L.stageReward(ch[4], Math.min(k, n - 1));
                        const bg = all ? '#1f6f53' : k >= Math.ceil(n * 0.66) ? '#9a7410' : k >= Math.ceil(n * 0.33) ? '#5d6676' : '#7a4a1e';
                        return (
                          <View key={ch[0]} style={{ width: '23.9%', backgroundColor: bg, borderRadius: 1.4 * u, padding: u, alignItems: 'center', gap: 0.4 * u, borderWidth: all ? 2 : 1, borderColor: all ? C.good : 'rgba(255,255,255,0.15)' }}>
                            <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.2 * u }}>{ch[6]} <Text style={{ color: '#ffe39a' }}>{all ? '★' : L.ROMAN[k]}</Text></Text>
                            <Text allowFontScaling={false} style={{ fontSize: 4.2 * u, lineHeight: 5 * u }}>{ch[5]}</Text>
                            <Text allowFontScaling={false} numberOfLines={2} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 1.55 * u, textAlign: 'center', minHeight: 3.8 * u }}>{all ? 'Bu görevin tüm aşamalarını bitirdin!' : ch[7].replace('{n}', L.chipShort(tgt))}</Text>
                            <View style={{ flexDirection: 'row', gap: 0.3 * u }}>{ch[3].map((_, j) => <View key={j} style={{ width: 1.1 * u, height: 1.1 * u, borderRadius: u, backgroundColor: j < k ? '#ffe39a' : 'rgba(0,0,0,0.35)' }} />)}</View>
                            {all ? <Text allowFontScaling={false} style={{ color: '#fff', fontWeight: '700', fontSize: 1.6 * u }}>Ustalaştın ✓</Text> : (
                              <>
                                <View style={{ alignSelf: 'stretch', height: 0.9 * u, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.35)', overflow: 'hidden' }}><View style={{ width: Math.round(v * 100 / tgt) + '%', height: '100%', backgroundColor: C.good }} /></View>
                                <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontWeight: '700', fontSize: 1.6 * u }}>{L.chipShort(v)} / {L.chipShort(tgt)} · {L.DIFF[ch[4]].name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 0.9 * u, paddingVertical: 0.4 * u, borderRadius: u }}>
                                  <Coin s={1.8 * u} /><Text allowFontScaling={false} style={{ color: '#fff', fontFamily: NUM_FONT, fontWeight: '800', fontSize: 1.9 * u }}>{L.chipShort(r.chip)} · +{r.dp} DP</Text>
                                </View>
                              </>
                            )}
                          </View>
                        );
                      })}
                    </View>
                    <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u, marginTop: u }}>Her görevin birkaç aşaması var; hedef büyüdükçe ödül de büyür. Zor görevler daha çok deneyim puanı (DP) verir.</Text>
                  </View>
                );
              })()}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 1.2 * u, marginTop: 1.6 * u }}>
              <Btn u={u} pri label="Kapat" style={{ flex: 3, minHeight: 7.4 * u }} onPress={() => setProf(false)} />
              <Btn u={u} label="Çıkış Yap" style={{ flex: 1, minHeight: 7.4 * u, borderColor: 'rgba(255,107,94,0.6)' }} onPress={() => { setProf(false); setTimeout(() => setLogoutAsk(true), 450); }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* çıkış onayı */}
      <Dlg u={u} visible={logoutAsk}>
        <H2 u={u}>Çıkış Yap</H2>
        <Sub u={u}>Giriş ekranına dönülecek. Oradan başka bir hesapla (Apple, Facebook, Email) ya da misafir olarak girebilirsin.</Sub>
        <Sub u={u} style={{ color: C.ink }}>Misafir hesabındaki çiplerin ve ilerlemen bu telefonda saklı kalır, silinmez.</Sub>
        <View style={[styles.mrow, { marginTop: 2 * u }]}>
          <Btn u={u} pri label="Çıkış Yap" onPress={() => { setLogoutAsk(false); setTimeout(() => onLogout && onLogout(), 400); }} />
          <Btn u={u} label="Vazgeç" onPress={() => setLogoutAsk(false)} />
        </View>
      </Dlg>

      {/* oyun süresi ödülleri */}
      <Dlg u={u} visible={ptOpen} wide>
        <Text allowFontScaling={false} style={{ color: C.amber, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 5 * u, letterSpacing: 0.2 * u }}>OYUN SÜRESİ ÖDÜLLERİ</Text>
        <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2.2 * u, marginTop: 0.4 * u }}>Toplam oyun süren: <Text style={{ color: C.amber, fontWeight: '800' }}>{L.ptFmt(pt.sec)}</Text>. Süre sadece masada oyun oynarken işler; oyun bitince durur, yeni oyunda kaldığı yerden devam eder. Son ödülden sonra hepsi en baştan yeniden başlar.{(pt.round || 1) > 1 ? ' (' + pt.round + '. tur)' : ''}</Text>
        <ScrollView style={{ marginTop: 1.4 * u, flexGrow: 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 0.8 * u }}>
            {L.PT_GOALS.map((g, k) => {
              const done = k < pt.got, cur = k === pt.got, pc = cur ? ptPct : done ? 100 : 0;
              return (
                <View key={k} style={{ width: '49.4%', flexDirection: 'row', alignItems: 'center', gap: u, minHeight: 5.2 * u, paddingHorizontal: 1.2 * u, borderRadius: u, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: cur ? 0.4 * u : 0, borderColor: C.amber }}>
                  <Text allowFontScaling={false} style={{ width: 13 * u, color: done ? C.muted : C.ink, fontWeight: '700', fontSize: 2.2 * u }}>{L.ptLabel(g[0])}</Text>
                  <View style={{ flex: 1, height: 1 * u, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}><View style={{ width: pc + '%', height: '100%', backgroundColor: done ? '#b07a2a' : C.amber }} /></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', width: 10 * u, opacity: done ? 0.6 : 1 }}><Coin s={2.2 * u} /><Text allowFontScaling={false} style={{ color: C.ink, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.1 * u }}>{L.chipShort(g[1])}</Text></View>
                  <Text allowFontScaling={false} style={{ width: 8 * u, textAlign: 'right', color: C.good, fontWeight: '700', fontSize: 1.8 * u }}>{done ? 'Alındı ✓' : cur ? pc + '%' : ''}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <Btn u={u} pri label="Kapat" style={{ marginTop: 1.6 * u, minHeight: 7.4 * u }} onPress={() => setPtOpen(false)} />
      </Dlg>

      {/* reklam izle */}
      <Dlg u={u} visible={adOpen && adPlay === null}>
        <H2 u={u}>Reklam İzle, Çip Kazan</H2>
        <Sub u={u}>Reklamı sonuna kadar izlersen <Text style={{ color: C.ink, fontWeight: '800' }}>{L.chipFmt(L.AD_REWARD)} çip</Text> kazanırsın. Günde en fazla {L.AD_DAILY} reklam, iki reklam arası {L.AD_COOL / 60000} dakika.</Sub>
        <View style={{ flexDirection: 'row', gap: 1.2 * u, marginVertical: 2 * u }}>
          <View style={[styles.adCnt, { borderRadius: 1.4 * u, padding: 1.4 * u }]}>
            <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.8 * u }}>Bugün izlenen</Text>
            <Text allowFontScaling={false} style={{ color: C.ink, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.6 * u }}>{L.adState().n} / {L.AD_DAILY}</Text>
          </View>
          <View style={[styles.adCnt, { borderRadius: 1.4 * u, padding: 1.4 * u }]}>
            <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.8 * u }}>Kazanılan</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Coin s={3 * u} /><Text allowFontScaling={false} style={{ color: GOLD, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.6 * u }}>{L.chipFmt(L.adState().n * L.AD_REWARD)}</Text></View>
          </View>
        </View>
        <View style={styles.mrow}>
          {!L.adLeft() ? <Btn u={u} disabled label="Bugünkü hakkın bitti" />
            : L.adWait() ? <Btn u={u} disabled label={Math.ceil(L.adWait() / 1000) + ' sn sonra'} />
            : <Btn u={u} pri label="▶ Reklamı İzle" onPress={() => setAdPlay(L.AD_LEN)} />}
          <Btn u={u} label="Kapat" onPress={() => setAdOpen(false)} />
        </View>
      </Dlg>

      {/* deneme reklamı (mağaza sürümünde gerçek reklam gelecek) */}
      <Modal visible={adPlay !== null} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={[styles.modal, { width: '62%', borderRadius: 2.4 * u, padding: 2.4 * u, alignItems: 'center', gap: 1.4 * u }]}>
            <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.8 * u }}>Deneme reklamı · mağaza sürümünde gerçek reklam gelecek</Text>
            <Text allowFontScaling={false} style={{ fontSize: 10 * u, lineHeight: 12 * u }}>☕</Text>
            <Text allowFontScaling={false} style={{ color: C.amber, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 4.4 * u }}>Kahve Usulü 101 Okey</Text>
            <Text allowFontScaling={false} style={{ color: C.ink, fontSize: 2.4 * u }}>Arkadaşlarını davet et, masayı birlikte kurun!</Text>
            <View style={{ alignSelf: 'stretch', height: 1.2 * u, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
              <View style={{ width: Math.round(((L.AD_LEN - (adPlay || 0)) * 100) / L.AD_LEN) + '%', height: '100%', backgroundColor: C.amber }} />
            </View>
            <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '700', fontSize: 2.4 * u }}>{adPlay > 0 ? adPlay + ' sn' : 'Tamamlandı'}</Text>
              <Btn u={u} sm pri={adPlay === 0} label={adPlay > 0 ? 'Kapat' : 'Ödülü Al'} onPress={() => {
                const ok = adPlay === 0;
                setAdPlay(null); setAdOpen(false);
                if (!ok) { say('Reklamı sonuna kadar izlemedin, ödül verilmedi.', true); return; }
                L.adClaim(); say('Reklam ödülü: +' + L.chipFmt(L.AD_REWARD) + ' çip');
              }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* isim değiştir */}
      <Dlg u={u} visible={rename !== null}>
        <H2 u={u}>İsim Değiştir</H2>
        <TextInput value={rename || ''} onChangeText={setRename} maxLength={14} autoFocus
          style={{ marginTop: 2 * u, color: C.ink, fontSize: 3 * u, borderWidth: 1, borderColor: C.line, borderRadius: 1.2 * u, padding: 1.2 * u, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        <View style={[styles.mrow, { marginTop: 2 * u }]}>
          <Btn u={u} pri label="Kaydet" onPress={() => { const n = (rename || '').trim(); if (n) { w.name = n; L.saveWallet(); } setRename(null); }} />
          <Btn u={u} label="Vazgeç" onPress={() => setRename(null)} />
        </View>
      </Dlg>

      {/* masa filtrele */}
      <Dlg u={u} visible={fOpen} wide>
        <H2 u={u}>Masa Filtrele</H2>
        <Sub u={u}>Sadece seçtiğin özelliklerdeki masalar listelenir.</Sub>
        <ScrollView style={{ marginTop: 1.4 * u }}>
          <View style={{ flexDirection: 'row', gap: 2.4 * u }}>
            <View style={{ flex: 1 }}>
              <Text allowFontScaling={false} style={cLbl(u)}>BİÇİM</Text>
              <SegFull u={u} opts={[['all', 'Fark etmez'], ['tek', 'Tek'], ['esli', 'Eşli']]} val={filter.team} onPick={v => setFilter({ ...filter, team: v })} />
              <Text allowFontScaling={false} style={[cLbl(u), { marginTop: 1.2 * u }]}>OYUN</Text>
              <SegFull u={u} opts={[['all', 'Fark etmez'], ['klasik', 'Klasik'], ['katlamali', 'Katlamalı']]} val={filter.mode} onPick={v => setFilter({ ...filter, mode: v })} />
              <Text allowFontScaling={false} style={[cLbl(u), { marginTop: 1.2 * u }]}>EL SAYISI</Text>
              <SegFull u={u} opts={[['all', 'Fark etmez']].concat(s.hands.map(h => [h, String(h)]))} val={filter.hands} onPick={v => setFilter({ ...filter, hands: v })} />
              <Text allowFontScaling={false} style={[cLbl(u), { marginTop: 1.2 * u }]}>YARDIM</Text>
              <SegFull u={u} opts={[['all', 'Fark etmez'], ['yardimli', 'Yardımlı'], ['yardimsiz', 'Yardımsız']]} val={filter.hard} onPick={v => setFilter({ ...filter, hard: v })} />
            </View>
            <View style={{ flex: 1.1 }}>
              <Text allowFontScaling={false} style={cLbl(u)}>OYUN MODLARI <Text style={{ fontSize: 1.7 * u }}>(dokun: fark etmez → olsun → olmasın)</Text></Text>
              {[['rekor', 'Rekorlu'], ['okeyCal', 'Okey çalma cezası'], ['herTas', 'Her taş cezalı'], ['yanAc', 'Yandan açma cezalı'], ['gosterge', 'Gösterge']].map(([k, n]) => {
                const v = filter.pen[k];
                const next = v === undefined ? true : v ? false : undefined;
                return (
                  <Pressable key={k} onPress={() => setFilter({ ...filter, pen: { ...filter.pen, [k]: next, ...(k === 'herTas' && next === true ? { yanAc: true } : {}) } })}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 7.2 * u, paddingHorizontal: 1.8 * u, marginBottom: 0.8 * u, borderRadius: 1.4 * u, borderWidth: 1,
                      borderColor: v === undefined ? 'rgba(255,255,255,0.14)' : v ? 'rgba(126,240,181,0.6)' : 'rgba(255,120,120,0.5)',
                      backgroundColor: v === undefined ? 'rgba(0,0,0,0.35)' : v ? 'rgba(40,140,90,0.25)' : 'rgba(140,40,40,0.22)' }}>
                    <Text allowFontScaling={false} style={{ color: C.ink, fontWeight: '800', fontSize: 3 * u }}>{n}</Text>
                    <Text allowFontScaling={false} style={{ fontWeight: '800', fontSize: 2.5 * u, color: v === undefined ? C.muted : v ? '#7ef0b5' : '#ff9a9a' }}>{v === undefined ? 'Fark etmez' : v ? '✓ Olsun' : '✕ Olmasın'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 1.4 * u, marginTop: 1.6 * u }}>
          <Btn u={u} pri label={'Masaları Göster (' + list.length + ')'} style={{ flex: 1.35 }} onPress={() => setFOpen(false)} />
          <Btn u={u} label="Temizle" style={{ flex: 1 }} onPress={() => setFilter(F0)} />
        </View>
      </Dlg>

      {/* masa aç — web'deki düzen */}
      <Modal visible={!!create} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          {create ? (
            <View style={[styles.modal, { width: '70%', maxHeight: '96%', borderRadius: 2.4 * u, paddingHorizontal: 3 * u, paddingVertical: 2.4 * u }]}>
              <Text allowFontScaling={false} style={{ color: C.amber, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 6.4 * u, letterSpacing: 0.3 * u }}>MASA AÇ · {cs.name.toLocaleUpperCase('tr-TR')}</Text>
              <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2.6 * u, marginBottom: 1.4 * u }}>{L.MODE.offline ? 'Çevrimdışı masa: çip yok, istediğin gibi kur.' : 'Bahis: herkes ortaya koyar, en düşük puanlı oyuncu ortadakini alır.'}</Text>
              <ScrollView>
                <View style={{ flexDirection: 'row', gap: 2.4 * u }}>
                  <View style={{ flex: 1 }}>
                    {L.MODE.offline ? null : <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text allowFontScaling={false} style={cLbl(u)}>BAHİS</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Coin s={2.8 * u} /><Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.2 * u, color: GOLD }}>{L.chipFmt(create.bet)}</Text></View>
                    </View>
                    <BetSlider u={u} min={cs.min} max={maxOk} step={cs.step} value={create.bet} onChange={v => setCreate(c => c && ({ ...c, bet: v }))} />
                    </>}
                    <Text allowFontScaling={false} style={[cLbl(u), { marginTop: 1.2 * u }]}>OYUN</Text>
                    <SegFull u={u} opts={[['klasik', 'Klasik 101'], ['katlamali', 'Katlamalı 101']]} val={create.mode} onPick={v => setCreate({ ...create, mode: v })} />
                    <Text allowFontScaling={false} style={[cLbl(u), { marginTop: 1.2 * u }]}>BİÇİM</Text>
                    <SegFull u={u} opts={[[false, 'Tek'], [true, 'Eşli']]} val={create.team} onPick={v => setCreate({ ...create, team: v })} />
                    <Text allowFontScaling={false} style={[cLbl(u), { marginTop: 1.2 * u }]}>EL SAYISI</Text>
                    <SegFull u={u} opts={cs.hands.map(h => [h, String(h)])} val={create.hands} onPick={v => setCreate({ ...create, hands: v })} />
                  </View>
                  <View style={{ flex: 1.3 }}>
                    <Text allowFontScaling={false} style={cLbl(u)}>OYUN MODLARI</Text>
                    {L.MODE_CHIPS.map(([k, label, desc]) => {
                      const pk = k.slice(4), on = k === 'hard' ? create.hard : create.pen[pk] !== false;
                      const flip = () => k === 'hard' ? setCreate({ ...create, hard: !create.hard }) : setCreate({ ...create, pen: linkPen(create.pen, pk, !on) });
                      return <Toggle key={k} u={u} label={label} desc={desc} on={on} onPress={flip} />;
                    })}
                  </View>
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 1.4 * u, marginTop: 1.6 * u }}>
                <Btn u={u} pri label="Masayı Aç ve Otur" style={{ flex: 1.35, minHeight: 6.6 * u }} onPress={() => {
                  saveSet({ ...set, mode: create.mode, team: create.team, hands: create.hands, hard: create.hard, pen: create.pen });
                  sitAt({ id: 'c' + Date.now(), salon, bet: create.bet, hands: create.hands, team: create.team, mode: create.mode, hard: create.hard, pen: { ...create.pen }, seats: [null, null, null, null] });
                }} />
                <Btn u={u} label="Vazgeç" style={{ flex: 1, minHeight: 6.6 * u }} onPress={() => setCreate(null)} />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* masaya oturdun: bekleme */}
      <Dlg u={u} visible={!!wait} wide>
        {wait ? (
          <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
            <H2 u={u}>Masaya Oturdun</H2>
            <Sub u={u}>{L.SALONS[wait.t.salon].name} · {L.tableTags(wait.t).join(' · ')}</Sub>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 0.6 * u, marginTop: u }}>
              {L.modeList(wait.t.pen).map(([n, on]) => (
                <Text key={n} allowFontScaling={false} style={{ fontSize: 1.9 * u, fontWeight: '700', color: on ? '#7ef0b5' : '#ff9a9a', borderWidth: 1, borderColor: on ? 'rgba(126,240,181,0.55)' : 'rgba(255,120,120,0.45)', borderRadius: u, paddingHorizontal: u, paddingVertical: 0.4 * u }}>{on ? '✓ ' : '✕ '}{n}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 3 * u, marginVertical: 1.4 * u }}>
              {wait.cfg.names.map((n, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 0.5 * u }}>
                  <Av u={u} name={i ? n : w.name} size={i ? 4.4 : 6} sm={!!i} />
                  <Text allowFontScaling={false} style={{ color: C.ink, fontSize: 2 * u }}>{i ? n : w.name}</Text>
                </View>
              ))}
            </View>
            {L.MODE.offline ? <Sub u={u}>Çevrimdışı oyun · çip yok</Sub> : <>
            <View style={[styles.bet, { borderRadius: 2 * u, paddingVertical: 0.6 * u, paddingHorizontal: 1.6 * u }]}>
              <Coin s={3.4 * u} /><Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.6 * u, color: GOLD }}>{L.chipFmt(wait.t.bet)}</Text>
            </View>
            <Sub u={u} style={{ maxWidth: '92%' }}>{L.payInfo(wait.t)}</Sub></>}
            <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 7 * u, color: C.amber, marginTop: u }}>{wait.left}</Text>
            <Sub u={u}>Oyun {wait.left} saniye içinde başlıyor.{L.MODE.offline ? '' : ' Başlayınca bahsin ortaya konur.'}</Sub>
            <View style={[styles.mrow, { marginTop: 1.6 * u }]}>
              <Btn u={u} pri label="Hemen Başlat" onPress={start} />
              <Btn u={u} label="Masadan Kalk" onPress={() => { setWait(null); say('Masadan kalktın, çipin gitmedi'); }} />
            </View>
          </ScrollView>
        ) : null}
      </Dlg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1d0b3a' },
  top: { flexDirection: 'row', alignItems: 'center' },
  brand: { flex: 1, minWidth: 0, overflow: 'hidden', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  chips: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,201,60,0.45)' },
  salons: { flex: 1, flexDirection: 'row', minHeight: 0 },
  salon: { flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'flex-start' },
  salonDark: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', opacity: 0.55 },
  salonDot: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.07)' },
  bottom: { flexDirection: 'row', justifyContent: 'center' },
  sh: { flexDirection: 'row', alignItems: 'center' },
  seg: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  felt: { flex: 1, backgroundColor: '#174a45', borderColor: '#5a2e14' },
  seat: { position: 'absolute', alignItems: 'center' },
  free: { backgroundColor: '#3fd391', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)' },
  mid: { position: 'absolute', left: '22%', right: '22%', top: '30%', bottom: '30%', alignItems: 'center', justifyContent: 'center' },
  bet: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  msg: { position: 'absolute', alignSelf: 'center', backgroundColor: '#2c1252', maxWidth: '70%' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: '#24104a', borderWidth: 1, borderColor: '#6b3fa8' },
  mrow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dg: { alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.3)' },
  pfRow: { flexDirection: 'row', alignItems: 'center' },
  ptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  adCnt: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  pfCard: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pfRow2: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  pfStat: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  soon: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.06)', opacity: 0.55 },
  pfK: { color: C.muted },
  pfV: { color: C.ink, fontWeight: '800', marginRight: 10 },
});
