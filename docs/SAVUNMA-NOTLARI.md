# Jüri Savunma Notları — Kök Avı

> **Final:** 7–8 Kasım 2026 · **Canlı ürün:** https://kokavi-one.vercel.app
> **Amaç:** Sunumda söylenecek doğru cümleler ve her iddianın repodaki kanıtı.
> Kanıt yolları repo köküne göredir. Sayılar 26–27 Ekim 2026 doğrulamasıdır.
> Demo akışı ve zaman planı: [DEMO.md](DEMO.md).

## 1. Tek cümlelik ürün tanımı

Kök Avı, 10–12 yaş çocuklara vakıf eserlerini beş adımlı mikro derslerle öğreten,
her tarihî bilgiyi kaynak künyesiyle veren ve gelir dağılımını **belge yoksa
göstermeyen** bir PWA'dır. Ürünün ayırtıcı ekranı **Vakıf Röntgeni**'dir.

---

## 2. Düzeltilmiş iddialar — "şunu söyleme, şunu söyle"

| # | Söylenmemesi gereken iddia | Doğru cümle | Kanıt |
|---|---|---|---|
| 1 | "Her ders TTS ile dinlenebilir, toplu ses dosyası var." | "Ses **yalnızca cihazın kendi konuşma sentezidir** ve yalnızca 'Dinle' düğmesinde çalışır. **Toplu ses dosyası yok**; dersler ses olmadan da tamamlanır." | `src/features/ders/DinleDugmesi.tsx`, `src/lib/ses.ts`, `README.md` → "Bilinen sınırlar" |
| 2 | "Köstik ile yapay zekâ sohbeti var." | "Model sohbeti **26 Ekim'de kaldırıldı**; PDF'te beyan edilmemişti. Maskot Köstik (marka) kalır, sohbet yok." | `docs/KARARLAR.md` §17, `TODOLIST.md` 26 Ekim, `src/lib/yonlendirme.ts` (sohbet rotası yok) |
| 3 | "Canlı sınıf yarışması ürünün parçası." | "Kod tabanda duruyor ama **çocuk akışından çıkarıldı**; bu sunumda gösterilmiyor." | `TODOLIST.md` 26 Ekim, `src/features/bugun/BugunSayfasi.tsx` (bağlantı yok) |
| 4 | "80 eser tamamlandı." | "**Bursa'da 33 eser** işlendi; 80 eser hedefi **yol haritasıdır**, bugünkü sayı değil." | `docs/PDF-FARK-GUNCEL.md` §5 (Y-01), `docs/DURUM.md` 24 Ekim notu |
| 5 | "Her değer arşiv numaralı / her şey resmî künyeli." | "**Gerçek arşiv referansı 6/57** (Konya 3 · Hatay 3). Resmî envanter künyesi **55/57**; eksik 2 çeşme envanterde yok." | `docs/PDF-FARK-GUNCEL.md` §4 dipnot, `src/lib/arsivKaydi.ts`, `TODOLIST.md` 26 Ekim |
| 6 | "Bütün gelir oranları vakfiyeden alındı." | "Gelir dağılımı **4/57 eserde belgeli**. Belge yoksa çubuk çizilmez, ekran açıkça **'belgelenememiştir'** der." | `data/research/*.json`, `src/features/ders/VakifRontgeni.tsx`, `docs/KARARLAR.md` §8 |
| 7 | "Doğrulanmamış bilgi de olsa gösteriyoruz." | "**Belgelenen** her değer kaynak künyesiyle gösterilir; belgelenemeyen değer gösterilmez, uydurulmaz." | `src/features/ders/VakifRontgeni.tsx` (`BELGE_YOK_METNI`), `docs/KARARLAR.md` §8 |
| 8 | "Gerçek tarayıcıda 22 ekran × 3 tema 0 ihlal — kesin sonuç." | "**23 rota × 3 tema otomatik axe taraması** (69 tarama) + jeton kontrast testleri yeşil; gerçek tarayıcı ve ekran okuyucu provası finalde tekrarlanır. Bu bir tasarım iddiası değil, test çıktısıdır." | `tests/erisilebilirlik-tam-tarama.test.tsx`, `tests/tema-kontrast.test.ts`, `docs/ERISILEBILIRLIK.md` |
| 9 | "Ürünün içinde çalışan AI var." | "**Çalışma zamanında model yok.** AI yalnız soru **taslak** hattında; her soru insan onayından sonra yayına girer." | `scripts/soru-taslak.ts`, `TODOLIST.md` (AI soru hattı), `docs/KARARLAR.md` §17 |
| 10 | "PostGIS kullanıyoruz." | "**PostgreSQL (PGlite)** var; **PostGIS yok**. Üründe sunucu tarafı mekânsal sorgu yok, gerekçesi kayıtlı." | `README.md` yığın tablosu, `docs/KARARLAR.md` §5 |
| 11 | "3 pilot okulda doğrulanmış saha kanıtı var." | "Pilot okul ve saha ölçümü **henüz yok**; yol haritasında. 'Doğrulanmış' sıfatı kullanılmaz." | `docs/PDF-FARK-GUNCEL.md` §5 (Y-04) ve §7.2 |
| 12 | "g = 0,28 / kaynaksız dış istatistikler." | "Bu sayılar **sunumda kullanılmıyor**; künyesi tamamlanmadan iddia edilmez." | `docs/PDF-FARK-GUNCEL.md` §7 |
| 13 | "Sınıf özelliği öğrencileri takip ediyor." | "Sunucu yalnızca **sayaç** tutar: 'bu kodla bu ders kaç kez bitti'. **Kaç farklı öğrenci olduğu bilinemez** ve arayüz bunu iddia etmez." | `server/repo/sinif.ts` başlık yorumu, `src/features/ogretmen/SinifDetayi.tsx` (`GizlilikNotu`) |
| 13b | "Sınıf özelliği yalnızca sayaçtan ibaret; külliyeyi birlikte tamamlama yok." | "Artık var: öğretmen panelinde **hedef külliye** ilerlemesi, ders sonunda **Sınıf Vakıf Röntgeni** (`#/tahta/<kod>/rontgen`). Külliye bağları yalnız kaynakta belgelenmiş olanlardır (Yeşil 4 ders, Muradiye 3 ders)." | `shared/kulliyeler.ts`, `server/repo/sinif.ts` (`kulliyeleriHesapla`, `sinifRontgeni`), `server/routes/sinif.ts` |
| 14 | "Okulda öğrenciler telefonlarından katılır." | "Okulda telefon yok: öğretmen **tek cihazda Tahta modu** açar (`#/tahta/<kod>/<dersId>`). Sınıf kodu yalnız **evde devam** içindir." | `src/app/App.tsx` (tahta rotası), `src/features/ogretmen/SinifDetayi.tsx` ("Tahtada aç"), `tests/tahta-rota.test.ts` |
| 15 | "Harita vakıf ağı, filtreler, uzun tarihçeler gösteriyor." | "Harita **tek soruyu** yanıtlar: 'eser Türkiye'nin neresinde?' Keşfet **3 kapı**: Harita · Keşif rotası · Meraklısına arşivi." | `src/features/merkez/KesfetSayfasi.tsx`, `src/features/harita/HaritaSayfasi.tsx` |
| 16 | "Kalp/suçluluk mekaniği var." | "**Kalp mekaniği yok**; yanlış cevap yalnızca ipucu ve tekrar turu üretir, ilerleme durmaz." | `docs/KARARLAR.md` §2, `src/features/ders/MerakAdimi.tsx` |
| 17 | "Test sayısı 186 / 228." | "Güncel doğrulama: **66 test dosyası / 695 test** yeşil (27 Ekim); canlı sürüm aynı doğrulamadan geçti." | `TODOLIST.md` son doğrulama satırı, `docs/PDF-FARK-GUNCEL.md` §7 |

