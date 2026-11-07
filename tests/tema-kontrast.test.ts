import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Tema jetonlarının kontrast denetimi (WCAG 2.2). tokens.css doğrudan okunur;
 * her tema bloğunda metin/zemin çiftleri ölçülür. Ayrıca turkuaz/yeşil vurgunun
 * geri gelmemesi denetlenir (kullanıcı kararı: tek vurgu safran).
 */
const css = readFileSync('src/styles/tokens.css', 'utf8');

function blok(secici: string): Record<string, string> {
  const bas = css.indexOf(secici + ' {');
  if (bas < 0) throw new Error('blok yok: ' + secici);
  const govde = css.slice(css.indexOf('{', bas) + 1, css.indexOf('}', bas));
  const jetonlar: Record<string, string> = {};
  for (const m of govde.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) jetonlar[m[1]] = m[2];
  return jetonlar;
}

function parlaklik(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function oran(a: string, b: string): number {
  const [l1, l2] = [parlaklik(a), parlaklik(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function ton(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const TEMALAR = [
  ["[data-tema='koyu']", 'koyu'],
  ["[data-tema='acik']", 'açık'],
  ["[data-tema='yuksek-kontrast']", 'yüksek kontrast'],
] as const;

describe('tema kontrastı', () => {
  for (const [secici, ad] of TEMALAR) {
    describe(ad, () => {
      const j = blok(secici);
      it.each([
        ['metin', 'zemin', 7],
        ['metin', 'zemin-kart', 4.5],
        ['metin-ikincil', 'zemin-kart', 4.5],
        ['metin-soluk', 'zemin-kart', 4.5],
        ['vurgu-metin', 'vurgu', 4.5],
        ['odul-metin', 'odul', 4.5],
        ['hata-metin', 'hata', 4.5],
        ['ikincil-metin', 'ikincil', 4.5],
        ['vurgu-koyu', 'zemin-kart', 4.5],
        ['vurgu-koyu', 'vurgu-yumusak', 4.5],
      ])('%s / %s >= %s', (on, arka, esik) => {
        expect(j[on], `--${on}`).toBeDefined();
        expect(j[arka], `--${arka}`).toBeDefined();
        expect(oran(j[on], j[arka])).toBeGreaterThanOrEqual(esik);
      });
    });
  }

  it('vurgu turkuaz ya da yeşil değil (hiçbir temada)', () => {
    for (const [secici] of TEMALAR) {
      const h = ton(blok(secici).vurgu);
      expect(h < 60 || h > 200, `${secici} ton ${h}`).toBe(true);
    }
  });

  it('eski turkuaz değerleri jetonlarda kalmadı', () => {
    expect(css).not.toMatch(/#(0f7f7a|3cbfae|6fd3c4|0a5a56|1cb0a6|2fc4b8)/i);
  });
});

/**
 * GERÇEK METİN/ARKA PLAN ÇİFTLERİ — WCAG 2.2 AA (SC 1.4.3).
 *
 * Neden ayrı: jsdom'da yerleşim/canvas olmadığı için axe-core'un
 * `color-contrast` kuralı ÇALIŞMAZ (bkz. docs/ERISILEBILIRLIK.md). Bu yüzden
 * renk ölçümü burada, jetonların gerçek hex değerleri üzerinden WCAG
 * relative-luminance formülüyle yapılır. Çiftler uydurulmadı: her satırdaki
 * iki jeton ürün CSS'inde gerçekten metin/arka plan olarak birlikte kullanılır.
 *
 * Eşikler (WCAG 2.2 SC 1.4.3): normal metin >= 4.5:1 · büyük metin
 * (>= 24px ya da >= 18.66px kalın) >= 3:1. AAA hedefi (7:1) üstteki temel
 * testte ayrıca ölçülür.
 */
const NORMAL_METIN_CIFTLERI = [
  ['metin', 'zemin', 'global.css gövde metni'],
  ['metin', 'zemin-kart', 'kart gövdesi'],
  ['metin', 'zemin-vurgu', 'global.css form alanı metni'],
  ['metin-ikincil', 'zemin', 'sayfa ikincil metni'],
  ['metin-ikincil', 'zemin-kart', 'kart ikincil metni'],
  ['metin-soluk', 'zemin', 'app.css altbilgi metni'],
  ['metin-soluk', 'zemin-kart', 'kart içi soluk metin'],
  ['metin-soluk', 'zemin-vurgu', 'global.css ::placeholder'],
  ['vurgu-metin', 'vurgu', 'global.css .dugme birincil'],
  ['odul-metin', 'odul', 'canli.css .canli-puan · harita elmas rozeti'],
  ['ikincil-metin', 'ikincil', 'global.css .dugme--mavi'],
  ['hata-metin', 'hata', 'global.css .dugme--tehlike'],
  ['vurgu-koyu', 'zemin', 'global.css .etiket (sayfa zemini)'],
  ['vurgu-koyu', 'zemin-kart', 'kart içi etiket'],
  ['vurgu-koyu', 'vurgu-yumusak', 'merkez.css .yasiyor-rozet · arsiv.css çipler'],
  ['altin-metin', 'odul-yumusak', 'harita.css .hm-popup__durum--ogrenildi'],
  ['altin-metin', 'zemin-kart', 'ders.css .ders-sonu__defter-ust'],
  ['basari', 'basari-yumusak', 'ders.css .ders-ilerleme__adim--tamam'],
  ['uyari', 'uyari-yumusak', 'panel.css .rozet--belgesiz'],
  ['ikincil', 'ikincil-yumusak', 'harita.css .hm-popup__durum · canli takma ad'],
  ['sicak', 'sicak-yumusak', 'harita.css .rozet--sergi'],
  ['hata', 'zemin-kart', 'carsi.css .veli-kapisi__hata'],
] as const;

const BUYUK_METIN_CIFTLERI = [
  ['metin', 'zemin', 'h1 sayfa başlığı (yazi-2xl/3xl)'],
  ['metin', 'zemin-kart', 'kart başlığı (yazi-2xl)'],
  ['vurgu-koyu', 'zemin', 'ders.css .ders-sonu__baslik h1 (yazi-3xl)'],
  ['vurgu-koyu', 'zemin-kart', 'canli.css .canli-pin__sayi (clamp 2.6–5rem)'],
  ['metin-soluk', 'zemin-kart', 'canli.css .canli-podyum__sira (yazi-3xl)'],
] as const;

describe('gerçek metin/arka plan çiftleri — WCAG 2.2 AA', () => {
  for (const [secici, ad] of TEMALAR) {
    describe(ad, () => {
      const j = blok(secici);

      it.each(NORMAL_METIN_CIFTLERI)(
        '%s / %s >= 4.5:1 (normal metin — %s)',
        (on, arka, nerede) => {
          expect(j[on], `--${on} yok (${nerede})`).toBeDefined();
          expect(j[arka], `--${arka} yok (${nerede})`).toBeDefined();
          expect(oran(j[on], j[arka])).toBeGreaterThanOrEqual(4.5);
        },
      );

      it.each(BUYUK_METIN_CIFTLERI)(
        '%s / %s >= 3:1 (büyük metin — %s)',
        (on, arka, nerede) => {
          expect(j[on], `--${on} yok (${nerede})`).toBeDefined();
          expect(j[arka], `--${arka} yok (${nerede})`).toBeDefined();
          expect(oran(j[on], j[arka])).toBeGreaterThanOrEqual(3);
        },
      );
    });
  }

  it('açık temada safran metin kullanımları koyu safran jetonuna bağlı (AA düzeltmesi)', () => {
    // `--vurgu` (#ffbf3c) safran DOLGU rengidir; açık temada yumuşak safran
    // zemin üzerinde metin olarak 1.49:1 kaldığı için üç bileşen tokens.css'te
    // koyu safran metnine bağlandı. jsdom/axe bunu ölçemediği için kural
    // burada statik olarak doğrulanır (gerçek tarayıcı provası finalde manuel).
    const duzeltme = css.match(/\[data-tema='acik'\][\s\S]{0,400}?color:\s*var\(--vurgu-koyu\)/);
    expect(duzeltme, 'tokens.css: açık tema safran metin düzeltmesi').toBeTruthy();
    for (const sec of ['.ders-ilerleme__adim--aktif', '.rozet--belgeli', '.rozet--rol-admin']) {
      expect(duzeltme![0]).toContain(sec);
    }
  });
  it('varsayılan :root bloğu seçilen temayı ezmez (koyu tema regresyonu)', () => {
    // `:root, [data-tema='acik']` koyu bloğundan SONRA geldiği ve aynı
    // özgüllüğe sahip olduğu için koyu tema hiç görünmüyordu. Varsayılan
    // yalnızca hiç tema özniteliği yokken devreye girmeli.
    expect(css).not.toMatch(/^:root,\s*$/m);
    expect(css).toMatch(/:root:not\(\[data-tema\]\),\s*\[data-tema='acik'\]/);
  });
});
