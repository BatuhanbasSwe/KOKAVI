# UI/UX Devir Teslimi

> Bu belge, arayüzü yeniden tasarlayacak ekibe/ajana verilir.
> **Amaç:** yeni arayüz, çalışan backend'i ve doğrulanmış erişilebilirlik
> sözleşmesini BOZMASIN.

---

## 1. Sizin alanınız / dokunmayın

| Alan | Yol | Kural |
|---|---|---|
| **Serbestçe değiştirin** | `src/features/**/*.tsx`, `src/features/**/*.css`, `src/app/app.css`, `src/styles/*.css` | Görsel katman |
| **Sözleşme — dikkatli** | `src/app/App.tsx` | Rota ve kabuk. Yapısı korunmalı (atlama bağlantısı, `aria-current`, odak yönetimi) |
| **DOKUNMAYIN** | `server/**`, `shared/**`, `src/lib/api.ts`, `src/lib/ilerleme.ts`, `src/lib/oturum.ts` | İş mantığı ve API sözleşmesi. Değişirse testler kırılır |

`src/lib/*` içindeki fonksiyonlar **saf mantıktır** ve testlerle korunur (toplam 228 test).
Arayüz değişirken bunlar aynı kalmalı.

---

## 2. API sözleşmesi (hazır, test edilmiş)

Tüm istekler `credentials: 'include'` kullanır (oturum httpOnly çerezde).

### Genel okuma — kimlik gerekmez

| Metot | Yol | Dönüş |
|---|---|---|
| GET | `/api/saglik` | `{durum, zaman}` |
| GET | `/api/yol` | `{sehirler: [{sehirId, ad, sira, uniteler: [{uniteId, ad, sira, dersler: [...]}]}]}` |
| GET | `/api/sehirler` | `Sehir[]` |
| GET | `/api/uniteler?sehir=<id>` | `Unite[]` |
| GET | `/api/kulliyeler` | `Kulliye[]` |
| GET | `/api/eserler?hepsi=1` | `Eser[]` |
| GET | `/api/eserler/:id` | `Eser` |
| GET | `/api/dersler/:id` | `Ders` (5 adım + egzersizler) |

**Kritik:** `/api/yol` **ilerleme bilgisi döndürmez.** Kilit/tamamlanma durumu
`src/lib/ilerleme.ts → yolHesapla()` ile cihazda hesaplanır. Bu bir gizlilik
kararıdır, değiştirilemez.

### Oturum

| Metot | Yol | Gövde | Not |
|---|---|---|---|
| POST | `/api/auth/giris` | `{email, parola}` | 200 + çerez · 401 · 429 (kilit) |
| POST | `/api/auth/cikis` | — | **Gövdesiz çağrılır** (regresyon testi var) |
| GET | `/api/auth/ben` | — | 200 `{kullanici}` · 401 |
| POST | `/api/auth/parola` | `{yeniParola}` | Tüm oturumları düşürür |

### Yönetim (admin) · Öğretmen · Sınıf

Tam liste ve alan şemaları: `README.md` + `shared/types.ts`.
Uçlar: `/api/yonetim/*` (admin) · `/api/ogretmen/*` (öğretmen) · `/api/sinif/*` (herkese açık sayaç).

---

## 3. Erişilebilirlik sözleşmesi — **BOZULMAMALI**

Bu maddeler `axe-core` ile 6 sayfada **0 ihlal** verecek şekilde doğrulanmıştır.

### Zorunlu kurallar

1. **Renk asla tek başına anlam taşımaz.** Doğru/yanlış için simge + metin;
   çubuklar için desen (`--d1`…`--d4`) + etiket.
2. **Her etkileşim `<button>` veya `<a>`.** `div`e `onClick` yazmak yasak.
3. **Görünür odak.** `:focus-visible` jetonu (`--odak`) korunmalı. Yüksek
   kontrast temasında ek halka var.
