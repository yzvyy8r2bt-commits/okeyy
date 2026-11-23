// Lobi ekranı: salonlar, masalar, masa açma, bekleme, günlük hediye, profil (web sürümünün düzeni)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { C, Btn, Toggle, Coin, NUM_FONT } from './ui';
import * as L from './lobby';

const GOLD = '#ffe39a';
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
        <Pressable key={String(v)} onPress={() => onPick(v)} style={[{ flex: 1, height: 5.4 * u, borderRadius: 1.1 * u, alignItems: 'center', justifyContent: 'center' }, val === v && { backgroundColor: C.amber }]}>
          <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: 2.5 * u, fontWeight: '800', color: val === v ? C.amberInk : C.ink }}>{label}</Text>
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

export default function LobbyScreen({ u, ins, set, saveSet, onStart, openSettings, flash }) {
  const [, setTick] = useState(0);
  const re = () => setTick(t => t + 1);
  const [view, setView] = useState('home');
  const [salon, setSalon] = useState(0);
  const [filter, setFilter] = useState({ team: 'all', mode: 'all' });
  const [msg, setMsg] = useState(null);
  const [gift, setGift] = useState(false);
  const [prof, setProf] = useState(false);
  const [rename, setRename] = useState(null);
  const [create, setCreate] = useState(null);     // { bet, mode, team, hands, hard, pen }
  const [wait, setWait] = useState(null);         // { t, cfg, left }
  const msgT = useRef(null);
  const w = L.wallet(), lv = L.levelInfo(w.st.xp);

  const say = (m, bad) => { clearTimeout(msgT.current); setMsg({ m, bad }); msgT.current = setTimeout(() => setMsg(null), 3500); };
  useEffect(() => { if (flash) say(flash.m, flash.bad); }, [flash]);

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
        <View style={[styles.chips, { borderRadius: 3 * u, paddingVertical: u, paddingHorizontal: 1.6 * u }]}>
          <Coin s={3 * u} />
          <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3 * u, color: GOLD }}>{L.chipFmt(w.chips)}</Text>
        </View>
        <Btn u={u} sm pri={L.giftReady()} label={L.giftReady() ? 'Günlük Hediye · ' + L.nextGiftDay() + '. gün' : 'Hediye Alındı'} onPress={() => setGift(true)} />
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
  const list = L.tablesOf(salon).filter(t => t.seats.some(x => !x) && (filter.team === 'all' || (filter.team === 'esli') === t.team) && (filter.mode === 'all' || filter.mode === t.mode));
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
              <Coin s={2.6 * u} /><Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 2.8 * u, color: GOLD }}>{L.chipShort(t.bet)}</Text>
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
          <Seg u={u} opts={[['all', 'Hepsi'], ['tek', 'Tek'], ['esli', 'Eşli']]} val={filter.team} onPick={v => setFilter({ ...filter, team: v })} />
          <Seg u={u} opts={[['all', 'Hepsi'], ['klasik', 'Klasik'], ['katlamali', 'Katlamalı']]} val={filter.mode} onPick={v => setFilter({ ...filter, mode: v })} />
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
          {ready ? <Btn u={u} pri label={'+' + L.chipFmt(L.DAILY_STREAK[day - 1]) + ' çip al'} onPress={() => { const r = L.takeGift(); setGift(false); if (r) say('Günlük hediye (' + r.day + '. gün): +' + L.chipFmt(r.amt) + ' çip'); }} />
            : <Btn u={u} disabled label="Yarın yine gel" />}
          <Btn u={u} label="Kapat" onPress={() => setGift(false)} />
        </View>
      </Dlg>

      {/* profil */}
      <Dlg u={u} visible={prof} wide>
        <View style={{ flexDirection: 'row', gap: 3 * u, alignItems: 'center' }}>
          <Av u={u} name={w.name} size={14} />
          <View style={{ flex: 1, gap: 0.9 * u }}>
            <View style={styles.pfRow}><Text allowFontScaling={false} style={[styles.pfK, { fontSize: 2 * u, width: 14 * u }]}>İsim</Text><Text allowFontScaling={false} style={[styles.pfV, { fontSize: 2.6 * u }]}>{w.name}</Text><Btn u={u} sm label="Değiştir" onPress={() => setRename(w.name)} /></View>
            <View style={styles.pfRow}><Text allowFontScaling={false} style={[styles.pfK, { fontSize: 2 * u, width: 14 * u }]}>Çip</Text><Coin s={2.4 * u} /><Text allowFontScaling={false} style={[styles.pfV, { fontSize: 2.6 * u, color: GOLD }]}>{L.chipFmt(w.chips)}</Text></View>
            <View style={styles.pfRow}>
              <Text allowFontScaling={false} style={[styles.pfK, { fontSize: 2 * u, width: 14 * u }]}>Seviye</Text>
              <Text allowFontScaling={false} style={[styles.pfV, { fontSize: 2.6 * u, marginRight: u }]}>{lv.lv}</Text>
              <View style={{ flex: 1, height: 1.2 * u, borderRadius: u, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}><View style={{ width: Math.round(lv.rest * 100 / lv.need) + '%', height: '100%', backgroundColor: C.amber }} /></View>
              <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.9 * u, marginLeft: u }}>{lv.rest}/{lv.need} DP</Text>
            </View>
            <View style={styles.pfRow}><Text allowFontScaling={false} style={[styles.pfK, { fontSize: 2 * u, width: 14 * u }]}>Başlangıç</Text><Text allowFontScaling={false} style={[styles.pfV, { fontSize: 2.6 * u }]}>{w.since}</Text></View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: u, marginTop: 2 * u }}>
          {[['Oynadığı oyun', w.st.games], ['Kazandığı oyun', w.st.wins], ['Galibiyet yüzdesi', '%' + pct], ['En büyük kazanç', L.chipShort(w.st.best)]].map(([k, v]) => (
            <View key={k} style={[styles.dg, { flex: 1, borderRadius: 1.4 * u, paddingVertical: 1.4 * u }]}>
              <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 1.8 * u }}>{k}</Text>
              <Text allowFontScaling={false} style={{ color: C.ink, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.6 * u }}>{v}</Text>
            </View>
          ))}
        </View>
        <Sub u={u}>Her oyun +5, kazanılan oyun +10 deneyim puanı (DP). Seviye atlayınca seviye × 1.000 çip ödül.</Sub>
        <View style={[styles.mrow, { marginTop: 1.6 * u }]}><Btn u={u} pri label="Kapat" onPress={() => setProf(false)} /></View>
      </Dlg>

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

      {/* masa aç — web'deki düzen */}
      <Modal visible={!!create} transparent animationType="fade" supportedOrientations={['landscape']}>
        <View style={styles.modalBg}>
          {create ? (
            <View style={[styles.modal, { width: '70%', maxHeight: '96%', borderRadius: 2.4 * u, paddingHorizontal: 3 * u, paddingVertical: 2.4 * u }]}>
              <Text allowFontScaling={false} style={{ color: C.amber, fontFamily: NUM_FONT, fontWeight: '800', fontSize: 6.4 * u, letterSpacing: 0.3 * u }}>MASA AÇ · {cs.name.toLocaleUpperCase('tr-TR')}</Text>
              <Text allowFontScaling={false} style={{ color: C.muted, fontSize: 2.6 * u, marginBottom: 1.4 * u }}>Bahis: herkes ortaya koyar, en düşük puanlı oyuncu ortadakini alır.</Text>
              <ScrollView>
                <View style={{ flexDirection: 'row', gap: 2.4 * u }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text allowFontScaling={false} style={cLbl(u)}>BAHİS</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Coin s={2.8 * u} /><Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.2 * u, color: GOLD }}>{L.chipFmt(create.bet)}</Text></View>
                    </View>
                    <BetSlider u={u} min={cs.min} max={maxOk} step={cs.step} value={create.bet} onChange={v => setCreate(c => c && ({ ...c, bet: v }))} />
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
            <View style={[styles.bet, { borderRadius: 2 * u, paddingVertical: 0.6 * u, paddingHorizontal: 1.6 * u }]}>
              <Coin s={3.4 * u} /><Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 3.6 * u, color: GOLD }}>{L.chipFmt(wait.t.bet)}</Text>
            </View>
            <Sub u={u} style={{ maxWidth: '92%' }}>{L.payInfo(wait.t)}</Sub>
            <Text allowFontScaling={false} style={{ fontFamily: NUM_FONT, fontWeight: '800', fontSize: 7 * u, color: C.amber, marginTop: u }}>{wait.left}</Text>
            <Sub u={u}>Oyun {wait.left} saniye içinde başlıyor. Başlayınca bahsin ortaya konur.</Sub>
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
  brand: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
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
  pfK: { color: C.muted },
  pfV: { color: C.ink, fontWeight: '800', marginRight: 10 },
});
