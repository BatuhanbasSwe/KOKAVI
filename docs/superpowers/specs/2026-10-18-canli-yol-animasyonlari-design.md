# Canlı öğrenme yolu: animasyon paketleri — tasarım

> Tarih: 18 Ekim 2026 · Karar: Batuhan dört paketi de seçti.
> Amaç: öğrenme yolu ve dersler daha canlı ve eğlenceli olsun, çocuk sıkılmasın.

## İlkeler (bağlayıcı)

1. **Ölçeklenebilir.** Hiçbir animasyon esere özel çizim ya da sahne istemez. Her yeni eser ve şehir otomatik canlanır (başvuru: "şehir başına yazılım maliyeti 0").
2. **Anlam taşır, süs değildir.** Öğrenmeyle ilgisiz parlak görseller öğrenmeyi düşürür (seductive details, g ≈ −0,33). Bu yüzden her hareket bir durumu anlatır: ilerleme (yol dolar), keşif (fotoğraf renklenir), kazanç (elmas sayaca gider), başarı (mühür).
3. **Hareketi azalt.** Sistem ayarı ve uygulamadaki "Hareketi azalt" ayarı bütün animasyonları kapatır. CSS genel kuralı zaten var; JS animasyonları `src/app/hareket.ts` üzerinden aynı kontrolü yapar.
4. **Erişilebilirlik bozulmaz.** Animasyon katmanları `aria-hidden`; durum yine metin ve simgeyle söylenir; odak sırası değişmez; axe 0 ihlal.
5. **Bağımlılık yok.** CSS animasyonları, Web Animations API ve destekleyen tarayıcılarda CSS kaydırma zaman çizelgesi (`animation-timeline: view()`). Desteklemeyen tarayıcıda içerik durağan ama eksiksiz.
6. **Ham renk yok.** Renkler `tokens.css` jetonlarıyla.

## Paket 1 — Yol canlanır (`src/features/yol/`)

- **Yol çizgisi:** madalyonların merkezlerinden geçen kıvrımlı bir SVG yol. Bitmiş bölüm altın renkli ve kesintisiz, kalan bölüm kesik çizgili. Merkezler çizimden ölçülür (ResizeObserver).
- **İlerleme sahnesi:** Yol'a dönüldüğünde, son görülen "sıradaki ders" bitmişse bir sahne oynar:
  1. Önceki durağın onayı patlar.
  2. Aradaki yol parçası altınla dolar.
  3. Köstik yol boyunca zıplayarak yeni durağa gider.

  Son görülen durum cihazda tutulur (`localStorage`, kişisel veri değil).
- **Kilit kırılır:** yeni açılan ünitede kilit simgeleri kırılıp dağılır; siyah-beyaz fotoğraflar sırayla renklenir.

## Paket 2 — Kazanma anları

- **Elmas uçuşu:** ders sonunda elmaslar kazanç kartından üst çubuktaki elmas sayacına uçar; sayaç zıplar.
- **Seri alevi:** ders sonunda seri kartındaki ve üst çubuktaki alev tutuşur, titrer.
- **Ünite mührü:** bir ünitenin bütün dersleri bitince ünite başlığına "TAMAM" mührü basılır. İlk görüşte "güm" animasyonuyla, sonra durağan rozet olarak kalır.

## Paket 3 — Ders içi tepkiler (var olanı güçlendirir)

- Mevcut onay patlaması, ipucu sallanması, kombo alevi ve Köstik tepkileri korunur.
- **Ekler:**
  - Doğru cevapta seçili kartın çevresinde kıvılcımlar.
  - Kombo büyüdükçe alev de büyür.
  - Seçenek kartları basılınca yaylanır.
  - Adım ilerleme çubuğu dolarken parlar.

## Paket 4 — Kaydırma şovu (CSS kaydırma zaman çizelgesi)

- Kaydırdıkça duraklar yaylanarak girer.
- Ünite başlığı görünür alana girince bir şerit gibi açılır.
- Madalyon fotoğraflarında hafif derinlik (paralaks).

## Test

- Saf yardımcılar birim testli: yol eğrisi üretimi, ilerleme sahnesi kararı, hareket kontrolü.
- Mevcut yol, ders ve axe testleri yeşil kalır.
- Gerçek tarayıcıda telefon ve masaüstü boyutlarında ekran görüntüsüyle doğrulanır.