4. **Dokunma hedefi ≥ 44px.** `.dugme`, `.secenek`, `.gezinme__baglanti` bunu sağlar.
5. **Her form alanında görünür `<label htmlFor>`.** Placeholder etiket yerine geçmez.
6. **Hata metni** `role="alert"` + `aria-describedby` + `aria-invalid`.
7. **Adım/sayfa değişiminde odak taşınır** ve `aria-live` ile duyurulur.
8. **İçeriğe atla bağlantısı** (`#ana-icerik`) korunmalı.
9. **`<html lang="tr">`** — `App.tsx` bunu garanti eder.
10. **Harita gibi görsel öğelerin metin eşdeğeri** olmalı (WCAG 1.1.1).

### Tema jetonları — kullanın, yeniden icat etmeyin

`src/styles/tokens.css` şunları zaten tanımlar:

- Temalar: `[data-tema="acik|koyu|yuksek-kontrast"]`
- Renk körlüğü paletleri: `[data-renk-korlugu="protanopi|döteranopi|tritanopi"]` (Okabe-Ito)
- Yazı ölçeği: `--yazi-olcek` (0.85–1.60, kullanıcı ayarı)
- Hareket azaltma: `prefers-reduced-motion` + `[data-hareket-azalt]`
- Kategorik seriler: `--seri-1` … `--seri-6`

**Yeni renk eklemeyin**, jeton ekleyin (3 tema). `tests/tema-kontrast.test.ts` her temada metin/zemin
oranlarını ölçer ve turkuaz/yeşil vurgunun geri gelmesini engeller. Tasarım kuralları: `DESIGN.md`.

### Türkçe tuzağı (yaşanmış hata)

JS regex `i` bayrağı Türkçe `İ` ile eşleşmez (`'İ'.toLowerCase()` iki kod noktası üretir).
Metin aramasında `/içeriğe atla/i` **çalışmaz**. Bunun yerine Türkçe özel harf
içermeyen parça arayın (`/atla/i`) veya metni normalize edin.

---

## 4. Testleri kırmayın

```bash
npm run dogrula     # tip kontrolü + 228 test + build
```

| Paket | Neyi korur |
|---|---|
| `tests/ilerleme.test.ts` (21) | Kilit sırası, seri, seviye, elmas mantığı |
| `tests/erisilebilirlik.test.ts` (13) | Tema/palet/yazı ayarlarının DOM'a uygulanması |
| `tests/erisilebilirlik-denetim.test.tsx` (6) | **axe-core ile 0 ihlal** |
| `tests/kabuk.test.tsx` (9) | Atlama bağlantısı, nav, `aria-current`, dil |
| `tests/api.test.ts` (15) | CRUD + doğrulama + gizlilik |
| `tests/akis.test.ts` (9) | Yeni şehir→ünite→eser→ders zinciri |
| `tests/guvenlik.test.ts` (57) | Yetki, parola, kaba kuvvet, enjeksiyon, başlıklar |
| `tests/icerik.test.ts` (34) | Ders içeriği sözleşmesi |

### Arayüz değişince kırılabilecek testler ve ne yapmalı

- **`tests/kabuk.test.tsx`** — gezinme öğe sayısını (5: Yol, Defter, Harita, Sınıfım, Ayarlar) ve yetişkin gezinmesini kontrol eder.
  Gezinmeyi değiştirirseniz bu testi güncelleyin; atlama bağlantısı ve
  `aria-current` kontrollerini **silmeyin**.
- **`tests/erisilebilirlik-denetim.test.tsx`** — sayfa başına bir `<h1>`/`<h2>`
  bekler. Yeni sayfa eklerseniz bir tarama ekleyin.

---

## 5. Sayfa envanteri

