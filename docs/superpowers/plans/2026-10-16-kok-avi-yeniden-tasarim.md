# Kök Avı Yeniden Tasarım (Mozaik + Fotoğraf Patikası) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uygulamanın bütün görsel dilini ve gezinmesini koyu, safran vurgulu, şablonsuz yeni tasarıma geçirmek (spec: `docs/superpowers/specs/2026-10-16-kok-avi-yeniden-tasarim-design.md`).

**Architecture:** Jeton adları korunur, değerleri değişir (`tokens.css`), böylece bütün sayfalar yeni dile otomatik geçer. Üstüne yeni kabuk (4 sekme + profil), yeni ana ekran (Mozaik), yeni Yol (fotoğraf patikası), Keşfet merkezi, Defter iç sekmeleri ve ders sonuç sayfası eklenir. Simgeler Phosphor'a, yazı tipleri yerel Bricolage Grotesque + Figtree'ye geçer.

**Tech Stack:** React 19 + TS, Vite, vitest + Testing Library + axe-core, saf CSS (jetonlar), @phosphor-icons/react.

**Ortak kurallar (her görev):** jeton dışında renk yok · emoji ve em-dash yok · dokunma ≥ 44px · her animasyon `prefers-reduced-motion` ve `[data-hareket-azalt]` ile durur · Python ile dosya düzenlerken `scratchpad/duzenle.py` (satır sonu korur, eşleşmeyi doğrular) · her görev sonunda `npm run dogrula` yeşil + commit.

---

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| `public/fonts/{bricolage,figtree}-*.woff2`, `OFL-*.txt` | Yerel yazı tipleri |
| `src/styles/tokens.css` | Renk/yazı/şekil jetonları; koyu varsayılan, açık, yüksek kontrast |
| `src/styles/global.css` | `@font-face`, temel bileşenler (düğme, kart, seçenek, rozet, bildirim, girdi) |
| `src/lib/ilerleme.ts` (🔴, 1 satır) | `VARSAYILAN_AYARLAR.tema = 'koyu'` |
| `src/app/temaGocu.ts` | Kayıtlı eski varsayılan "açık"ı bir kez koyuya taşır |
| `src/app/Ikonlar.tsx` | Aynı adlar, Phosphor sarmalayıcıları |
| `src/app/App.tsx`, `app.css` | 4 sekmeli kabuk, profil düğmesi, yeni üst/alt çubuk |
| `src/lib/yonlendirme.ts` | `bugun`, `kesfet`, `profil` rotaları; `''` → `bugun` |
| `src/features/bugun/BugunSayfasi.tsx`, `bugun.css` | Mozaik ana ekran |
| `src/features/yol/FotografPatikasi.tsx`, `patika.css` | Fotoğraf madalyonlu yol |
| `src/features/merkez/KesfetSayfasi.tsx`, `merkez.css` | Keşfet kutucukları |
| `src/features/profil/ProfilSayfasi.tsx`, `profil.css` | Ayarlar özeti, çarşı, yetişkin bağlantıları |
| `src/features/defter/DefterSayfasi.tsx` | İç sekmeler (Pullar/Rozetler/Seri/Belgeler) |
| `src/features/ders/ders.css`, `EgzersizKabugu.tsx` | Koyu ders, alttan yaylanan sonuç sayfası |
| `tests/tema-kontrast.test.ts`, `tests/bugun.test.tsx`, `tests/kesfet-profil.test.tsx` | Yeni testler; `kabuk.test.tsx` güncellenir |

---

### Task 1: Yerel yazı tipleri

**Files:** Create `public/fonts/bricolage-latin.woff2`, `bricolage-latin-ext.woff2`, `figtree-latin.woff2`, `figtree-latin-ext.woff2`, `OFL-Bricolage.txt`, `OFL-Figtree.txt` · Modify `src/styles/global.css` (başına), `src/styles/tokens.css` (`--yazi-aile`)

