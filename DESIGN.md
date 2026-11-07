# DESIGN.md: Kök Avı tasarım sistemi ("Mozaik + Fotoğraf Patikası")

> Karar belgesi: `docs/superpowers/specs/2026-10-16-kok-avi-yeniden-tasarim-design.md`.
> Gerçek değerler `src/styles/tokens.css` içindedir; bu dosya *nasıl kullanılacağını* anlatır.
> Bileşen kodunda ham renk yok: yalnızca jetonlar.

## 1. İlkeler

1. **Koyu, tek vurgu.** Varsayılan tema koyu. Tek vurgu rengi **safran** (`--vurgu`): ana eylem,
   aktif sekme, ilerleme, biten durak, seri ve ödül. **Turkuaz ve yeşil arayüzde yok**
   (`tests/tema-kontrast.test.ts` bunu denetler).
2. **Fotoğraf öne.** Eser fotoğrafları arayüzün asıl rengidir: Bugün mozaiği, Yol madalyonları,
   Defter pulları. Fotoğraf üstündeki metin her zaman `--karartma` geçişi + `--foto-metin` ile.
3. **İlk ekran = sıradaki eylem.** Bugün sekmesinde büyük fotoğraflı "sıradaki ders" kutucuğu,
   tek dokunuşla derse girer.
4. **Ceza yok, kıyas yok.** Doğru: safran + onay simgesi. İpucu: kısık İznik mavisi (`--uyari`)
   + ampul simgesi. Kırmızı "hata" ekranı yok. Sıralama yalnızca canlı yarışmada, takma adla.
5. **Renk tek başına anlam taşımaz.** Her durumda simge + metin (WCAG 1.4.1).
6. **Şablon görüntüsü yok.** Neon/parıltı, mor, degrade metin, büyük harfli etiket, emoji,
   em-dash, elle çizilmiş simge yok.

## 2. Renk (koyu varsayılan)

| Rol | Jeton | Koyu | Not |
|---|---|---|---|
| Zemin | `--zemin` | `#000000` | tam siyah; yüzeyler soğuk koyu gri |
| Yüzey | `--zemin-kart` | `#161d20` | kart, liste |
| Yüzey 2 | `--zemin-vurgu` | `#1d2629` | simge kutusu, girdi, ikincil düğme |
| Çizgi | `--cizgi` / `--cizgi-kalin` | `#2a3539` / `#3a474c` | 1px |
| Metin | `--metin` / `--metin-ikincil` / `--metin-soluk` | `#eef2f0` / `#a9b8b5` / `#8a9a97` | hepsi kartta ≥ 4.5:1 |
| Vurgu | `--vurgu` + `--vurgu-metin` | `#ffbf3c` + `#2a1c00` | dolgu; üstünde koyu metin |
| Vurgu (metin olarak) | `--vurgu-koyu` | `#ffd27a` | açık temada `#8a5b00` |
| İpucu/bilgi | `--uyari`, `--ikincil` | `#8ea6ff` | yalnızca metin, simge, kenar |

- **Açık tema:** kırık beyaz `#f6f4ef` (bej değil) + aynı safran. Safran açık zeminde metin
  olamaz; metin olarak `--vurgu-koyu` kullanılır.
- **Yüksek kontrast:** `#050607` zemin, beyaz metin, `#ffd000` vurgu, 2px çerçeveler.
- **Yeni renk gerekiyorsa** üç temaya birden jeton ekleyin; kontrast testi yeni çifti ölçsün.

## 3. Tipografi

- Başlık: **Bricolage Grotesque** 700/800, `letter-spacing: -0.02em` (`--yazi-baslik`).
- Gövde: **Figtree** 500/600/700 (`--yazi-aile`).
- İkisi de OFL, `public/fonts/` altında yerel woff2 (latin + latin-ext: ğ ş ı İ).
- Telefon ölçeği: h1 28 · h2 22 · h3 18 · gövde 16 · küçük 13. `--yazi-olcek` ile büyür.
- 900 ağırlık ve büyük harfli küçük etiket kullanılmaz.

## 4. Şekil ve derinlik (kilitli)

| Öğe | Köşe |
|---|---|
| Düğme, girdi, simge kutusu | `--kose-sm` 12px |
| Kart, mozaik kutucuğu | `--kose-md` 20px |
| Alt sonuç sayfası, büyük yüzey | `--kose-lg` 24px |
| Madalyon, maskot, hap | tam daire |

- Düğmeler **gölgesiz**, düz dolgu; basınca `scale(.97)`.
- Kart: yüzey + 1px çizgi; gölge yok. Kart yalnızca hiyerarşi gerekiyorsa.

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
| Sıradaki durak | halka çizilir, madalyon yavaş nefes alır (tek döngü) |
| Cevap | sonuç sayfası alttan yaylanır, Köstik tepki verir |
| Defter | yeni pul "basılır" |

## 8. Yapma

- Ham hex/rgba (jeton dışı), turkuaz/yeşil vurgu, mor, neon parıltı.
- Gölgeli "3B" düğme, büyük harf etiket, eşit üçlü kart dizisi.
- Emoji, em-dash, elle çizilmiş SVG simge.
- 44px'ten küçük dokunma hedefi; `div` üzerinde `onClick`.
