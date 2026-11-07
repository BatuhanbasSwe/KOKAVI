# Başvuru PDF'i ↔ Uygulama Farkı — 24 Ekim 2026

> **Kaynak:** `sunum/KokAvi_Başvuru.pdf` (3 sayfa, 3 Ekim 2026). Ayrıntılı kanıt raporu:
> çalışma klasöründeki `_calisma/07-pdf-guncel-fark.md` (repo dışı; her satır dosya/satır
> veya komut çıktısıyla kanıtlı). Bu belge repo içi özet ve yol haritasıdır.
>
> **Yayın durumu:** 24 Ekim'de yayınlandı ve doğrulandı →
> **https://kokavi-one.vercel.app** · `/api/eserler` **57** · `/api/yol` **3 şehir / 5 ünite /
> 57 ders** · `cache-control: no-store` · yabancı Origin'e CORS başlığı yok.
> (Eski `kokavi.vercel.app` başka bir Vercel hesabında ve eski 25 eserlik sürümü gösteriyor.)

## 1. Tek cümle

PDF'teki **95 bağlayıcı unsurun** durum sayılabilen **53'ünün 22'si tam (VAR), 23'ü kısmi
(KISMİ), 8'i yok (YOK)**; buna karşılık repoda PDF'te olmayan **24 büyük özellik** var.
Demo için kritik eksikler: 80 eser hedefi (Bursa 33), pilot okul ölçümü ve bazı dış
istatistiklerin kaynağı. **27 Ekim:** sınıfça külliye + birlikte Röntgen yapıldı;
39 kaynak künyesi PDF'ten doğrulandı (2 künye düzeltildi); WCAG taraması
tekrarlanabilir hâle geldi (23 rota × 3 tema). Toplu TTS kullanıcı kararıyla kapsam dışı.

## 2. Kategori bazında durum

| Kategori | Sayılabilir unsur | VAR | KISMİ | YOK |
|---|---:|---:|---:|---:|
| 1.A Ürün ve konumlandırma (P) | 5 | 4 | 1 | 0 |
| 1.C Öğrenme modeli (L) | 7 | 5 | 2 | 0 |
| 1.D Egzersizler + Vakıf Röntgeni (E) | 7 | 2 | 5 | 0 |
| 1.E Oyunlaştırma (O) | 6 | 4 | 2 | 0 |
| 1.F Erişilebilirlik (A) | 5 | 1 | 4 | 0 |
| 1.G Çocuk gizliliği (G) | 4 | 2 | 2 | 0 |
| 1.H Teknoloji yığını (T) | 5 | 3 | 2 | 0 |
| 1.I İçerik üretim hattı (I) | 5 | 0 | 4 | 1 |
| 1.J İş modeli (B) + 1.K Finans (F) | 2 | 1 | 0 | 1 |
| 1.L Yol haritası (Y) | 7 | 0 | 1 | 6 |
| **TOPLAM** | **53** | **22** | **23** | **8** |

> Ayrıca 42 unsur iddia / iş modeli / taleptir (özellik değil); kanıtı §7'de.

## 3. Tamam olanlar (VAR — kanıt repo'da)

- **Ders akışı:** 57 ders × 5 adım (Merak → Bağlam → Perspektif → Geri çağırma → Yansıma);
  `src/features/ders/`, `AdimGostergesi.tsx`.
- **Üç soru:** kim yaptırdı (bani 57/57), neden yaptırdı (vakfiye amacı 54/57), bugün ne
  oldu (57/57) — `data/research/*.json`.
