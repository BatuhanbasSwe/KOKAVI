# Kök Avı — MVP

> Vakıf eserlerini çocuklara günlük mikro derslerle öğreten PWA.
> **Takım TRİA** · KÖK & KOD Hackathon · Vakıf Katılım × 42 Türkiye

Bu klasör, başvuru PDF'inde (`../sunum/KokAvi_Sunum.pdf`) **taahhüt edilen ürünün
çalışan MVP'sidir.** Organizasyonun "başvuru PDF'inde ne yazıyorsa aynısını yapın"
talimatı gereği, buradaki her özellik o PDF'teki bir taahhüde karşılık gelir.

---

## Hızlı başlangıç

```bash
cd mvp
npm install

# 1) İçeriği veritabanına yükle (data/research + data/content)
npm run seed

# 2) Geliştirme sunucusu (API :8787 + arayüz :5173 birlikte)
npm run dev
```

Arayüz: **http://localhost:5173** · API: **http://localhost:8787**

Üretim derlemesi:

```bash
npm run build     # tsc + vite build → dist/
npm start         # API, dist/ içeriğini de servis eder → http://127.0.0.1:8787
```

Testler:

```bash
npm test          # 702 test, 69 paket — aşağıya bakın
npm run dogrula   # tip kontrolü + testler + üretim derlemesi (tek komut)
npm run typecheck # TypeScript strict
```

> **Not:** `npm install` sonrası esbuild gibi paketlerin kurulum betikleri
> engellenmişse (bazı npm sürümlerinde varsayılan), `npm approve-scripts` ile
> onaylayın. Aksi halde `vite` çalışmaz.

### Test paketleri

| Paket | Test | Neyi korur |
|---|---|---|
| `tests/guvenlik.test.ts` | 70 | Yetki, parola, kaba kuvvet, enjeksiyon, başlıklar, sınıf gizliliği |
| `tests/icerik.test.ts` | 34 | Ders içeriği sözleşmesi (dört tip, `___`, `dogruIndex`…) |
| `tests/ilerleme.test.ts` | 21 | Kilit sırası, seri, seviye, elmas mantığı |
| `tests/api.test.ts` | 15 | CRUD + girdi doğrulama + gizlilik |
| `tests/erisilebilirlik.test.ts` | 13 | Tema/palet/yazı ayarlarının DOM'a uygulanması |
| `tests/kabuk.test.tsx` | 9 | Atlama bağlantısı, nav, `aria-current`, dil |
| `tests/akis.test.ts` | 9 | Yeni şehir→ünite→eser→ders zinciri (kod değişikliği gerekmez) |
| `tests/hata-siniri.test.tsx` | 7 | Hata sınırı: beyaz ekran yok, çıkış yolu var |
| `tests/erisilebilirlik-denetim.test.tsx` | 6 | **axe-core: 6 sayfada 0 ihlal** |
| `tests/sinif-gizlilik.test.tsx` | 5 | Sınıf kaydında yalnızca `{kod, dersId}` gider |
| `tests/erisilebilirlik-tam-tarama.test.tsx` | 69 | **23 rota × 3 tema axe taraması** (0 ihlal) |
| `tests/kulliye.test.ts` + sınıf Röntgeni testleri | 13 | Hedef külliye hesabı, sınıf Röntgeni ekranı, kimlik sızdırmama |

---

## Teknoloji yığını

PDF'te taahhüt edilen yığın ve MVP'deki karşılığı:

