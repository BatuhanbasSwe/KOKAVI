# Gece çalışması raporu (16 Ekim 2026)

> Batuhan için sabah okuma notu. Her özellik **ayrı commit**; istemediğini
> tek komutla geri alabilirsin (en altta).

## 30 saniyede özet

| # | Özellik | Başvuruda? | Nerede görürsün |
|---|---|---|---|
| 1 | Canlı sınıf yarışması (Kahoot) | ✅ iş listesinde | Altbilgi → *Canlı yarışma kur*; çocuk: *Sınıfım → Canlı yarışmaya katıl* |
| 2 | Günün Eseri (Wordle) | ❌ senin fikrin | Öğrenme Yolu'ndaki sarı kart |
| 3 | Ses efektleri + titreşim | ~ (sessiz moda uyar) | Derste doğru/yanlış cevap |
| 4 | Kombo sayacı | ❌ | Derste üst üste ipucusuz egzersiz |
| 5 | Başarım rozetleri | ❌ | Kâşif Defteri → Rozetlerim |
| 6 | İlk açılış turu | ❌ | Yeni kullanıcıda Öğrenme Yolu'nun üstü |
| 7 | Şehir sertifikası | ❌ | Kâşif Defteri → Sertifikalarım |
| 8 | Kâşif'in tepkileri | ❌ | Ders geri bildirim bandı |
| 9 | Seviye rozetleri | ❌ | 6. ve 12. derste bildirim |
| 10 | Uygulamayı yükle kartı | ~ (PWA) | Ayarlar |
| 11 | Hayrat mı Akar mı? | ❌ (çekirdek kavram) | Yol → Bugün şeridi |
| 12 | Hatalarımı çalış | ❌ | Yol → Bugün şeridi (ipucu aldıysan) |
| 13 | Zaman tüneli | ❌ | Yol → Bugün şeridi |
| 14 | Seri takvimi | ❌ | Yol'daki hafta şeridi; üst çubuk 🔥 → takvim |
| 15 | Vakıf ağı haritası | ❌ (jüri için güçlü) | Harita → "Vakıf ağını göster" |
| 16 | Keşif rotası | ❌ | Harita → "Keşif rotası oluştur" |
| 17 | Hikâyesini dinle | ~ (sesli anlatım) | Arşiv eser sayfası, Günün Eseri sonu |
| 18 | Sınıf raporu | ✅ (yarışmanın parçası) | Canlı yarışma bitince öğretmen ekranı |
| 19 | Zamana göre öğrenme | ❌ | Yol'un üstündeki sekmeler + tanıtım turu |
| 20 | Maskot Köstik | — | Her yerde |
| 21 | Mobil arayüz revizyonu + DESIGN.md | — | Bütün uygulama |

**Sonuç (son durum):** `npm run dogrula` yeşil — **32 test dosyası, 347 test** (gece öncesi 263), derleme
başarılı. Her ekran tarayıcıda telefon (390 px) ve masaüstünde, açık ve koyu temada
denendi; konsol hatası yok, yatay taşma yok.

### Sabah kontrol listesi
1. `npm run dev` → http://localhost:5173 (sunucuları kapattım; seed gerekmez, veritabanı değişmedi).
2. Yeni kullanıcı gibi görmek için tarayıcıda gizli pencere aç: tur + Günün Eseri kartı çıkar.
3. Kahoot'u iki sekmeyle dene: birinde *Canlı yarışma kur*, diğerinde PIN ile katıl.
4. İstemediğin özelliği söyle, o commit'i geri alırım (en altta nasıl yapıldığı var).

### Bilmen gereken açık noktalar
- **Vercel + Kahoot:** odalar bellekte; canlı sürümde bölünebilir. Finalde `npm run dev:lan` ile laptoptan göster (`docs/DEMO.md` EK).
- **İçerik okuması:** Günün Eseri'nin 57 ipucu cümlesini bir insan okumalı (`scripts/gunun-eseri.py` → `IPUCLARI`).
- **DEMO.md'deki eski bilgi:** ana senaryoda "Konya/Kütahya/İzmir kilitli" yazıyor; Kütahya/İzmir artık yok. Senaryoya dokunmadım.
- **Yeni paket:** `qrcode-generator@2.0.4` (MIT, bağımlılıksız). `npm install` gerekir.
- **🔴 bölgeler (senin iznin ile):** `server/index.ts` (1 satır), yeni `server/canli/*`, `server/routes/canli.ts`, `shared/canli.ts`. Güvenlik testleri dahil hepsi yeşil.
- **14:00 zamanlayıcısı** hâlâ kurulu: VS Code açık kalırsa bu oturuma "devam et" yazacak.

