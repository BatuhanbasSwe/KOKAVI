# Demo Senaryosu — Final 7–8 Kasım 2026

> **Ürün:** https://kokavi-one.vercel.app · **Takım:** TRİA · **Süre:** ana senaryo **3:50**,
> jüri 3 dakika verirse **kırpılmış 3:00** planı (§4'te).
> Şartname 5.1.1: ekran görüntüsü/statik tasarım çalışan ürün demosu yerine geçmez → **canlı ürün**.
> Şartname 5.3: sunumu takım yapar. Bu senaryoda **iki anlatıcı**, **iki persona** vardır.
> Sayılar ve iddiaların kanıtı: [SAVUNMA-NOTLARI.md](SAVUNMA-NOTLARI.md).

## 1. İki persona

| Persona | Nerede / cihaz | Ne yapar | Neyi kanıtlar |
|---|---|---|---|
| **Çocuk (evde)** | Aile cihazı, tarayıcı/PWA | Öğrenme yolunda ders bitirir, Vakıf Röntgeni'ni görür, defterine ekler | Ürünün çocuk akışı; ilerleme cihazda; cezasız öğrenme |
| **Öğretmen (tahtada)** | Okulda tek cihaz (tahta/projeksiyon) | Sınıf kodu açar, dersi **Tahta modu**nda sınıfla birlikte işler, sayacı görür | Okulda telefon olmadan kullanım; anonim sınıf külliyesi |

İki anlatıcı: **A = Ürün/Anlatı** (çocuk akışı, hikâye), **B = Veri/Sistem** (öğretmen, veri dürüstlüğü, teknik cevaplar).
Herkes kendi bölümünü anlatır (şartname 5.2.3). Geçiş cümlesi: *"Şimdi aynı dersi okulda, tek cihazda görelim."*

## 2. Ana senaryo — 3:50 (dondurulmuş)

| Süre | Ekran / rota | Ne denir | Kim |
|---|---|---|---|
| 0:00–0:20 | **Bugün** `#/bugun` | "Kök Avı canlı: 57 ders, 3 şehir, 633 eserlik arşiv. Bugün iki kişiyiz: evdeki çocuk ve tahtadaki öğretmen." | A |
| 0:20–0:40 | **Öğrenme Yolu** `#/yol` | "Bursa 3 ünite, toplam 5 ünite 57 ders. Sıradaki ders burada; Kuzey Yıldızı ölçümüz **bir şehri uçtan uca tamamlamak**." | A |
| 0:40–1:05 | **Ders 1/5 Merak** `#/ders/<dersId>` | "İlk adım tahmin: **hiçbir tahmin yanlış sayılmaz.** Kalp yok, ceza yok; yanlış sadece merakı başlatır." (kasten bir seçenek işaretlenir) | A |
| 1:05–1:30 | **2/5 Bağlam** | "Vakıf bir bina değil, **kendi kendini finanse eden bir kurum**. Hayrat hizmet, akar gelir; ikisi aynı vakfın iki yüzü." | A |
| 1:30–1:50 | **3/5 Perspektif** | "Tek karar anı: çocuk kendini 15. yüzyılda bir vakıf yöneticisi yerine koyar." | A |
| 1:50–2:15 | **4/5 Geri çağırma** | "Dört egzersiz tipi. Kasten yanlış cevap: **ipucu gelir, ilerleme durmaz, elmas eksilmez.**" | A |
| 2:15–2:50 | ⭐ **5/5 Yansıma — Vakıf Röntgeni** | "Ürünün ayırtıcı ekranı. Habib-i Neccar: **'Vakfa para nereden geliyordu?'** (Kozya %59 · Buhşîn %21 · arazi %20) ve **'Bu para nereye harcanıyordu?'** (maaşlar %77 · cami masrafları %23) — aynı paranın iki tarafı, iki ayrı liste." | A |
| 2:50–3:05 | Vakıf Röntgeni — belgesiz örnek | "Peki belge yoksa? Başka bir ders: uygulama çubuk çizmez, açıkça **'belgelenememiştir'** der. **Oran uydurmayız** — asıl fark burada." | A |
| 3:05–3:28 | **Öğretmen paneli** `#/ogretmen` → `#/tahta/<kod>/<dersId>` | "Okulda öğrenci telefonu yok. Öğretmen sınıf kodu açar, **Tahtada aç** ile dersi tek cihazda işler; ders bitince sınıf külliyesine işlenir. Sınıf kodu yalnız **evde devam** için." | B |
| 3:28–3:43 | ⭐ **Sınıf Vakıf Röntgeni** `#/tahta/<kod>/rontgen` | "Ders bitince panelde **hedef külliye** ilerlemesi görünür: sınıf birlikte Yeşil Külliyesi'ni tamamlıyor, 1/4. **Sınıf Röntgeni**'nde birlikte görülen eserlerin gelir/gider listeleri tek ekranda — hangi çocuğun gördüğü yazmaz, yalnız eserler ve toplu sayaç var." | B |
| 3:43–3:50 | Öğretmen paneli — sayaç | "Panelde 'kaç öğrenci' yazmaz: **kaç kez tamamlandı** yazar. Kimlik, cihaz, IP tutulmaz. 57 dersin tamamı ücretsiz; ses iddiası yok, dersler ses olmadan da biter." | B |

> Demo sonunda **hiçbir ekstra özellik** gösterilmez. Canlı yarışma, Köstik sohbeti,
> zaman tüneli bu sunumda yoktur.

## 3. Tıklama yolları (tam adımlar)

### A. Çocuk akışı (evde) — 2:30
1. `https://kokavi-one.vercel.app` → `#/bugun`. Fotoğraflı **sıradaki ders** kutucuğuna bas (`Başla` / `Derse devam`) → `#/yol?odak=siradaki`.
2. Yol'da Bursa üniteleri görünür; sıradaki durağa bas → `#/ders/<dersId>` (adres çubuğunda kimlik görünür).
3. **Merak:** bir seçenek seç → *"Güzel tahmin!"* + köprü metni → **Devam**.
4. **Bağlam:** kavram kartları (VAKIF, İMARET, EVKAF DEFTERİ) → **Devam**.
5. **Perspektif:** tek seçenek → **Devam**.
6. **Geri çağırma:** egzersizleri çöz; yanlışta **İpucu** → devam. Son egzersizde Yansıma'ya geçilir.
7. **Yansıma:** Vakıf Röntgeni iki soru; en altta **Dersi bitir**.
8. **Ders sonu:** elmas/seri/defter + "1, 3, 7, 14 gün" tekrar cümlesi → **Devam et**.
9. **Defter** `#/defter`: pul ve rozetler; **Profil** `#/profil`: seri/elmas/seviye.

**Belgeli ↔ belgesiz karşılaştırması (adres çubuğuyla, ~20 sn):**
`#/ders/hatay-u1-d1` = Habib-i Neccar (iki liste, belgeli) ·
`#/ders/bursa-u1-d1` = Ulucami (gelir dağılımı **belgelenememiştir**).
> Ulucami Yansıma'sında **Geçmişten bugüne** kartı vardır: 1862 ve 1865–75
> fotoğrafları bugünkü görünümle kaydırıcıdan karşılaştırılır (+15 sn, isteğe bağlı).
> Ders kimlikleri seed sırasına bağlıdır: demo sabahı iki dersi açıp doğrula, yer imine ekle.

### B. Öğretmen akışı (tahtada) — ~45 sn
1. `#/profil` → **Yetişkinler için** → *Öğretmen paneli* (`#/ogretmen`). Doğrudan URL de olur.
2. Giriş yap (demo hesabı; parola **repoda tutulmaz**).
3. **Sınıf oluştur** (ör. ad: "TRİA Demo") → kod üretilir (ör. `KTM-4829`).
4. Sınıf satırına bas → detay: üstte **gizlilik notu**, altta ünite tablosu.
5. Tabloda bir dersin **Tahtada aç** bağlantısı → `#/tahta/<kod>/<dersId>`.
6. Tahta modu: büyük yazılı, sade akış (tekrar sorusu sorulmaz, elmas verilmez). Dersin sonunda **Dersi bitir** → *"Sınıf külliyesine işlendi."*
7. Ders sonu ekranındaki **Sınıf Röntgeni'ni tahtada aç** bağlantısı → `#/tahta/<kod>/rontgen`. Ya da panelde sınıf detayı → **Sınıf külliyesi** kartı → aynı bağlantı.
8. Röntgen ekranı: hedef külliye ilerlemesi (ör. **1/4** Yeşil Külliyesi) + sınıfın birlikte gördüğü eserlerin **gelir/gider** listeleri. Kimlik yok; yalnız eser + toplu sayaç.
9. **Öğretmen paneline dön** → sayaç **"1 kez tamamlandı"**; kaç öğrenci olduğu **bilinmez**.
10. (Opsiyonel, 10 sn) Çocuk evde: `#/sinif` → kodu girer → "evde devam" açıklanır.

> **Admin panel** (`#/panel`) şartname 5.1.1 CRUD içindir; **ana senaryoda yoktur**.
> Jüri CRUD sorarsa: canlıda da gösterilebilir (7 Kasım 4. tur: oturumlar Upstash
> Redis'te, yönetim yazmaları ortak işlem günlüğünde — sunucu örnekleri arasında
> paylaşılır). Yedek: yerel `npm start` + önceden açık oturum (§5).

## 4. Jüri 3 dakika verirse — kırpılmış plan (3:00)

| Süre | Ekran / rota | Ne denir |
|---|---|---|
| 0:00–0:15 | `#/bugun` + `#/yol` | "57 ders, 3 şehir, 633 arşiv; sıradaki ders yolda." |
| 0:15–0:40 | Merak + Bağlam | "Tahmin yanlış sayılmaz; vakıf bina değil kurum." |
| 0:40–1:20 | Yansıma: Vakıf Röntgeni (Habib-i Neccar) | İki liste: para nereden gelir / nereye gider. |
| 1:20–1:45 | Belgesiz örnek (`#/ders/bursa-u1-d1`) | "Belge yoksa **belgelenememiştir** der; oran uydurmaz." |
| 1:45–2:25 | Tahta modu (`#/ogretmen` → `#/tahta/...`) | "Okulda telefon yok; tek cihaz, sınıf külliyesine işlenir; sayaç, kimlik yok." |
| 2:25–3:00 | Kapanış | Doğru sayılar + yol haritası (Bursa 33 → hedef 80, arşiv 6/57, TTS yok). |

**Kırpılanlar (sorulursa tek cümle):** Perspektif, geri çağırma egzersizleri, ders sonu,
defter, harita/Keşfet. *"Süre nedeniyle atladık; canlı üründe hepsi var."*

## 5. Yedek planlar

| Durum | Belirti | Yedek plan |
|---|---|---|
| **İnternet yok** | Sayfa açılmıyor / "Çevrimdışısın" bandı | PWA önbelleği + yerel sunucu: `npm run seed` (API kapalıyken) → `npm run build` → `npm start` → `http://127.0.0.1:8787`. En az bir ders önbellekte prova edilmiş olmalı. |
| **Harita altlığı yok** (tile gelmiyor) | Harita boş/gri | İl–ilçe sınırları **gömülüdür**; harita yine çizilir. Cümle: "Altlık gelmezse gömülü sınırlarla çalışır." Alternatif: `#/arsiv` (633 eser) + Keşif rotası. |
| **Admin/öğretmen girişi olmaz** (canlı oturum, ağ) | Giriş ekranı hata verir | Önceden açık oturum (demo sabahı gir, sekmeyi kapatma) → yoksa yerel `npm start` + bilinen parola → yoksa **girişsiz tahta rotası**: `#/tahta/<kod>/<dersId>` doğrudan açılır; sayaç sözlü anlatılır. Canlıda `curl -s …/api/saglik` → `oturumDeposu:"redis"` ve `gunluk:"redis"` ise canlı giriş/CRUD güvenilirdir (7 Kasım 4. tur); değilse canlı admin girişine güvenme. |
| **Projeksiyon / salon** | Yazı küçük, kontrast zayıf | Tahta modu (büyük punto) + tarayıcı yakınlaştırma %125; Ayarlar → **yüksek kontrast** teması; koyu tema varsayılan. Uzun kabloya karşı HDMI + yedek dongle. |
| **Cihaz sesi yok / sessiz salon** | "Dinle" düğmesi görünmez | Bu **arıza değil**: sessiz modda düğme çizilmez, ders ses olmadan biter. Cümle: "Dersler ses olmadan da tamamlanır." |
| **Vercel/servis düşer** | Beyaz ekran / API hatası | Yerel `npm start` + telefon hotspot; demo verisi seed'den gelir. |
| **Ders kimliği değişmiş** | `#/ders/...` hata | Öğretmen panelindeki **Tahtada aç** bağlantısından aç (kimlik oradan gelir). |
| **Sunucu bozuk / seed bozuk** | "İçerik yüklenemedi" | `.pgdata` yedeğini geri koy → `npm run seed`. Prova günü yedek klasör alınır. |

## 6. Demo öncesi kontrol listesi

- [ ] Canlı doğrulama: `/api/eserler` **57**, `/api/dersler` **57**, `/api/yol` **3 şehir / 5 ünite**, `/arsiv/liste.json` **633**.
- [ ] Canlı URL (https://kokavi-one.vercel.app) yeni sürümde: tahta modu var, sade harita, `/api/sor` **404**.
- [ ] **Canlı yarışma gösterilecekse:** `curl -s https://kokavi-one.vercel.app/api/saglik` → `"depo":"redis"` **ve** `"gunluk":"redis"` **ve** `"oturumDeposu":"redis"` olmalı. Biri `bellek`/`kapali`/`yerel` ise o katman sunucu örnekleri arasında bölünür (Vercel'de Upstash bağlanıp deploy yenilenmeli).
- [ ] Yerel yedek: `npm run seed` (API kapalıyken) → `npm run build` → `npm start` çalışıyor.
- [ ] Demo tarayıcı profili: ilerleme hazır (Ünite 1'de 2–3 ders bitmiş görünsün; "Derse devam" çıksın).
- [ ] Belgeli ders (`#/ders/hatay-u1-d1`) ve belgesiz ders (`#/ders/bursa-u1-d1`) açılıyor; **yer iminde**.
- [ ] Öğretmen oturumu demo sabahı açıldı; sınıf oluşturuldu; **Tahtada aç** bir kez denendi.
- [ ] **Sınıf külliyesi**: tahta dersten sonra panelde hedef külliye ilerlemesi (ör. 1/4) görünüyor.
- [ ] **Sınıf Röntgeni** `#/tahta/<kod>/rontgen` tahtada açılıyor; en az bir belgeli + bir belgesiz eser görünüyor.
- [ ] `/api/sinif/<kod>/rontgen` canlıda 200 dönüyor (sınıf koduyla).
- [ ] Günün Eseri bugün oynanmamış (gizem kartı dolu görünsün).
- [ ] Defter dolu, Profil sayıları tutarlı (seri/elmas/seviye).
- [ ] İnternetsiz prova: uçak modu + yerel sunucu; ders baştan sona bitti.
- [ ] Harita prova: internetli + internet kapalı (gömülü sınırlar).
- [ ] Tema prova: koyu + yüksek kontrast; projeksiyonda okunuyor. Yazı %125/160'ta taşma yok.
- [ ] Klavye ile ders: Tab/Enter; odak görünür; atlama bağlantısı.
- [ ] Sessiz mod açık/kapalı iki durumda ders bitti.
- [ ] Admin panel **opsiyonel**: demo sabahı canlı girişi bir kez dene; `api/saglik` `oturumDeposu:"redis"` + `gunluk:"redis"` döndüğünü doğrula. Parola repoda/sohbette yok; yerel giriş yedek.
- [ ] Ana senaryo **3:50** en az 3 kez, kırpılmış **3:00** 1 kez prova edildi.
- [ ] İki anlatıcı geçiş cümlelerini ezberledi; "söylenmeyecek iddialar" kutusu okundu.
- [ ] Telefon hotspot + şarj + HDMI dongle + yedek laptop hazır.

## 7. Söylenmeyecek iddialar (kutu)

> ⛔ Bu cümleleri **hiçbir anlatıcı söylemez**; jüri sorarsa SAVUNMA-NOTLARI.md §2'deki doğru cümle kullanılır.

- ⛔ "Her ders TTS ile dinlenebilir / toplu ses dosyası var." → **Ses dosyası yok**; yalnız cihaz sesi ve yalnız "Dinle" düğmesi.
- ⛔ "Köstik ile yapay zekâ sohbeti var." → 26 Ekim'de **kaldırıldı**; maskot kalır, sohbet yok.
- ⛔ "Canlı sınıf yarışması / Kahoot tarzı oyun." → Çocuk akışından çıkarıldı; **Profil > Giriş** bölümünden açılır. Sunumda yalnız `/api/saglik` `"depo":"redis"` ise gösterilir; `"bellek"` ise gösterilmez.
- ⛔ "80 eser tamamlandı." → Bursa'da **33**; 80 **hedef/yol haritası**.
- ⛔ "Her şey arşiv numaralı / her değer vakfiyeden." → Gerçek arşiv referansı **6/57**; resmî envanter künyesi **55/57**.
- ⛔ "Tüm gelir oranları belgeli." → **4/57** belgeli; kalanında ekran "belgelenememiştir" der.
- ⛔ "Gerçek tarayıcıda 22 ekran × 3 tema 0 ihlal, kesin." → "Otomatik axe taraması + kontrast testleri; finalde gerçek tarayıcı provası."
- ⛔ "Kaç öğrenci tamamladı." → **Kaç kez** tamamlandı; öğrenci sayısı bilinmez.
- ⛔ "AI ürünün içinde çalışıyor." → Yalnız **soru taslağı** hattı, insan onaylı.
- ⛔ "3 pilot okulda doğrulandı / saha kanıtı var." → Pilot okul ve ölçüm **yok**.
- ⛔ "g = 0,28" ve kaynaksız dış istatistikler → **kullanılmaz**.
- ⛔ "Harita vakıf ağı/filtre ekranı." → Harita yalnız "eser Türkiye'nin neresinde?" sorusunu yanıtlar.
- ⛔ "Derslerin süresi ölçüldü (3–5 dk)." → Süre **ölçülmedi**; "tasarım hedefi" denir.
- ⛔ "PostGIS kullanıyoruz." → PostgreSQL (PGlite) var, **PostGIS yok**.

## 8. Hızlı doğru sayılar (sunum öncesi son bakış)

**57** eser · **57** ders · **3** şehir (Bursa 33 · Konya 12 · Hatay 12) · **5** ünite (Bursa 3) ·
**633** arşiv eseri · **55/57** resmî envanter künyesi · **6/57** gerçek arşiv referansı ·
**4/57** belgeli gelir dağılımı · **69** test dosyası / **702** test · canlı: `kokavi-one.vercel.app`.

> Bu senaryo **26 Ekim ürün sadeleştirmesinden sonra** donmuştur; değişiklik ancak
> iki anlatıcının onayıyla yapılır ve DEMO.md güncellenir.
