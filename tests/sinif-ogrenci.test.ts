/**
 * İsteğe bağlı takma adlı sınıf katılımı: takma ad kuralı, cihazda saklama,
 * sınıftan çıkınca silme. (Sunucu tarafı tamamlama ve rapor: repo/sinif.ts.)
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { takmaAdTemizle } from '../server/repo/sinif';
import {
  sinifOgrencisiniSil,
  sinifOgrencisiOku,
  sinifOgrencisiYaz,
  takmaAdGecerliMi,
} from '../src/lib/sinifOgrencisi';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('takma ad kuralı', () => {
  it('istemci ve sunucu aynı kararı verir', () => {
    for (const [ad, gecerli] of [
      ['Mavi Kartal', true],
      ['Ali_42', true],
      ['Ç', false],
      ['<script>', false],
      ['a'.repeat(21), false],
      ['  Lale  ', true],
    ] as const) {
      expect(takmaAdGecerliMi(ad), ad).toBe(gecerli);
      expect(takmaAdTemizle(ad) !== null, ad).toBe(gecerli);
    }
    expect(takmaAdTemizle('  Lale   Bahçe ')).toBe('Lale Bahçe');
  });
});

describe('cihazdaki öğrenci kaydı', () => {
  it('yalnızca aynı sınıf kodu için okunur', () => {
    sinifOgrencisiYaz({ kod: 'ABC-2345', ogrenciId: 'x1', takmaAd: 'Mavi' });
    expect(sinifOgrencisiOku('ABC-2345')?.ogrenciId).toBe('x1');
    expect(sinifOgrencisiOku('XYZ-9999')).toBeNull();
  });

  it('sınıftan çıkınca cihazdan silinir ve sunucuya silme isteği gider', async () => {
    const istekler: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (u: string, o?: RequestInit) => {
      istekler.push(`${o?.method} ${u}`);
      return new Response('{}');
    }));
    sinifOgrencisiYaz({ kod: 'ABC-2345', ogrenciId: 'x1', takmaAd: 'Mavi' });
    await sinifOgrencisiniSil();
    expect(sinifOgrencisiOku()).toBeNull();
    expect(istekler).toEqual(['DELETE /api/sinif/ABC-2345/ogrenci/x1']);
  });
});
