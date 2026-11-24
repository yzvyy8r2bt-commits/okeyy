// SADECE Snack/Expo Go denemesi için: Snack ses ve resim dosyalarını pakete koyamıyor,
// bu yüzden aynı dosyalar GitHub'dan yüklenir. Mağaza sürümü src/media.js'i kullanır.
const B = 'https://raw.githubusercontent.com/yzvyy8r2bt-commits/okeyy/main/mobil/assets/';
export const SFX = {};
for (const k of ['tap', 'place', 'draw', 'discard', 'open', 'penalty', 'win', 'okey', 'turn']) SFX[k] = { uri: B + 'sfx/' + k + '.wav' };
export const GIFT_IMG = {};
for (const g of ['altin-kolye', 'altin-semaver', 'ayran', 'baklava', 'biberon', 'bordo-mavi-forma', 'boza', 'cay', 'cicek-buketi', 'damatlik', 'domates', 'dondurma', 'dort-yaprakli-yonca', 'elmas-bardakta-cay', 'elmas-okey-tasi', 'fotr-sapka', 'gazoz', 'gelinlik', 'gul', 'gunes-gozlugu', 'ihlamur', 'kahvehane-tapusu', 'kalp', 'kaplumbaga', 'kirmizi-beyaz-forma', 'kirmizi-yesil-forma', 'kol-saati', 'kumpir', 'kupa', 'limonata', 'lokum', 'luks-otomobil', 'luks-yat', 'madalya', 'maden-suyu', 'mendil', 'menengic-kahvesi', 'nazar-boncugu', 'palyaco', 'papyon', 'pirlanta', 'salep', 'salgam', 'salyangoz', 'sari-kirmizi-forma', 'sari-lacivert-forma', 'simit', 'siyah-beyaz-forma', 'tac', 'terlik', 'tespih', 'tost', 'turk-kahvesi', 'uyku', 'yesil-beyaz-forma', 'yildiz', 'yuzuk']) GIFT_IMG[g] = { uri: B + 'gifts/' + g + '.png' };
// Expo Go denemesi: geliştiricinin (senin) misafir adı
export const DEV_NAME = 'C331903';
