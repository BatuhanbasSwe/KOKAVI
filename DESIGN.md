# DESIGN.md — Kök Avı tasarım sistemi (mobil öncelikli)

> **Kaynak:** Yapı (boşluk ölçeği, kart hiyerarşisi, tek vurgu rengi, tek gölge katmanı,
> mobilde alta yapışık eylem) **Airbnb** DESIGN.md'sinden uyarlandı
> (`~/.claude/skills/design-md/library/airbnb.md`). Çocuk uygulaması dokusu (tombul,
> basılınca çöken düğmeler, yuvarlak köşeler) **ui-ux-pro-max** önerisindeki
> *Claymorphism*'den. **Palet, yazı tipi ve maskot Kök Avı'nındır** — hiçbir marka
> varlığı kopyalanmadı.
>
> Gerçek değerler `src/styles/tokens.css` içindedir; bu dosya *nasıl kullanılacağını* anlatır.
> Bileşen kodunda ham renk yok: yalnızca jetonlar.

## 1. İlkeler

1. **Tek vurgu.** Turkuaz (`--vurgu`) ana eylemi taşır: "Başla", "Derse devam", aktif sekme.
   Ekranın çoğu sakin zemin + koyu metin. Altın (`--odul`) yalnızca ödül/bugün anları.
2. **İlk ekran = sıradaki eylem.** Telefonda açılınca çocuk tek dokunuşla derse girebilmeli
   (karşılama kartı). Yardımcı içerik yana kaydırılan şeritte, dikey yığında değil.
3. **Ceza yok, kıyas yok.** Yanlışta ipucu tonu (sarı/turkuaz), asla kırmızı "hata" ekranı.
   Sıralama yalnızca canlı yarışmada, takma adla.
4. **Renk tek başına anlam taşımaz.** Her durum simge + metin. Simgeler SVG (`src/app/Ikonlar.tsx`),
   **emoji yasak** (temaya boyanmaz, ekran okuyucu tutarsız okur).
5. **Hareket anlam taşır ve susturulabilir.** Her animasyon `prefers-reduced-motion` ve
   Ayarlar → "Hareketi azalt" ile durur. Ses/titreşim "Sessiz mod"a uyar.

## 2. Renk (jeton → rol)

| Rol | Jeton | Kullanım |
|---|---|---|
| Zemin | `--zemin` | Sayfa tabanı (sıcak krem) |
| Yüzey | `--zemin-kart` | Kartlar, üst ve alt çubuk |
| Yumuşak yüzey | `--zemin-vurgu` | Pasif hücreler, çubuk izleri |
| Metin | `--metin` / `--metin-ikincil` / `--metin-soluk` | Başlık-gövde / alt satır / not |
| Vurgu (tek) | `--vurgu`, `--vurgu-metin`, `--vurgu-golge`, `--vurgu-yumusak` | Ana eylem, aktif durum |
| Ödül | `--odul`, `--odul-metin`, `--odul-golge`, `--odul-yumusak` | Günün Eseri, rozet, seri günü |
| Başarı / uyarı | `--basari*`, `--uyari*` | Doğru cevap / öğrenme anı |
| Sıcak metin | `--sicak` | Küçük üst etiketler, yıl, alev simgesi |
| Maskot | `--maskot-*` | Yalnızca Köstik çizimi (her temada aynı) |

Üç tema (açık / koyu / yüksek kontrast) aynı jeton adlarıyla tanımlıdır; bileşen tema bilmez.
Metin kontrastı her temada ≥ 4.5:1 (testli: `tests/erisilebilirlik.test.ts`).

## 3. Tipografi

- Yazı tipi: **Nunito** (yerel, çevrimdışı; OFL). Yuvarlak, çocuk dostu. Gövde **600**.
- Başlıklar **800** (900 telefonda kaba duruyordu), `text-wrap: balance`.

| Seviye | Masaüstü | Telefon (≤720px) |
|---|---|---|
| h1 | 36px (`--yazi-3xl`) | 28px |
| h2 | 28px | 22px |
| h3 | 22px | 18px |
| Gövde | 16px, satır 1.6 | 16px |
| Etiket (üst başlık) | 12px, 800, büyük harf, aralıklı, `--sicak` | aynı |

