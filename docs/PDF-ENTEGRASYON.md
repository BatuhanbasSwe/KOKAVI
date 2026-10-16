# PDF entegrasyonu — Vakıf Katılım envanterlerinden uygulamaya

Kaynak: Vakıf Katılım'ın gönderdiği 6 envanter PDF'i (Bursa I-III. Cilt, Konya I-II. Cilt,
Hatay İli Vakıf Eserleri). PDF'ler `Downloads` klasöründe beklenir; yolu script'lerin
başında değiştirilebilir.

## Veri hattı (sırayla)

| Adım | Komut | Ne üretir | Süre |
|---|---|---|---|
| 1 | `python scripts/pdf-md.py` | `kaynak/md/*.md` — sayfa işaretli metin | ~25 dk |
| 2 | `python scripts/pdf-gorsel.py` | `kaynak/gorseller/<il>/<eser>/` + `eserler.json` — her görsel ait olduğu esere eşli | ~5 dk |
| 3 | `python scripts/gorsel-ders.py` | `public/gorseller/<eserId>/` (ders fotoğrafları, WebP) + `data/gorseller.json` | ~1 dk |
| 4 | `python scripts/arsiv-hazirla.py` | `public/arsiv/` — Meraklısına arşivi (633 eser: liste, metin, fotoğraf) | ~3 dk |
| 5 | `npm run seed` | Veritabanı: 57 eser, 57 ders, 303 fotoğraf (API KAPALIYKEN) | ~1 dk |

Gerekli paketler: `pip install pymupdf pymupdf4llm psutil pillow`
`kaynak/` klasörü (~380 MB) üretilen ara veridir; ZIP'e girmez.

## Önemli kararlar

- **Dersler:** 57 ders = PDF'lerden seçilen 51 eser + bir külliyenin parçası olan 6 mevcut ders.
  Bursa üniteleri temaya göre (`data/research/bursa-1..3.json`, `tema` alanı): İbadet ve İlim,
  Ticaret ve Şehir Hayatı, Hayır ve Yardımlaşma. Seed üniteleri dosya + kayıt sırasıyla böler.
- **Kaynak:** Her yeni dersin bilgileri yalnızca envanterden alındı; künyede kitap + basılı sayfa var.
  PDF'teki çelişkiler (ör. Hz. Üftâde Camii'nde Kanuni tarihi) derse konmadı, `dogrulamaNotu`na yazıldı.
- **Hatay:** Envanter 2023 depremi sonrası durumu bildirmez; yeni Hatay derslerinde "doğrulanmadı" yazar.
- **Koordinat:** OpenStreetMap Nominatim ile bulundu, ilçe sınırı içinde doğrulandı. Yaklaşık olanlar
  kaynak listesinde "YAKLAŞIK" diye işaretli (haritada kesik çerçeve). 3 eser konumsuz.
- **Harita:** İl → ilçe → eser. İl/ilçe sınırları gömülü (çevrimdışı); yakınlaşınca OpenFreeMap
  vektör karolarından sokaklar çizilir (internet gerekir, anahtar gerekmez).
- **Arşiv metni** PDF'ten otomatik aktarıldı; elle düzeltilmedi (sayfada okura söylenir).

## Lisans / atıf

- Metin ve fotoğraflar: © Vakıf Katılım envanter yayınları (eğitim amaçlı kullanım).
- İl sınırları: Natural Earth (kamu malı). İlçe sınırları: geoBoundaries (CC BY 4.0).
- Konumlar ve sokak haritası: © OpenStreetMap katkıcıları (ODbL), OpenFreeMap, OpenMapTiles.