> **Kural:** Tablodaki kanıt dosyasını açamıyorsan o iddiayı söyleme.

---

## 3. Jüri soru–cevap

| Soru | Cevap | Kanıt |
|---|---|---|
| "Bu bir Duolingo kopyası değil mi?" | "Öğrenme motoru ödünç: beş adım, aralıklı tekrar, seri. **İçerik ve veri modeli özgün**: Vakıf Röntgeni ve vakfiye/gelir veri modeli başka bir üründe yok." | `README.md` PDF→kod eşleme tablosu, `src/features/ders/VakifRontgeni.tsx` |
| "Sesli rehber uygulamaları zaten var, farkınız ne?" | "Mevcut sesli rehberler **biletli müze/ören yeri** odaklı. Vakıf eserlerinin çoğu müze değil, sokağın içinde ve biletisiz; o model uygulanamaz. Biz ekonomik döngüyü (para nereden gelir, nereye gider) öğretiyoruz." | `../Arastirma_Raporu.md` §5.4 (üst klasör), `src/features/harita/HaritaSayfasi.tsx` |
| "Yapay zekâ kullanıyor musunuz? ChatGPT wrapper'ı mı?" | "Çalışma zamanında model yok. AI yalnız **soru taslağı** üretir; `--yayinla` yalnız adıyla onaylananı alır, yani insan kapısı var." | `scripts/soru-taslak.ts`, `npm run soru:taslak`, `TODOLIST.md` |
| "Gelir oranlarını nereden aldınız?" | "Belgeden: Habib-i Neccar'da 1550 tarihli evkaf defteri (gelir 59/21/20, gider 77/23 ayrı listeler). Belge yoksa oran yok — **4/57 belgeli**, kalanı 'belgelenememiştir' der." | `data/research/hatay.json` (Habib-i Neccar), `docs/KARARLAR.md` §8 |
| "Arşiv numaraları neden eksik?" | "Envanter kitapları anlatı formatında; Vakıflar Genel Müdürlüğü arşiv numarası her eserde yok. **Gerçek referans 6/57**; uydurulmuyor. Arayüz 'numara bulunamadı' notunu arşiv no gibi basmaz." | `src/lib/arsivKaydi.ts`, `tests/arsiv-kaydi.test.ts`, `docs/PDF-FARK-GUNCEL.md` §4 |
| "PDF 80 eser diyor, sizde 33 var." | "Bursa'da **33 eser** işlendi, toplam 57. 80 hedefi **yol haritası**; sunumda '80 tamam' demiyoruz, 'hedef' diyoruz." | `docs/PDF-FARK-GUNCEL.md` §5, `docs/DURUM.md` 24 Ekim notu |
| "Çocuk verisini nasıl koruyorsunuz?" | "Hiç toplamıyoruz. İlerleme `localStorage`'da; ilerleme gönderen bir uç **yok**. Sınıf kaydında sunucuya yalnız `{kod, dersId}` gider." | `tests/api.test.ts` ("ilerleme alanı yok"), `tests/sinif-gizlilik.test.tsx`, `README.md` gizlilik mimarisi |
| "Sınıf özelliği takip değil mi?" | "Sayaç: 'toplam tamamlama' ve 'tamamlanan farklı ders'. Öğrenci kimliği, cihaz kimliği, IP, zaman serisi tutulmaz. Panelde 'kaç öğrenci' yazmaz." | `server/repo/sinif.ts`, `server/routes/sinif.ts`, `src/features/ogretmen/SinifDetayi.tsx` |
| "Okulda telefon yasak, ürün nasıl kullanılır?" | "Öğretmen tek cihazdan **Tahta modu**nu açar; ders bitince sınıf külliyesine işlenir. Kod yalnız evde devam içindir. Bu, PDF'in 'sınıf birlikte külliyeyi tamamlar' senaryosunun tek cihazla karşılığı." | `src/app/App.tsx`, `src/features/ogretmen/SinifDetayi.tsx`, `tests/tahta-rota.test.ts` |
| "Sınıf külliyeyi nasıl birlikte tamamlıyor? Röntgeni birlikte görüyor musunuz?" | "Evet. Her sınıfın yol sırasındaki ilk tamamlanmamış külliyesi **hedef** olur; panelde ilerleme çubuğu görünür. Ders bitince 'Sınıf Röntgeni'ni tahtada aç' bağlantısı **sınıfın birlikte gördüğü eserlerin** gelir/gider listelerini tek ekranda toplar. Ekranda kimlik yok; yalnız eser + toplu sayaç var." | `shared/kulliyeler.ts` · `tests/kulliye.test.ts` · `tests/sinif-rontgen.test.tsx` · `tests/sinif-kulliye-ui.test.tsx` · `GET /api/sinif/:kod/rontgen` (`server/routes/sinif.ts`) |
| "Yönetim paneli güvenli mi? CRUD var mı?" | "`#/panel` şartname 5.1.1 için eser/şehir/ünite ekleme-düzenleme yapar. Tüm yönetim uçları korumalı: scrypt parola, httpOnly çerez, kaba kuvvet kilidi. Parola repoda tutulmaz." | `README.md` Güvenlik, `src/features/panel/KorumaliPanel.tsx`, `server/routes/auth.ts`, `tests/guvenlik.test.ts` |
| "Erişilebilirlik gerçekten çalışıyor mu?" | "Çalışan DOM'da otomatik axe taraması ve jeton tabanlı kontrast testleri var; yüksek kontrast teması, %160 yazı, klavye akışı ve sessiz mod üründe. Gerçek tarayıcı provası finalde tekrarlanır." | `tests/erisilebilirlik-denetim.test.tsx`, `tests/tema-kontrast.test.ts`, `src/styles/tokens.css` |
| "PDF toplu TTS taahhüdü ne olacak?" | "Kullanıcı kararıyla **eklenmeyecek**; bu yüzden TTS iddiası kullanılmıyor. PDF'in kendi 'ses olmadan tam akış' taahhüdü ise karşılanıyor: dersler sessiz modda baştan sona bitiyor." | `docs/KARARLAR.md` §7, `README.md` "Bilinen sınırlar", `tests/dinle.test.tsx` |
| "Yeni şehir eklemek ne kadar sürer?" | "Yazılım maliyeti sıfır: şehir parametreli mimari. Seed şehirleri veriden gruplar, üniteleri üretir; panelden şehir/ünite/eser eklenir, kod değişmez." | `server/seed/run.ts`, `tests/akis.test.ts`, `README.md` |
| "Neden yalnız 3 şehir? Hedef kitle PDF'ten dar değil mi?" | "Kapsam, organizasyonun izin verdiği 3 şehir (Hatay, Konya, Bursa) ve öncelikli genç hedef. Ürün yetişkin kullanımını dışlamaz: arşiv, harita, iki dilli tarihçe yetişkine de açık." | `docs/KARARLAR.md` §11, §14 |
| "Sizde canlı yarışma vardı, ne oldu?" | "PDF'te beyan edilmediği için **çocuk akışından çıkarıldı**; kod tabanda duruyor ama bu sunumda ne gösteriliyor ne anlatılıyor." | `TODOLIST.md` 26 Ekim, `src/app/App.tsx` |
| "En zayıf noktanız ne?" | "Toplu ses dosyaları, Bursa 80 hedefi, 3 pilot okul ve arşiv referansı 6/57. Hiçbirini gizlemiyoruz; bunlar bu sunumda **yol haritası** olarak söylenir. Ürünün gücü, eksiği saklamaması." | `docs/PDF-FARK-GUNCEL.md` §4–§5, `docs/SAVUNMA-NOTLARI.md` §4 |