Tüm boyutlar `--yazi-olcek` ile çarpılır (Ayarlar → Yazı boyutu).

## 4. Boşluk, köşe, gölge

- Ölçek (4/8 ritmi): `--b-1` 4 · `--b-2` 8 · `--b-3` 12 · `--b-4` 16 · `--b-5` 24 · `--b-6` 32 · `--b-7` 48.
- Köşe: `--kose-sm` 10 (çip, simge kutusu) · `--kose-md` 16 (kart) · `--kose-lg` 20 (büyük kart, fotoğraf) · `--kose-tam` (hap).
- Derinlik (claymorphism): kartlar ve düğmeler **alt kenar gölgesi** `0 var(--bas-derinlik) 0 <ton>`;
  basınca `translateY(--bas-derinlik)` ile çöker (düzen kaymaz). Yüzer gölge yalnızca
  `--golge` / `--golge-buyuk` (Airbnb'deki tek katman gibi).

## 5. Mobil kabuk

- **Üst çubuk:** yapışık, çentik payı `env(safe-area-inset-top)`; marka + seri (→ takvim) + elmas (→ çarşı) + seviye.
- **Alt sekme çubuğu (≤720px):** 5 sekme (Yol, Defter, Harita, Sınıfım, Ayarlar), 64px, alt güvenli alan payı;
  aktif sekme turkuaz çerçeveli hap. İçerik ve altbilgi altta 80px + güvenli alan boşluk bırakır.
- **Ders odak modu:** gezinme gizli; eylem çubuğu (`.ders-eylem`) alta yapışık, güvenli alan paylı.
- Kenar payı: telefonda ~10–16px; geniş ekranda içerik 720px'te ortalanır.

## 6. Bileşenler

| Bileşen | Sınıf | Kural |
|---|---|---|
| Ana düğme | `.dugme` | Turkuaz, 48px+, büyük harf, 800; basınca çöker |
| İkincil düğme | `.dugme--ikincil` | Yüzey + çizgi; aynı yükseklik |
| Kart | `.kart` | Yüzey, 16px köşe, 2px çizgi; özel kartlar `.kart.<ad>` ile güçlendirilir |
| Karşılama | `.kart.karsilama` | Köstik + söz + ana eylem; turkuaz çerçeve |
| Bugün şeridi | `.pratik__liste` | Telefonda yatay `scroll-snap`, kart ~%46 genişlik; masaüstünde ızgara |
| İlerleme | `.yol-ozet__cubuk` | 10px hap; `role="progressbar"` + `aria-valuenow` |
| Sekme seçici | `.yol-gorunum` | İki düğme, `aria-pressed`; seçili olan yüzeye kalkar |
| Rozet / çip | `.rozet`, `.canli-cip` | Hap; seçili çipte ✓ ön eki (renk + işaret) |
| Maskot | `<Maskot>` | Köstik SVG; ifadeler: meraklı, `mutlu`, `saskin`, `dusunceli`; her zaman `aria-hidden` |

## 7. Dokunma ve erişilebilirlik

- Dokunulan her şey `<button>` / `<a>`; hedef ≥ 44×44px (MapLibre düğmeleri dahil).
- Sürükle-bırak her zaman düğme + klavye eşdeğeriyle (Hayrat mı Akar mı: ← →).
- Harita görsel özettir; aynı bilgi sayfadaki listede (eserler, "Para nereye akıyordu?").
- axe ile 0 ihlal (her yeni ekran için test).

## 8. Yap / Yapma

**Yap:** jeton kullan · simgeyi SVG ve `aria-hidden` yap, anlamı metne koy · ilk ekranda tek ana eylem ·
uzun listeyi yüzyıl/şehir başlıklarıyla böl · her yeni ekranı 360/375/414px'te yatay taşma için kontrol et.

**Yapma:** ham renk · emoji simge · 900 kalınlıkta uzun başlık · yalnızca renkle durum · süre baskısı ·
kırmızı "yanlış" ekranı · `.kart`'ı tek sınıfla ezmeye çalışmak (özgüllük için `.kart.<ad>`).
