# TODOLIST — Kök Avı: ne yapıldı, ne kaldı

> **Takımın ortak ilerleme listesi.** İnsan ya da AI ajanı fark etmez: işe başlamadan önce bunu oku.
> Son güncelleme: 18 Ekim 2026 · Final: 7–8 Kasım 2026
> Son çalışma raporu: [docs/CALISMA-RAPORU-2026-10-18.md](docs/CALISMA-RAPORU-2026-10-18.md) (18 Ekim'de yapılan her şey).
>
> **Kural:** Bir işi bitiren, kutusunu `[x]` yapar ve aynı commit'te bu dosyayı günceller.
> Bir işe başlayan, satırın sonuna adını yazar (`— 🔧 Ad`). Böylece aynı işe iki kişi girmez.

Durum işaretleri: `[x]` bitti · `[ ]` yapılacak · `🔧 Ad` üzerinde çalışılıyor · `⏳` birinden karar ya da veri bekliyor

---

## Aşama 1: Başvuru PDF'ini tamamla

Takım planından ([docs/plan/ILERLEYIS.md](https://github.com/BatuhanbasSwe/KOKAVI/blob/eksikler/docs/plan/ILERLEYIS.md), `eksikler` dalı). Kural: Aşama 1 bitmeden yeni özelliğe geçilmez.

- [x] **Dinle ve seç egzersizi.** Ses kendiliğinden çalar, altyazı açılıp kapanabilir. Sessiz modda "Eseri tanı"ya düşer. Ekran okuyucuyla da çözülebilir. Test: `tests/dinle-sec.test.tsx`
- [ ] **Toplu TTS ses dosyaları.** ⏳ Motor kararını Batuhan verecek. Piper ve Edge yeterince insan gibi bulunmadı. Adaylar: OpenAI gpt-4o-mini-tts, Google Chirp 3 HD, ElevenLabs, insan kaydı. Seslendirilecek metin: 57 ders, 285 parça, yaklaşık 100 dakika. Bitince ses dosyaları `public/` altına girer ve PWA önbelleğine eklenir. — Batuhan
- [x] **Erişilebilirlik doğrulaması.** Gerçek tarayıcıda 22 rota × 3 tema (koyu, açık, yüksek kontrast) axe ile tarandı: 0 ihlal. 360 px ekranda %160 yazı boyutunda taşma yok. Sessiz modla ders baştan sona bitiyor. Test: `tests/erisilebilir-ders-akisi.test.tsx`, `tests/tema-kontrast.test.ts`
- [x] **AI soru üretimi hattı.** Akış şöyle olmalı: içerik → AI taslak soru → insan onayı → yayın. İnsan onayı olmadan hiçbir soru yayına girmemeli. ✅ `npm run soru:taslak` → `data/taslak-sorular/`, `--yayinla` yalnızca adıyla onaylananları alır.
- [x] **Elmas harcama + veli onayı (simüle).** Çarşı'da avatar, defter teması ve ek ipucu alınır. Her harcamadan önce yazıyla bir çarpma sorusu sorulur; onay 10 dakika geçerlidir. Ayarlar'dan kapatılabilir ama kapatmak da onay ister. "Ek sefer" ifadesinin yorumu: [docs/KARARLAR.md](docs/KARARLAR.md) §4. Test: `tests/veli-onayi.test.ts`, `tests/veli-kapisi.test.tsx`
- [x] **Belge düzeltmeleri.** `docs/DEMO.md`'de şehirler (Hatay, Konya, Bursa), Hatay eser sayısı (12) ve erişilebilirlik kapsamı güncellendi. `docs/KARARLAR.md` §5'e PostgreSQL yerine PGlite, PostGIS yerine cihazda mesafe ve gömülü GeoJSON gerekçesi yazıldı. (Demo senaryosunun baştan yazımı aşağıda ayrı madde.)
- [x] **npm audit açıkları.** Sunucu paketi (`@fastify/static`) dahil düzeltildi. `npm audit` sonucu: 0 açık.
  - ⚠️ 18 Ekim: bu güncellemeden sonra Vercel'deki canlı API her istekte çöküyordu (`ERR_REQUIRE_ESM`): `@fastify/static` 10, ES modülü olan `content-disposition` 3'ü `require()` ile yüklüyor; yerel Node buna izin verdiği için görünmedi. Düzeltme: `package.json` `overrides` ile `content-disposition` 2.0.1 (aynı API, CommonJS) ve `@fastify/static` yalnızca gerektiğinde yükleniyor. Test: `tests/vercel-paketi.test.ts`.

## Başvuruya göre ek tespitler

Aykuutt'un tespitleri (`pdf-eksikleri-ve-guvenlıkuyarıları` dalı).

- [ ] **Bursa eser sayısı.** Başvuruda 80 eser hedefleniyor; veride şu an 33 eser var. ⏳ Vakıf Katılım PDF'lerine bağlı.
- [ ] **Sınıfça külliye akışı.** Sınıfın külliyeyi birlikte tamamlaması ve Vakıf Röntgeni'ni beraber görmesi henüz yok.
- [ ] **Vakfiye arşiv numaraları.** 57 eserin yalnızca 13'ünde arşiv numarası var. ⏳ Kaynağa bağlı; numara uydurulmaz.
- [x] **npm audit uyarıları.** Yukarıdaki Aşama 1 maddesiyle kapandı.

## Aşama 2: PDF'te olmayan özellikler için kararlar

- [x] **Başarım rozetleri kalsın.** Batuhan'ın kararı, 17 Ekim. iamch3f "PDF ile çelişiyor" demişti.
- [ ] **Günün Eseri.** 57 ipucu cümlesini bir insan okuyup onaylamalı.
- [ ] **Kombo, ses efekti, titreşim, konfeti.** Sadeleştirilecek mi? Takım karar verecek. (Ses ve titreşim zaten sessiz moda uyuyor.)
- [ ] **Zaman tüneli ve zamana göre öğrenme.** Öğrenme yolunu bulandırıyor mu? Takım konuşacak.

## Tasarım ve farklılaşma (bitti)

Ayrıntılar [docs/GECE-RAPORU.md](docs/GECE-RAPORU.md) §21–24 ve [DESIGN.md](DESIGN.md) dosyalarında.

- [x] **Sıfırdan yeniden tasarım.**
  - Görünüm: tam siyah koyu tema, tek vurgu rengi safran, Phosphor ikonlar.
  - Gezinme: 4 sekme (Bugün · Yol · Keşfet · Defter) ve Profil.
  - Ekranlar: Bugün sayfasında fotoğraflı mozaik, Yol'da fotoğraf patikası, Defter'de sekmeler (Pullar, Rozetler, Seri, Belgeler).
  - Açık tema ve yüksek kontrast teması da korunuyor.
- [x] **Köstik maskotu.** Karakter sayfasındaki çizimle aynı; 4 ifadesi var. PWA ikonu da Köstik.
- [x] **Yol ekranı.**
  - Bugün'deki "Başla" doğrudan derse değil, Yol'daki sıradaki durağa götürür.
  - Kaydırırken arka plan, ekrandaki eserin rengini alır.
- [x] **Keşif rotası yenilendi.** Gerçek sokak haritası üzerinde çalışır. Yakın eserler gruplanır, uzun rotalar bölümlere ayrılır, yürüyüş tarifi için OSM'e bağlantı verir.
- [x] **Süzgeç paneli.** Arşiv ve harita süzgeçleri açılır kapanır panelde.
- [x] **Harita onarımı ve Google benzeri görünüm (18 Ekim).** MapLibre 6'ya geçişten beri worker yüklenemiyordu, harita boş çiziliyordu (yayındaki sürümde de); düzeltildi. Vakıf ağı haritası ve keşif rotası artık OpenFreeMap "Liberty" altlığıyla: Türkçe sokak, mahalle ve yer adları. İnternet yoksa gömülü il/ilçe haritasına düşer. Kod: `src/lib/maplibreYukle.ts`, `src/features/harita/altlik.ts`.
- [x] **Kaynaklı soru-cevap (Köstik sohbeti).**
  - Her ekrandan açılan yüzen bir sohbet penceresi; derste ve canlı oyunda gizli.
  - Cevaplar yalnızca kaynak metinlerden üretilir ve her cümlede kaynak numarası olur. Kaynaksız cümle silinir, gerekirse cevap "bilmiyorum"a düşer.
  - Sorudaki kişisel veri gizlenir ve soru günlüğe yazılmaz.
  - Kod: `server/sor/`, `POST /api/sor`.
- [x] **Kavram soruları (sözlük).** "Vakıf nedir?", "Akar ne demek?" gibi sorular için derslerin 112 kavram açıklaması korpusta; tanım sorularında öne alınıyor. Kod: `server/sor/sozluk.ts`. Temel 6 kavramda TDV İslâm Ansiklopedisi künyesi de var (`data/sozluk-kaynaklari.json`, her madde okunup doğrulandı).
- [x] **Prompt injection kalkanı ve toplu sorular.** Saldırı kalıpları modele gitmez, alakasız sorular kibarca geri çevrilir, cevaptaki her yıl kaynakta olmalı, sızıntı denetimi var. "Bursa'daki en eski 3 eser" gibi sıralama soruları cevaplanıyor. Gerekçe: [docs/KARARLAR.md](docs/KARARLAR.md) §17. Test: `tests/sor-kalkan.test.ts`
- [x] **Hâlâ yaşayan vakıflar.** Bugün hâlâ işleyen 17 eser var; her birinde kaynak metinden birebir alıntı bulunur. Rota: `#/kesfet/yasayan`. Ders ve arşiv sayfasında "bugün hâlâ…" rozeti çıkar.
- [x] **Sahada mühür ("Buradayım").** Konum bir kez ve yalnızca cihazda ölçülür. Esere 150 m içindeysen deftere damga basılır. Konum saklanmaz.
- [x] **Daha önce bitenler:** canlı sınıf yarışması (Kahoot tarzı), sınıf raporu, Günün Eseri, vakıf ağı haritası, Meraklısına arşivi, şehir sertifikası, Hayrat mı Akar mı?, Hatalarımı çalış, seri takvimi. Ayrıntılar: GECE-RAPORU §1–20.

## Açık işler ve bekleyenler

- [ ] **Soru-cevap için API anahtarı eklemek.** ⏳ Batuhan. Anahtar olmadan Köstik sohbeti "şu an kapalı" der. Kod iki modeli de destekliyor: `GEMINI_API_KEY` varsa Gemini, yoksa `ANTHROPIC_API_KEY` ile Claude.
  - ⚠️ Gemini API şartları 18 yaş altına yönelik uygulamalarda kullanımı yasaklıyor; ücretsiz kotada veriler Google'ın modellerini eğitmekte kullanılıyor. Hangisinin kullanılacağına takım karar vermeli.
  - Yerelde: `.env` dosyasına anahtar satırı yazılır (`.env.example` dosyasına bak). `.env.example`'a değil: o dosya git'e girer.
  - 18 Ekim: Batuhan'ın makinesinde Gemini anahtarıyla uçtan uca denendi; kaynaklı cevaplar doğru geliyor. Vercel'e henüz eklenmedi.
  - 18 Ekim (Abdullah): Gemini anahtarı yok. Karar bekleyene kadar Köstik sohbeti kapalı kalır ("şu an kapalı" der); demo bu haliyle güvenli.
  - ⚠️ Gemini ücretsiz kotası model başına günde yalnızca 20 istek (18 Ekim'de iki model için de doldu). Finalde bir sınıf birkaç dakikada tüketir: ücretli kota ya da Claude gerekir.
  - Vercel'de: Settings → Environment Variables.
  - Anahtar asla koda, commit'e ya da sohbete yazılmaz.
- [ ] **Sahada mührü telefonda denemek.** Konum yalnızca https üzerinde çalışır; Vercel sürümünde denenmeli.
- [ ] **PDF'lerden resmi içerik aktarmak.** Vakıf Katılım PDF'lerindeki metin ve görseller `data/` dosyalarına aktarılacak. Eser listesi yalnızca PDF'teki eserlerle sınırlanacak.
- [ ] **Admin ve öğretmen paneli.** Şu an `#/panel` ve `#/ogretmen` rotaları var ve Profil'den açılıyor. Ayrı giriş noktası (`/admin`, `/ogretmen`) isteniyor mu? Takım karar verecek.
- [ ] **Arşiv eserlerine konum.** Haritada fotoğraflı işaret yalnızca 57 ders eserinde var; arşivdeki diğer eserlerin (`public/arsiv/liste.json`) koordinatı yok. Bu ilçeler haritada "· arşiv" balonuyla gösteriliyor. Koordinatlar Vakıf Katılım PDF'lerinden ya da OpenStreetMap'ten kaynaklı eklenebilir.
- [x] **Canlı yarışma için kalıcı oda.** Odalar `server/canli/depo.ts` üzerinden ortak depoda: Vercel'de Upstash Redis (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`), yerelde bellek. Sürümlü yazma (CAS) ile eşzamanlı cevap kaybolmaz. Test: `tests/canli-cok-ornek.test.ts`.
- [ ] **İçerik okuması.** 57 dersin metinlerini bir insan 10–12 yaş diline göre okumalı.
- [ ] **Hatay teyidi.** Deprem sonrası durumu "doğrulanmadı" olarak işaretli eserler için mentörden teyit istenmeli.
- [ ] **Demo senaryosu.** `docs/DEMO.md` yeni akışa göre baştan yazılmalı (Senaryo A + B, 3 dakika).
- [ ] **Dağıtım kararı.** PWA olarak mı kalacak, APK'ya mı çevrilecek? Final öncesi netleşmeli.

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

- Depo: `github.com/BatuhanbasSwe/KOKAVI`. Artık ZIP yok; her şey git üzerinden.
- Son doğrulama (18 Ekim): 48 test dosyası, 461 test yeşil, build temiz.
- Kurallar ve dokunulmaması gereken dosyalar: [CLAUDE.md](CLAUDE.md).
- Tasarım dili: [DESIGN.md](DESIGN.md) · Kararların gerekçeleri: [docs/KARARLAR.md](docs/KARARLAR.md) · API: [docs/API.md](docs/API.md)
- Tasarım ve özellik planları: [docs/superpowers/specs/](docs/superpowers/specs/) ve [docs/superpowers/plans/](docs/superpowers/plans/)