---

## 4. Riskler ve cevaplar

| Risk | Sunumdaki cevap / önlem |
|---|---|
| **Bursa 33 / PDF 80** | "3 ayda 33 eser işlendi; 80 hedefi ikinci dönem. Bu bir eksik değil, ölçülebilir bir hız." — `docs/PDF-FARK-GUNCEL.md` §5 |
| **Arşiv referansı 6/57, resmî künye 55/57** | "'Her değer arşiv numaralı' demiyoruz. **55/57 resmî envanter künyesi** var; eksik 2 çeşme envanterde yok; gerçek arşiv referansı 6/57." — `TODOLIST.md` 26 Ekim |
| **39 kaynak künyesi doğrulandı** | "39/39 manuel doğrulandı: 36 doğru, 1 teyit edildi, **2 künye düzeltildi** (Topraklık Hasan Efendi s. 272-273; Tatköy Merkez s. 298-299). Doğrulama yöntemi: resmî PDF'te başlık sayfası eşleşmesi." — `TODOLIST.md` 27 Ekim, `scripts/arsiv-hazirla.py` (`SAYFA_DUZELTMESI`) |
| **Gelir dağılımı 4/57** | "Çoğu vakfiyede oran belgelenemedi. Ekran bunu açıkça söyler; oran uydurmak ürünün varlık sebebine aykırı." — `VakifRontgeni.tsx` |
| **Admin parolası repoda yok** | Canlı admin girişine güvenilmez: demo ya **önceden açık oturumla** ya da **yerelde** `npm start` + bilinen parolayla yapılır. `deploy/ADMIN-PAROLA.txt` gizlidir, okunmaz. |
| **TTS yok** | İddia edilmiyor; cihaz sesi yalnız "Dinle" düğmesinde. "Ses olmadan tam akış" kanıtı gösterilir. — `docs/KARARLAR.md` §7 |
| **Erişilebilirlik iddiası abartılabilir** | "23 rota × 3 tema otomatik axe taraması + jeton kontrast testleri yeşil; gerçek tarayıcı/ekran okuyucu provası finalde." — `docs/ERISILEBILIRLIK.md` |
| **Harita internetsiz** | İl/ilçe sınırları gömülü GeoJSON; altlık gelmezse harita yine çizilir. — `src/features/harita/altlik.ts`, `tests/harita-altlik.test.ts` |
| **Jüri 'sadece 3 şehir' eleştirisi** | Şehir parametreli mimari canlı gösterilir; yazılım maliyeti 0 TL. — `server/seed/run.ts`, `tests/akis.test.ts` |

