// Web sürümündeki Kurallar ve Nasıl Oynanır metinleri (aynen)
export const HOWTO = [
 "Amaç: Taşlarını per (aynı renk sıralı ya da farklı renk aynı sayı) ve çift yapıp elini açmak, sonra elindeki taşları bitirmek. Puanı en düşük olan kazanır.",
 "Sıran gelince: Desteden ya da solundaki oyuncunun attığı taşı ıstakana sürükle, sonra bir taşı sağ alttaki Attığın alanına sürükle.",
 "El açmak: Perlerini ıstakada yan yana diz, Seri Aç de (101 puan ve üstü) ya da 5 çift dizip Çift Aç de. Katlamalıda masadaki limiti geçmelisin.",
 "İşlemek: Elini açtıktan sonra taşı masadaki perin ucuna sürükle.",
 "Okey: Göstergenin bir üstü okeydir, her taşın yerine geçer. Okeye basılı tutunca ters döner.",
 "Dikkat: Masadaki bir pere işlenebilecek taşı atarsan (işlek) 101 ceza yersin."
];
export const RULES = [
 {
  "t": "Taşlar",
  "i": [
   "1-13 arası 4 renk, ikişer takım ve 2 sahte okey: 106 taş.",
   "Gösterge açılır, bir üstü Okey olur (13 ise 1). Gerçek okey her taşın yerine geçer. Sahte okey üzerinde halka ve yıldız işareti olan bir taştır; okey taşının yüzü yerine geçen sıradan bir taş gibi davranır, joker değildir. Gerçek okey ise sıradan taş gibi görünür; basılı tutunca hafifçe kalkıp ters döner (beyaz yüz), 0,6 saniye tutarsan ters kalır.",
   "Başlayana 22, diğerlerine 21 taş verilir. Başlayan çekmeden taş atar."
  ]
 },
 {
  "t": "El açma",
  "i": [
   "Seri: en az 3 taşlı perlerle (aynı renk ardışık ya da farklı renkte aynı sayı) en az 101 puan. 1 taşı yalnızca başta (1-2-3) kullanılır ve 1 puandır; 12-13-1 per olmaz.",
   "Çift: en az 5 çift. Çift açan hem çift hem seri perlere işleyebilir; ama bir turda bir perin her ucuna (sağ ve sol) en fazla 2 taş işleyebilir, okey çalabilir.",
   "Katlamalı modda masadaki en yüksek açılışı geçmek gerekir (seri puanı ya da çift sayısı). Elini açtığın turda, taş atmadan sonradan indirdiğin per ve çiftler de açılışına eklenir ve limit buna göre yükselir. O turda okey ya da gösterge çaldıktan sonra indirdiklerin eklenmez.",
   "Istakada yan yana (boşluksuz) duran taşlar bir per sayılır. Yeşil çizgi per, altın çizgi çift demektir."
  ]
 },
 {
  "t": "İşleme ve okey çalma",
  "i": [
   "Elini açtıysan yerdeki perlere taş işleyebilirsin: taşı seçip pere dokun ya da sürükle. Yardımsız mod kapalıyken Tümünü İşle düğmesi işlenebilen tüm taşları işler.",
   "Yandan aldığın taşı mutlaka kullanmalısın: elin kapalıysa onunla el açarsın, açıksa pere işler ya da yeni per (çift açtıysan çift) indirirsin. Kullanamayacağını anlarsan taşı Yan kutusuna geri sürükle: ceza yok, ama o turda desteden çekersin.",
   "Yandan aldığın taşla yanlış el açmaya çalışırsan (puan yetmiyor, Katlamalıda rakibi geçemiyorsun) +101 ceza yersin ve taş geri gider. Yandan taş almadan başarısız el açmaya çalışmak da +101 cezadır.",
   "Masada hem seri hem çift açan varsa, seri açan oyuncu da elindeki çiftleri Çift Aç düğmesiyle indirebilir (bir turda en fazla 2 çift; sıra tekrar gelince 2 çift daha). Yandan aldığı taşla çift indirirse taşı atana ×10 ceza yazılır (çift açan çift indirirse ×20).",
   "Her taş ceza: elini açtıktan sonra yandan aldığın taşla yeni per ya da çift indirirsen o taşı atan oyuncu taş sayısı ×10 (çiftte ×20) ceza yer. Yandan aldığın taşı elindeki taşla bağlayıp (örneğin yerde kırmızı 3-4-5, elinde 6, yandan 7) pere işlersen de ceza yazılır; çift açan bunu yaparsa ×10, çift indirirse ×20 yazılır.",
   "Yandan aldığın taşla el açarsan o taşı atan oyuncu, taş sayısı ×10 (çift açtıysan ×20) ceza yer.",
   "Yan oyuncu işlek taş atıp 101 ceza yediyse, o taşı yandan alınca cezası 101 yerine taş sayısı ×10 olur (alana ceza yok).",
   "Bir oyuncunun perde bıraktığı okeyi çalarsan okeyi bırakan oyuncuya 101 ceza yazılır (kendi okeyini alırsan ceza yok).",
   "Perdeki okeyi almak için yerine tam olarak temsil ettiği taşı koymalısın; okey ıstakana gelir. Çiftteki okey de, çiftin eşi olan taşla alınabilir (eşin değilse okeyi bırakana 101 ceza).",
   "Aynı sayı perinde (küt) 1 okey varsa okeyin rengi belli değildir: örneğin siyah 13, mavi 13 ve okey perinde okeyi almak için sarı 13 ve kırmızı 13 birlikte konmalı. Tek taş konursa okey alınmaz, taş sadece pere işlenir. 4'lü kütte (rengi belli) tek taş yeter.",
   "1 taş ve 2 okeyle per indirirken taşın yeri perin türünü belirler. Taş en soldaysa yukarı doğru seri olur (siyah 10, okey, okey = siyah 10-11-12): okeyleri siyah 11 ve siyah 12 alır. Taş ortada ya da sağdaysa küt olur (10'lu): ilk konan farklı renk 10 bir okeyi alır, kalan okey için kalan iki renk birlikte konmalı.",
   "Masadaki bir okeyin (seri ya da çift) yerini tutan taşı atmak işlek sayılır: atan 101 ceza yer."
  ]
 },
 {
  "t": "Ceza ve puan",
  "i": [
   "Yanlışa taş atma: attığın taş masadaki bir pere işleniyorsa +101 ceza.",
   "El sonunda eli açmamış oyuncuya 202. Eli açan, kalan taşlarının toplamını yazar; elinde okey kalırsa +101 ekstra.",
   "Bitiren −101 alır. Kafa (kimse el açmamışken eli açıp aynı turda son taşı atarak bitirmek) ×2, okey atarak bitme ×2, ikisi birlikte (okey kafa) ×4 çarpan uygular. Başkası açtıktan sonra aynı turda açıp bitirmek normal bitiştir. Çift açıp bitiren −202 alır, rakiplerin kalan puanı ×2 olur. Eli ortada okey atmak 101 cezadır.",
   "Deste biterse el berabere biter, herkes kalan taşına göre yazılır."
  ]
 },
 {
  "t": "Oyun modları",
  "i": [
   "Ayarlardaki Oyun modları bölümünden Rekorlu, Okey çalma cezası, Her taş cezalı, Yandan açma cezalı ve Yardımsız seçenekleri tek tek açılıp kapatılabilir. Kapalı olan kural uygulanmaz. Değişiklik yeni oyunda geçerli olur."
  ]
 },
 {
  "t": "El açma ve bitirme",
  "i": [
   "Rekor ödülü: 151–160 puanla seri ya da 7 çiftle açan −101, 161 ve üzeri puanla ya da 8 ve üzeri çiftle açan −202 kazanır. Seri ve çift için ödül ayrıdır. Daha yüksek açan olursa ödül ona geçer, öncekinin ödülü silinir.",
   "Katlamalıda rakibin açtığı sayıyı geçemiyorsan bile, işlek yapmadan elindeki taşlardan tek taş kalacak şekilde 101+ puanla açabilirsen eli açabilir ve o son taşı atıp bitirebilirsin. Rakibin sayısı aranmaz. Bu normal bitiş sayılır (kimse açmamışsa kafa).",
   "Eli açarken tüm taşlarını indiremezsin: elinde en az bir taş kalmalı. Eli son taşını sağına atarak bitirirsin. Kimse açmadan aynı turda açıp bitirmek kafadır.",
   "Limit tutmasa da perlerini indirebilirsin: aynı turda, taş atmadan indirdiğin perler (ya da çiftler) toplanır, toplam limite ulaşınca elin açılmış olur. Tamamlamadan taş atarsan indirdiklerin geri gelir ve +101 yanlış açma cezası yazılır. Geri Topla ile indirdiklerini geri alıp düzeltebilirsin; yine açamadan taş atarsan ceza aynıdır.",
   "El açtığın turda Geri Topla düğmesiyle indirdiklerini geri alabilirsin. Düzeltip yeniden açabilirsen ceza yok; açamazsan ya da açmadan taş atarsan +101 yanlış el açma cezası yazılır.",
   "Elin daha önceki bir turda açıksa, bu turda işlediğin, indirdiğin ya da okey/gösterge almak için koyduğun taşları taş atmadan önce Geri Topla ile ıstakana geri alabilirsin. Bunun cezası yoktur; taşı attıktan sonra geri alınamaz.",
   "Çift açan oyuncu eli bitirememişse kalan taşının 2 katı yazılır. Rakip okeyle ya da çiftle bitirirse bu 4 kata, seri açanın cezası 2 kata çıkar. Rakip bitirdiğinde çift açanın elinde 100'ü geçen sayı kalmışsa ayrıca +101 ceza yazılır."
  ]
 },
 {
  "t": "Eşli oyun",
  "i": [
   "Ayarlardan Eşli seçilirse Sen ile Mehmet (karşılıklı oturanlar) bir takım, Ahmet ile Ayşe rakip takım olur.",
   "Eli bitiren oyuncunun eşine o el için puan yazılmaz (0), ama eş bitirmeden önce ceza yediyse o ceza yazılır. Eşe katlama yoktur. Rakiplere olağan puanlar yazılır.",
   "Eşinin perde bıraktığı okeyi çalarsan eşine ceza yazılmaz.",
   "Oyun sonunda iki oyuncunun toplamı takım puanıdır; düşük olan takım kazanır. El sayısı 1, 2, 4 ya da 8 seçilebilir (Tek oyunda da)."
  ]
 },
 {
  "t": "Gösterge",
  "i": [
   "Oyun modlarında Gösterge açıksa, ortadaki göstergenin eşi elinde olan oyuncu elin başında, ilk taşını çekmeden önce o taşa basılı tutarak (başlayan oyuncu ilk taşını attıktan sonra da, çekmeden önce söyleyebilir) \"Gösterge bende\" der. Herkese bildirim gider. 4 el ve üstü oyunlarda göstergeyi söyleyene göstergenin 10 katı silme yazılır (ör. gösterge 4 ise −40); 1 ve 2 ellik oyunlarda bu ödül yoktur.",
   "Söylenen gösterge yalnızca çiftte joker gibidir: her taşla çift olur. Seri perde sıradan taş olarak kullanılır.",
   "Seri açtıysan ve masada çift açan varsa, çift indirirken göstergeyi kullanabilirsin.",
   "Yandan alınan taşı göstergeyle çift yapıp açarsan ya da indirirsen taşı atana ceza yazılmaz (okeyle yapılırsa yazılır).",
   "Masada gösterge + X çifti varsa, eli açık olan ve X’i olan oyuncu X’i koyup göstergeyi alır ve başka taşla yeniden çift indirebilir. Göstergeyi almanın cezası yoktur; ama çiftten alınan gösterge ile seri açılamaz. O X taşını atmak işlek sayılır (101).",
   "El sonunda elde kalan gösterge kendi sayısı kadar yazılır; atılan gösterge sıradan taşa döner."
  ]
 },
 {
  "t": "Yardımsız mod",
  "i": [
   "Ayarlardan açılır, Klasik ve Katlamalı ile birlikte oynanır. Istakadaki per ve çift çizgileri görünmez, taş seçince işleyeceği perler parlamaz, işlek taş ipucu çalışmaz. Perleri kendin dizmelisin."
  ]
 },
 {
  "t": "Tur süresi",
  "i": [
   "Her turda 60 saniyen var; süre ıstakanın üstünde görünür, son 10 saniyede kırmızıya döner.",
   "El açtığında, taş işlediğinde, per ya da çift indirdiğinde veya okey/gösterge aldığında süre baştan başlar. Bu hak her turda yalnızca bir kezdir: aynı turda sonraki işlemlerde süre yenilenmez.",
   "Süre dolarsa senin yerine desteden taş çekilir ve bir taş atılır (önce okey ve işlek olmayan taşlar seçilir). Ceza yazılmaz. Menü ya da yazboz açıkken süre durur.",
   "Üst üste 2 tur süresi dolan oyuncunun süresi 5 saniyeye düşer. Bir turu kendisi oynayınca süresi yeniden 60 saniye olur."
  ]
 },
 {
  "t": "Kontroller",
  "i": [
   "Taşa dokun: seç. Sürükle: yerleştir; taşı atmak için Attığın alanına, işlemek için pere bırak.",
   "Seri Diz ve Çift Diz, ıstakayı en iyi dizilimle düzenler."
  ]
 }
];

