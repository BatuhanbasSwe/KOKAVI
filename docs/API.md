# API Referansı

Temel adres: `http://127.0.0.1:8787` · Tüm istek/yanıt gövdesi **JSON**.
Oturum, `kokavi_oturum` adlı **httpOnly çerezde** tutulur (tarayıcı istemcisi
`credentials: 'include'` göndermelidir).

CLI/test istemcileri alternatif olarak `Authorization: Bearer <belirtec>`
başlığını kullanabilir (`POST /api/auth/giris` yanıtındaki `belirtec`).

**Hata biçimi:** `{ "hata": "Türkçe mesaj", "kod"?: "MAKINE_KODU", "detay"?: [...] }`

| Kod | Anlam |
|---|---|
| 400 | Girdi doğrulama hatası |
| 401 | Giriş yapılmamış (`GIRIS_GEREKLI`) |
| 403 | Yetki yok (`YETKI_YOK`) |
| 404 | Kayıt bulunamadı |
| 409 | Çakışma (e-posta zaten var) |
| 415 | Desteklenmeyen içerik türü (gövdeli istekte) |
| 429 | Hız sınırı / kaba kuvvet kilidi (`HIZ_SINIRI`, `COK_FAZLA_DENEME`) |

---

## 1. Genel okuma — kimlik gerekmez

| Metot | Yol | Dönüş |
|---|---|---|
| `GET` | `/api/saglik` | `{ durum: "calisiyor", zaman: ISO }` |
| `GET` | `/api/yol` | `{ sehirler: YolSehri[] }` — öğrenme yolu iskeleti |
| `GET` | `/api/sehirler` | `Sehir[]` |
| `GET` | `/api/uniteler?sehir=<id>` | `Unite[]` |
| `GET` | `/api/kulliyeler` | `Kulliye[]` |
| `GET` | `/api/eserler?hepsi=1&sehir=<id>` | `Eser[]` (varsayılan: yalnızca yayında) |
| `GET` | `/api/eserler/:id` | `Eser` · 404 |
| `GET` | `/api/dersler` | `Ders[]` |
| `GET` | `/api/dersler/:id` | `Ders` · 404 |

> 🔒 **`/api/yol` ilerleme bilgisi döndürmez.** Kilit ve tamamlanma durumu
> istemcide `yolHesapla()` ile hesaplanır. Sunucu hiçbir kullanıcı verisi
> saklamaz — bu, "kişisel veri toplanmaz" iddiasının mimari kanıtıdır.

---

## 2. Kimlik doğrulama

| Metot | Yol | Gövde | Dönüş |
|---|---|---|---|
| `POST` | `/api/auth/giris` | `{email, parola}` | `{kullanici, belirtec}` + çerez · 401 · 429 |
| `POST` | `/api/auth/cikis` | — | `{tamam:true}` — **gövdesiz çağrılır** |
| `GET` | `/api/auth/ben` | — | `{kullanici}` · 401 |
| `POST` | `/api/auth/parola` | `{yeniParola}` | `{tamam:true}` — tüm oturumları düşürür |

**Parola kuralları** (400 `detay` dizisinde döner): en az 8 karakter, bir küçük
harf, bir büyük harf, bir rakam, tek karakter tekrarı değil.

**Kaba kuvvet:** aynı e-posta için 15 dakikada 10 başarısız deneme → 429.
**Kullanıcı numaralandırması yok:** var olan ve olmayan e-posta aynı mesajı alır.

---

## 3. Yönetim — `admin` rolü gerekir

🔒 Bu gruptaki **tüm** uçlar korumalıdır (`yoneticiGerekli` kancası).

| Metot | Yol | Gövde / Not |
|---|---|---|
| `GET` | `/api/yonetim/istatistik` | `{sehir, unite, eser, ders, yayinda, belgeli}` |
| `GET` | `/api/yonetim/kullanicilar` | `Kullanici[]` |
| `POST` | `/api/yonetim/kullanicilar` | `{email, ad, parola, rol}` · 409 e-posta var |
| `PATCH` | `/api/yonetim/kullanicilar/:id` | `{aktif}` — kendi hesabını kapatamaz |
| `POST` | `/api/yonetim/sehirler` | `{id, ad, sira, aktif?}` |
| `POST` | `/api/yonetim/uniteler` | `{id, sehirId, ad, sira, aciklama?}` |
| `DELETE` | `/api/yonetim/uniteler/:id` | — |
| `POST` | `/api/yonetim/kulliyeler` | `{id, ad, sehirId, bani?, aciklama?}` |
| `POST` | `/api/yonetim/eserler` | `EserGirdisi` — aşağıya bakın |
| `PUT` | `/api/yonetim/eserler/:id` | `EserGirdisi` |
| `DELETE` | `/api/yonetim/eserler/:id` | Gelir kalemleri CASCADE silinir |
| `POST` | `/api/yonetim/dersler` | `DersGirdisi` — en az 1 egzersiz zorunlu |
| `PUT` | `/api/yonetim/dersler/:id` | `DersGirdisi` |
| `DELETE` | `/api/yonetim/dersler/:id` | — |

### `EserGirdisi`