- **Şehir tamamlama:** sıralı ünite kilidi + şehir sertifikası; `src/lib/ilerleme.ts`.
- **Seri / elmas / seviye / Kâşif Defteri:** `shared/types.ts`, `src/features/defter/`.
- **Cezasız tahmin ve kalp yok:** `MerakAdimi.tsx`; gerekçe `docs/KARARLAR.md` §2.
- **4 egzersiz tipi:** 57 ders × 4 = 228 egzersiz; eşleştir, sırala, boşluk doldur, eser tanı.
- **Dinle ve seç:** ses varsa dinletir, sessiz modda "Eseri tanı"ya düşer (`tests/dinle-sec`).
- **Vakıf Röntgeni + kaynak künyesi:** her dersin Yansıma adımında; `kaynakKunye` 57/57.
- **Sınıf kodu anonim + reklam/profilleme yok:** `server/routes/sinif.ts`; analytics yok.
- **PWA + çevrimdışı ders + öğrenme motoru modülleri:** `vite.config.ts`, `src/lib/tekrar.ts`.
- **Yönetim paneli:** eser/şehir/ünite ekleme; `src/features/panel/`, `server/routes/admin.ts`.
- **Ana öğrenme yolu ücretsiz:** ödeme duvarı yok; 57 dersin tamamı açık.
- **MapLibre harita, keşif rotası, "Hâlâ yaşıyor", 633 eserlik arşiv** (PDF dışı ama
  envanter kanıtı).

## 4. Kısmi olanlar — eksik parça

