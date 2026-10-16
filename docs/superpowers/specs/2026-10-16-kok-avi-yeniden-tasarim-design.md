# Kök Avı yeniden tasarım: "Fotoğraf Patikası" (koyu, oyunsu, şablonsuz)

Tarih: 2026-10-16 · Durum: onaylandı (Batuhan, beyin fırtınası oturumu) · Branch: `gece-calismasi`

## 1. Amaç ve okuma

**Tasarım okuması:** 10-12 yaş için öğrenme uygulaması; koyu, sakin ama oyunsu dil; Duolingo'nun
öğrenme yolu mantığı; konuya bağlılığı gerçek eser fotoğrafları ve vakıf mirası sağlar. Çocuk ürünü
olduğu için erişilebilirlik estetikten önce gelir.

**Kullanıcı istekleri:** koyu tema, bol ama anlamlı animasyon, Duolingo hissi, "yapay zekâ şablonu"
görüntüsünün kesinlikle olmaması (klasik gölgeli düğmeler, neon parıltı, mor degrade, amaçsız döngüler).

**Ayarlar (design-taste-frontend):** çeşitlilik 6, hareket 7, yoğunluk 4.

**Reddedilen yönler:** parşömen "Kâşif Haritası" (açık, bej/pirinç paleti = YZ varsayılanı), Neon Kâşif
(mor + parıltı), Deste ve Mozaik (yol hissi zayıf). Seçilen: **Fotoğraf Patikası**.

## 2. Görsel sistem

### Renk (tek vurgu)
- Zemin `#0e1315` (siyah değil, soğuk koyu), yüzey `#161d20`, yüzey-2 `#1d2629`, çizgi `#2a3539`.
- Metin `#eef2f0`, ikincil `#9fb0ad` (koyu zeminde ≥ 4.5:1).
- **Tek vurgu: kısık çini turkuazı `#3cbfae`** (üstündeki metin koyu `#062521`). Ana eylem, aktif
  sekme, ilerleme, biten durak.
- Anlamsal: sıcak `#f2a541` yalnızca seri/ödül; başarı ve uyarı mevcut anlamlarıyla.
- **Neon/dış parıltı, mor, degrade metin yok.** Gölgeler zemine boyalı, siyah değil.
- Tema: **koyu varsayılan**. Ayarlar'daki "açık" ve "yüksek kontrast" aynı jeton adlarıyla yeniden
  tanımlanır (açık tema bej değil: kırık beyaz + aynı turkuaz). Bileşen tema bilmez.

### Tipografi
- Başlık: **Bricolage Grotesque** (700/800, `letter-spacing: -0.02em`). Gövde: **Figtree** (500/600/700).
- İkisi de OFL; `public/fonts/` altında yerel woff2 (çevrimdışı), latin + latin-ext (Türkçe).
- Ölçek (telefon): h1 28 · h2 22 · h3 18 · gövde 16 · küçük 13. `--yazi-olcek` korunur.

### Şekil ve derinlik
- Köşe sistemi (kilitli): düğme/girdi 12px · kart 20px · fotoğraf madalyonu tam daire · hap tam.
- Düğmeler **gölgesiz**, düz dolgu; basınca `scale(.97)`; odak halkası her zaman görünür.
- Kart: yüzey rengi + 1px iç çizgi; kart yalnızca hiyerarşi gerektiğinde, değilse boşlukla gruplama.

### Simgeler
- **@phosphor-icons/react** (tek aile, `weight="bold"` arayüz, `"fill"` aktif durum). Elle çizilmiş SVG
  simgeler kaldırılır; `src/app/Ikonlar.tsx` aynı adlarla Phosphor'u saran ince bir katmana dönüşür
  (bileşen değişikliği en aza iner). Maskot Köstik (SVG çizim) istisna: marka karakteri.
- Emoji yasağı sürer (`tests/emoji-yok.test.ts`).

### Hareket (anlamlı olan)
| An | Hareket | Anlam |
|---|---|---|
| Yol açılışı | duraklar yaylanarak gelir (stagger) | sıra ve hiyerarşi |
| Sıradaki durak | ilerleme halkası çizilir; durak yavaş "nefes" alır (tek döngü) | dikkat |
| Düğme basma | `scale(.97)` 120ms | geri bildirim |
| Cevap | alttan yaylanan sonuç sayfası + Köstik tepkisi + ses | geri bildirim |
| Ders sonu | elmas sayacı sayar, pul "basılır", konfeti | ödül |
| Sekme değişimi | içerik hafif kayarak girer | durum geçişi |
Hepsi `prefers-reduced-motion` ve Ayarlar → "Hareketi azalt" ile durur. Yalnızca `transform`/`opacity`.

## 3. Bilgi mimarisi ve gezinme

Alt sekme çubuğu **4 sekme**: **Yolculuk · Keşfet · Oyunlar · Defter**. Üst çubuk: logo, seri, elmas,
**profil düğmesi**.

