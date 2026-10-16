# DURUM — Nerede kaldık, ne kaldı

> **Bu belge yeni bir oturumda işe devam etmek için yazıldı.**
> Son güncelleme: 12 Ekim 2026 · Durum: **çalışır ve doğrulanmış MVP + güvenlik + veri**

---

## 1. Tek cümlede durum

`mvp/` klasöründe **çalışan, test edilmiş, belgelenmiş** bir ürün var:
`npm install && npm run seed && npm run dev` → **http://localhost:5173**

**228 test geçiyor (12 paket) · tip kontrolü temiz · üretim derlemesi başarılı.**

---

## 2. Sayılarla mevcut durum

| Ölçüt | Değer |
|---|---|
| Kaynak dosya / satır | 83+ dosya / ~16.000 satır |
| Test | **228** (12 paket) |
| Şehir | **5** — Bursa 12, Hatay 6, Konya 3, Kütahya 2, İzmir 2 |
| Ünite / Ders | 7 / **25 ders** (her ders 5 adım + 4 egzersiz) |
| Eser türü | **11** (Cami, Medrese, Hamam, Han, Çeşme, Türbe, Köprü, İmaret, Mescit, Külliye, Kervansaray) |
| Kaynak atfı | **94** (eser başına ~3,8) |
| Gelir dağılımı belgeli | **4** eser |
| İki dilli tarihçe (TR+EN) | **19 / 25** ← Hatay'ın 6'sı eksik |
| Sergi | 3 sergi, 21 eser bağlantısı |
| Vakfiye arşiv no | 9 eser |
| axe-core erişilebilirlik | **6 sayfada 0 ihlal** |
| Güvenlik testi | 67 |

---

## 3. 🔴 Kalan işler

### 3.1 Hatay'ın 6 eserinde İngilizce tarihçe yok

**Durum:** `data/tarihce.json` 19 eser içeriyor (Hatay eklenmeden önce üretildi).
Hatay'ın 6 eseri için `adEn`, `tarihce`, `tarihceEn` boş.

**Neden önemli:** Vakıf Katılım Bilgi Notu açıkça *"eserlerin tarihçeleri Türkçe ve
İngilizce olarak hazırlanmakta"* diyor; veri alanları arasında *"Türkçe ve
İngilizce metinler"* sayılıyor. Envanter kitapları iki dilli basılıyor.

**Nasıl yapılır:** `data/research/hatay.json`'daki 6 eser için
`data/tarihce.json`'a kayıt ekle. Format mevcut 19 kayıtla aynı:

```json
{ "eserId": "hatay-habib-i-neccar-camii-ve-kulliyesi",
  "adEn": "Habib al-Najjar Mosque and Complex",
  "tarihce": "…5 cümle Türkçe…",
  "tarihceEn": "…5 sentences English…" }
```

Sonra `npm run seed`. **Kod değişikliği gerekmez** — seed otomatik okur.

**Alt ajan için hazır prompt:** "data/research/hatay.json'daki 6 eser için
data/tarihce.json'a adEn + tarihce (TR) + tarihceEn (EN) ekle. Yalnızca
araştırma dosyasındaki bilgileri kullan, uydurma. Deprem bağlamını koru."

---

### 3.2 Fotoğraf galerileri — şema hazır, görsel yok

**Durum:** `work_photo` tablosu ve `EserFotograf` tipi kurulu; arayüz fotoğraf
varsa galeriyi gösteriyor. **Hiç fotoğraf yok** çünkü organizasyon şöyle dedi:

> *"Envanter dokümanları ve yüksek çözünürlüklü fotoğrafların paylaşımı için
> Vakıf Katılım'dan dönüş bekliyoruz."*

**Yapılacak:** Görseller gelince `work_photo` tablosuna ekle. `alt_metin`
**NOT NULL** — her fotoğrafın metin karşılığı zorunlu (WCAG 1.1.1).

---

### 3.3 Seslendirme (TTS) — ✅ tarayıcı sesiyle yapıldı (13 Ekim)

"Dinle" düğmesi Web Speech API ile Türkçe okur (`src/lib/ses.ts`). Aşağıdaki not,
toplu üretilmiş ses dosyalarına geçiş içindir.