- [ ] **Step 1:** Dosyaları indir (Google Fonts CSS2 çıktısındaki woff2 adresleri, değişken ağırlık):
```bash
cd public/fonts
curl -sLo bricolage-latin.woff2 https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9K6as8bTXq_nANBjzKo3IeZx8z6up5BeSl9D4dj_x9PpZBMlGIInE.woff2
curl -sLo bricolage-latin-ext.woff2 https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9K6as8bTXq_nANBjzKo3IeZx8z6up5BeSl9D4dj_x9PpZBMlGGInHEVA.woff2
curl -sLo figtree-latin.woff2 https://fonts.gstatic.com/s/figtree/v9/_Xms-HUzqDCFdgfMm4S9DQ.woff2
curl -sLo figtree-latin-ext.woff2 https://fonts.gstatic.com/s/figtree/v9/_Xms-HUzqDCFdgfMm4q9DbZs.woff2
curl -sLo OFL-Bricolage.txt https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/OFL.txt
curl -sLo OFL-Figtree.txt https://raw.githubusercontent.com/google/fonts/main/ofl/figtree/OFL.txt
```
Expected: dosyalar > 10 KB (`ls -la`).
- [ ] **Step 2:** `global.css` başına `@font-face` (her aile için latin + latin-ext, `font-weight: 500 800`, `font-display: swap`, `unicode-range` Google çıktısındaki gibi). `tokens.css`: `--yazi-aile: "Figtree", system-ui, sans-serif; --yazi-baslik: "Bricolage Grotesque", "Figtree", system-ui, sans-serif;` ve `h1..h4 { font-family: var(--yazi-baslik); letter-spacing: -0.02em }`.
- [ ] **Step 3:** `npm run dogrula` yeşil; commit `Yazı tipleri: Bricolage Grotesque + Figtree (yerel, OFL)`.

### Task 2: Jetonlar (koyu varsayılan, safran vurgu) + kontrast testi

**Files:** Modify `src/styles/tokens.css` · Create `tests/tema-kontrast.test.ts`

- [ ] **Step 1: Failing test** — `tokens.css`'i okuyup her tema bloğunda (`[data-tema='koyu']`, `:root,[data-tema='acik']`, `[data-tema='yuksek-kontrast']`) şu çiftlerin WCAG oranını hesaplar: `metin/zemin ≥ 7`, `metin/zemin-kart ≥ 4.5`, `metin-ikincil/zemin-kart ≥ 4.5`, `vurgu-metin/vurgu ≥ 4.5`. Ayrıca koyu temada `--vurgu` değerinin turkuaz/yeşil olmadığını (ton açısı 60-200 arası değil) denetler.
```ts
import { readFileSync } from 'node:fs';
const css = readFileSync('src/styles/tokens.css', 'utf8');
function blok(secici: string): Record<string, string> { /* seçicinin { } içindeki --ad: #hex; çiftleri */ }
function oran(a: string, b: string): number { /* sRGB göreli parlaklık, (L1+.05)/(L2+.05) */ }
```
- [ ] **Step 2:** Çalıştır, FAIL (vurgu hâlâ turkuaz).
- [ ] **Step 3:** Jetonları yeniden yaz. Koyu (`[data-tema='koyu']`): `--zemin #0e1315; --zemin-kart #161d20; --zemin-vurgu #1d2629; --cizgi #2a3539; --cizgi-kalin #3a474c; --metin #eef2f0; --metin-ikincil #a9b8b5; --metin-soluk #8a9a97; --vurgu #ffbf3c; --vurgu-metin #2a1c00; --vurgu-koyu #ffd27a; --vurgu-golge #b8862a; --vurgu-yumusak #2b2414; --odul #ffbf3c; --odul-metin #2a1c00; --odul-golge #b8862a; --odul-yumusak #2b2414; --basari #ffbf3c; --basari-yumusak #2b2414; --uyari #8ea6ff; --uyari-yumusak #1a2140; --hata #ff8a7a; --hata-yumusak #3a1a16; --ikincil #8ea6ff; --ikincil-yumusak #1a2140; --ikincil-metin #0a1230; --sicak #ffbf3c; --odak #ffd27a; --golge 0 6px 18px rgba(4,8,10,.45); --golge-buyuk 0 16px 40px rgba(4,8,10,.55); --bas-derinlik 0px`. Köşe: `--kose-sm 12px; --kose-md 20px; --kose-lg 24px`. Açık (`:root,[data-tema='acik']`): kırık beyaz `#f6f4ef` zemin, `#ffffff` kart, metin `#14191b`, vurgu `#ffbf3c` + koyu metin, `--vurgu-koyu #8a5b00` (metin olarak kullanılan vurgu). Yüksek kontrast: siyah değil `#050607` zemin, `#ffffff` metin, vurgu `#ffd000`. `data-palet` blokları silinir (palet karşılaştırması bitti).
- [ ] **Step 4:** Test PASS; `npm run dogrula`; commit `Jetonlar: koyu varsayılan, safran tek vurgu, kontrast testi`.