// açılışta (giriş beklemesinde) gösterilen ipuçları
export const TIPS = [
  'Gösterge elindeyse ilk taşını çekmeden göstergeye basılı tut, "Gösterge bende" de. Böylece gösterge çift indirirken her taşla eş olur, 4 el ve üstü oyunlarda da göstergenin 10 katı ödül alırsın!',
  '151 ve üzeri seri ya da 7 çiftle açarsan rekor ödülü kazanırsın: −101. 161+ ya da 8+ çiftte −202!',
  'Okey çalma cezası açık masada, perdeki okeyini başkası alırsa sana 101 ceza yazılır. Okeyli per indirirken iki kez düşün!',
  'Her taş cezalı masada, elini açmış biri senin attığın taşı yandan alıp yeni per ya da çift indirirse sana taş sayısı ×10 ceza yazılır (çiftte ×20).',
  'Yandan açma cezalı masada, attığın taşı alan oyuncu onunla elini açarsa sana taş sayısı ×10 ceza yazılır (çift açarsa ×20).',
  'Masadaki bir okeyin yerini tutan ya da bir pere işlenebilen taşı atarsan işlek sayılır ve 101 ceza yersin.',
  'Masa açarken Cezalar bölümünden hangi kuralların geçerli olacağını sen seçersin. Oyunda açık olan cezalar seri perlerin altında yazar.',
  'Ayarlar\'daki Hemen Oyna Ayarları\'ndan el sayısını, tek ya da eşli, yardımlı ya da yardımsız ve istediğin cezaları seç: Hemen Oyna seni tam aradığın masaya oturtur.',
];
