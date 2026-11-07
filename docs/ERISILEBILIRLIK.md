# Erişilebilirlik Kanıtı — WCAG 2.2 AA

> **Amaç:** PDF'in "WCAG 2.2 AA" taahhüdü için tekrarlanabilir, çıktısı saklanan
> bir tarama. Bu bir tasarım iddiası değil, **çalışan DOM üzerinde ölçüm**dür.
> Son güncelleme: 27 Ekim 2026 · Kök Avı / TRİA.

## 1. Tek komut

```bash
npm run erisilebilirlik
```

Komut iki test dosyasını birlikte çalıştırır ve sonucu JSON olarak
[`docs/erisilebilirlik-raporu.json`](erisilebilirlik-raporu.json) dosyasına yazar:

- `tests/erisilebilirlik-tam-tarama.test.tsx` — **23 rota × 3 tema = 69 axe taraması**
- `tests/tema-kontrast.test.ts` — tema jetonlarının gerçek metin/arka plan çiftleri,
  WCAG relative-luminance formülüyle (normal metin ≥ 4.5:1, büyük metin ≥ 3:1)
- `tests/erisilebilirlik-denetim.test.tsx` — ekran bazlı ayrıntılı denetim (ders sonu,
  404, giriş vb.)

JSON çıktısı CI/teslim kanıtı olarak saklanır. Testlerin hepsi yeşil olduğunda
komut `0` ile biter.

## 2. Kapsam

### Taranan ekranlar (her biri koyu · açık · yüksek kontrast temada)

| # | Ekran | Rota |
|---:|---|---|
| 1 | Bugün | `#/bugun` |
| 2 | Keşfet | `#/kesfet` |
| 3 | Hâlâ yaşayan vakıflar | `#/yasayan` |
| 4 | Profil | `#/profil` |
| 5 | Öğrenme yolu | `#/yol` |
| 6 | Kâşif Defteri | `#/defter` |
| 7 | Meraklısına arşivi | `#/arsiv` |
| 8 | Arşiv eser detayı | `#/arsiv/<id>` |
| 9 | Ayarlar | `#/ayarlar` |
| 10 | Vakıf Çarşısı | `#/carsi` |
| 11 | Sınıfım (evde katıl) | `#/sinif` |
| 12 | Günün Eseri | `#/gunun-eseri` |
| 13 | Hayrat mı Akar mı? | `#/hayrat-akar` |
| 14 | Hatalarımı Çalış | `#/hatalar` |
| 15 | Zaman Tüneli | `#/zaman-tuneli` |
| 16 | Keşif Serisi | `#/seri` |
| 17 | Şehir sertifikası | `#/sertifika/<şehir>` |
| 18 | Öğretmen paneli (giriş ekranı) | `#/ogretmen` |
| 19 | Yönetim paneli (giriş ekranı) | `#/panel` |
| 20 | Ders akışı (5 adım) | `#/ders/<dersId>` |
| 21 | Tahta modu | `#/tahta/<kod>/<dersId>` |
| 22 | Sınıf Vakıf Röntgeni | `#/tahta/<kod>/rontgen` |
| 23 | 404 | `#/bilinmeyen` |

### Bilinçli olarak taranmayanlar

| Ekran | Neden |
|---|---|
| Harita (`#/harita`), Keşif rotası (`#/rota`) | MapLibre WebGL canvas'ı jsdom'da çizilemez; erişilebilirlik taraması anlamsız olur. Finalde **gerçek tarayıcıda** ayrıca provalanır. |
| Canlı yarışma (`#/canli*`) | 26 Ekim'de çocuk akışından çıkarıldı; demo/pitch'te gösterilmiyor. Kod tabanda duruyor. |

## 3. Sonuç (27 Ekim 2026)

- **69/69 axe taraması ihlalsiz** (23 ekran × 3 tema; yapısal kurallar).
- **Kontrast:** koyu, açık ve yüksek kontrast temalarında ölçülen tüm metin/arka plan
  çiftleri AA eşiğini geçiyor. Açık temada safran metnin (`#ffbf3c` / `#fff3d6`)
  1.49:1 kaldığı üç bileşen `tokens.css` içinde koyu safran jetonuna bağlandı.
- **Dokunma hedefleri:** `.dugme`, `.ogretmen__girdi` ve yeni Röntgen bağlantıları
  en az 44 px (stil sözleşmesi; `tests/erisilebilirlik.test.ts` denetler).
- **Renk tek başına anlam taşımaz:** ilerleme çubuklarında yüzde metni, rozetlerde
  simge + metin, Röntgen'de oran hem çubuk hem `%` olarak verilir.

## 4. Dürüst sınırlar — neyi KANITLAMAZ

Bu otomatik tarama şunların yerine geçmez; finalde **elle** provalanmalıdır:

1. **Gerçek tarayıcı + ekran okuyucu** (NVDA/VoiceOver) ile bir ders baştan sona.
2. **Gerçek renk kontrastı:** jsdom'da axe'in `color-contrast` kuralı canvas
   olmadığı için kapalıdır. Kontrast, jetonların hex değerleri üzerinden ayrı
   testte ölçülür; ama gerçek tarayıcıdaki opaklık/katman etkileri bu testin dışındadır.
3. **%200 ve %160 yazı boyutu** ve 360 px genişlikte taşma — gerçek yerleşim gerekir
   (final kontrol listesinde maddedir).
4. **Harita/rota** ekranlarının klavye ve kontrast davranışı.
5. **Hareket azalt** tercihinin gerçek tarayıcıda animasyonları durdurması
   (`prefers-reduced-motion` + uygulama ayarı).

Bu maddeler [`docs/DEMO.md`](DEMO.md) demo öncesi kontrol listesinde ve
[`docs/SAVUNMA-NOTLARI.md`](SAVUNMA-NOTLARI.md) iddia tablosunda "finalde prova"
olarak işaretlidir. Sunumda **"otomatik tarama yeşil"** denir; "her şeyi elle
doğruladık" denmez.

## 5. İlgili dosyalar

- Tarama: `tests/erisilebilirlik-tam-tarama.test.tsx`
- Kontrast: `tests/tema-kontrast.test.ts`
- Ekran denetimi: `tests/erisilebilirlik-denetim.test.tsx`
- Jetonlar: `src/styles/tokens.css`
- JSON kanıt: `docs/erisilebilirlik-raporu.json`