### Task 3: Koyu varsayılan + bir kerelik göç

**Files:** Modify `src/lib/ilerleme.ts:24` · Create `src/app/temaGocu.ts` · Modify `src/app/DurumSaglayici.tsx` (ilerleme başlatıcısı) · Test `tests/tema-gocu.test.ts`

- [ ] **Step 1: Test**
```ts
import { temaGocuUygula } from '../src/app/temaGocu';
it('eski varsayılan açık bir kez koyuya taşınır, sonra kullanıcı seçimine dokunulmaz', () => {
  localStorage.clear();
  expect(temaGocuUygula({ tema: 'acik' } as never).tema).toBe('koyu');
  expect(temaGocuUygula({ tema: 'acik' } as never).tema).toBe('acik'); // ikinci kez: kullanıcı seçti
});
```
- [ ] **Step 2:** `temaGocu.ts`: `const ANAHTAR='kokavi-tema-gocu-v1'; export function temaGocuUygula<T extends {tema:string}>(a:T):T { try { if (localStorage.getItem(ANAHTAR)) return a; localStorage.setItem(ANAHTAR,'1'); return a.tema==='acik'?{...a,tema:'koyu'}:a; } catch { return a; } }`. `DurumSaglayici`: `useState(() => { const i = ilerlemeYukle(); return { ...i, ayarlar: temaGocuUygula(i.ayarlar) }; })`. `ilerleme.ts`: `tema: 'koyu'`.
- [ ] **Step 3:** Test PASS, `dogrula`, commit `Koyu tema varsayılan (+ eski açık ayarı bir kez taşır)`.

### Task 4: Phosphor simgeleri

**Files:** `package.json` · Modify `src/app/Ikonlar.tsx`

- [ ] **Step 1:** `npm install @phosphor-icons/react@2.1.10 --save-exact`.
- [ ] **Step 2:** `Ikonlar.tsx`: `Svg` yardımcı ve elle çizilmiş yolları kaldır; aynı dışa aktarılan adlar Phosphor'u sarar, `aria-hidden` korunur:
```tsx
import { House, Path, Compass, BookOpen, UserCircle, Flame, Diamond, Lock, Check, X, SpeakerHigh, Stop, Lightbulb, ArrowsClockwise, Question, ArrowsLeftRight, Hourglass, Coin, Timer, Star, ArrowRight, DiceFive, Warning, MapTrifold, Gear, Mosque, Church, Bathtub, Storefront, Books, Bridge, Drop, Tent, BuildingApartment } from '@phosphor-icons/react';
type P = { boyut?: number; kalinlik?: number; className?: string };
const s = (C: Icon) => ({ boyut = 24, className }: P) => <C size={boyut} weight="bold" className={className} aria-hidden="true" focusable="false" />;
export const IkonAlev = s(Flame); /* … her eski ad için eşleme … */
```
`IkonTur` tür → simge eşlemesi (Cami/Mescit → Mosque, Kilise → Church, Hamam → Bathtub, Han/Bedesten → Storefront, Medrese/Mektep → Books, Köprü → Bridge, Çeşme → Drop, Türbe → Tent, diğer → BuildingApartment). `YildizDugum` ve `Avatar` aynı kalır (marka/çizim).
- [ ] **Step 3:** `npx tsc -b --noEmit`; `npm run dogrula`; commit `Simgeler: Phosphor (tek aile, bold)`.

### Task 5: Temel bileşen stilleri

**Files:** Modify `src/styles/global.css`

- [ ] **Step 1:** `.dugme`: düz safran dolgu, `--vurgu-metin` yazı, `border-radius: var(--kose-sm)`, yükseklik 52px, `font-family: var(--yazi-baslik)`, 700, büyük harf YOK, gölge yok; `:active { transform: scale(.97) }`; `.dugme--ikincil`: `--zemin-vurgu` dolgu + `--metin`; `:focus-visible` 3px `--odak` halka. `.kart`: `--zemin-kart`, `border: 1px solid var(--cizgi)`, `--kose-md`, gölge yok. `.secenek`: 56px, `--zemin-kart`, seçili `border-color: var(--vurgu)`. `.rozet`, `.bildirim*` yeni jetonlarla. Girdiler: `--zemin-vurgu` zemin, 1px çizgi, odakta vurgu kenar.
- [ ] **Step 2:** `npm run dogrula` (axe testleri) yeşil; commit `Temel bileşenler: düz, gölgesiz, safran`.

### Task 6: Kabuk (4 sekme + profil) ve rotalar

