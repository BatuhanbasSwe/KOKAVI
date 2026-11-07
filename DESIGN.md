# DESIGN.md: Kök Avı tasarım sistemi ("Mozaik + Fotoğraf Patikası")

> Karar belgesi: `docs/superpowers/specs/2026-10-16-kok-avi-yeniden-tasarim-design.md`.
> Gerçek değerler `src/styles/tokens.css` içindedir; bu dosya *nasıl kullanılacağını* anlatır.
> Bileşen kodunda ham renk yok: yalnızca jetonlar.

## 1. İlkeler ("Çini Oyun", 07.11.2026)

1. **Açık, renkli, oyunsu.** Varsayılan tema açık. 9-14 yaş için Duolingo hissi: kalın,
   basılabilir düğme ve kartlar (altta düz "dudak"), yuvarlak yazı tipi, canlı renkler.
2. **Renklerin görevi sabit.** Ana eylem **çini turkuazı** (`--vurgu`); ödül, seri, elmas,
   biten durak ve altın yol **safran** (`--odul`); bilgi/ipucu **lapis** (`--ikincil`, `--uyari`).
3. **Her ünite kendi rengini taşır.** Öğrenme yolunda üniteler sırayla turkuaz, lapis, nar,
   safran, lale (`--unite-1..5` + `-metin` + `-golge`): başlık şeridi, sıradaki durağın halkası
   ve "Devam et" düğmesi. Kilitli ünite gri.
4. **Fotoğraf öne.** Eser fotoğrafları mozaik, madalyon ve pullarda; üstündeki metin `--karartma` ile.
5. **Ceza yok, kıyas yok.** Doğru: turkuaz + onay simgesi. İpucu: lapis + ampul. Kırmızı hata ekranı yok.
6. **Renk tek başına anlam taşımaz.** Her durumda simge + metin (WCAG 1.4.1).
7. **Yapma:** neon/parıltı, mor, degrade metin, emoji, em-dash, elle çizilmiş simge.

## 2. Renk (açık varsayılan)

| Rol | Jeton | Açık | Not |
|---|---|---|---|
| Zemin / kart | `--zemin` / `--zemin-kart` | `#f6f8fc` / `#ffffff` | kartta 2px çizgi + 4px alt kenar |
| Metin | `--metin` / `--metin-ikincil` | `#1c2433` / `#4a5468` | ≥ 4.5:1 |
| Ana eylem | `--vurgu` + `--vurgu-metin` | `#1fc2b3` + `#04211e` | metin olarak `--vurgu-koyu` `#0a6d64` |
| Ödül | `--odul` + `--odul-metin` | `#ffc233` + `#3a2700` | seri, elmas, altın yol |
| Bilgi | `--ikincil` | `#3557d6` | beyaz metinle |
| Ünite | `--unite-1..5` | turkuaz, lapis, nar, safran, lale | her birinin metin çifti ≥ 4.5:1 |

- **Koyu tema:** `#0d1418` zemin, aynı renk görevleri. **Yüksek kontrast:** siyah-beyaz-sarı; üniteler sarıya iner.
- Yeni renk gerekiyorsa üç temaya birden jeton ekleyin; `tests/tema-kontrast.test.ts` ölçer.

## 3. Tipografi

- Başlık: **Baloo 2** 700/800 (`--yazi-baslik`), yuvarlak ve oyunsu.
- Gövde: **Nunito** 500-800 (`--yazi-aile`).
- İkisi de OFL, `public/fonts/` altında yerel woff2 (latin + latin-ext: ğ ş ı İ).
- Telefon ölçeği: h1 28 · h2 22 · h3 18 · gövde 16 · küçük 13. `--yazi-olcek` ile büyür.

## 4. Şekil ve derinlik (kilitli)

| Öğe | Köşe |
|---|---|
| Düğme, girdi, simge kutusu | `--kose-sm` 16px |
| Kart, mozaik kutucuğu | `--kose-md` 20px |
| Alt sonuç sayfası, büyük yüzey | `--kose-lg` 24px |
| Madalyon, maskot, hap | tam daire |

- Düğme, kart ve mozaik kutucuğu **basılabilir**: düz dolgu + altta bulanıksız kalın kenar
  (`--bas-derinlik` 5px); basınca o kadar aşağı iner.
- Kart: yüzey + 2px çizgi + 4px alt kenar.

## 5. Bileşenler

| Bileşen | Sınıf / dosya | Kural |
|---|---|---|
| Ana düğme | `.dugme` | 52px, safran, Bricolage 700 |
| İkincil düğme | `.dugme--ikincil` | `--zemin-vurgu` dolgu |
| Seçenek | `.secenek` | 56px; seçili safran kenar; doğru safran, ipucu mavi |
| Mozaik | `src/features/bugun/Mozaik.tsx` | `Kutu` + `Foto`; 2 sütun, büyük kutucuk tam genişlik |
| Fotoğraf patikası | `src/features/yol/FotografPatikasi.tsx` | madalyon 76px, sıradaki 100px + halka |
| Pul | `src/features/defter/defter.css` | tırtıklı kenar `mask` ile |
| Sonuç sayfası | `.ders-eylem--dogru/--ipucu` | alttan yaylanır, üst köşe 24px |
| Simgeler | `src/app/Ikonlar.tsx` | Phosphor; `bold`, aktifte `fill` |
| Maskot | `src/app/Maskot.tsx` | Köstik daire portre; `mutlu`, `saskin`, `dusunceli` |

## 6. Gezinme

Alt sekme çubuğu 5 sekme: **Bugün · Yol · Keşfet · Defter · Ayarlar** (mobilde altta 64px, geniş
ekranda üstte). Profil üst çubukta avatar düğmesi (çerçeveli, sağ oklu). **Giriş seçenekleri,
Vakıf Çarşısı ve yetişkin panelleri ayrı sekme değil, Profil sayfasının bölümleridir**; `#/giris`
ve `#/carsi` rotaları Profil'i açıp ilgili bölüme kaydırır. Alt sayfaların hangi sekmeyi seçili
gösterdiği `App.tsx` → `UST_SEKME`.

## 7. Hareket

Yalnızca `transform`/`opacity`; eğri `--yay`. Hepsi `prefers-reduced-motion` ve
"Hareketi azalt" ayarıyla durur.

| An | Hareket |
|---|---|
| Sayfa/sekme değişimi | içerik 8px kayarak gelir |
| Mozaik, patika | kutucuk/duraklar sırayla yaylanır (60-70ms arayla) |
| Sıradaki durak | ünite renginde halka çizilir, durak "beni seç" der gibi zıplar |
| Cevap | sonuç sayfası alttan yaylanır, Köstik tepki verir |
| Defter | yeni pul "basılır" |

## 8. Yapma

- Ham hex/rgba (jeton dışı), turkuaz/yeşil vurgu, mor, neon parıltı.
- Bulanık gölgeli düğme (dudak düz ve bulanıksız olmalı), büyük harf etiket, eşit üçlü kart dizisi.
- Emoji, em-dash, elle çizilmiş SVG simge.
- 44px'ten küçük dokunma hedefi; `div` üzerinde `onClick`.
