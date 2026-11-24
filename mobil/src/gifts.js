// Hediyeler: web sürümündeki kurallar (tek hediye; kalıcı > günlük > oyunluk; daha pahalısı gönderilebilir)
import React from 'react';
import { Image, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GIFT_CATS } from './giftData';
// Web'deki SVG hediye çizimleri birebir resme çevrildi (assets/gifts), uygulamanın içine gömülü
import { GIFT_IMG } from './media';
const SLUG = {"Çay": "cay", "Türk Kahvesi": "turk-kahvesi", "Ayran": "ayran", "Gazoz": "gazoz", "Salep": "salep", "Limonata": "limonata", "Maden Suyu": "maden-suyu", "Boza": "boza", "Şalgam": "salgam", "Ihlamur": "ihlamur", "Menengiç Kahvesi": "menengic-kahvesi", "Simit": "simit", "Lokum": "lokum", "Tost": "tost", "Kumpir": "kumpir", "Baklava": "baklava", "Dondurma": "dondurma", "Gül": "gul", "Nazar Boncuğu": "nazar-boncugu", "Dört Yapraklı Yonca": "dort-yaprakli-yonca", "Kalp": "kalp", "Pırlanta": "pirlanta", "Yüzük": "yuzuk", "Terlik": "terlik", "Domates": "domates", "Biberon": "biberon", "Kaplumbağa": "kaplumbaga", "Mendil": "mendil", "Salyangoz": "salyangoz", "Palyaço": "palyaco", "Uyku": "uyku", "Taç": "tac", "Fötr Şapka": "fotr-sapka", "Güneş Gözlüğü": "gunes-gozlugu", "Kupa": "kupa", "Madalya": "madalya", "Yıldız": "yildiz", "Tespih": "tespih", "Kol Saati": "kol-saati", "Altın Kolye": "altin-kolye", "Papyon": "papyon", "Çiçek Buketi": "cicek-buketi", "Sarı-Kırmızı Forma": "sari-kirmizi-forma", "Sarı-Lacivert Forma": "sari-lacivert-forma", "Siyah-Beyaz Forma": "siyah-beyaz-forma", "Bordo-Mavi Forma": "bordo-mavi-forma", "Kırmızı-Yeşil Forma": "kirmizi-yesil-forma", "Kırmızı-Beyaz Forma": "kirmizi-beyaz-forma", "Yeşil-Beyaz Forma": "yesil-beyaz-forma", "Gelinlik": "gelinlik", "Damatlık": "damatlik", "Altın Semaver": "altin-semaver", "Elmas Okey Taşı": "elmas-okey-tasi", "Kahvehane Tapusu": "kahvehane-tapusu", "Elmas Bardakta Çay": "elmas-bardakta-cay", "Lüks Otomobil": "luks-otomobil", "Lüks Yat": "luks-yat"};
export { GIFT_CATS };

const PERM_MS = 24 * 3600 * 1000, PKEY = 'okey101.permgifts';
let PERM = {};
export async function loadPerm() { try { PERM = JSON.parse((await AsyncStorage.getItem(PKEY)) || '{}') || {}; } catch (e) { PERM = {}; } }
const savePermStore = () => AsyncStorage.setItem(PKEY, JSON.stringify(PERM)).catch(() => {});
function permOf(name, key) { const e = PERM[name + (key || '')]; return e && (e.forever || e.until > Date.now()) ? e.em : ''; }
function savePerm(name, em, forever, price) {
  const now = Date.now();
  for (const k in PERM) if (!PERM[k] || (!PERM[k].forever && PERM[k].until <= now)) delete PERM[k];
  PERM[name + (forever ? '#ozel' : '')] = forever ? { em, forever: 1 } : { em, until: now + PERM_MS, p: price || 0 };
  savePermStore();
}
function delPerm(name, key) { delete PERM[name + (key || '')]; savePermStore(); }

// oyuncunun üzerindeki tek hediye; tmp: bu oyunluk hediyeler { [i]: { em, p } }
export function curGift(name, tmp) {
  const oz = permOf(name, '#ozel');
  if (oz) return { kind: 'oz', em: oz, p: 1e6 };
  const e = PERM[name];
  if (e && e.until > Date.now()) return { kind: 'perm', em: e.em, p: e.p || 0 };
  return tmp ? { kind: 'tmp', em: tmp.em, p: tmp.p || 0 } : null;
}
// gönderilebilir mi? boşsa olur, değilse nedeni
export function giftBlock(cur, cat, price) {
  if (!cur) return '';
  if (cur.kind === 'oz') return cat.forever ? '' : 'Kalıcı hediyesi var';
  if (cat.forever) return '';
  return price > cur.p ? '' : 'Üzerindekinden ucuz';
}
// hediyeyi yerleştir; oyunluk hediye için yeni tmp değerini döndürür
export function placeGift(name, item, cat) {
  const [em, , price] = item;
  if (cat.forever) { delPerm(name); savePerm(name, em, true, price); return null; }
  if (cat.perm) { savePerm(name, em, false, price); return null; }
  delPerm(name);
  return { em, p: price };
}
export function botLv(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997; return 3 + h % 58; }

export function GiftIcon({ name, size }) {
  const sl = SLUG[name];
  if (sl && GIFT_IMG[sl]) return <Image source={GIFT_IMG[sl]} style={{ width: size, height: size }} resizeMode="contain" />;
  const it = GIFT_CATS.flatMap(c => c.items).find(x => x[0] === name);
  return <Text allowFontScaling={false} style={{ fontSize: size * 0.78, lineHeight: size, textAlign: 'center', width: size }}>{it ? it[1] : '🎁'}</Text>;
}