**Files:** Modify `src/lib/yonlendirme.ts`, `src/app/App.tsx`, `src/app/app.css` · Modify `tests/kabuk.test.tsx`

- [ ] **Step 1: Test güncelle** — gezinmede 4 bağlantı (`#/`→ Bugün `#/bugun`, `#/yol`, `#/kesfet`, `#/defter`); başlangıçta aktif "Bugün"; üst çubukta "Profil" bağlantısı (`#/profil`); `#/ogretmen` ve `#/panel` çocuk gezinmesinde değil, profil sayfasının "Yetişkinler için" gezinmesinde (`#/profil` açılınca). `rotayiCoz('')` → `{ad:'bugun'}`.
- [ ] **Step 2:** FAIL gör.
- [ ] **Step 3:** `yonlendirme.ts`: `| {ad:'bugun'} | {ad:'kesfet'} | {ad:'profil'}`; boş hash → `bugun`. `App.tsx`: `GEZINME = [Bugün(#/bugun, IkonEv), Yol(#/yol, IkonYol), Keşfet(#/kesfet, IkonPusula), Defter(#/defter, IkonDefter)]`; `UST_SEKME` güncellenir (harita/arsiv/zaman-tuneli/rota → kesfet; gunun-eseri/hayrat-akar/hatalar/canli/canli-oyna/sinif → bugun; seri/sertifika → defter; ayarlar/carsi/ogretmen/panel → profil); üst çubukta seri + elmas + `<a href="#/profil" aria-label="Profil">` avatar. Altbilgide yalnızca künye satırı; "Yetişkinler için" gezinmesi profil sayfasına taşınır. `app.css`: üst çubuk 56px, alt çubuk 64px + güvenli alan; aktif sekme safran simge (`weight="fill"`) + etiket, kutu/hap yok.
- [ ] **Step 4:** PASS, `dogrula`, commit `Kabuk: Bugün · Yol · Keşfet · Defter + profil`.

### Task 7: Bugün (Mozaik)

**Files:** Create `src/features/bugun/BugunSayfasi.tsx`, `bugun.css` · Test `tests/bugun.test.tsx`

- [ ] **Step 1: Test** — `#/` açılınca: "Derse devam"/"Başla" bağlantısı sıradaki derse gider (`#/ders/<guncelDersId>`); "Günün Eseri", "Hayrat mı Akar mı?", "Canlı yarışma", "Sınıfım" kutucukları bağlantı; seri sayısı metinle; tanıtım turu yeni kullanıcıda görünür; axe 0 ihlal.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Bileşen: `yol.guncelDersId` → ders + eser (`yol.sehirler…dersler`), fotoğraf `/gorseller/<eserId>/1.webp`. Izgara: `grid-template-columns: 1fr 1fr`, büyük kutucuk `grid-column: 1/-1; aspect-ratio: 4/3`; karartma `linear-gradient(to top, …)` jetonlu; kutucuk girişleri `animation-delay: calc(var(--sira) * 60ms)`. Günün Eseri: bugünün eserinin `k.webp`'si `filter: blur(8px)`. Hatalarımı çalış yalnızca `useHataSayisi() > 0`. TanitimTuru en üstte (yeni kullanıcı). Eski `YolSayfasi`'ndaki karşılama ve Bugün şeridi buraya taşınır.
- [ ] **Step 4:** PASS, `dogrula`, commit `Bugün: fotoğraflı mozaik ana ekran`.

### Task 8: Yol (Fotoğraf Patikası)

**Files:** Create `src/features/yol/FotografPatikasi.tsx`, `patika.css` · Modify `src/features/yol/YolSayfasi.tsx` · Tests: mevcut yol/zaman/a11y testleri