## Nerede?

- Proje artık **yerel git** deposu (hiçbir yere push edilmedi).
- `main` → gece öncesi durum (tek "Başlangıç" commit'i).
- `gece-calismasi` → gece eklenenler. Şu an bu branch açık.
- `.gitignore`'a eklendi: `deploy/ADMIN-PAROLA.txt`, `kaynak/` (356 MB PDF çıktısı),
  `.playwright-mcp/`, `*.tsbuildinfo`. `.pgdata`, `node_modules`, `dist` zaten dışarıdaydı.
- Git'in satır sonlarına dokunmaması için yerel `core.autocrlf=false`.

Commit listesini görmek için: `git log --oneline main..gece-calismasi`

---

## 1. Canlı sınıf yarışması (Kahoot tarzı) — `Canlı sınıf yarışması` commit'i

Başvuruda: **var** (iş listesinde "Kahoot tarzı canlı sınıf yarışması").

**Nasıl kullanılır**
1. Öğretmen: altbilgide *Yetişkinler için → Canlı yarışma kur* (`#/canli/kur`).
   Ders kapsamı (tümü / şehir / ünite), soru sayısı (5–15), süre (20/30/60 sn) seçer.
2. Tahta ekranında dev PIN + **QR kod** çıkar. Çocuklar *Sınıfım → Canlı yarışmaya katıl*
   ya da QR'ı okutup katılır. **Ad sorulmaz**: "Turkuaz Kubbe", "Altın Minare" gibi takma ad gelir.
3. Sorular: dersin kendi "boşluk doldur" ve "eseri tanı" egzersizleri + envanter
   fotoğrafından "Bu fotoğraftaki eser hangisi?". Seçenekler Kahoot gibi renk **ve** şekil (▲◆●■).
4. Süre bitince ya da herkes cevaplayınca sonuç açılır: doğru cevap, cevap dağılımı,
   açıklama + kaynak künyesi, ilk 5. Sonunda podyum + konfeti.

**Kurallar korunuyor**: ceza yok (yanlış puan düşürmez, 500–1000 hız puanı), kişisel veri yok
(odalar yalnızca bellekte, oyun bitince silinir), doğru cevap süre bitmeden telefona gitmez,
axe 0 ihlal, ekran okuyucuya şekil adı söylenir, 60 sn "rahat mod".

**⚠ Bilmen gereken**: Odalar sunucu belleğinde. **Vercel'de oda bölünebilir** (istekler farklı
örneklere düşerse). Finalde **laptop + aynı Wi-Fi** ile göster: `npm run dev:lan`
(telefonlar laptopun IP'sine bağlanır; QR kod doğru adresi verir). Ayrıntı: `docs/KARARLAR.md` §15.

**Yeni dosyalar**: `shared/canli.ts`, `server/canli/{oda,sorular}.ts`, `server/routes/canli.ts`,
`src/features/canli/*`, `tests/canli.test.ts`, `tests/canli-arayuz.test.tsx`.
**Değişen**: `server/index.ts` (1 satır kayıt), `src/app/App.tsx`, `src/lib/yonlendirme.ts`,
`package.json` (`qrcode-generator` MIT paketi + `dev:lan` betiği).

**Test**: 28 yeni test. Ayrıca tarayıcıda 1 öğretmen + 2 oyuncu ile baştan sona oynandı.
30 kişilik sınıfın aynı IP'den saniyede bir yoklaması hız sınırına takılmıyor (testli).

---

## 2. Günün Eseri (Wordle tarzı) — `Günün Eseri` commit'i

Başvuruda: **yok** (senin fikrin; çıkarmak istersen tek commit).

- Öğrenme Yolu'nun üstünde sarı **Günün Eseri #N** kartı → `#/gunun-eseri`.
- Her gün herkese aynı eser (57 günde hiçbiri tekrar etmez). 6 tahmin hakkı.
- İpuçları her yanlış tahminde sırayla açılır: **1) şehir 2) ne için kullanıldı 3) fotoğraf**
  4) ne zaman 5) adının ilk harfi 6) kim yaptırdı.
- Her tahmin karşılaştırılır: *Şehir aynı/farklı · Tür aynı/farklı · Biraz/Çok daha eski/yeni*.
- Bitince: konfeti, fotoğraf, kaynak künyesi, **derse git**, Wordle gibi kareli paylaşım
  (cevabı ele vermez), seri ve "kaçıncı tahminde" grafiği. Her şey cihazda; sunucu yok.

