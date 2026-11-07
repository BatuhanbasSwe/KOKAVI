/**
 * Canlı yol yardımcıları: yol eğrisi, zıplayan yürüyüş noktaları ve sahne
 * kararı (ders bitti → yol ilerler; ünite açıldı → kilit kırılır; ünite
 * bitti → mühür; ilk ziyarette sahne yok).
 */
import { describe, expect, it } from 'vitest';
import type { OgrenmeYolu } from '../shared/types';
import { egriNoktalari, egriYolu, sahneHesapla, yolAnisi, ziplayanNoktalar } from '../src/features/yol/yolSahnesi';

function yolYap(tamam: string[], guncel: string | null, kilitli: string[] = ['u2']): OgrenmeYolu {
  const ders = (dersId: string) => ({ dersId, eserId: dersId, eserAdi: dersId, tur: 'Cami', sira: 0, tamamlandi: tamam.includes(dersId) });
  const unite = (uniteId: string, dersler: string[]) => ({
    uniteId,
    ad: uniteId,
    sira: 0,
    dersler: dersler.map(ders),
    tamamlananSayi: dersler.filter((d) => tamam.includes(d)).length,
    toplamSayi: dersler.length,
    kilitli: kilitli.includes(uniteId),
    aktif: false,
  });
  return {
    guncelDersId: guncel,
    sehirler: [
      { sehirId: 's', ad: 'Bursa', sira: 0, uniteler: [unite('u1', ['a', 'b']), unite('u2', ['c'])], tamamlananSayi: 0, toplamSayi: 3, kilitli: false, tamamlandi: false },
    ],
  };
}

describe('yol eğrisi', () => {
  it('S eğrisi uçlardan geçer; noktalar eşit sayıda ve uçlar dahil', () => {
    expect(egriYolu({ x: 0, y: 0 }, { x: 10, y: 100 })).toBe('M 0 0 C 0 50 10 50 10 100');
    const n = egriNoktalari({ x: 0, y: 0 }, { x: 10, y: 100 }, 5);
    expect(n).toHaveLength(5);
    expect(n[0]).toEqual({ x: 0, y: 0 });
    expect(n[4]).toEqual({ x: 10, y: 100 });
    expect(n[2]!.y).toBeCloseTo(50);
  });

  it('zıplayan yürüyüş: uçlarda yerde, adım ortalarında havada', () => {
    const n = ziplayanNoktalar({ x: 0, y: 0 }, { x: 0, y: 120 }, 3, 20, 6);
    expect(n).toHaveLength(19);
    expect(n[0]!.y).toBeCloseTo(0);
    expect(n[18]!.y).toBeCloseTo(120);
    // 1. adımın ortası (i=3): eğri üzerindeki noktadan 20 px yukarıda
    const egri = egriNoktalari({ x: 0, y: 0 }, { x: 0, y: 120 }, 19);
    expect(n[3]!.y).toBeCloseTo(egri[3]!.y - 20);
    // 1. adımın sonu (i=6): yere değer, yani eğrinin üzerinde
    expect(n[6]!.y).toBeCloseTo(egri[6]!.y);
  });
});

describe('sahne kararı', () => {
  it('ilk ziyarette sahne yok', () => {
    expect(sahneHesapla(null, yolYap([], 'a'))).toEqual({ kimden: null, kime: null, yeniAcilan: [], yeniBiten: [] });
  });

  it('ders bitince yol eski dersten yenisine ilerler', () => {
    const once = yolAnisi(yolYap([], 'a'));
    expect(sahneHesapla(once, yolYap(['a'], 'b'))).toMatchObject({ kimden: 'a', kime: 'b' });
  });

  it('aynı ders hâlâ sıradaysa ya da önceki ders bitmemişse yürüyüş yok', () => {
    const once = yolAnisi(yolYap([], 'a'));
    expect(sahneHesapla(once, yolYap([], 'a'))).toMatchObject({ kimden: null, kime: null });
    expect(sahneHesapla(once, yolYap([], 'b'))).toMatchObject({ kimden: null, kime: null });
  });

  it('ünite bitince mühür, sonraki ünite açılınca kilit kırılır; bir kez', () => {
    const once = yolAnisi(yolYap(['a'], 'b'));
    const sonra = yolYap(['a', 'b'], 'c', []);
    const sahne = sahneHesapla(once, sonra);
    expect(sahne).toMatchObject({ kimden: 'b', kime: 'c', yeniAcilan: ['u2'], yeniBiten: ['u1'] });
    // Aynı durum ikinci kez görülünce sahne tekrarlanmaz.
    expect(sahneHesapla(yolAnisi(sonra), sonra)).toEqual({ kimden: null, kime: null, yeniAcilan: [], yeniBiten: [] });
  });
});