PDF "toplu Türkçe TTS" taahhüdü veriyor. MVP'de yok. Egzersizlerin tamamı ses
olmadan çalışır (PDF'in kendi "sessiz mod" taahhüdü). TTS eklendiğinde
`eser-tani` egzersizi sesli ipucuyla da sunulabilir — **veri şeması değişmez.**

---

### 3.4 Payas vakfiyesi (tek açık araştırma ucu)

Sokullu Mehmed Paşa Külliyesi'nin (Payas) gelir dağılımı, tam metni erişilemeyen
bir lisansüstü tezde. **YÖK Tez Merkezi erişimi gerekir.**

---

### 3.5 UI/UX yeniden tasarımı — ✅ 13 Ekim'de yapıldı (bkz. `UI-DEVIR.md` §8)

Kullanıcı bu işi Claude/Anthropic modellerine devredecek.
**Devir sözleşmesi: `docs/UI-DEVIR.md`** — hangi dosyalar serbest, hangilerine
dokunulmaz, bozulmaması gereken 10 erişilebilirlik kuralı, testleri kırmamak
için ne yapmalı.

---

## 4. Bu oturumda çözülen kritik sorunlar

Bunlar **tekrar açılmamalı** — çözümler testlerle korunuyor.

| Sorun | Çözüm | Test |
|---|---|---|
| Yönetim uçları **tamamen korumasızdı** | `yoneticiGerekli` kancası + scrypt + oturum | `guvenlik.test.ts` (67) |
| **Çıkış düğmesi bozuktu** (gövdesiz POST 400) | Boş gövde ayrıştırıcı + regresyon testi | `guvenlik.test.ts` §9 |
| **İlerleme yarış durumu** (yükleme efekti tamamlamayı siliyordu) | `useState` başlatıcısına taşındı | `sinif-gizlilik.test.tsx` |
| **Liste ucu fotoğraf/sergi döndürmüyordu** | Toplu JOIN (N+1 yok) | `bilgi-notu.test.ts` |
| **Gelir kalemleri %200 topluyordu** (Habib-i Neccar) | `tip` alanı: `gelir` / `gider` ayrımı | `bilgi-notu.test.ts` |
| **`tip` alanı API'de sessizce düşüyordu** | Route doğrulamasına beyaz liste | `bilgi-notu.test.ts` |
| Türkçe `İ` JS regex `i` bayrağıyla eşleşmiyor | Türkçe özel harf içermeyen parça arama | `kabuk.test.tsx` |
| `#/yol` rotası tanınmıyordu | Router'a `case 'yol'` | `kabuk.test.tsx` |
| Slug mantığı iki yerde kopyalanmıştı | `shared/slug.ts` tek kaynak | `icerik.test.ts` |
| Seed iki PGlite örneği açıyordu | Tek bağlantı | manuel doğrulama |

---

## 5. Nasıl çalıştırılır

```bash
cd mvp
npm install

# Not: esbuild kurulum betiği engellenmişse `npm approve-scripts` gerekir.

npm run seed      # veritabanını kur ve içeriği yükle
npm run dev       # API :8787 + arayüz :5173

npm run dogrula   # tip kontrolü + 214 test + build (tek komut)
npm start         # üretim: API dist/ içeriğini de servis eder
```

> ### ⚠️ Bilinen ortam sorunu — arka plan iş sarmalayıcısı
>
> **Sunucuyu arka plan işi (background job) olarak başlatmak bu makinede
> güvenilmez.** İş bir süre çalıştıktan sonra şu hatayla düşüyor:
>
> ```
> subprocess-local: Windows Job runner exited with exit code 1073807364
> before proving its managed range empty
> [status: killed, killed before exit]
> ```
>
> **Bu bir kod hatası DEĞİL** — aynı komut doğrudan çalıştırıldığında sunucu
> sorunsuz başlıyor ve istekleri yanıtlıyor (birden fazla kez doğrulandı).
> Sorun harness'ın Windows iş yöneticisinde.
>
> **Çözüm:** Sunucuyu **normal bir terminal penceresinde** çalıştırın:
>
> ```bash
> cd "D:\kök kod hackathon\mvp"
> npm run dev
> ```
>
> Testler ve build etkilenmez — yalnızca uzun süre ayakta kalması gereken
> süreçler (sunucu) için geçerlidir. Kısa komutlar arka planda sorunsuz çalışır.

**Yönetici hesabı:** `admin@kokavi.local` · parola seed çıktısında bir kez
gösterilir (rastgele üretilir). Kalıcı parola: `KOKAVI_ADMIN_PAROLA` ortam değişkeni.
**Seed yönetici hesabını silmez** — auth tabloları içerik tablolarından ayrıdır.

---

## 6. Mimari özet

```
mvp/
├── shared/          types.ts (tek sözleşme) · slug.ts
├── server/
│   ├── db/          schema.sql (içerik) · auth-schema.sql (kalıcı)
│   ├── auth/        parola (scrypt) · oturum · koruma kancaları
│   ├── repo/        eser · ders · yol · sinif · sergi
│   ├── routes/      public · admin 🔒 · auth · sinif
│   └── seed/run.ts  araştırma + içerik + sergi + tarihçe → DB
├── src/
│   ├── app/         kabuk · DurumSaglayici · HataSiniri
│   ├── features/    yol · ders · defter · harita · sinif · ayarlar · ogretmen · panel
│   ├── lib/         api · ilerleme · oturum · erisilebilirlik · yonlendirme
│   └── styles/      tokens.css (4 tema × 4 palet) · global.css
├── data/            research/ · content/ · tarihce.json · sergiler.json
├── tests/           11 paket, 214 test
└── docs/            aşağıya bakın
```

**Veritabanı:** PGlite (WASM'da gerçek PostgreSQL). Üretimde `pg` sürücüsüne
geçiş `server/db/index.ts` içinde tek dosyada yapılır.

---

## 7. Belgeler

| Belge | Ne zaman okunur |
|---|---|
| `README.md` | Kurulum, mimari, PDF→kod eşleme tablosu |
| `docs/KARARLAR.md` | **"Neden böyle yaptınız?"** — 14 belirsizliğin çözümü |
| `docs/API.md` | Uç referansı, alan şemaları, hata kodları |
| `docs/VERI.md` | **"Bu bilgiler nereden geliyor?"** — kaynakça + kalite raporu |
| `docs/UI-DEVIR.md` | Arayüz yeniden tasarlanırken (bozulmaması gerekenler) |
| `docs/DEMO.md` | 4 dakikalık final demo senaryosu + jüri Q&A |
| `docs/DURUM.md` | **Bu belge** — devir teslim |

---

## 8. Jüri karşısında en güçlü 5 kart

1. **Vakıf Röntgeni gerçek belgeyle çalışıyor.** Yeşilcami'nin gelir kalemlerinde
   `Harir Hanı (İpek Hanı) rüsumu %2,9` satırı var — hanın kirası külliyeyi
   finanse ediyor. Ürünün tezi, 19. yy vakıf muhasebe defterinde gerçekten duruyor.

2. **Dürüstlük ilkesi ürüne gömülü ve 4 kez işledi.** Karatay'ın oranları toplamı
   %110 (kaynak çelişkisi) → uygulama çubuk çizmiyor, hisse listesi gösteriyor.
   Yeşilcami'nin oranları 1419 vakfiyesinin şartı **değil** → metin bunu söylüyor.
   21 eserde oran yok → *"belgelenememiştir"*. Habib-i Neccar'da gelir/gider
   karışmıştı → `tip` alanıyla ayrıldı.

3. **Hatay anı.** Envanter fotoğrafları **depremden bir gün önce (5 Şubat 2023)**
   sergilendi; bir gün sonra bina yıkıldı. Uygulama eserin deprem öncesi son
   sistematik kaydını gösteriyor.

4. **Erişilebilirlik ölçülmüş.** axe-core ile 6 sayfada **0 ihlal** — iddia değil,
   test. 4 tema × 4 renk körlüğü paleti × ölçeklenebilir yazı, hepsi çalışıyor.

5. **Gizlilik mimari olarak kanıtlanabilir.** İlerleme sunucuya hiç gitmiyor;
   sınıf kaydında yalnızca `{kod, dersId}` gönderiliyor — test ediliyor.

---

## 9. Açık riskler

| Risk | Durum |
|---|---|
| **Hedef kitle dar** — Bilgi Notu "geniş kamuoyu" diyor, ürün 10-12 yaş | Cevap `docs/KARARLAR.md` §14: Bilgi Notu "özellikle gençlerle" diyor ve ürün yetişkin kullanımını dışlamıyor |
| **Kütahya/İzmir izin verilen listede değil** | Cevap `docs/KARARLAR.md` §11: duyuru izin cümlesi, yasak değil; ikisi de envanter projesinin parçası |
| **TTS yok** | PDF taahhüdü; ayrı iş. Egzersizler ses olmadan tam çalışıyor |
| **PostGIS kullanılmıyor** | Konum tabanlı sorgu üründe yok; koordinatlar düz kolonlarda, geçişe hazır |
| **Payas vakfiyesi bulunamadı** | YÖK Tez Merkezi erişimi gerekir |

---

## 10. Yeni oturumda ilk 3 komut

```bash
cd "D:\kök kod hackathon\mvp"
npm run dogrula          # her şey çalışıyor mu?
npm run seed && npm run dev
```

Sonra: **§3.1 Hatay İngilizce tarihçeleri** — kalan tek içerik işi.