**İçerik**: 57 eserin ipuçlarını envanterdeki bilgiden çocuk diline ben yazdım
(`scripts/gunun-eseri.py`). Yazarken envanterde **olmayan** 9 ayrıntıyı yakalayıp düzelttim
(ör. "ipek ticareti", "yeşil kubbe", "depremden sonra" — kaynakta yoktu, çıkardım).
Bir test ilk dört ipucunun eserin adını ele vermediğini denetliyor; bu test de 5 sızıntı yakaladı
(ör. Osman Gazi ipucunda "Osmanlı"), hepsi düzeltildi. **Yine de bir insan okumalı.**

**Test**: 11 yeni test (veri, sızıntı, günlük seçim, karşılaştırma, paylaşım, istatistik, axe).

---

## 3. Ses efektleri ve titreşim — `Ses efektleri` commit'i

Başvuruda: **dolaylı** (Duolingo hissi; "sessiz mod" taahhüdüne uyuyor).

- Sesler **dosya değil**, Web Audio ile kodda sentezleniyor (indirme, lisans yok; çevrimdışı çalışır).
- Doğru cevap: iki notalı "ding" + 30 ms titreşim. Yanlış (ipucu): alçak, yumuşak bir ton,
  **titreşim yok** (ceza hissi vermesin). Ders sonu ve Günün Eseri'ni bilince: 4 notalı arpej.
- Canlı yarışmada: cevaba dokununca "tık", sonuçta doğru/ipucu sesi, podyumda kutlama.
- **Ayarlar → Sessiz mod** artık efektleri ve titreşimi de kapatıyor (açıklaması güncellendi).
  **Hareketi azalt** titreşimi kapatıyor.
- Ufak düzeltme: Sıralama egzersizi geri bildirim nesnesini her çizimde yeniden üretiyordu
  (`useMemo` ile sabitlendi); yoksa ses tekrar tekrar çalardı.

**Test**: `tests/efekt.test.ts` (5).

---

## 4. Kombo sayacı — `Kombo sayacı` commit'i