---

## 5. Konuşma kuralları — abartı denetimi

1. **Sayı = kanıt.** Her sayının arkasında bir dosya var; dosyayı açamıyorsan sayıyı söyleme.
   Yuvarlama yok ("yaklaşık 60 ders" değil, "57 ders").
2. **Zaman kipi:** Bitmiş iş **geniş zaman** ("57 ders var"), plan **gelecek/planlanan**
   ("80 eser hedefi", "TTS kullanıcı kararıyla eklenmeyecek").
3. **Yasak sıfatlar:** "devrim", "ilk", "en iyi", "kanıtlandı", "tamamlandı" (80 eser için).
   Yerine: "çalışıyor", "test edildi", "hedef", "belgelenen".
4. **Bilmiyorsan söyle:** *"Bu veri elimizde yok; nasıl tamamlanacağını şöyle planladık…"*
   Jüri eksik itirafına değil, **saklamaya** puan kırar.
5. **Karşılaştırma yapma:** rakip uygulamayı/kurumu kötüleme; yalnız "biletli müze modelinde
   vakıf eserinin gişesi yok" gibi yapısal farkı söyle.
6. **Kim ne yaptı?** Şartname 5.2.3: her üye kendi bölümünü anlatır —
   A: ders akışı, Vakıf Röntgeni, erişilebilirlik · B: veri, sınıf/tahta, gizlilik/güvenlik.