| Rota | Bileşen | Durum |
|---|---|---|
| `#/yol` | `features/yol/YolSayfasi.tsx` | Öğrenme yolu, kilitler, seviye |
| `#/ders/:id` | `features/ders/DersSayfasi.tsx` | 5 adım + 4 egzersiz tipi |
| `#/defter` | `features/defter/DefterSayfasi.tsx` | Kâşif Defteri, bani bağlantıları |
| `#/harita` | `features/harita/HaritaSayfasi.tsx` | MapLibre + metin eşdeğeri |
| `#/sinif` | `app/App.tsx` (`CocukSinifSayfasi`) | Sınıf kodu (cihaz-yerel) |
| `#/ayarlar` | `features/ayarlar/AyarlarSayfasi.tsx` | Erişilebilirlik ayarları |
| `#/panel` | `features/panel/KorumaliPanel.tsx` | Giriş + yönetim CRUD |
| `#/ogretmen` | `features/ogretmen/OgretmenPaneli.tsx` | Sınıf oluştur, ilerleme gör |

---

## 6. Tasarım yönü (başvuru PDF'inden)

Sunumun görsel dili: koyu teal `#14524B`, kiremit `#B4532A`, altın `#C99A3E`,
krem `#FAF7F1`, lacivert `#1B2A41`. "Osmanlı arşiv belgesi" hissi.

**Hedef kitle 10-12 yaş çocuk.** Mevcut arayüz yetişkin-ölçekli; çocuk için
daha büyük dokunma hedefleri, daha az metin, daha çok görsel geri bildirim
uygun olur. **Ama kontrast ve odak kurallarından ödün verilmez.**

**Sunumun kendi eleştirisi:** Başvuru PDF'i 5.2–7.5pt arası çok küçük
tipografi kullanıyordu. Arayüzde bunu tekrarlamayın — gövde metni en az 16px.

---

## 7. Bilinen eksikler (sizin kapsamınızda değil, bilgi olsun)

- **TTS / seslendirme yok.** PDF taahhüdü; ayrı iş. Egzersizlerin tamamı ses
  olmadan çalışır (PDF'in "sessiz mod" taahhüdü).
- **PostGIS kullanılmıyor.** Konum tabanlı sorgu yok; harita görselleştirme.
- **Vakfiye gelir oranları** 19 eserin yalnızca 3'ünde belgeli. Kalanında
  arayüz "belgelenememiştir" der — bu bir eksiklik değil, dürüstlük ilkesi.

---

## 8. 13 Ekim 2026 — uygulanan yeniden tasarım (özet)

Bu sözleşmeye uyularak yapıldı: `server/**`, `shared/**`, `src/lib/api.ts`,
`src/lib/ilerleme.ts`, `src/lib/oturum.ts` **değişmedi**.

| Ne | Nerede |
|---|---|
| Koyu varsayılan tema, tek vurgu safran (2026-10-16 yeniden tasarım; palet denemesi kaldırıldı) | `src/styles/tokens.css` |
| Bricolage Grotesque + Figtree (gömülü, OFL), düz gölgesiz düğmeler, programatik odak çerçevesi kaldırıldı (`[tabindex='-1']`) | `src/styles/global.css`, `public/fonts/` |
| Phosphor simgeleri (emoji yok), fotoğraf madalyonlu yol | `src/app/Ikonlar.tsx`, `src/features/yol/FotografPatikasi.tsx` |
| Alt sekme çubuğu, ders odak modu, "Yetişkinler için" gezinmesi | `src/app/App.tsx`, `src/app/app.css` |
| Zikzak öğrenme yolu, tekrar kartı | `src/features/yol/YolSayfasi.tsx` |
| Alt geri bildirim paneli, Dinle düğmesi, ders sonu ekranı, katlanır kaynaklar | `src/features/ders/*` |
| Aralıklı tekrar (Leitner, cihazda) | `src/lib/tekrar.ts`, `DurumSaglayici.tsx`, `GeriCagirmaAdimi.tsx` |
| Sesli anlatım (Web Speech API) | `src/lib/ses.ts`, `src/features/ders/DinleDugmesi.tsx` |

**Yeni renk eklerken:** jetonu 3 temaya (koyu, açık, yüksek kontrast) ekleyin. Metin rengi
olarak `--vurgu` yerine `--vurgu-koyu` kullanın (safran açık zeminde metin olamaz).