| PDF'te yazıyor | MVP'de | Not |
|---|---|---|
| React + TypeScript (PWA) | ✅ React 19 + TypeScript + Vite + `vite-plugin-pwa` | Telefonda ve masaüstünde kurulabilir |
| Node/Fastify API | ✅ Fastify 5 | `server/` |
| PostgreSQL + PostGIS | ✅ **PostgreSQL** (PGlite — WASM'da gerçek Postgres) | PostGIS kullanılmıyor: üründe konum tabanlı **sorgu** yok, harita yalnızca görselleştirme. Koordinatlar düz kolonlarda, PostGIS'e geçişe hazır |
| MapLibre | ✅ MapLibre GL JS | Eserlerin haritası + erişilebilir metin listesi |
| Toplu Türkçe TTS | ⏳ **Bu MVP kapsamı dışı** | Arayüz ses olmadan tam çalışır (PDF'in "sessiz mod" taahhüdü) |

**Neden PGlite:** demo makinesinde ayrı bir PostgreSQL sunucusu kurma riskini
ortadan kaldırır, ama gerçek PostgreSQL SQL'i çalıştırır. Üretimde `server/db/index.ts`
içindeki bağlantı `pg` sürücüsüyle değiştirilir; şema ve tüm sorgular birebir taşınır.

---

## Başvuru PDF'i → kod eşlemesi

Her satır, PDF'teki bir taahhüdün kodda nerede karşılandığını gösterir.

| PDF taahhüdü | Kod |
|---|---|
| "beş adımlık akış" (Merak→Bağlam→Perspektif→Geri çağırma→Yansıma) | `src/features/ders/DersSayfasi.tsx` |
| "karışık egzersiz tipleri" (Eşleştir, Sırala, Boşluğu doldur, Dinle ve seç) | `src/features/ders/*Egzersizi.tsx` |
| "Dinle ve seç" — ses olmadan eşdeğeri | `EserTaniEgzersizi` (PDF: "ses olmadan da akışın tamamı bitirilebilir") |
| "Vakıf Röntgeni — ürünün ayırt edici özelliği" | `src/features/ders/` Yansıma adımı + `income_item` tablosu |
| "her değer vakfiye belgesinden alınır ve arşiv numarasıyla gösterilir" | `work.arsiv_no`, `work.kaynaklar`, `income_item.kaynak` |
| "doğrulanmamış hiçbir bilgi kesin bilgi olarak sunulmaz" | `work.gelir_dagilimi_durumu` + `GelirDurumu` tipi; oran yoksa çubuk çizilmez |
| "Öğrenme Yolu — her şehir bir ünite, her eser bir ders" | `src/features/yol/YolSayfasi.tsx`, `src/lib/ilerleme.ts` → `yolHesapla` |
| "Kâşif Defteri: öğrenilenin biriktiği yer" | `src/features/defter/DefterSayfasi.tsx` |
| "Seri, Elmas, Seviye: Çırak → Kalfa → Usta" | `src/lib/ilerleme.ts` → `seriGuncelle`, `seviyeHesapla` |
| "Öğretmen sınıf kodunu açar" | `src/features/ogretmen/` + `server/routes/sinif.ts` |
| "Sınıf birlikte bir külliyeyi tamamlar; Vakıf Röntgeni'ni birlikte görür" (Senaryo B) | `shared/kulliyeler.ts` + `server/repo/sinif.ts` (`kulliyeleriHesapla`, `sinifRontgeni`) + `#/tahta/<kod>/rontgen` |
| "Yönetim paneli — eser ekleme/düzenleme, yeni şehir ünitesi tanımlama" | `src/features/panel/` + `server/routes/admin.ts` |
| "Sesli anlatım / ekran okuyucu / yüksek kontrast / renk körlüğü / altyazı / klavye" | `src/styles/tokens.css`, `src/features/ayarlar/`, tüm bileşenlerde ARIA |
| "Kişisel veri toplanmaz, sınıf kodu anonim" | `src/lib/ilerleme.ts` (localStorage) + `tests/api.test.ts` gizlilik testi |
| "çevrimdışı ders desteği" | `vite.config.ts` → Workbox runtime caching |

---

## Mimari

```
mvp/
├── shared/types.ts          # Tek tip sözleşmesi (istemci + sunucu)
├── server/
│   ├── db/
│   │   ├── schema.sql       # PostgreSQL şeması (7 tablo)
│   │   └── index.ts         # PGlite bağlantısı
│   ├── repo/                # Veri erişimi: eser, ders, yol
│   ├── routes/
│   │   ├── public.ts        # /api/*  — okuma, kullanıcı verisi almaz
│   │   └── admin.ts         # /api/yonetim/* — CRUD + doğrulama
│   ├── seed/run.ts          # Araştırma + içerik → veritabanı
│   └── index.ts             # Fastify sunucusu
├── src/
│   ├── app/                 # Kabuk, yönlendirme, durum sağlayıcı
│   ├── features/            # yol · ders · defter · harita · sinif · ayarlar · panel
│   ├── lib/                 # api · ilerleme · erisilebilirlik · yonlendirme
│   └── styles/              # tokens.css (tema/palet) · global.css
├── data/
│   ├── research/            # Doğrulanmış eser künyeleri (kaynaklı)
│   └── content/             # Beş adımlı ders içerikleri
├── tests/                   # 702 test (69 dosya)
└── docs/
    ├── KARARLAR.md          # PDF'teki belirsizliklerin çözümü (10 madde)
    ├── API.md               # Uç referansı, alan şemaları, hata kodları
    ├── VERI.md              # Kaynakça ve veri kalite raporu
    ├── UI-DEVIR.md          # Arayüzü yeniden yazacak ekip için sözleşme
    └── DEMO.md              # 3 dakikalık final demo senaryosu + jüri Q&A
```

### Belgeler

| Belge | Ne zaman okunur |
|---|---|
| `TODOLIST.md` | Her işe başlamadan önce: ne bitti, ne kaldı, kim ne yapıyor |
| `docs/KARARLAR.md` | "Neden böyle yaptınız?" sorusuna cevap |
| `docs/API.md` | İstemci yazarken |
| `docs/VERI.md` | "Bu bilgiler nereden geliyor?" sorusuna cevap |
| `docs/UI-DEVIR.md` | Arayüz yeniden tasarlanırken (bozulmaması gerekenler) |
| `docs/DEMO.md` | Final provası ve jüri soru-cevap hazırlığı |

### Veri modeli

```
city ──< unit ──< lesson ──< exercise
  │                 │
  └──< kulliye      └── work ──< income_item
```

- `work.gelir_dagilimi_durumu` ∈ {`belgeli`, `belge-bulunamadi`}
- `income_item.yuzde` **NULL olabilir** — belge yoksa oran uydurulmaz
- `exercise.tip` ∈ {`eslestir`, `sirala`, `bosluk-doldur`, `eser-tani`}

---

## Güvenlik

Şartname 5.1.5: *"Kullanıcı girdilerinin uygun doğrulama ve kontrol
mekanizmalarından geçirilmesi beklenmektedir."* + *"Kişisel veya hassas veri
işlenmesi halinde bu verilerin korunmasına yönelik gerekli teknik önlemler
alınmalıdır."*

### Kimlik doğrulama ve yetkilendirme

| Konu | Uygulama |
|---|---|
| Yönetim uçları | **Tümü korumalı** — `yoneticiGerekli` kancası tek yerde, uç bazında unutma riski yok |
| Roller | `admin` (tam yetki) · `ogretmen` (yalnızca okuma) |
| Yetkisiz erişim | 401 `GIRIS_GEREKLI` · yetki yetersizse 403 `YETKI_YOK` |
| Parola saklama | **scrypt** (N=16384, r=8, p=1) + 16 bayt rastgele tuz. Düz metin yok |
| Oturum belirteci | 32 rastgele bayt; veritabanında **yalnızca SHA-256 özeti** |
| Oturum çerezi | `httpOnly` + `sameSite=strict` + üretimde `secure`. JS okuyamaz |
| Oturum ömrü | 8 saat; süresi dolan oturumlar açılışta temizlenir |
| Çıkış | Belirteç veritabanından silinir — tekrar kullanılamaz |
| Parola değişimi | Kullanıcının **tüm açık oturumları düşer** |
| Hesap kapatma | Açık oturumlar anında düşer |

### Saldırı azaltma

| Saldırı | Önlem |
|---|---|
| Kaba kuvvet | 15 dakikada 10 başarısız deneme → hesap kilitlenir (429) |
| Kimlik denemesi bombardımanı | Giriş ucunda dakikada 10 istek (uç bazlı hız sınırı) |
| Genel hız sınırı | Tüm uçlarda dakikada 300 istek |
| Kullanıcı numaralandırması | Var olan ve olmayan e-posta **aynı mesajı** alır; yanıt süresi de eşitlenir |
| Zamanlama saldırısı | `timingSafeEqual` ile sabit zamanlı karşılaştırma |
| SQL enjeksiyonu | %100 parametreli sorgu — hiçbir yerde string birleştirme yok |
| XSS | İstemci veriyi metin olarak render eder; API her zaman JSON döner |
| Clickjacking | `Content-Security-Policy: frame-ancestors 'none'` + `X-Frame-Options` |
| MIME karıştırma | `X-Content-Type-Options: nosniff` |
| Bellek tüketimi | Gövde sınırı 1 MB |
| Prototip kirlenmesi | Gövde alanları beyaz listeyle okunur |
| Bilgi sızıntısı | `X-Powered-By` kapalı; hata yanıtları ayrıntı içermez |

### Yönetici hesabı

```bash
# Sabit varsayılan parola YOKTUR. Parola verilmezse rastgele üretilir
# ve yalnızca seed çıktısında bir kez gösterilir.
npm run seed                                   # rastgele parola üretir
KOKAVI_ADMIN_PAROLA='GucluParola1' npm run seed # kendi parolanı ver
```

Hesap `app_user` tablosunda tutulur ve **seed onu silmez** (auth tabloları
içerik tablolarından ayrıdır).

### Güvenlik testleri

```bash
npx vitest run tests/guvenlik.test.ts   # 57 test
```

Kapsam: yetkisiz erişim (12 uç) · rol ayrımı · parola özeti · kullanıcı
numaralandırması · kaba kuvvet kilidi · oturum geçersizleştirme · SQL
enjeksiyonu · XSS · güvenlik başlıkları · gövde sınırı · girdi doğrulama ·
prototip kirlenmesi · gövdesiz POST regresyonu.

---

## Gizlilik mimarisi

"Kişisel veri toplanmaz" iddiası **mimari olarak doğrulanabilir**:

1. `POST /api/yol` gibi bir uç **yoktur** — ilerleme sunucuya hiç gönderilmez.
2. Tüm ilerleme (`tamamlananDersler`, `elmas`, `seri`) `localStorage`'da tutulur.
3. Sunucu yalnızca içerik döner; hiçbir kullanıcı kaydı tutmaz.
4. Sınıf kodu bir kimlik değildir: rastgele üretilir, isim/e-posta ile eşleşmez.
5. `tests/api.test.ts` → `/api/yol` yanıtında ilerleme alanı **olmadığını** test eder.

---

## Erişilebilirlik

Hedef: **WCAG 2.2 AA**, özellikler ürüne gömülü (şartname 5.1.4 gereği).

| Özellik | Nerede |
|---|---|
| Yüksek kontrast teması | `tokens.css` → `[data-tema="yuksek-kontrast"]` |
| Renk körlüğü paleti (Okabe-Ito) | `tokens.css` → `[data-renk-korlugu]` |
| Ölçeklenebilir yazı boyutu (%85–%160) | `lib/erisilebilirlik.ts` → `--yazi-olcek` |
| Hareket azaltma | `prefers-reduced-motion` + `[data-hareket-azalt]` |
| Sessiz mod | `AyarlarSayfasi` |
| Klavye ile tam gezinme | Tüm etkileşimler `button`/`a`; sürükle-bırak **yok** (ok tuşları ve düğmeler) |
| Odak görünürlüğü | `global.css` → `:focus-visible` (yüksek kontrastta ek halka) |
| İçeriğe atla bağlantısı | `App.tsx` |
| Ekran okuyucu duyuruları | `aria-live`, `role="status"` |
| Renk tek başına anlam taşımaz | Doğru/yanlış → simge + metin; çubuklar → desen + etiket |
| Dokunma hedefi ≥ 44px | `.dugme`, `.secenek`, `.gezinme__baglanti` |
| Haritanın metin eşdeğeri | `HaritaSayfasi` → eser listesi (WCAG 1.1.1) |

**Kanıt:** `npm run erisilebilirlik` → 23 rota × 3 tema = 69 axe taraması + tema
jetonu kontrast testleri, JSON çıktı `docs/erisilebilirlik-raporu.json`; yöntem ve
dürüst sınırlar `docs/ERISILEBILIRLIK.md`.

---

## Bilinen sınırlar

- **Seslendirme (TTS) yok.** PDF'te "toplu Türkçe TTS" taahhüdü var; bu MVP
  kapsamı dışı bırakıldı (kullanıcı kararı, 27 Ekim 2026: eklenmeyecek, sunumda
  iddia edilmeyecek). Egzersizlerin tamamı ses olmadan çalışır.
- **PostGIS yok.** Konum tabanlı sorgu üründe yok; koordinatlar düz kolonlarda.
- **Eser sayısı** sponsorun veri setine bağlıdır; bu depodaki veri
  `data/research/` içindeki doğrulanmış araştırma çıktısıdır.
- **Vakfiye gelir oranları** çoğu eser için belgelenememiştir. Bu bir eksiklik
  değil, ürünün dürüstlük ilkesinin sonucudur: oran yoksa arayüz
  "belgelenememiştir" der, sayı uydurmaz.

---

## Lisans ve kaynak

- Uygulama kodu: takım TRİA.
- İçerik ve görseller: Vakıf Eserleri Envanter Projesi'ne aittir; ürün lisanslı
  erişim katmanıdır.
- Tarihsel bilgiler `data/research/` içinde kaynak künyesiyle birlikte saklanır.
