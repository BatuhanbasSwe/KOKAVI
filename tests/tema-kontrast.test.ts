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