- [ ] **Step 1:** `FotografPatikasi({ unite, guncelDersId })`: `<ol>`; her ders `<li>` içinde `<a href="#/ders/…" aria-label="Ulucami, tamamlandı">` (kilitliyse `<span aria-disabled>` + "kilitli"); madalyon `img src=/gorseller/<eserId>/k.webp alt=""`; sıradaki için SVG ilerleme halkası (`stroke-dasharray` çizim animasyonu) + yanında ad ve "Devam et"; zigzag `--kayma` (0, -60, -84, -60, 0, 60, 84, 60 px; mobilde %60). Ünite başlığı: ad + `progressbar` (kabuk testi).
- [ ] **Step 2:** `YolSayfasi`: başlık (şehir), sekme seçici (Şehirlere göre / Zamana göre), tekrar kartı, şehir şehir `FotografPatikasi`; karşılama/Bugün şeridi/seri şeridi kaldırılır (Bugün'e taşındı). `ZamanListesi` yeni dile.
- [ ] **Step 3:** `npm run dogrula`; commit `Yol: fotoğraf madalyonlu patika`.

### Task 9: Keşfet merkezi ve Profil

**Files:** Create `src/features/merkez/KesfetSayfasi.tsx`, `merkez.css`, `src/features/profil/ProfilSayfasi.tsx`, `profil.css` · Test `tests/kesfet-profil.test.tsx`

- [ ] **Step 1: Test** — Keşfet: Harita, Meraklısına arşivi, Zaman tüneli, Keşif rotası bağlantıları; Profil: Ayarlar, Vakıf Çarşısı bağlantıları ve "Yetişkinler için" gezinmesi (`#/ogretmen`, `#/panel`, `#/canli/kur`); ikisi de axe 0.
- [ ] **Step 2:** FAIL → bileşenler: karışık boyutlu kutucuklar (Harita büyük, fotoğraflı; arşiv eser fotoğrafı; zaman tüneli en eski eserin fotoğrafı; rota). Profil: avatar + seviye, satır listesi (simge + etiket + ok), yetişkin gezinmesi.
- [ ] **Step 3:** PASS, `dogrula`, commit `Keşfet merkezi ve profil sayfası`.

### Task 10: Ders (koyu, alttan sonuç sayfası)

**Files:** Modify `src/features/ders/ders.css`, `src/features/ders/EgzersizKabugu.tsx`

- [ ] **Step 1:** `ders.css` yeni jetonlarla (turkuaz/yeşil kalıntı yok); `.ders-eylem` geri bildirimli hâlde alttan yaylanan sayfa: `animation: ders-sayfa .32s cubic-bezier(.2,1,.3,1)` (`translateY(100%)`→0), doğru: `--vurgu-yumusak` zemin + safran kenar + onay simgesi, ipucu: `--ikincil-yumusak` + mavi kenar + ampul simgesi; Köstik tepkisi kalır. İlerleme çubuğu bölümlü (5 adım).
- [ ] **Step 2:** `npm run dogrula` (ders axe + akış testleri); commit `Ders: koyu, alttan yaylanan sonuç`.

### Task 11: Defter iç sekmeleri

**Files:** Modify `src/features/defter/DefterSayfasi.tsx`, `defter.css`

- [ ] **Step 1:** Üstte sekme seçici (`role="tablist"`, `aria-selected`, ok tuşlarıyla geçiş): Pullar (mevcut defter albümü, fotoğraf pulu: `k.webp` + tırtıklı kenar `mask: radial-gradient(...)`), Rozetler (`RozetPanosu`), Seri (`SeriSayfasi` gövdesi), Belgeler (`SertifikaBaglantilari`). Seçim `#/defter?sekme=…` ile derin bağlantılanabilir.
- [ ] **Step 2:** `dogrula`; commit `Defter: Pullar · Rozetler · Seri · Belgeler`.

### Task 12: Tarama, şablon denetimi, belgeler

- [ ] **Step 1:** Bütün `*.css` dosyalarında turkuaz/yeşil kalıntı ara: `grep -rn "0f7f7a\|3cbfae\|1cb0a6\|2fc4b8" src` → yalnızca jeton dışı kalmamalı.
- [ ] **Step 2:** Tarayıcıda 360/375/414 px, koyu/açık/yüksek kontrast, hareketi azalt: bütün rotalarda yatay taşma yok, konsol hatası yok.
- [ ] **Step 3:** `DESIGN.md`'yi yeni sisteme göre yeniden yaz; `docs/GECE-RAPORU.md`'ye bölüm ekle; `npm run dogrula`; commit `Yeniden tasarım: denetim ve belgeler`.

---

## Self-review

- Spec kapsamı: renk/tipografi/şekil (T1-2,5) · koyu varsayılan (T3) · simgeler (T4) · gezinme 4 sekme + profil (T6, T9) · Bugün (T7) · Yol (T8) · Keşfet (T9) · Ders + sonuç sayfası (T10) · Defter (T11) · test/kabul (T2,6,7,9,12). Eksik yok.
- Ad tutarlılığı: rotalar `bugun`, `kesfet`, `profil`; bileşenler `BugunSayfasi`, `FotografPatikasi`, `KesfetSayfasi`, `ProfilSayfasi`; `temaGocuUygula`.