| PDF unsuru | Eksik parça |
|---|---|
| L-01 / L-11 ders 3–5 dk | Süre ölçümü yok; 57 ders ≈ 133.000 karakter (PDF 80 eser için 40.000 varsayıyor) |
| E-02 eşleştirmede sürükle-bırak | Dokun/klavye var, HTML5 sürükle-bırak yok |
| E-04 sırala: vakfiye gelir dağılımı | 57 sırala sorusu var; içerik kronoloji, gelir dağılımı değil |
| E-05 otomatik soru üretimi | AI taslak hattı var (`npm run soru:taslak`); yayına bağlı değil, sorular elle yazılı |
| E-06 / E-07 Vakıf Röntgeni her değer vakfiyeden | Gelir oranı belgeli 4/57; gerçek arşiv referansı 6/57 (13 kaydın 7'si "numara bulunamadı" notu); 15 eserde resmî cilt künyesi yok. **27 Ekim:** 39 künye yerel resmî PDF'lerden doğrulandı; 2 künye düzeltildi (Konya I. Cilt s. 272-273 ve 298-299). |
| A-01 / I-05 her ders TTS, toplu dosya, çevrimdışı | Cihaz sesi var, **0 ses dosyası**; motor seçimi bekliyor (TODOLIST) |
| A-02 / A-03 / A-05 WCAG 2.2 AA, %200 yazı | Alt metin + klavye var; NVDA/VoiceOver kaydı, %200 testi ve AA denetim raporu yok |
| O-06 özerklik: eseri çocuk seçer | Ünite içinde serbest; şehir/ünite sıralı kilit (`KARARLAR.md` §3) |
| O-07 sınıf birlikte külliyeyi tamamlar | **27 Ekim'de yapıldı:** panelde hedef külliye ilerlemesi + `#/tahta/<kod>/rontgen` sınıf Vakıf Röntgeni (`GET /api/sinif/:kod/rontgen`). Külliye bağları yalnız kaynakta belgelenmiş (Yeşil 4, Muradiye 3 ders). |
| I-02 insan kontrolü | `--yayinla` yalnız adıyla onaylananı alır; kontrol listesi / ret oranı yok |
| T-05 planlanan yığın | React/TS/Fastify/PGlite/MapLibre var; **PostGIS yok** (`KARARLAR.md` §5), toplu TTS yok |
| P-06 / Y-04 pilot ölçüm | Sertifika var; 3 pilot okul ve "şehri tamamlayan öğrenci oranı" ölçümü yok |

> **Arşiv numarası sayımı (düzeltme, 24 Ekim):** `arsivNo` alanı 13 eserde dolu görünüyor,
> ama bunların 7'si gerçek numara değil, "Vakıflar Genel Müdürlüğü arşiv numarası
> bulunamadı" gibi bir arama notu. **Gerçek arşiv referansı 6/57** (Konya 3 · Hatay 3;
> Bursa'da 0). Arayüz artık yalnız gerçek kaydı "Vakfiye/arşiv kaydı" başlığıyla gösteriyor
> (`src/lib/arsivKaydi.ts`), "bulunamadı" notunu arşiv numarası gibi basmıyor.

## 5. Yok olanlar

| PDF unsuru | Not |
|---|---|
| I-05 Toplu TTS dosyaları (çevrimdışı ses) | **Kullanıcı kararıyla kapsam dışı (27 Ekim):** ses dosyası üretilmeyecek, sunumda TTS iddiası kullanılmayacak. Cihaz sesi yalnız "Dinle" düğmesinde; dersler ses olmadan tamamlanır. |
| F-11 Teslim sonrası maliyet revize tablosu | Repoda yok |
| Y-01 0–3 ay: Bursa 80 eser + 3 okul | 57 eser (Bursa 33), 3 okul kaydı yok |
| Y-02 4–12 ay: Kütahya/İzmir/Manisa + premium | Kapsam 3 şehre çekildi (`KARARLAR.md` §11); premium yok |
| Y-03 12+ ay: 7 bölge, kurumsal, kamu | Plan/kod kanıtı yok |
| Y-04 pilot okul | Sınıf kodu var; okul adı/taahhüdü yok |
| Y-05/Y-06 belediye/müze/MEB muhatabı | Görüşme kaydı yok |

## 6. PDF'te olmayan fazlalıklar (24 kalem) — kal / sadeleş

**Kal (PDF anlatısına köprü kuruyor):** Günün Eseri (57 ipucu insan onayı bekliyor) ·
Meraklısına arşivi (633 eser) · harita + vakıf ağı + keşif rotası (MapLibre kanıtı) ·
şehir sertifikası · Hayrat mı Akar mı? · Hatalarımı çalış + seri takvimi · öğretmen paneli
ve sınıf kodu · yönetim paneli · sergi + "Hâlâ yaşıyor" · AI soru taslak hattı · 15 rozet
(PDF'in "rozet değil aidiyet" cümlesiyle çelişiyor; sunumda "ilerleme göstergesi" denmeli).

**Sadeleş / riskli:** sahadaki mühür "Buradayım" (konum izni demo riski) · zaman tüneli +
zamana göre öğrenme (ana yolu dağıtıyor) · kombo/ses/titreşim/konfeti (sadeleş) ·
4 sekmeli kabuk + mozaik/animasyon (demo öncesi animasyon riski).

> **26 Ekim:** Köstik kaynaklı soru-cevap kaldırıldı (PDF'te yok, 18 yaş altı model riski).

**Temizlik:** `src/features/sinif/SinifSayfasi.tsx` ölü dosyası **27 Ekim'de kaldırıldı** (klasör artık yok). Kalan geçici dosya yok; `npm run dogrula` temiz.

## 7. Doğrulanmamış iddialar — sunum öncesi düzeltilmeli

1. **Dış sayılar kaynaksız:** 130.632 taşınmaz (TÜİK), VGM 9.000/25, rehber 17 mekân
   (Aralık 2021), "MEB resmen tanıdı" — hiçbirinde kurum + yayın + erişim tarihi yok.
2. **"Doğrulanmış saha kanıtı" (10–12 yaş) ve 3 pilot okul** — repoda dayanak yok;
   "doğrulanmış" sıfatı kaldırılmalı veya 1 niyet mektubu eklenmeli.
3. **"g = 0,28"** — g tanımsız, kaynak/örneklem yok; tam künye verilmeli veya sayı çıkarılmalı.
   Endacott & Brooks yılı da eksik.
4. **"Her değer vakfiye belgesinden + arşiv numarasıyla"** — gerçek arşiv referansı 6/57
   (13 kaydın 7'si "numara bulunamadı" notu taşıyor), oran 4/57;
   sunumda "belgelenen her değer" denmeli.
5. **"Her ders TTS ile dinlenebilir; toplu üretilir, çevrimdışı"** — cihaz sesi var, dosya
   yok; "cihaz sesiyle dinlenebilir; toplu dosya planlanan" olarak düzeltilmeli.
6. **"Kişisel veri toplanmaz"** — model sohbeti kaldırıldığı için üçüncü tarafa giden soru yok; beyan artık tutarlı.
7. **Finans tablosu** — Y1 netinin %84'ü hibe+kurumsal; pazarlama/vergi/komisyon yok;
   "varsayımdır" notu ve hibe hariç senaryo eklenmeli.
8. **Doküman sayıları tutarsız** (README/DURUM/VERI/UI-DEVIR/API farklı test-ders sayıları
   veriyordu) — bu belge ve güncellenen `DURUM.md`/`VERI.md`/`plan/EKSIKLER.md` ile
   hizalanmaya başlandı; teslim öncesi tüm sayılar 57/57/228/303/633 ile eşlenmeli.
   (27 Ekim: **66 dosya / 695 test** — final doğrulaması yayın öncesi bir kez daha koşulur.)
9. **39 bozuk arşiv künyesi** — 27 Ekim'de resmî PDF'lerden doğrulandı: 36 doğru,
   2 künye düzeltildi, 1 kayıt teyit edildi. Yöntem ve kanıt: `_calisma/_kaynak-dogrulama-sonuc.md`.

## 8. Final demo (7–8 Kasım) öncelikleri

**P0 — demo günü patlar / PDF'te açıkça söz verilmiş ve yok**
- [x] Vercel yayını doğrulandı: 57 eser / 57 ders / 3 şehir / 5 ünite, `no-store`, CORS kapalı.
- [ ] Tek cihazda 4 dakikalık smoke test: Yol → ders → 5 adım → Yansıma → defter; konsol hatası 0. **(finalde manuel; `docs/DEMO.md` kontrol listesi)**
- [x] Otomatik erişilebilirlik: 23 rota × 3 tema axe + kontrast testleri (`npm run erisilebilirlik`). Sessiz mod/klavye/gerçek tarayıcı provası finalde manuel.
- [ ] Canlı oda (Redis env yoksa) laptop + yerel ağdan 2 cihazla gösterilir — **bu sunumda canlı yarışma gösterilmiyor**; demo akışından çıkarıldı.

**P1 — PDF sözü, kısmi kanıt**
- [x] Toplu TTS — **kullanıcı kararı (27 Ekim): yapılmayacak**, sunumda iddia edilmiyor.
- [ ] Arşiv referansı kapsamı: 6/57; 5 yeni gerçek referans **kaynağa bağlı** (VGM arşivi erişimi yok; numara uydurulmaz).
- [x] Sınıfça külliye: hedef külliye ilerlemesi + `#/tahta/<kod>/rontgen` sınıf Vakıf Röntgeni. Test: `tests/kulliye.test.ts`, `tests/sinif-rontgen.test.tsx`.
- [x] WCAG 2.2 AA tekrarlanabilir tarama + JSON çıktı: `npm run erisilebilirlik`, `docs/ERISILEBILIRLIK.md`, `docs/erisilebilirlik-raporu.json`.
- [x] Doküman sayıları ve kırık bağlantılar tek gerçek duruma hizalandı (57/57/228/303/633; 27 Ekim doğrulaması).

**P2 — uzun vadeli (sunumda sözlü)**
- [ ] 80 eser hedefi (Bursa 33 → 80) · 3 pilot okul + saha ölçümü · premium/kurumsal lisans
  · PostGIS / 7 şehir / 560 eser / finans varsayımları.

## 9. Yayın sonrası canlı doğrulama (24 Ekim'de geçti; 27 Ekim sürümü yayında)

> **27 Ekim sürümü:** `vercel deploy --prod --yes` → Production **Ready**, alias
> **https://kokavi-one.vercel.app**. Doğrulama: `/api/saglik` 200 · `/api/yol`
> **3 şehir / 5 ünite / 57 ders** (Bursa 3 ünite, Konya 1, Hatay 1) · yeni
> `GET /api/sinif/XXX-9999/rontgen` ucu canlıda **404 `SINIF_YOK`** JSON'u dönüyor
> (rota mevcut) · istemci paketi sınıf külliyesi + Sınıf Röntgeni rotalarını içeriyor.
>
> **28 Ekim:** Vercel Git entegrasyonu düzeltildi. Commit yazarı geçersizdi
> (`lead@local` → Deployment Blocked); commit'ler `abdkayaa <kayaheredot32@gmail.com>`
> ile yeniden yazıldı ve `hackathon` `main`'e push edildi. Otomatik production deploy
> **Ready**, alias **https://kokavi-one.vercel.app**; `vercel inspect` build `api/index`
> paketi ve canlı istemci paketi yerel build ile aynı (hash eşleşti).

| Kontrol | Beklenen | Sonuç |
|---|---|---|
| `GET /api/eserler` | 57 | ✅ 57 |
| `GET /api/dersler` | 57 | ✅ 57 |
| `GET /api/yol` | 3 şehir / 5 ünite | ✅ 3 / 5 (Bursa 3 ünite; 57 ders) |
| `GET /arsiv/liste.json` | 633 | ✅ 633 |
| `cache-control` | `no-store` | ✅ no-store |
| Yabancı `Origin` | CORS başlığı yok | ✅ başlık dönmedi |
| `GET /api/sinif/:kod/rontgen` | yeni uç; bilinmeyen kod 404 `SINIF_YOK` | ✅ canlıda doğrulandı |

> Yayın URL'i: **https://kokavi-one.vercel.app** (Vercel projesi `kokavi`). Yeni sürümde
> arşiv/keşfet metinleri çocuk özetine indirildi: `src/features/arsiv/ozet.ts`,
> `ArsivEserSayfasi.tsx`, `KesfetSayfasi.tsx`; testler `tests/ozet.test.ts`,
> `tests/arsiv-cocuk-metni.test.tsx`, `tests/eser-satiri-ozet.test.tsx`.

## 10. 27 Ekim kapanış güncellemesi

| İş | Durum | Kanıt |
|---|---|---|
| Sınıfça külliye hedefi + birlikte Vakıf Röntgeni | ✅ Yapıldı | `shared/kulliyeler.ts`, `server/repo/sinif.ts` (`kulliyeleriHesapla`, `sinifRontgeni`), `src/features/ogretmen/SinifRontgenSayfasi.tsx`, `#/tahta/<kod>/rontgen`, `GET /api/sinif/:kod/rontgen` |
| WCAG 2.2 AA tekrarlanabilir kanıt | ✅ 69 axe taraması + kontrast testleri | `npm run erisilebilirlik`, `docs/ERISILEBILIRLIK.md`, `docs/erisilebilirlik-raporu.json` |
| 39 kaynak künyesi doğrulaması | ✅ 36 doğru · 2 düzeltme · 1 teyit | `_calisma/_kaynak-dogrulama-sonuc.md`, `scripts/arsiv-hazirla.py` (`SAYFA_DUZELTMESI`) |
| İçerik okuması (otomatik + örneklem) | ✅ 3 uzun cümle bölündü; 0 İngilizce/0 uzun paragraf | `_calisma/_icerik-okuma-raporu.md` |
| Demo + jüri savunması | ✅ Baştan yazıldı | `docs/DEMO.md`, `docs/SAVUNMA-NOTLARI.md` |
| Toplu TTS | ⛔ Kapsam dışı (kullanıcı kararı) | `docs/KARARLAR.md` §7 |
| Bursa 80 eser hedefi | ⏳ Yol haritası (57 MVP) | Sunumda "hedef" denir; sayı uydurulmaz |
| Pilot okul / saha ölçümü · Hatay teyidi · yeni arşiv referansları | ⏳ Dış bağımlılık | `TODOLIST.md` açık işler |