Başvuruda: **yok** (Duolingo'daki "üst üste doğru" hissi).

- Derste egzersizler üst üste **ipucu almadan** çözülünce "🔥 2 egzersiz üst üste ilk
  denemede!" bandı yaylanarak çıkar, alev titrer, kombo sesi çalar.
- İpucu alınınca sayaç sessizce sıfırlanır; elmas/puan **eksilmez** (ceza yok).
- Önceki dersten gelen tekrar sorusu da sayılır.

**Test**: `tests/kombo.test.tsx`.

---

## 5. Başarım rozetleri — `Başarım rozetleri` commit'i

Başvuruda: **yok** (Duolingo "başarılar"; ödül sistemini güçlendirir).

- **Kâşif Defteri**'nin altında *Rozetlerim (x/16)* panosu: sekiz köşeli çini yıldızı rozetler.
  Kilitli olanlar gri + kilit + "nasıl kazanılır" metni.
- Rozetler: İlk Adım (1 ders), Meraklı Kâşif (5), **Kalfa Oldun! (6) / Usta Oldun! (12)** — seviye atlama kutlaması, Vakıf Uzmanı (20), Büyük Kâşif (hepsi),
  **Bursa/Konya/Hatay Kâşifi** (şehri bitir), Üç Gün / Bir Hafta (seri), Kusursuz Ders
  (bütün egzersizler ipucusuz), Dedektif (Günün Eseri ilk tahminde), Günlük Avcı
  (Günün Eseri 5 kez), Sınıfın Yıldızı (canlı yarışmada ilk üç).
- Rozet kazanılınca altta **"Yeni rozet!"** bildirimi (yıldız dönerek gelir, ses çalar, 5 sn sonra
  kapanır; kapatma düğmesi var). İlk açılışta mevcut rozetler sessizce sayılır — eski
  kullanıcıya bildirim yağmuru olmaz.
- Rozetler ilerlemeden **hesaplanır**, kaybedilmez. Her şey cihazda (sunucuya bir şey gitmez).

**Test**: `tests/rozetler.test.tsx` (5) + kombo testine kusursuz ders senaryosu.

---

## 6. İlk açılış turu — `İlk açılış turu` commit'i

Başvuruda: **yok** (Duolingo'nun "tanışalım" ekranları).

- Hiç ders bitirmemiş yeni kullanıcı Öğrenme Yolu'nu açınca maskot Kâşif'le 4 sayfalık bir kart:
  *Merhaba ben Kâşif → Her gün kısa ders (ceza yok!) → Elmas, seri, rozet → Harita ve sınıf*.
- Sayfa noktaları, maskot zıplaması, kayan metin. **Atla** ile tek dokunuşta geçilir; bir kez
  gösterilir (cihazda hatırlanır).
- Modal değil, sayfanın içinde kart: odak tuzağı / ekran okuyucu riski yok, testleri bozmaz.

**Test**: `tests/tanitim.test.tsx` (3). Öğrenme Yolu'nun axe denetimi turla birlikte de 0 ihlal.

---

## 7. Şehir sertifikası — `Şehir sertifikası` commit'i

Başvuruda: **yok** (öğretmen/aile için somut bir "bitirdim" belgesi).

- Kâşif Defteri'nde *Sertifikalarım*: her şehir için düğme. Şehir bitmediyse `x/33` ve ilerleme
  çubuğu; bittiyse **"Bursa: sertifikanı al"** → `#/sertifika/bursa`.
- Sertifika: çini köşe yıldızları, mühür, "Tebrikler, [ad] — Bursa şehrindeki 33 vakıf eserinin
  hepsini keşfettin!", tarih. **Yazdır** (yalnızca belge, yatay sayfa) ve **İndir (SVG)**.
- 🔒 **Ad isteğe bağlı** ve yalnızca ekranda: kaydedilmez, sunucuya gitmez (testli). Boşsa "Genç Kâşif".
- Kodda ham renk yok: ekranda jetonlar; indirirken o anki tema renkleri dosyaya işlenir.
- Küçük temizlik: `App.tsx`'teki iç içe `?:` zinciri (`aktifAd`) bir eşleme tablosuna (`UST_SEKME`) çevrildi.

**Test**: `tests/sertifika.test.tsx` (3) — kilit, gizlilik, axe.

---

## 8. Kâşif'in tepkileri — `Kâşif geri bildirime tepki veriyor` commit'i

Başvuruda: **yok** (Duolingo karakterlerinin tepki vermesi gibi).

- Egzersiz geri bildirim bandında küçük maskot: doğruda **gülümseyip zıplar**, ipucunda
  **yukarı bakıp "o" diye düşünür** (üzgün değil — ceza yok). Süs; anlam simge + metinde.

## 9. Seviye rozetleri — `Seviye atlama rozetleri` commit'i

- Çırak → Kalfa (6 ders) ve Kalfa → Usta (12 ders) geçişinde "Yeni rozet!" bildirimi çıkar.
  Eşikler `shared/types.ts`'teki `SEVIYE_ESIKLERI`'nden okunur (tek kaynak).

## 10. "Uygulamayı yükle" kartı — `Uygulamayı yükle kartı` commit'i

Başvuruda: **dolaylı** (PWA; iş listesindeki "PWA mı APK mı" kararına yardımcı).

- Ayarlar'da kart: Android/Chrome/Edge'de **Ana ekrana ekle** düğmesi tarayıcının kurulum
  penceresini açar; iPhone'da "Paylaş → Ana Ekrana Ekle" adımları yazılır. Zaten kuruluysa
  ya da tarayıcı desteklemiyorsa kart görünmez.
- Test bir hata yakaladı ve düzeltildi: kabulden sonra kart kendini gizleyip "Yüklendi!"
  mesajını yutuyordu.

**Test**: `tests/yukleme.test.tsx` (2).

---

# İkinci tur (16 Ekim sabah, senin seçtiklerin)

## 11. Hayrat mı Akar mı? — `Hayrat mı Akar mı` commit'i

- Öğrenme Yolu → **Pratik** köşesi → `#/hayrat-akar`. Tur başına 10 kart (en az 3 akar).
- Kart sola (hayrat) / sağa (akar) **sürüklenir**; aynı iş iki büyük düğmeyle ve klavyede ← → ile yapılır.
- Cevaptan sonra gerekçe + kaynak: ör. *"Koza Hanı — kirası İstanbul'daki II. Bayezid Külliyesi'ne gidiyordu."*
  Öğretici istisna: **Issız Han** ve **Kanuni Kervansarayı** han ama **hayrat** (yolculara hizmet).
- Sınıflandırma yalnızca envanterdeki vakfiye cümlelerinden (28 eser). Külliyeler, Irgandı Köprüsü
  (köprü hayrat + dükkân akar), kiliseler ve vakfiye metni olmayanlar **oyuna alınmadı**.
- Süre baskısı yok; yanlışta puan düşmez ("↻ yeni öğrendin").

**Test**: `tests/hayrat-akar.test.tsx` (4) — veri, tur dengesi, düğme+klavye akışı, axe.

## 12. Hatalarımı çalış — `Hatalarımı çalış` commit'i

- Derste **ipucu alınan** egzersiz, eser adı ve egzersizin kendisiyle cihaza yazılır (en fazla 30;
  internetsiz de açılır). Öğrenme Yolu → Pratik'te **"Hatalarımı çalış · N soru seni bekliyor"**
  kartı çıkar (liste boşsa kart görünmez).
- `#/hatalar`: 5'erli tur. İpucusuz çözülen soru listeden **çıkar** ("✓ listeden çıktı"),
  ipucuyla çözülen kalır ("↻ bir dahaki pratikte yine gelecek"). Ceza yok.
- Pratik, kombo ve "kusursuz ders" sayacına karışmaz (ayrı çalıştırıcı).

**Test**: `tests/hatalar.test.tsx` (3).

## 13. Zaman tüneli — `Zaman tüneli` commit'i

- Pratik → **Zaman tüneli** (`#/zaman-tuneli`): 57 eser 636 (Habib-i Neccar) → 1916 (Dullar Evi)
  yıl sırasıyla. Telefonda soldan tek sütun, masaüstünde ortada çizgi + sağlı sollu kartlar.
- Dönemler **yüzyılla** etiketli ("1200'ler"); "Selçuklu/Memlük" gibi hanedan etiketleri
  her eser için kaynakla doğrulanmadığından **bilerek konmadı**.
- Kesin olmayan yıllar "~" ile ve ekran okuyucuya "(yaklaşık)" diye. Keşfedilenler renkli ve
  derse bağlı; diğerleri gri + "keşfedilmedi".

**Test**: `tests/zaman-tuneli.test.tsx`.

## 14. Seri takvimi — `Seri takvimi` commit'i

- Öğrenme Yolu'nda **bu hafta** şeridi (Pzt–Paz; ders yapılan gün 🔥, bugün çerçeveli) +
  olumlu davet: *"Bugün bir ders yaparsan serin 4 gün olur!"* / seri yoksa *"Yeni bir seri
  başlatmak için bir ders yeter."* (suçlama yok — testli).
- Üst çubuktaki 🔥 göstergesi artık **takvime bağlantı** (`#/seri`): ay takvimi (önceki aylara
  gezilebilir), şu anki / en uzun seri, toplam ders günü.
- Ders günleri ayrı bir cihaz kaydında; ilk açılışta mevcut seri geriye doğru günlere çevrilir
  (eski kullanıcının takvimi boş başlamaz). Ders sonu bugünü işler.
- Erişilebilirlik: takvim gerçek `<table>`; her hücre "16 Ekim, bugün: ders yapıldı" diye okunur.

**Test**: `tests/seri-takvimi.test.tsx` (4).

## 15. Vakıf ağı haritası — `Vakıf ağı haritası` commit'i

- Harita'da **"Vakıf ağını göster"** düğmesi: akar yapılardan besledikleri hayratlara **akan kesik
  çizgiler** + hedef etiketleri; harita Bursa → İstanbul → Gelibolu hepsini gösterecek kadar uzaklaşır.
- Haritanın altında her zaman **"Para nereye akıyordu?"** listesi (metin eşdeğeri):
  Koza Hanı / Pirinç Hanı → II. Bayezid Külliyesi (İstanbul) · Fidan Hanı → Mahmutpaşa Külliyesi ·
  İpek Hanı → Yeşilcami · Nasuh Paşa Hamamı → Mesih Mehmed Paşa Camii (Gelibolu) ·
  Demirtaş Hamamı → Demirtaş Camii.
- **Yalnızca envanterde açıkça yazan 6 bağ.** "Yeni Bedesten" bağı çıkarım gerektirdiği için alınmadı.
- Hedef konumları OpenStreetMap'ten (Beyazıt ve Mahmut Paşa camileri kesin; Gelibolu ve
  Demirtaş Camii OSM'de bulunamadığından semt/ilçe merkezi, "(yaklaşık)" etiketli).
  Sorgularda kişisel bilgi gönderilmedi.
- 🎯 Jüriye: vakıf modelini ("bir han, uzak bir şehirdeki camiyi yaşatır") tek bakışta gösterir.
- `bolgeHaritasiKur` artık `{ temizle, agGoster }` döndürüyor.

**Test**: `tests/vakif-agi.test.tsx` (2).

## 16. Keşif rotası — `Keşif rotası` commit'i

- Harita → **"Keşif rotası oluştur"** (`#/rota`): ilçe seç (en az 2 eserli ilçeler; Osmangazi 21,
  Yıldırım 8, Antakya 6…) → eserler gezi sırasına dizilir (en yakın komşu + 2-opt, kesişmesiz).
- Numaralı duraklar, durak arası mesafe ve süre, **"Gördüm"** kutuları, akan çizgili şema,
  **Rotayı yazdır** (yalnızca rota basılır). 90 dk'yı aşan rotada "iki güne böl" önerisi.
- Dürüstlük: mesafeler **kuş uçuşu** (yol ağı verisi yok), süre ×1,3 sokak payıyla tahmin; konumu
  yaklaşık eserler işaretli; "bir yetişkinle olun, trafiğe dikkat" notu.

**Test**: `tests/rota.test.tsx` (4).

## 17. Eserin hikâyesini dinle — `Hikâyesini dinle` commit'i

- **Meraklısına arşivi**'ndeki her eser sayfasında **"Hikâyesini dinle"**: eserin adı ve ekranda
  görünen paragraflar Türkçe sesle okunur ("Devamını oku" açılınca o kısım da). Tekrar basınca durur.
- **Günün Eseri** bitiş ekranında **"Eseri dinle"**: ad, şehir, ne için kullanıldığı, ne zaman ve
  kim yaptırdığı okunur.
- Dersteki mevcut "Dinle" düğmesi yeniden kullanıldı: sessiz modda ya da cihazda Türkçe ses yoksa
  düğme hiç görünmez (testli). Okuma güçlüğü olan çocuklar için.

**Test**: `tests/dinle.test.tsx` (2).

## 18. Yarışma sonrası sınıf raporu — `Sınıf raporu` commit'i

- Canlı yarışma bitince öğretmen ekranında podyumun altında **Sınıf raporu**: her soru için
  doğru oranı çubuğu ("%67 doğru (2/3)") ve doğru cevap.
- Sınıf bir soruda %60'ın altında kaldıysa vurgu: *"Sınıf en çok 2. soruda zorlandı (%0 doğru).
  Doğru cevap: Ayasofyası. Bu eserin dersini birlikte açın →"* (derse bağlantı).
- **Anonim:** yalnızca sayılar; takma ad bile yok (testli). Kaydedilmez. **Raporu yazdır** düğmesi.
- Sunucu: `CanliSunucuDurumu.rapor` yalnızca oyun bitince gönderilir (`shared/canli.ts`, `server/canli/oda.ts`).

**Test**: `tests/canli.test.ts` (+2), `tests/canli-arayuz.test.tsx` (+1).

# Üçüncü tur (senin notların)

## 19. Zamana göre öğrenme — `Zamana göre öğrenme` commit'i

- Öğrenme Yolu'nun üstünde iki sekme: **Şehirlere göre** (üniteler, eskisi gibi) · **Zamana göre**
  (57 ders 636 → 1916, yüzyıl yüzyıl). Seçim cihazda hatırlanır.
- Zamana göre: üstte **"Zamanda sıradaki durak"** kartı + listede "BAŞLA" etiketli, nabız atan durak
  (en eski bitmemiş eser). Kilit yok; her ders açık.
- **İlerleme ortak:** hangi sekmeden biterse bitsin, ders iki görünümde de bitmiş görünür.
- Tanıtım turunun son sayfası artık soruyor: **"Nasıl ilerlemek istersin?"** →
  *Şehir şehir ilerle* / *Zaman sırasıyla ilerle*.
- Zaman tüneli (Pratik) ile aynı liste bileşeni (`ZamanListesi`).

**Test**: `tests/yol-zaman.test.tsx` + tur testi güncellendi.

## 20. Maskot Köstik — `Maskot Köstik` commit'i

- Çini yıldızı maskotun yerine attığın tasarımdaki **Köstik**: kırmızı desenli bandana (altın zikzak,
  madalyon, yandan sarkan püskül), yuvarlak altın gözlük, pembe burun, ön dişler, bıyıklar, yelekli
  omuzlar. Vektör (SVG) çizim: her boyutta net, dosya indirmez, çevrimdışı çalışır.
- İfadeler görseldeki gibi: **meraklı** (varsayılan), **mutlu** (gözler kapalı gülüş), **şaşkın**,
  **düşünceli** (ipucu anı). Göz kırpma ve süzülme animasyonu korunuyor.
- Renkler `tokens.css`'te `--maskot-*` jetonları. Metinlerde maskotun adı **Köstik** oldu
  ("Merhaba, ben Köstik! Ben meraklı bir köstebeğim…"). "Kâşif Defteri" gibi kullanıcının unvanları aynı.
- Not: Görselin PNG dosyası bana ulaşmadı (sohbete yapıştırılan resim dosya olarak kaydedilmiyor).
  Görseli olduğu gibi kullanmak istersen `public/maskot/` klasörüne koy; tur ve boş ekranlarda büyük
  illüstrasyon olarak bağlarım.

## 21. Mobil arayüz revizyonu — `Mobil arayüz revizyonu` commit'i

İstediğin gibi **ui-ux-pro-max** (çocuk eğitim uygulaması → *Claymorphism* önerisi + profesyonel
mobil kontrol listesi) ve **design-md** (Duolingo kütüphanede yok; **Airbnb** taban seçildi: tek vurgu,
kart hiyerarşisi, mobilde alta yapışık eylem) kullanıldı. Sonuç proje kökünde **`DESIGN.md`**
(Kök Avı'nın kendi tasarım sistemi; palet/yazı tipi/maskot bizim, marka varlığı kopyalanmadı).

- **Öğrenme Yolu ilk ekranı sadeleşti:** başlık + ince ilerleme çubuğu → **Köstik karşılama kartı**
  (söz + tek dokunuşla "Başla / Derse devam") → seri şeridi → **"Bugün" şeridi** (Günün Eseri, Hayrat mı
  Akar mı, Zaman tüneli, Hatalarımı çalış; telefonda yana kaydırılır) → sekmeler → yol. Önceden 6 ayrı
  blok vardı, asıl yol ekranın çok altında kalıyordu.
- **Tipografi:** başlıklar 900 → 800 ve `text-wrap: balance`; telefonda h1 36 → 28px, h2 28 → 22px.
- **Emoji simgeler kaldırıldı** (projenin kendi "emoji yok" kuralı zaten vardı; gece benim eklediklerim +
  önceden kalan 🎲 🎓 ⚠ ★): 9 yeni SVG simge (soru, değiştir, kum saati, sikke, saat, yıldız, ok, zar, uyarı).
  Yeni **`tests/emoji-yok.test.ts`** tekrar girmesini engelliyor.
- **Dokunma/güvenli alan:** üst çubukta çentik payı; harita yakınlaştırma düğmeleri 29 → 44px;
  "Keşif rotası" bağlantısı 44px. Alt sekme çubuğu ve ders eylem çubuğu zaten güvenli alan paylıydı.
- **Doğrulama:** 12 sayfa × 360/375/414px'te yatay taşma yok; koyu temada yeni bileşenlerin metin
  kontrastı ölçüldü (≥ 4.5:1).

## 22. Sıfırdan yeniden tasarım: "Mozaik + Fotoğraf Patikası" (2026-10-16)

Beyin fırtınasında senin seçimlerinle karar verildi (parşömen reddedildi → koyu, Duolingo hissi,
şablon görüntüsü yok, turkuaz silindi, **safran** seçildi). Karar belgesi:
`docs/superpowers/specs/2026-10-16-kok-avi-yeniden-tasarim-design.md`, plan:
`docs/superpowers/plans/2026-10-16-kok-avi-yeniden-tasarim.md`, kurallar: `DESIGN.md`.

| Commit | Ne değişti |
|---|---|
| Yazı tipleri | Nunito → **Bricolage Grotesque** (başlık) + **Figtree** (gövde), yerel, OFL |
| Jetonlar | **Koyu varsayılan**, tek vurgu **safran `#ffbf3c`**, turkuaz/yeşil yok; palet denemesi kaldırıldı; yeni `tests/tema-kontrast.test.ts` (3 tema, WCAG oranları + "turkuaz geri gelmesin") |
| Koyu varsayılan | Eski kayıtlardaki "açık" bir kez koyuya taşınır (`src/app/temaGocu.ts`); sonra seçimine dokunulmaz. `ilerleme.ts`'te yalnızca varsayılan değer değişti |
| Simgeler | Elle çizilmiş SVG'ler yerine **Phosphor** (tek aile; aktifte dolu). Simge başına içe aktarma (testler 41 sn → 3 sn) |
| Temel bileşenler | Düğmeler düz safran, gölgesiz, büyük harf yok, basınca küçülür; kart 1px çizgi |
| Kabuk | Alt çubuk **Bugün · Yol · Keşfet · Defter**; profil üst çubukta; yetişkin bağlantıları Profil'de |
| Bugün | Yeni ana ekran: **fotoğraf mozaiği** (sıradaki ders büyük fotoğraf, seri, bulanık Günün Eseri, oyunlar, canlı yarışma, sınıf) |
| Keşfet / Profil | Harita, arşiv, zaman tüneli, rota merkezi; Profil: ayarlar, çarşı, seri, sınıf, yetişkinler |
| Yol | **Fotoğraf madalyonlu patika**: biten safran kenar + onay, sıradaki büyük + ilerleme halkası + "Devam et", kilitli gri |
| Köstik | Senin gönderdiğin karakter sayfasından 4 ifade (**meraklı, mutlu, şaşkın, düşünceli**) daire portre olarak (`public/maskot/`); SVG çizim kaldırıldı. PWA simgeleri de Köstik'in yüzü |
| Ders | 5 bölümlü ilerleme çubuğu; sonuç **alttan yaylanan sayfa** (doğru safran, ipucu mavi) |
| Defter | İç sekmeler **Pullar · Rozetler · Seri · Belgeler** (`#/defter?sekme=…`); öğrenilen eser **tırtıklı fotoğraf pulu** |
| Denetim | Haritanın yedek renkleri, favicon ve PWA simgeleri yeni palete; 3 tema × 26 rota × 360px'te yatay taşma yok |

Bütün eski rotalar (`#/harita`, `#/sinif`, `#/ayarlar`, `#/carsi`, `#/seri`…) çalışıyor.
`server/`, `shared/`, `api.ts`, `oturum.ts`'e dokunulmadı.

## 23. Aşama 1 (PDF eksikleri) ve düzeltmeler (2026-10-17)

Takım planı (`eksikler` dalı, `docs/plan/ILERLEYIS.md`) Aşama 1'deki dört iş Batuhan'da.

| İş | Durum | Ne yapıldı |
|---|---|---|
| Dinle ve seç | ✅ | Betimleme açılışta bir kez okunur, metni "Altyazıyı göster" arkasında (PDF: altyazı ve sessiz mod). Sessiz modda yazılı "Eseri tanı". `tests/dinle-sec.test.tsx` |
| Toplu TTS ses dosyaları | ⏳ karar bekliyor | Piper (çevrimdışı) ve Edge sesi yeterince insan gibi bulunmadı. Seslendirilecek metin 57 ders / 285 parça / ~84 bin karakter. Seçenekler: OpenAI TTS, Google Chirp 3 HD, ElevenLabs, insan kaydı |
| Elmas harcama + veli onayı | ✅ | Çarşı harcamaları veli kapısından geçer (yazıyla çarpma sorusu, rakamla cevap; onay 10 dk). Ayarlar'dan kapatmak da onay ister. Gerçek para yok. `tests/veli-*.test.ts(x)` |
| Erişilebilirlik doğrulaması | ✅ | Gerçek tarayıcıda axe (renk kontrastı dahil): 22 sayfa × 3 tema, 0 ihlal. %160 yazı × 360 px'te yatay taşma yok. Yüksek kontrast + büyük yazı + sessiz modla tam ders arayüzden bitiyor; ses/titreşim yok. `tests/erisilebilir-ders-akisi.test.tsx` |

Ayrıca:
- **Güvenlik:** `npm audit` 8 uyarı → 0 (maplibre-gl 6.14, @fastify/static 10.1.6, vitest 4.1.12). `tests/statik-sunum.test.ts` yol aşımını denetler.
- **Keşif rotası:** gerçek sokak haritası, üst üste binen duraklar "10-15" grup etiketi, uzak duraklar ayrı yürüyüş bölümü, fotoğraflı durak listesi, OSM yol tarifi, "Gördüm" cihazda.
- **Bugün → Yol:** "Başla / Derse devam" dersi açmaz; Yol sekmesinde sıradaki durağa kaydırır.
- **Yol ortam rengi:** kaydırırken ortadaki eserin fotoğrafı bulanık ve soluk biçimde arka plana yayılır.

---

## Geri alma

Bir özelliği istemezsen (örnek Günün Eseri):

```bash
git log --oneline main..gece-calismasi   # commit kimliğini bul
git revert <kimlik>                        # o özelliği geri alır, diğerleri kalır
```

Hepsini beğendiysen `main`'e almak için: `git checkout main && git merge gece-calismasi`.

## Kaptana ZIP

Proje git kullanmadığı için kaptana yine ZIP gidecek. Değişen dosya listesini almak için:
`git diff --name-only main..gece-calismasi`