| Sekme | Rota | İçerik |
|---|---|---|
| Yolculuk | `#/yol` | Fotoğraf patikası (Şehirlere göre / Zamana göre), tanıtım turu, tekrar kartı |
| Keşfet | `#/kesfet` (yeni merkez) | Harita · Meraklısına arşivi · Zaman tüneli · Keşif rotası (kutucuklar) |
| Oyunlar | `#/oyunlar` (yeni merkez) | Günün Eseri · Hayrat mı Akar mı · Hatalarımı çalış · Canlı yarışma · Sınıfım |
| Defter | `#/defter` | İç sekmeler: Pullar · Rozetler · Seri · Belgeler (sertifikalar) |
| Profil | `#/profil` (yeni) | Ayarlar özeti + Vakıf Çarşısı + Yetişkinler (öğretmen, içerik yönetimi, canlı yarışma kur) |

- Bütün eski rotalar çalışmaya devam eder (`#/harita`, `#/arsiv`, `#/sinif`, `#/ayarlar`, `#/carsi`,
  `#/gunun-eseri`, `#/seri`…); `UST_SEKME` hangi sekmenin seçili görüneceğini belirler.
- Altbilgideki "Yetişkinler için" gezinmesi profil sayfasına taşınır; kabuk testi buna göre güncellenir
  (öğretmen/panel çocuk gezinmesinde değil, ayrı yerde kuralı korunur).

## 4. Ekranlar

1. **Yolculuk:** başlıkta şehir adı (Bricolage 28) + ünite adı + ince ilerleme çizgisi. Altında patika:
   zigzag, durak = eserin kapak fotoğrafı (`k.webp`) dairesel madalyon. Bitti: renkli + turkuaz kenar +
   onay simgesi. Sıradaki: büyük (96px), ilerleme halkası, yanında ad + "Devam et". Kilitli: gri + kilit.
   Ünite başlıkları patikanın içinde sade bir satır. Köstik sıradaki durağın yanında küçük (konuşma
   balonu yalnızca tanıtımda / ilk ders).
2. **Ders:** odak modu (gezinme yok); üstte kapat + bölümlü ilerleme; içerik kartları koyu yüzeyde;
   seçenekler 56px satırlar (seçili: turkuaz kenar); sonuç **alttan yaylanan sayfa** (doğru: başarı rengi,
   ipucu: sıcak ton; Köstik tepkisi), "Devam" tam genişlik.
3. **Ders sonu:** eser fotoğrafı pul olarak basılır, elmas sayacı sayar, seri ve deftere eklendi bilgisi.
4. **Keşfet / Oyunlar merkezleri:** fotoğraf ve doku içeren karışık boyutlu kutucuklar (eşit üçlü kart
   yok); Günün Eseri bulanık fotoğrafla "gizem".
5. **Defter:** iç sekmeler; Pullar = 3 sütun fotoğraf pulları (tırtıklı kenar maskesi), kilitliler boş
   pul çerçevesi; Rozetler/Seri/Belgeler mevcut bileşenler yeni dille.
6. **Profil:** ayarlar satırları, çarşı girişi, yetişkin bağlantıları.
7. **Diğer sayfalar** (harita, arşiv, canlı yarışma, sertifika, rota, sınıf, ayarlar, çarşı, öğretmen,
   panel): yeni jetonlar ve bileşenlerle otomatik değişir; yerleşimleri yalnızca kırılırsa düzeltilir.

## 5. Mimari

- **Jetonlar:** `src/styles/tokens.css` yeniden yazılır (aynı jeton adları korunur, değerler değişir;
  koyu varsayılan; açık/yüksek kontrast yeniden tanımlanır). Kontrast testi (`tests/erisilebilirlik.test.ts`)
  güncellenir.
- **Temel bileşen stilleri:** `src/styles/global.css` (düğme, kart, seçenek, rozet, bildirim) yeni dile.
- **Kabuk:** `src/app/App.tsx` 4 sekme + profil düğmesi; `app.css` yeniden.
- **Yeni sayfalar:** `src/features/merkez/KesfetSayfasi.tsx`, `OyunlarSayfasi.tsx`, `src/features/profil/ProfilSayfasi.tsx`.
- **Yolculuk:** `src/features/yol/` patika bileşeni (`FotografPatikasi.tsx`) yeniden; `YolSayfasi` sadeleşir.
- **Ders:** `src/features/ders/ders.css` yeniden; `EgzersizKabugu` sonuç sayfası alttan kayar.
- **Defter:** iç sekmeler (`DefterSayfasi`), pul bileşeni.
- 🔴 bölgelere (server, shared, api, ilerleme, oturum) dokunulmaz.

## 6. Test ve kabul ölçütleri

- `npm run dogrula` yeşil; axe 0 ihlal (yeni merkez ve profil sayfaları dahil).
- Kabuk testi: 4 çocuk sekmesi; öğretmen/panel çocuk gezinmesinde değil (profilde).
- Görsel denetim: 360/375/414px'te yatay taşma yok; koyu (varsayılan), açık ve yüksek kontrastta
  metin ≥ 4.5:1; hareketi azalt'ta animasyon yok.
- Şablon denetimi: emoji yok, neon/parıltı yok, elle çizilmiş simge yok (maskot hariç), tek vurgu,
  tek köşe sistemi, em-dash yok.

## 7. Kapsam dışı

İçerik metinleri, ders akışı (5 adım), sunucu ve API, puan/elmas kuralları değişmez.