```jsonc
{
  "id": "bursa-ipek-hani",        // zorunlu, tekil
  "ad": "İpek Hanı",              // zorunlu
  "sehirId": "bursa",             // zorunlu, var olan şehir
  "tur": "Han",                   // zorunlu
  "kulliyeId": null,
  "ilce": "Osmangazi",
  "koordinat": { "lat": 40.18, "lng": 29.06 },   // veya null
  "bani": "Çelebi Sultan Mehmed",                 // K1: kim yaptırdı
  "baniDonem": "1413-1421",
  "yapimYili": "XV. yüzyılın ilk yarısı",
  "vakfiyeAmaci": "Yeşilcami Külliyesi'ne gelir sağlamak",  // K2: neden
  "hizmet": "Kervanların konaklaması",                       // K3: kime fayda
  "bugunNeOldu": "Restore edilmiş ticari bina",              // K4: bugün
  "gelirDagilimiDurumu": "belgeli",   // veya "belge-bulunamadi" (otomatik hesaplanır)
  "arsivNo": "Muallim Cevdet–Fermanlar No. 5",
  "kaynaklar": [{ "kunye": "TDV İA, 'İpek Hanı'", "url": "https://..." }],
  "dogrulamaNotu": "Oda sayısı TDV ile teyitli.",
  "yayinda": true,
  "gelirKalemleri": [
    { "kalem": "Medrese talebelerine burs", "yuzde": 60, "kaynak": "..." }
  ]
}
```

**Gelir dağılımı kuralı:** `yuzde` **`null` olabilir**. Hiçbir kalemde oran
yoksa sunucu durumu otomatik `"belge-bulunamadi"` yapar — oran **uydurulmaz**.
Toplam %100'ü aşarsa seed katmanı oranları `null`'lar (kaynak tutarsızlığı).

### `DersGirdisi`

Beş adım + egzersizler. Alan şemaları `shared/types.ts` içinde:
`MerakAdimi`, `BaglamAdimi`, `PerspektifAdimi`, `YansimaAdimi`.

```jsonc
{
  "id": "bursa-u1-d1", "uniteId": "bursa-u1", "eserId": "bursa-ipek-hani", "sira": 1,
  "merak":      { "soru": "...", "secenekler": ["..."], "kopru": "..." },
  "baglam":     { "baslik": "...", "metin": "...", "kavramlar": [...], "kapanis": "..." },
  "perspektif": { "baslik": "...", "diyalog": [...], "soru": "...", "secenekler": [...] },
  "yansima":    { "ozet": "...", "rontgenSorusu": "...", "rontgenAciklama": "...", "kaynakKunye": "..." },
  "egzersizler": [
    { "id": "e1", "tip": "eslestir",      "veri": { /* EslestirVerisi */ }, "kaynak": "TDV" },
    { "id": "e2", "tip": "sirala",        "veri": { /* SiralaVerisi */ } },
    { "id": "e3", "tip": "bosluk-doldur", "veri": { /* BoslukVerisi */ } },
    { "id": "e4", "tip": "eser-tani",     "veri": { /* EserTaniVerisi */ } }
  ]
}
```

Geçerli tipler: `eslestir` · `sirala` · `bosluk-doldur` · `eser-tani`.
Başka tip → 400. Egzersizsiz ders → 400.

---

## 4. Sınıf — herkese açık, kimlik yok

| Metot | Yol | Gövde | Dönüş |
|---|---|---|---|
| `GET` | `/api/sinif/:kod` | — | `{kod, ad, toplamTamamlama, tamamlananDersCesidi}` · 404 |
| `POST` | `/api/sinif/tamamla` | `{kod, dersId}` | `{tamam:true}` · 404 · 429 |

> 🔒 **Kimlik alınmaz.** Sunucu yalnızca sayaç tutar: "bu kodla bu ders kaç kez
> tamamlandı". Kaç farklı öğrenci olduğu **bilinemez** ve arayüz de iddia etmez.

---

## 5. Öğretmen — giriş gerekir

| Metot | Yol | Gövde | Dönüş |
|---|---|---|---|
| `GET` | `/api/ogretmen/siniflar` | — | `(Sinif & {ozet})[]` — yalnızca kendi sınıfları |
| `POST` | `/api/ogretmen/siniflar` | `{ad}` | 201 `Sinif` (kod otomatik: `XYZ-2345`) |
| `GET` | `/api/ogretmen/siniflar/:kod` | — | `{ilerleme, uniteler}` · 403 başkasının sınıfı |
| `PATCH` | `/api/ogretmen/siniflar/:kod` | `{aktif}` | `{tamam:true}` · 403 |

Kod biçimi `XYZ-2345`. Sunucu normalleştirir (küçük harf, boşluk, tiresiz giriş kabul).
Karışması kolay karakterler (`I`, `O`, `0`, `1`) alfabede **yoktur**.

---

## 6. Hız sınırları

| Kapsam | Sınır |
|---|---|
| Tüm uçlar | 300 istek / dakika |
| `POST /api/auth/giris` | 10 istek / dakika |
| `POST /api/sinif/tamamla` | 60 istek / dakika |

Aşılırsa **429** `HIZ_SINIRI`.

---

## 7. Güvenlik başlıkları

Her yanıtta: `Content-Security-Policy` (frame-ancestors `none`) ·
`X-Content-Type-Options: nosniff` · `X-Frame-Options` · `Referrer-Policy` ·
`Strict-Transport-Security`. `X-Powered-By` **gönderilmez**.

Gövde sınırı **1 MB**. Gövdesiz `POST` istekleri içerik türü belirtilmese de
kabul edilir; gövdesi olan bilinmeyen içerik türleri **415** ile reddedilir.