7. **Jüri "canlı göster" derse güvenli rotalar:** `#/yol` → ders, `#/defter`, `#/harita`,
   `#/arsiv`. **Yeni özellik uydurma** (canlı yarışma, sohbet, zaman tüneli açılmaz).
8. **Kapanış 3 cümlesi:** "57 ders canlıda. Eksiğimiz belli: Bursa'da 33/80, arşiv referansı
   6/57, pilot okul ölçümü — hepsi yol haritasında. En güçlü yanımız, **bilmediğimizi söyleyen**
   bir ürün olması." (kanıt: `VakifRontgeni.tsx`, `docs/PDF-FARK-GUNCEL.md`)

---

## 6. Kanıt dizini (gerçek dosya yolları)

- `README.md` — PDF→kod eşleme tablosu, güvenlik, gizlilik mimarisi, erişilebilirlik, bilinen sınırlar.
- `docs/PDF-FARK-GUNCEL.md` — PDF↔ürün farkı: 22 VAR / 23 KISMİ / 8 YOK, canlı doğrulama tablosu (§9: 57/57/3/5/633).
- `docs/KARARLAR.md` — §2 kalp yok · §5 PGlite/PostGIS/MapLibre · §7 ses · §8 gelir durumu · §11 şehir · §14 hedef kitle · §15 canlı yarışma riski · §17 Köstik kaldırıldı.
- `docs/DURUM.md` — 24 Ekim notu: Bursa 33 · Konya 12 · Hatay 12, 57 ders, 228 egzersiz, 303 fotoğraf.
- `TODOLIST.md` — 26 Ekim sadeleştirmesi, 55/57 künye, 27 Ekim doğrulaması (66 dosya / 695 test, sınıf külliyesi, WCAG kanıtı, 39 künye doğrulaması).
- `src/features/ders/VakifRontgeni.tsx` — belge yoksa çubuk çizilmez; gelir/gider ayrı listeler.
- `src/features/ders/DinleDugmesi.tsx`, `src/lib/ses.ts` — yalnız cihaz sesi.
- `src/lib/arsivKaydi.ts` — yalnız gerçek arşiv referansı gösterilir.
- `src/features/merkez/KesfetSayfasi.tsx` — Keşfet'in 3 kapısı.
- `src/features/ogretmen/SinifDetayi.tsx`, `OgretmenPaneli.tsx` — "Tahtada aç", gizlilik notu, sayaçlar.
- `server/repo/sinif.ts`, `server/routes/sinif.ts` — anonim sayaç sözleşmesi, öğretmen yetkisi.
- `server/routes/auth.ts`, `README.md` Güvenlik — giriş, oturum, kaba kuvvet.
- `docs/ERISILEBILIRLIK.md` + `docs/erisilebilirlik-raporu.json` — 23 rota × 3 tema otomatik axe taraması, jeton kontrast testi, dürüst sınırlar.
- `src/features/ogretmen/SinifRontgenSayfasi.tsx`, `src/features/ogretmen/SinifDetayi.tsx` — "Sınıf külliyesi" hedefi + tahtada birlikte Vakıf Röntgeni.
- `shared/kulliyeler.ts` — yalnız kaynakta belgelenmiş külliye bağları (Yeşil 4 ders, Muradiye 3 ders).
- `server/repo/sinif.ts` (`kulliyeleriHesapla`, `sinifRontgeni`), `server/routes/sinif.ts` — anonim sayaç + sınıf Röntgeni ucu.
- `tests/kulliye.test.ts`, `tests/sinif-rontgen.test.tsx`, `tests/sinif-kulliye-ui.test.tsx`, `tests/erisilebilirlik-tam-tarama.test.tsx` — yeni özelliklerin çalıştırılabilir kanıtı.
- `data/research/*.json` — her tarihî bilginin kaynak künyesi (ör. Habib-i Neccar, 1550 evkaf defteri).
- `scripts/soru-taslak.ts`, `npm run soru:taslak` — AI yalnız taslak; insan onayı.
