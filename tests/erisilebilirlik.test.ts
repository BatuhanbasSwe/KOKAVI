/**
 * Erişilebilirlik ve ayar uygulama testleri.
 *
 * Şartname 5.1.4: erişilebilirlik özellikleri "yalnızca tasarım üzerinde
 * gösterilmesi yerine mümkün olduğu ölçüde ÇALIŞAN ÜRÜNE entegre edilmesi"
 * beklenmektedir. Bu testler özelliklerin gerçekten DOM'a uygulandığını
 * kanıtlar — ekran görüntüsü değil, davranış testi.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ayarlariUygula,
  yaziBoyutuArtir,
  yaziBoyutuAzalt,
  YAZI_ADIMLARI,
  TEMA_ETIKETLERI,
  RENK_KORLUGU_ETIKETLERI,
} from '../src/lib/erisilebilirlik';
import { VARSAYILAN_AYARLAR } from '../src/lib/ilerleme';
import type { Ayarlar } from '../shared/types';

function ayar(kismi: Partial<Ayarlar> = {}): Ayarlar {
  return { ...VARSAYILAN_AYARLAR, ...kismi };
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-tema');
  document.documentElement.removeAttribute('data-renk-korlugu');
  document.documentElement.removeAttribute('data-hareket-azalt');
  document.documentElement.removeAttribute('data-sessiz-mod');
  document.documentElement.style.removeProperty('--yazi-olcek');
});

describe('ayarlariUygula — ayarlar gerçekten DOM’a yazılıyor', () => {
  it('tema veri özniteliği olarak uygulanır', () => {
    for (const tema of ['acik', 'koyu', 'yuksek-kontrast'] as const) {
      ayarlariUygula(ayar({ tema }));
      expect(document.documentElement.dataset.tema).toBe(tema);
    }
  });

  it('renk körlüğü paleti uygulanır', () => {
    ayarlariUygula(ayar({ renkKorlugu: 'protanopi' }));
    expect(document.documentElement.dataset.renkKorlugu).toBe('protanopi');
  });

  it('hareket azaltma uygulanır', () => {
    ayarlariUygula(ayar({ hareketAzalt: true }));
    expect(document.documentElement.dataset.hareketAzalt).toBe('true');
  });

  it('sessiz mod uygulanır (PDF: "ses olmadan da akışın tamamı bitirilebilir")', () => {
    ayarlariUygula(ayar({ sessizMod: true }));
    expect(document.documentElement.dataset.sessizMod).toBe('true');
  });

  it('yazı boyutu CSS değişkenine yazılır', () => {
    ayarlariUygula(ayar({ yaziBoyutu: 1.3 }));
    expect(document.documentElement.style.getPropertyValue('--yazi-olcek')).toBe('1.3');
  });

  it('yazı boyutu güvenli aralığa sınırlanır', () => {
    ayarlariUygula(ayar({ yaziBoyutu: 99 }));
    expect(Number(document.documentElement.style.getPropertyValue('--yazi-olcek'))).toBeLessThanOrEqual(2);

    ayarlariUygula(ayar({ yaziBoyutu: 0.01 }));
    expect(Number(document.documentElement.style.getPropertyValue('--yazi-olcek'))).toBeGreaterThanOrEqual(0.75);
  });
});

describe('yazı boyutu adımları', () => {
  it('A+ en yakın üst adıma çıkar', () => {
    expect(yaziBoyutuArtir(1)).toBe(1.15);
    expect(yaziBoyutuArtir(1.15)).toBe(1.3);
  });

  it('A+ en üst adımda sabit kalır (taşma yok)', () => {
    const enUst = YAZI_ADIMLARI[YAZI_ADIMLARI.length - 1]!;
    expect(yaziBoyutuArtir(enUst)).toBe(enUst);
  });

  it('A− en yakın alt adıma iner', () => {
    expect(yaziBoyutuAzalt(1)).toBe(0.85);
    expect(yaziBoyutuAzalt(0.85)).toBe(0.75);
    expect(yaziBoyutuAzalt(1.15)).toBe(1);
  });

  it('A− en alt adımda sabit kalır', () => {
    const enAlt = YAZI_ADIMLARI[0]!;
    expect(yaziBoyutuAzalt(enAlt)).toBe(enAlt);
  });

  it('adımlar artan sırada ve %100 içeriyor', () => {
    for (let i = 1; i < YAZI_ADIMLARI.length; i++) {
      expect(YAZI_ADIMLARI[i]!).toBeGreaterThan(YAZI_ADIMLARI[i - 1]!);
    }
    expect(YAZI_ADIMLARI).toContain(1);
  });
});

describe('etiket sözlükleri eksiksiz', () => {
  it('her tema için Türkçe etiket var', () => {
    for (const tema of ['acik', 'koyu', 'yuksek-kontrast'] as const) {
      expect(TEMA_ETIKETLERI[tema]).toBeTruthy();
    }
  });

  it('her renk körlüğü seçeneği için etiket var', () => {
    for (const anahtar of ['yok', 'protanopi', 'döteranopi', 'tritanopi'] as const) {
      expect(RENK_KORLUGU_ETIKETLERI[anahtar]).toBeTruthy();
    }
  });
});

describe('yazı boyutu aralığı (%75 - %200)', () => {
  it('sekiz adım, sıralı; hazır seçenekler aralığın içinde ve adımlardan biri', async () => {
    const { YAZI_ADIMLARI, YAZI_EN_KUCUK, YAZI_EN_BUYUK, YAZI_HAZIR } = await import('../src/lib/erisilebilirlik');
    expect(YAZI_EN_KUCUK).toBe(0.75);
    expect(YAZI_EN_BUYUK).toBe(2);
    expect([...YAZI_ADIMLARI].sort((a, b) => a - b)).toEqual(YAZI_ADIMLARI);
    for (const h of YAZI_HAZIR) expect(YAZI_ADIMLARI).toContain(h.deger);
  });
});
