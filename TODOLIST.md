# TODOLIST — Kök Avı: ne yapıldı, ne kaldı

> **Takımın ortak ilerleme listesi.** İnsan ya da AI ajanı fark etmez: işe başlamadan önce bunu oku.
> Son güncelleme: 7 Kasım 2026 · Final: 7–8 Kasım 2026
> Son çalışma raporu: [docs/CALISMA-RAPORU-2026-10-18.md](docs/CALISMA-RAPORU-2026-10-18.md) (18 Ekim'de yapılan her şey).
>
> **Kural:** Bir işi bitiren, kutusunu `[x]` yapar ve aynı commit'te bu dosyayı günceller.
> Bir işe başlayan, satırın sonuna adını yazar (`— 🔧 Ad`). Böylece aynı işe iki kişi girmez.

Durum işaretleri: `[x]` bitti · `[ ]` yapılacak · `🔧 Ad` üzerinde çalışılıyor · `⏳` birinden karar ya da veri bekliyor

---

## Aşama 1: Başvuru PDF'ini tamamla

Takım planından ([docs/plan/ILERLEYIS.md](docs/plan/ILERLEYIS.md)). Kural: Aşama 1 bitmeden yeni özelliğe geçilmez.

- [x] **Dinle ve seç egzersizi.** Ses kendiliğinden çalar, altyazı açılıp kapanabilir. Sessiz modda "Eseri tanı"ya düşer. Ekran okuyucuyla da çözülebilir. Test: `tests/dinle-sec.test.tsx`
- [x] **Toplu TTS — yapılmayacak (kullanıcı kararı, 27 Ekim).** Ses dosyası üretilmeyecek; sunumda TTS iddiası kullanılmayacak. Cihaz konuşma sentezi yalnızca "Dinle" düğmesinde kalır; dersler ses olmadan da tamamlanır. Gerekçe: `docs/KARARLAR.md` §7.
- [x] **Erişilebilirlik doğrulaması (27 Ekim'de tekrarlanabilir hâle getirildi).** `npm run erisilebilirlik` → **23 rota × 3 tema = 69 axe taraması** + tema jetonu kontrast testleri, toplam **191 test**; JSON kanıt `docs/erisilebilirlik-raporu.json`, yöntem/sınırlar `docs/ERISILEBILIRLIK.md`. Ekran bazlı denetim: `tests/erisilebilirlik-denetim.test.tsx`, ders akışı: `tests/erisilebilir-ders-akisi.test.tsx`, tarama: `tests/erisilebilirlik-tam-tarama.test.tsx`, kontrast: `tests/tema-kontrast.test.ts`.
- [x] **AI soru üretimi hattı.** Akış: içerik → AI taslak soru → insan onayı → yayın. İnsan onayı olmadan hiçbir soru yayına girmemeli. ✅ `npm run soru:taslak` → `data/taslak-sorular/`, `--yayinla` yalnızca adıyla onaylananları alır.
- [x] **Elmas harcama + veli onayı (simüle).** Çarşı'da avatar, defter teması ve ek ipucu alınır. Her harcamadan önce yazıyla bir çarpma sorusu sorulur; onay 10 dakika geçerlidir. Ayarlar'dan kapatılabilir ama kapatmak da onay ister. **18 Ekim:** kazanılan elmas gerçek para olmadığı için onay varsayılan olarak kapalı; veli isterse açar (KARARLAR §4). "Ek sefer" ifadesinin yorumu: [docs/KARARLAR.md](docs/KARARLAR.md) §4. Test: `tests/veli-onayi.test.ts`, `tests/veli-kapisi.test.tsx`
- [x] **Belge düzeltmeleri.** `docs/DEMO.md`'de şehirler (Hatay, Konya, Bursa), Hatay eser sayısı (12) ve erişilebilirlik kapsamı güncellendi. `docs/KARARLAR.md` §5'e PostgreSQL yerine PGlite, PostGIS yerine cihazda mesafe ve gömülü GeoJSON gerekçesi yazıldı. (Demo senaryosunun baştan yazımı aşağıda ayrı madde.)
- [x] **npm audit açıkları.** Sunucu paketi (`@fastify/static`) dahil düzeltildi. `npm audit` sonucu: 0 açık.
  - ⚠️ 18 Ekim: bu güncellemeden sonra Vercel'deki canlı API her istekte çöküyordu (`ERR_REQUIRE_ESM`): `@fastify/static` 10, ES modülü olan `content-disposition` 3'ü `require()` ile yüklüyor; yerel Node buna izin verdiği için görünmedi. Düzeltme: `package.json` `overrides` ile `content-disposition` 2.0.1 (aynı API, CommonJS) ve `@fastify/static` yalnızca gerektiğinde yükleniyor. Test: `tests/vercel-paketi.test.ts`.
- [x] **`eksikler` dalı main'e birleştirildi (24 Ekim).** Canlı oda Redis deposu (`server/canli/depo.ts`), API sertleştirmeleri (CORS kapalı, `trustProxy`, `/api` için `no-store`, 429), AI soru taslak hattı (`scripts/soru-taslak.ts`) artık `main`'de. Doğrulama: 61 test dosyası / 573 test yeşil, build temiz.
- [x] **Yayın DB'si ve API paketi yenilendi (24 Ekim).** `npm run seed` → 57 eser / 57 ders / 303 fotoğraf → `npm run pgdata:dump` → `deploy/pgdata.tgz` (4,8 MB) → `npm run build:vercel` → `api/index.mjs`. Uçtan uca doğrulandı: `/api/eserler` 57, `/api/dersler` 57, `/api/yol` 3 şehir / 5 ünite, `cache-control: no-store`, CORS kapalı. Prosedür: [docs/PDF-ENTEGRASYON.md](docs/PDF-ENTEGRASYON.md) §Yayın paketini yenileme.
  - [x] **Push + Vercel yayını (24 Ekim).** `main` push edildi (`3434fd1`) ve yeni Vercel projesi `kokavi`'ye yayın yapıldı: **https://kokavi-one.vercel.app**. Canlı doğrulandı: `/api/eserler` 57, `/api/dersler` 57, `/api/yol` 3 şehir / 5 ünite, `cache-control: no-store`, yabancı Origin'e CORS başlığı yok, `/arsiv/liste.json` 633. (Eski `kokavi.vercel.app` başka hesapta ve eski 25 eserlik sürümü gösteriyor.)

## 26 Ekim — ürün sadeleştirmesi (10-12 yaş odağı)

- [x] **Köstik kaynaklı soru-cevap kaldırıldı.** PDF'te beyan edilmediği için istemci sohbeti, `POST /api/sor`, korpus ve testleri repodan çıkarıldı; mascot Köstik kaldı.
- [x] **Tahta modu (okul, tek cihaz).** Öğretmen panelindeki sınıf detayında her ders için "Tahtada aç" bağlantısı var (`#/tahta/<kod>/<dersId>`); büyük yazılı sunum açar, ders bitince `POST /api/sinif/tamamla` ile sınıf külliyesine işlenir. Öğrenci telefonu gerekmez; sınıf kodu yalnızca **evde devam** için (Profil → Sınıfım). Test: `tests/tahta-rota.test.ts`.
- [x] **Harita sadeleşti.** Harita listesinde yalnızca ad + tür/ilçe/yıl + defter rozeti var; tarihçe, İngilizce metin, galeri, sergiler ve "Vakıf ağı" bloğu kaldırıldı. Uzun metinler Meraklısına arşivinde (yetişkin) kalır. Test: `tests/eser-satiri-ozet.test.tsx`.
- [x] **Keşfet üç kapıya indi.** Harita · Keşif rotası · Meraklısına arşivi; "Zaman tüneli" ve "Hâlâ yaşıyor" ana merkezden kaldırıldı (bilgi ders içi rozetlerde).
- [x] **Canlı yarışma çocuk akışından çıktı.** Bugün mozaiği ve yetişkin gezinmesindeki bağlantılar kaldırıldı; kod/rotalar ileride gerekirse diye duruyor, demo/pitch'te gösterilmiyor.

- [x] **Arşiv ↔ ders eşleşmesi düzeltildi.** `bursa-ii-murad-kulliyesi` kartı kendi dersine bağlandı (hamam + Muradiye çeşmesi ilgili ders); Yeşil Medrese/Türbe Yeşil külliye kartına, Beşir Ağa Çeşmesi Emir Sultan külliyesine ilgili ders olarak eklendi → **57/57 ders arşivden erişilebilir**. Çift önekli 2 id (`bursa-bursa-…`) tek öneke indirildi, metin/foto dosyaları yeniden adlandırıldı; üretici betiğe de aynı kurallar eklendi. Test: `tests/arsiv-eslesme.test.ts`.
- [x] **39 bozuk arşiv özeti düzeltildi.** `ozet.ts` artık baştaki eser başlığı + İngilizce ad satırını ve yarım kalmış gövde parçasını atlıyor; 633/633 özet dolu, ≤260 karakter, büyük harfle başlıyor ve İngilizce başlık taşımıyor. Test: `tests/arsiv-ozet-toplu.test.ts`, `tests/ozet.test.ts`.
- [x] **13 dersin resmî künyesi tamamlandı.** Arşivdeki cilt+sayfa künyeleri ders verisine eklendi (11 doğrudan + 2 Yeşil külliye kaydı) → resmî künye **55/57**; eksik 2 çeşme arşivde yok. `konya-konut` kartı "Konut bölümü (42 sayfa)" olarak etiketlendi. Test: `tests/veri-duzeltme.test.ts`.
- [x] **Canlı yayın güncellendi (26 Ekim).** https://kokavi-one.vercel.app — `/api/eserler` 57, `/api/dersler` 57, `/api/yol` 3 şehir / 5 ünite; yeni istemci paketinde "Tahta modu" var, `POST /api/sor` kapalı (404).

## 24 Ekim — çocuk metni, yayın ve PDF farkı

- [x] **Arşiv/Keşfet çocuk metni düzeltmesi.** Uzun envanter paragrafları (medyan ~2.300, en uzun ~111.000 karakter) çocuk arayüzünden kaldırıldı: `src/features/arsiv/ozet.ts` ilk 2 cümle / en fazla 260 karakterlik özet üretir, İngilizce çeviri paragraflarını ayıklar; tam Türkçe metin "Büyükler için kaynak metni" altında katlanır. Arşiv kartlarında "Dersi var" yıldızı, derssiz eserlerde "Dersi yok · yalnızca keşif" notu var. Harita tarihçesi de kısa özete indirildi. Test: `tests/ozet.test.ts`, `tests/arsiv-cocuk-metni.test.tsx`, `tests/eser-satiri-ozet.test.tsx`.
- [x] **Başvuru PDF'i güncel fark raporu.** 95 bağlayıcı unsurun 53 sayılabilirinin 22'si VAR / 23'ü KISMİ / 8'i YOK; PDF'te olmayan 24 büyük özellik sınıflandırıldı; demo için P0/P1/P2 listesi çıkarıldı: [docs/PDF-FARK-GUNCEL.md](docs/PDF-FARK-GUNCEL.md).
- [x] **Arşiv no dürüstlük düzeltmesi (24 Ekim).** `arsivNo` alanı 13 eserde doluydu ama 7'si "numara bulunamadı" notuydu; arayüz bunu "Vakfiye arşiv no: …" diye basıyordu. Yeni `src/lib/arsivKaydi.ts` yalnız gerçek referansı gösterir, uzun künyeyi kısaltır; sahte/yanıltıcı numara görünmez. Gerçek referans: **6/57** (Konya 3 · Hatay 3). Test: `tests/arsiv-kaydi.test.ts`.
- [x] **P1 fark işleri (27 Ekim durumu).** Sınıfça külliye hedefi + birlikte Vakıf Röntgeni **yapıldı** (aşağıda). WCAG kanıtı **yapıldı** (`npm run erisilebilirlik`, 69 tarama + JSON). Doküman sayıları 57/57/228/303/633 ve 27 Ekim doğrulamasına hizalandı. Toplu TTS **kullanıcı kararıyla kapatıldı**. 5 yeni gerçek arşiv referansı **kaynağa bağlı** (VGM arşivi erişimi yok; uydurulmaz) — yol haritası.
- [x] **Sınıfça külliye + birlikte Röntgen (27 Ekim).** `shared/kulliyeler.ts` yalnız kaynakta belgelenmiş iki külliyeyi tanımlar (Yeşil 4 ders, Muradiye 3 ders). Öğretmen panelinde **hedef külliye** ilerlemesi; ders sonunda **Sınıf Röntgeni** (`#/tahta/<kod>/rontgen`) sınıfın birlikte gördüğü eserlerin gelir/gider listelerini tek ekranda toplar. Yeni herkese açık uç: `GET /api/sinif/:kod/rontgen` (yalnız toplu sayaç + yayın içeriği; kimlik yok). Test: `tests/kulliye.test.ts`, `tests/sinif-rontgen.test.tsx`, `tests/sinif-kulliye-ui.test.tsx`, `tests/tahta-rota.test.ts`.

## Başvuruya göre ek tespitler

Aykuutt'un tespitleri (`pdf-eksikleri-ve-guvenlıkuyarıları` dalı).

- [x] **Bursa eser sayısı — kapsam kararı (27 Ekim).** Başvuruda 80 eser hedefi var; üründe **Bursa 33 / toplam 57** ders eseri işlendi. Karar: 47 yeni ders bu dönem **eklenmeyecek**; sunumda "80 hedefi yol haritası" denir, "80 tamam" denmez. Yeni içerik ancak resmî envanterden insan onayıyla gelir.
- [x] **Sınıfça külliye hedefi.** Yukarıdaki 27 Ekim maddesiyle yapıldı: hedef külliye ilerlemesi + Sınıf Röntgeni.
- [x] **Vakfiye arşiv numaraları — doğrulama tamam (27 Ekim).** 57 eserin gerçek arşiv referansı **6/57** (Konya 3 · Hatay 3); "numara bulunamadı" notları arşiv no gibi gösterilmez. Uydurma numara eklenmez; kapsam kaynağa bağlıdır.
- [x] **npm audit uyarıları.** Yukarıdaki Aşama 1 maddesiyle kapandı.

## Aşama 2: PDF'te olmayan özellikler için kararlar

- [x] **Başarım rozetleri kalsın.** Batuhan'ın kararı, 17 Ekim. iamch3f "PDF ile çelişiyor" demişti.
- [x] **Günün Eseri — içerik gözden geçirildi (27 Ekim).** 57 ipucu tarandı; ilk dört ipucunun cevabı ele vermediği mevcut testle (`tests/gunun-eseri.test.tsx`) zaten denetleniyor. Ek taramada yalnızca genel tür/zaman kelimeleri eşleşti; değişiklik gerekmedi.
- [x] **Kombo, ses efekti, titreşim, konfeti — karar (27 Ekim).** Mevcut hâliyle kalıyor; "hareketi azalt" ve "sessiz mod" zaten kapsıyor. Demo/pitch'te öne çıkarılmıyor.
- [x] **Zaman tüneli ve zamana göre öğrenme — karar (27 Ekim).** 26 Ekim'de ana merkezden kaldırıldı; rota kodda duruyor, çocuk gezinmesinde yok. Karar: kaldırılmış kalır.
- [x] **Egzersizler okumadan geçilemez (6 Kasım).** Eseri tanı ve boşluk doldurda şıklar karışık geliyor (doğru şık içerikte 51/57 ve 57/57 kez ilk sıradaydı). Sırala'da tarih önekleri ilk denemede gizli, ilk kontrolden sonra ipucu olarak açılıyor. İçerik ve `shared/` değişmedi. Test: `tests/egzersiz-okuma-zorunlu.test.tsx`. Analiz: `docs/EGZERSIZ-ANALIZI.md`. Sunum: `docs/SUNUM-TEMELLENDIRME.md`.
- [x] **Profilde rozet vitrini + "sıradaki rozet" çekimi (6 Kasım).** Profil'de seviye ilerleme çubuğu, 4 sayı kutusu (Ders · Seri · Elmas · Rozet x/y), en yakın 3 kilitli rozet için ilerleme (ör. 3/5) ve kazanılan madalyalar var. "Tüm rozetleri gör" → `#/defter?sekme=rozetler`. Rozet mantığına `rozetIlerlemesi()` eklendi (kazanılma ⇔ simdi ≥ hedef). Test: `tests/rozet-ilerlemesi.test.ts`, `tests/profil-rozetler.test.tsx`.
- [x] **Bağlam metni kartlara bölündü; çocuk arayüzünde kesik çizgi kaldırıldı (6 Kasım).** Bağlam adımında her paragraf ayrı kart; "Devam" ile ilerleniyor, "Geri" var, sayaç metinle de söyleniyor ("Kart 2 / 4"), kart değişince odak başlığa gidiyor. Kavramlar ve kapanış sorusu son kartta. İçerik değişmedi. Çocuk ekranlarındaki `dashed` kenarlıklar düz çizgiye çevrildi. Test: `tests/baglam-kartlari.test.tsx`.
- [ ] **V1 + V2 içerik varyantları (karar bekliyor).** V1: ünite sonu derslerde şıksız boşluk doldur. V2: para/sayı sıralayan 3 sırala egzersizi (Yeşil Cami, Yeşil Medrese, Habib-i Neccar) sebep→sonuç zincirine çevrilsin. Ayrıntı: `docs/EGZERSIZ-ANALIZI.md` §4.

## Tasarım ve farklılaşma (bitti)

Ayrıntılar [docs/GECE-RAPORU.md](docs/GECE-RAPORU.md) §21–24 ve [DESIGN.md](DESIGN.md) dosyalarında.

- [x] **Sıfırdan yeniden tasarım.**
  - Görünüm: tam siyah koyu tema, tek vurgu rengi safran, Phosphor ikonlar.
  - Gezinme: 4 sekme (Bugün · Yol · Keşfet · Defter) ve Profil.
  - Ekranlar: Bugün sayfasında fotoğraflı mozaik, Yol'da fotoğraf patikası, Defter'de sekmeler (Pullar, Rozetler, Seri, Belgeler).
  - Açık tema ve yüksek kontrast teması da korunuyor.
- [x] **Köstik maskotu kaldırıldı (3 Kasım).** Arayüz sadeleştirildi; maskot görselleri ve `Maskot.tsx` silindi, PWA ikonu yenilendi.
- [x] **Premium "basılabilir" UI cilası (3 Kasım).** Düğme ve seçeneklerde basılabilir dudak, doğru cevapta kıvılcım, yanlışta ceza yok (yana dürtme + ipucu), patika madalyonları basılabilir; tüm overshoot/bounce easing'ler `--cikis`'e çekildi. Safran + İznik mavisi kimliği korundu, renkler yalnız `tokens.css`'ten.
- [x] **Yol ekranı.**
  - Bugün'deki "Başla" doğrudan derse değil, Yol'daki sıradaki durağa götürür.
  - Kaydırırken arka plan, ekrandaki eserin rengini alır.
- [x] **Keşif rotası yenilendi.** Gerçek sokak haritası üzerinde çalışır. Yakın eserler gruplanır, uzun rotalar bölümlere ayrılır, yürüyüş tarifi için OSM'e bağlantı verir.
- [x] **Canlı öğrenme yolu ve animasyonlar (18 Ekim).** Köstik yolda yürüyor, yol altınla doluyor, kilitler kırılıyor, elmaslar uçuyor, ünite mührü, ders içi kıvılcımlar, kaydırma şovu. Ölçeklenebilir (esere özel çizim yok), hareketi azalt ayarına uyuyor. Ayrıntı: [docs/CALISMA-RAPORU-2026-10-18.md](docs/CALISMA-RAPORU-2026-10-18.md) §10.
- [x] **Süzgeç paneli.** Arşiv ve harita süzgeçleri açılır kapanır panelde.
- [x] **Harita onarımı ve Google benzeri görünüm (18 Ekim).** MapLibre 6'ya geçişten beri worker yüklenemiyordu, harita boş çiziliyordu (yayındaki sürümde de); düzeltildi. Vakıf ağı haritası ve keşif rotası artık OpenFreeMap "Liberty" altlığıyla: Türkçe sokak, mahalle ve yer adları. İnternet yoksa gömülü il/ilçe haritasına düşer. Kod: `src/lib/maplibreYukle.ts`, `src/features/harita/altlik.ts`.
- [x] **Kaynaklı soru-cevap (Köstik sohbeti) — kaldırıldı (26 Ekim).** Başvuru PDF'inde böyle bir vaat yok; organizatör kuralı "PDF'te olmayan büyük özellik eklenmez". İstemci sohbeti, `POST /api/sor` ucu, korpus ve testleri repodan çıkarıldı. Maskot da 3 Kasım'da kaldırıldı.
- [x] **Hâlâ yaşayan vakıflar.** Bugün hâlâ işleyen 17 eser var; her birinde kaynak metinden birebir alıntı bulunur. Rota: `#/kesfet/yasayan`. Ders ve arşiv sayfasında "bugün hâlâ…" rozeti çıkar.
- [x] **Sahada mühür ("Buradayım").** Konum bir kez ve yalnızca cihazda ölçülür. Esere 150 m içindeysen deftere damga basılır. Konum saklanmaz.
- [x] **Daha önce bitenler:** canlı sınıf yarışması (Kahoot tarzı), sınıf raporu, Günün Eseri, vakıf ağı haritası, Meraklısına arşivi, şehir sertifikası, Hayrat mı Akar mı?, Hatalarımı çalış, seri takvimi. Ayrıntılar: GECE-RAPORU §1–20.

## Açık işler ve bekleyenler

> 27 Ekim kapanışı: yazılım/içerik tarafında yapılabilir işler bitti. Kalanlar
> **fiziksel cihaz, dış kurum veya gelecek sürüm** işidir; hiçbiri demo gününü
> bloke etmez.

- [ ] **Sahada mührü telefonda denemek (manuel, final öncesi).** Konum yalnızca https üzerinde çalışır; Vercel sürümünde gerçek telefonla denenmeli. (`docs/DEMO.md` kontrol listesinde.)
- [x] **Sınıf akışı tahta moduna çevrildi (26 Ekim).** Dersler öğretmenin tek cihazında; öğrenci kodu yalnızca evde devam için.
- [x] **Harita/Keşfet sadeleştirmesi (26 Ekim).** Harita = konum; uzun metinler arşivde.
- [ ] **PDF'lerden resmî içerik aktarmak — yol haritası.** Vakıf Katılım PDF'lerindeki metin ve görsellerin tamamı `data/` dosyalarına aktarılacak. Bu dönem 57 dersle sınırlı; 80/633 kapsamı sonraki sürüm.
- [x] **Admin ve öğretmen paneli — karar (27 Ekim).** Ayrı `/admin`, `/ogretmen` giriş noktası **eklenmeyecek**; mevcut `#/panel` + `#/ogretmen` ve Profil'deki "Yetişkinler için" bağlantısı yeterli.
- [ ] **Arşiv eserlerine konum — yol haritası.** 633 arşiv eserinin koordinatı yok; haritada ilçe balonuyla gösteriliyor. Koordinatlar ancak kaynaklı veriyle eklenir (OSM/envanter).
- [x] **Canlı yarışma için kalıcı oda.** Odalar `server/canli/depo.ts` üzerinden ortak depoda: Vercel'de Upstash Redis (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`), yerelde bellek. Sürümlü yazma (CAS) ile eşzamanlı cevap kaybolmaz. Test: `tests/canli-cok-ornek.test.ts`.
- [x] **İçerik okuması (27 Ekim, otomatik + örneklem).** 57 dersin çocuk metinleri tarandı: 0 uzun cümle (>28 kelime), 0 İngilizce kalıntı, 0 bozuk karakter, 0 uzun paragraf. 3 uzun `rontgenAciklama` cümlesi bölündü. Rapor: `_calisma/_icerik-okuma-raporu.md`. **Not:** tam pedagojik insan okuması (terimlerin sınıfta anlaşılması, zorluk dengesi) final öncesi bir öğretmen/editör tarafından yapılmalı.
- [ ] **Hatay teyidi — dış kurum.** Deprem sonrası durumu "doğrulanmadı" olarak işaretli eserler için mentörden teyit istenmeli (dış bağımlılık).
- [x] **Demo senaryosu (27 Ekim).** `docs/DEMO.md` iki persona, 3:50 ana + 3:00 kırpma planı, tahta modu + Sınıf Röntgeni ile baştan yazıldı. Jüri savunması: `docs/SAVUNMA-NOTLARI.md`.
- [x] **Dağıtım kararı — PWA (27 Ekim).** Final için PWA kalıyor; APK/mağaza paketleme bu dönem yapılmayacak. Gerekçe: hackathon teslimi tarayıcıdan çalışan canlı ürün + kurulumsuz erişim.

---

## 27 Ekim — kapanış işleri (final öncesi)

- [x] **Sınıfça külliye hedefi + birlikte Vakıf Röntgeni.** `shared/kulliyeler.ts` (yalnız kaynakta belgelenmiş iki külliye: Yeşil 4 ders, Muradiye 3 ders), `kulliyeleriHesapla` (yol sırasındaki ilk tamamlanmamış külliye = hedef), herkese açık `GET /api/sinif/:kod/rontgen`, `#/tahta/<kod>/rontgen` büyük ekran sayfası, panelde hedef külliye kartı, ders sonunda Röntgen bağlantısı. Test: `tests/kulliye.test.ts`, `tests/sinif-rontgen.test.tsx`, `tests/sinif-kulliye-ui.test.tsx`, `tests/guvenlik.test.ts` (yeni uç gizlilik testleri).
- [x] **WCAG 2.2 AA tekrarlanabilir kanıt.** `npm run erisilebilirlik` → 23 rota × 3 tema = **69 axe taraması** + **114 kontrast/tema testi** + **8 ekran denetimi** = **191 test**; JSON: `docs/erisilebilirlik-raporu.json`; yöntem/sınırlar: `docs/ERISILEBILIRLIK.md`. jsdom'da ölçülemeyen `color-contrast` ayrı jeton testiyle kapatıldı; harita/rota/canlı ekranlar kapsam dışı (gerçek tarayıcı provası finalde).
- [x] **39 kaynak künyesi doğrulaması.** Yerel resmî envanter PDF'lerinden (PyMuPDF) 39/39 kontrol: **36 doğru**, **2 künye düzeltildi** (Konya I. Cilt: Topraklık Hasan Efendi Camii `s. 274-275 → 272-273`; Tatköy Merkez Camii `s. 300-301 → 298-299`), 1 kayıt (Karışdıran Türbesi) teyit edildi ve künyesi zaten doğru. Düzeltmeler `public/arsiv/liste.json` + üretici `scripts/arsiv-hazirla.py` (`SAYFA_DUZELTMESI`) içinde kalıcı.
- [x] **İçerik okuması (otomatik + örneklem).** 57 ders tarandı; 3 uzun cümle bölündü; 0 İngilizce kalıntı, 0 uzun paragraf. Rapor: `_calisma/_icerik-okuma-raporu.md`. Tam pedagojik insan okuması notu yukarıdaki "Açık işler"de.
- [x] **Demo + savunma dokümanları.** `docs/DEMO.md` (3:50 + 3:00 kırpma, iki persona, Sınıf Röntgeni adımı) ve `docs/SAVUNMA-NOTLARI.md` (17+1 düzeltilmiş iddia, 16 jüri sorusu, kanıt dizini).
- [x] **Kalan kararlar yazıldı:** TTS yapılmayacak · Bursa 80 hedefi yol haritası (57 MVP) · admin/öğretmen için ayrı giriş yok · dağıtım PWA · kombo/ses/titreşim mevcut hâliyle · zaman tüneli kaldırılmış kalır · 5 yeni arşiv referansı kaynağa bağlı ertelendi.

---

## 6 Kasım — final öncesi

- [x] **Giriş sekmesi + canlı yarışma görünür (6 Kasım, `08e3fa9`).** Alt menüye **Giriş** eklendi; buradan "Canlı yarışma kur" (`#/canli/kur`) ve "Canlı yarışmaya katıl" (`#/canli`) açılır. Canlı yarışma çocuk akışından 26 Ekim'de çıkarılmıştı; yetişkin girişinde görünür. Ayrıca Dinle düğmeleri ve "Cezasız tahmin" kaldırıldı.
- [x] **Geçmişten bugüne — eski/yeni fotoğraf (6 Kasım).** Ulucami'nin kamu malı (CC0) 1862 ve 1865–75 fotoğrafları, bugünkü görünümle Yansıma adımında kaydırıcıyla karşılaştırılır. Veri: `src/features/ders/gecmisFotograflari.ts` · görseller: `public/gecmis/` · bileşen: `GecmisKarsilastirma.tsx` · test: `tests/gecmis-karsilastirma.test.tsx`. Kaynak: eski fotoğraflar kamu malı, bugünkü fotoğraflar Vakıf Eserleri Envanteri arşivi.
- [x] **Son doğrulama (6 Kasım):** **69 test dosyası / 702 test yeşil**, typecheck + build temiz (`npm run dogrula`); Vercel production deploy **Ready**.
- [x] **Canlı yarışma "Oyun bulunamadı" düzeltmesi (6 Kasım).** Kök neden: yayında odalar her sunucu örneğinin belleğindeydi (ortak depo env'i etkin değildi); canlı ölçümde 60 yoklamanın **43'ü `ODA_YOK`** döndü. Düzeltme: `server/canli/depo.ts` artık `UPSTASH_REDIS_REST_*` **ve** `KV_REST_API_*` ad çiftlerini tanıyor; `/api/saglik` `depo: "redis" | "bellek"` alanı döndürüyor ve yayında `bellek` görünürse sorun görünür oluyor. İstemci geçici 404'ü kısa aralıkla 6 kez yeniden deniyor (`canliApi.ts`), yoklama eşiği 12'ye çıktı. Ayrıca soru fotoğrafı kırpılmıyor (`object-fit: contain` + orana uyan kutu), masaüstünde içerik 960px / tahta ekranı 1200px / öğrenci soru ekranı 760px. Test: `tests/canli-depo.test.ts` (4) + genişleyen `tests/canli-arayuz.test.tsx`.
  - ✅ **Yayın doğrulandı (6 Kasım, CLI deploy):** Vercel'de Upstash Redis bağlandı (free plan; env adları `KV_REST_API_*` — `depo.ts` aliası sayesinde tanındı, alias olmasa yine belleğe düşerdi). `/api/saglik` → `"depo":"redis"`; oda kur → katıl → başla → cevap sonrası **80 yoklama isteğinde 0 × `ODA_YOK`** (önce 60'ta 43).

## 7 Kasım — gezinme/IA, kategori, UI turu (final akşamı)

- [x] **Gezinme/IA turu (Batu geri bildirimi).** Alt menüdeki **Giriş** sekmesi kaldırıldı, yerine **Ayarlar** (`#/ayarlar`) geldi (6 Kasım'daki "Giriş sekmesi" kararı bu turla geri alındı). **Vakıf Çarşısı** ve **Giriş seçenekleri** artık ayrı sayfa değil, Profil sayfasının bölümleri: `#/carsi` → Profil'de çarşı bölümüne kaydırır, `#/giris` → giriş bölümüne; ikisi de odağı bölüm başlığına taşır. Üst çubuktaki avatar çerçeve + sağ okla buton gibi görünür. Dosyalar: `src/app/App.tsx`, `src/app/app.css`, `src/features/profil/ProfilSayfasi.tsx`, `src/features/carsi/CarsiBolumu.tsx` (eski `CarsiSayfasi`), `src/features/giris/GirisBolumu.tsx` (eski `GirisSayfasi`). Test: `tests/kabuk.test.tsx`, `tests/giris.test.tsx`, `tests/kesfet-profil.test.tsx`, `tests/veli-kapisi.test.tsx`.
- [x] **Kategori mantığı.** `src/lib/kategori.ts`: 11 kategori (Cami, Medrese, Han/Kervansaray, Hamam, Türbe, Çeşme, Köprü, Kilise, Külliye, Mescit, Diğer) + `kategoriBul(hamTur)`. Haritada "Ne arıyorsun?" çipleri (şehir ve ham tür süzgeçleriyle birlikte, "Temizle" hepsini sıfırlar); Defter'in Pullar sekmesinde kategori başlıkları + öğrenilen/toplam sayacı. Tamamen istemci — `server/**`, `shared/**`, `data/**` değişmedi, seed GEREKMEZ. Test: `tests/kategori.test.tsx` (16).
- [x] **Genel UI/UX düzeltme turu.** 7 başlıklı statik denetim; 9 gerçek bulgu düzeltildi (tanımsız `--r-3` jetonu, 320px ızgara taşması, klavyeyle kaydırılamayan sınıf tablosu, 30→44px harita işareti, 32→44px rozet bağlantısı, `uppercase` mühür, 31 görünür em-dash, eksik h1, bayat yorum). Yeni regresyon testi `tests/ui-tutarlilik.test.ts` (9). Rapor: `docs/UI-TURU-2026-11-07.md`.
- [x] **Son doğrulama (7 Kasım):** **78 test dosyası / 754 test yeşil**, `npm run dogrula` (typecheck + test + build) temiz.

## 7 Kasım — tercih ekranı görseli + tercihe göre ders önceliği (final akşamı, 2. tur)

- [x] **Başlangıç soruları görseli.** `#/baslangic` düz koyu zeminden çıktı: kart gövdesi + üstte dekoratif Ulucami fotoğraf bandı (mobil 3:1, ≥640px 16:5; `--karartma` scrim + `--foto-metin` etiket; foto gelmezse token'lı safran gradyan) ve sahneye yayılan token'lı radial ışıma. Özet ekranında "Seçtiğin ilgi alanları yolda öncelikli olur" notu. Yüksek kontrastta foto kapanır, hareket azaltmada animasyon durur. Dosyalar: `src/features/giris/BaslangicSorulari.tsx`, `src/features/giris/baslangic.css`; test: `tests/baslangic-sorulari.test.tsx` (+2: dekoratif band, özet notu).
- [x] **Tercihe göre ders önceliği.** Yeni `src/lib/kisiselSira.ts`: başlangıç sorularındaki ilgi (cami/han/hamam/medrese/çeşme-köprü/külliye) → `kategoriBul` kategorisi. Kilit modeli (`src/lib/ilerleme.ts`) DEĞİŞMEDİ: açık ünitedeki tamamlanmamış dersler arasında ilgiye uyan ders "sıradaki ders" olur; eşleşme yoksa veya ilgi seçilmediyse eski davranış. Bugün kartında "· ilgine göre" etiketi, Yol'da "Devam et" o durağa taşınır ve başlıkta "ilgine göre önerildi" görünür; zamana göre görünümde (`ZamanListesi`) ilgiye uyan en eski bitmemiş eser önerilir. Dosyalar: `src/lib/kisiselSira.ts`, `src/features/bugun/siradaki.ts`, `BugunSayfasi.tsx`, `src/features/yol/YolSayfasi.tsx`, `src/features/zaman/ZamanListesi.tsx`; test: `tests/kisisel-sira.test.ts` (14) + `tests/bugun.test.tsx` (+2).
- [x] **Son doğrulama (7 Kasım, 2. tur):** **79 test dosyası / 772 test yeşil**, `npm run dogrula` (typecheck + test + build) temiz; axe taramaları 0 ihlal.

## 7 Kasım — çevrimdışı sertleştirme (3. tur)

- [x] **Keşfet/Bugün kapak fotoğrafları çevrimdışı.** `vite.config.ts`: 57 eserin `k.webp` küçük kapağı precache'e girer (78 girdi / 4,5 MB); büyük galeri fotoğrafları önbelleği şişirmesin diye çalışma zamanına kalır. Keşfet'teki harita kartı `1.webp` yerine `k.webp` kullanır.
- [x] **Ders ve filtre verisi çevrimdışı.** Yeni `src/lib/cevrimdisi.ts`: internet varken (12 saatte bir, Save-Data'ya saygılı) liste uçlarını, 57 dersin verisini ve eser başına `k.webp` + `1.webp` kapağını sessizce ısıtır; service worker bunları önbelleğe yazar. `src/main.tsx` açılıştan 3 sn sonra çağırır. SW API deseni `sehirler|kulliyeler` ile genişledi; `maxEntries` 800.
- [x] **Ham hata metinleri temizlendi.** Harita filtre hatası, ders/eser/defter/arşiv yükleme hataları artık "FetchEvent.respondWith..." gibi teknik metni göstermiyor; çevrimdışıyken anlaşılır cümle + fotoğraf yerine kırık görsel gizleme (arşiv kartları) var. Test: `tests/cevrimdisi.test.ts` (5).
- [x] **Çevrimdışı paket yarışı düzeltildi.** İlk açılışta ısıtma, service worker sayfayı kontrol etmeden başlıyordu; istekler önbelleğe yazılmıyordu (çevrimdışı ders "açılamadı" veriyordu). `main.tsx` artık `navigator.serviceWorker.controller` / `controllerchange` bekliyor; `cevrimdisi.ts` kontrol yoksa başlamıyor (bayat "hazır" damgası bırakmıyor). Prod'da çevrimdışı doğrulandı: Keşfet fotoğrafları, harita filtre/eser listesi, arşiv ve Ulucami dersi açılıyor.
- [x] **Yeni eser girişi kolaylaştırıldı.** Panel `EserFormu`: üstte **"Hızlı giriş"** (5 alan: Eser adı, Kimlik, Şehir, Tür, Yayında), kalan **21 alan** katlanır "Ayrıntılar (isteğe bağlı)" bölümünde; kaydet üstte + mobilde yapışkan altta; canlı "kalan zorunlu alan" sayacı; hata özeti satırı tıklanınca ilgili alana odak; ayrıntıdaki hata bölümü kendiliğinden açılır. Görünür alan **26 → 5**. Doğrulama kuralları/API değişmedi. Test: `tests/eser-formu.test.tsx` (6, axe 0).
- [x] **Son doğrulama (7 Kasım, 3. tur):** **81 test dosyası / 783 test yeşil**, `npm run dogrula` (typecheck + test + build) temiz.
- Not: `TODO-2026-11-07.md` P0/P1/P2 maddelerinin tamamı kapandı; yalnız dış bağımlılık/yol haritası kalemleri (telefonda mühür provası, PDF'lerden resmî içerik, arşiv koordinatları, Hatay teyidi, V1+V2 içerik varyantı kararı) açık.

## 7 Kasım — canlı yönetim paneli: oturum + yazma kalıcılığı (4. tur)

- [x] **Kök neden bulundu:** Vercel'de her API örneği `deploy/pgdata.tgz`'yi kendi `/tmp` kopyasına açıyor. Oturum ve yönetim yazmaları yalnızca o örnekte kalıyordu → panel açılıyor, sonraki istek başka örneğe düşünce "Bu işlem için giriş yapmalısın." (401) ve eklenen içerik kayboluyordu. Yerelde sorun yoktu (tek süreç); iki ayrı PGlite kopyalı örnekle birebir yeniden üretildi (A'da oturum 200, B'de 401; A'da eklenen eser B'de yok).
- [x] **Ortak oturum deposu.** `server/redis.ts` (Upstash REST) + `server/auth/oturum.ts`: oturumlar Redis'te (`kokavi:oturum:<sha256>` + kullanıcı ters indeksi, TTL). Redis yoksa yerel `session` tablosu (yerel/test davranışı değişmedi). Çıkış/parola değişimi/pasifleştirme Redis oturumlarını da düşürür; Redis'te YOKLUK geçersizliktir (başka örnekteki eski yerel kayıt diriltmez).
- [x] **Ortak yazma günlüğü.** `server/yonetim/gunluk.ts`: başarılı yönetim yazmaları (eser/ünite/şehir/külliye/ders/kullanıcı/sınıf/anonim sayaç) Redis listesine işlem olarak eklenir; her örnek her API isteğinden önce yeni işlemleri kendi PGlite kopyasına uygular. Redis yoksa devre dışı (yerel aynı). Sağlık ucu `/api/saglik` artık `gunluk` ve `oturumDeposu` alanlarını döner.
- [x] **Panel oturum kurtarma.** `src/lib/api.ts` `ApiHatasi` (durum + kod + detay) fırlatır; 401'de `kokavi-oturum-bitti` olayı yayınlanır. `KorumaliPanel` paneli AÇIK tutup üstte yeniden giriş katmanı açar; form verisi korunur, giriş sonrası kaydetme yeniden denenebilir. Panel hata metinleri `panelHataMesaji()` ile dostu (401/403/429/5xx).
- [x] **Veri bütünlüğü düzeltmeleri.** POST uçlarında var olan kimlik artık **409** (eser/ünite/şehir/külliye/ders) — "yeni" kayıt eskiyi sessizce ezmez. Eser/ders yazımı **tek transaction** (çakışan egzersiz/kalem → eski kayıt korunur, yarım kayıt yok). Gövdesiz POST'lar 500 yerine 400; 500 yanıtlarında ham hata `detay`'ı istemciye dönmez. Sıra negatif/ondalık olamaz; `yayinda`/`aktif` yalnız boolean (string "false" yayınlamaz). Ders PUT var olmayan kimlikte 404.
- [x] **Testler:** `tests/yonetim-gunlugu.test.ts` (10: iki örnek senkronu, idempotent, kullanıcı girişi, sayaç, transaction), `tests/oturum-redis.test.ts` (6: sahte Upstash REST ile oturum yaz/oku/sil, yerel kayıt silinse bile geçerlilik, günlük uygulama). Tarayıcı doğrulaması: `_calisma/e2e/lead-dogrulama.cjs` 10/10 (giriş, hızlı ekleme, 409, düzenle, sil, 401 kurtarma + kaydetme).
- [x] **Son doğrulama (7 Kasım, 4. tur):** **83 test dosyası / 799 test yeşil**, `npm run dogrula` (typecheck + test + build) temiz; `npm run build:vercel` yenilendi.
- [x] **QA turu (3 ajan):** UI 15 senaryo (7 bulgu), API 245 kontrol (5 bulgu), statik denetim 25 bulgu. Kritik/orta bulguların çoğu yukarıda düzeltildi; ayrıca ünite listesi ↔ özet kartı tutarsızlığı (`Verileri yenile` üniteleri de tazeler, ünite ekle/sil özeti günceller) ve giriş ekranı sekme başlığı düzeltildi.
- Bilinen kalan düşükler (demo öncesi risk değil): kaydedilmemiş değişiklik uyarısı yok; gelir oranı toplamı >%100 kaydı engellemez (uyarı gösterir); panelde fotoğraf/sergi düzenleme yok (seed dolduruyor); kısmi PUT gönderilmeyen alanları null'lar (panel tam gövde gönderir); yeni kayıt sonrası başlık/URL `yeni` kalır; sekme durumu URL'e yansımaz.

---

## Nasıl çalışılır

```bash
git checkout main && git pull            # güncel kodu al
git checkout -b <senin-dalın>            # kendi dalında çalış
npm install
npm run seed                             # API KAPALIYKEN çalıştır
npm run dev                              # API :8787 + arayüz :5173
npm run dogrula                          # typecheck + test + build; teslimden önce MUTLAKA yeşil
git add <dosyalar> && git commit -m "..."
git push -u origin <senin-dalın>         # sonra GitHub'da PR aç ya da main'e merge et
```

- Depo: `github.com/abdkayaa/hackathon` (ana depo). Artık ZIP yok; her şey git üzerinden.
- Son doğrulama (27 Ekim, `sadelestirme/kostik-kaldir` → `78b9e60`): **66 test dosyası, 695 test yeşil**, typecheck + build temiz (`npm run dogrula`). **Vercel yayını 27 Ekim'de yenilendi:** Production Ready, alias https://kokavi-one.vercel.app; `/api/saglik` 200, `/api/yol` 3 şehir / 5 ünite / 57 ders, yeni `GET /api/sinif/:kod/rontgen` canlıda (bilinmeyen kod 404 `SINIF_YOK`), istemcide sınıf külliyesi + Sınıf Röntgeni var; tahta modu, sade harita, düzeltilmiş arşiv özetleri ve 57/57 ders↔arşiv eşleşmesi canlıda.
- **Vercel Git entegrasyonu (28 Ekim):** otomatik deploy için commit yazarı geçerli bir e-posta olmalı; geçersiz yazar (ör. `lead@local`) Vercel'de **Deployment Blocked** verir. Doğru kimlik `abdkayaa <kayaheredot32@gmail.com>` (repo-local `user.name` / `user.email` buna ayarlandı). `hackathon` `main`'e push production deploy tetikler; 28 Ekim push'u **Ready**, alias https://kokavi-one.vercel.app.
- Kurallar ve dokunulmaması gereken dosyalar: [CLAUDE.md](CLAUDE.md).
- Tasarım dili: [DESIGN.md](DESIGN.md) · Kararların gerekçeleri: [docs/KARARLAR.md](docs/KARARLAR.md) · API: [docs/API.md](docs/API.md)
- Tasarım ve özellik planları: [docs/superpowers/specs/](docs/superpowers/specs/) ve [docs/superpowers/plans/](docs/superpowers/plans/)
