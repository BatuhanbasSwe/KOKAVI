/**
 * Harita gruplaması: yakın işaretler birleşir, grup etiketleri birbirinin
 * üstüne düşmez; etiket ardışık duraklarda "3-7", değilse "N durak".
 */
import { describe, expect, it } from 'vitest';
import { ekrandaKumele, grupEtiketi } from '../src/features/harita/kumele';

describe('ekranda gruplama', () => {
  it('uzak noktalar ayrı kalır', () => {
    expect(ekrandaKumele([{ x: 0, y: 0 }, { x: 200, y: 0 }], 50)).toEqual([[0], [1]]);
  });

  it('yakın noktalar birleşir', () => {
    expect(ekrandaKumele([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 300, y: 0 }], 50)).toEqual([[0, 1], [2]]);
  });

  it('grup merkezleri eşikten yakınsa onlar da birleşir (etiketler çakışmaz)', () => {
    // Zincir: 0-1 ve 2-3 ayrı ayrı gruplanır ama merkezleri 40px; tek geçişli
    // gruplama iki çakışan etiket bırakırdı.
    const noktalar = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 55, y: 0 }, { x: 85, y: 0 }];
    const gruplar = ekrandaKumele(noktalar, 50);
    // 1-2 birleşir, merkezleri 0'ı da çeker; 3 yeni merkeze 56 px uzakta kalır.
    expect(gruplar).toEqual([[0, 1, 2], [3]]);
  });

  it('sonuçta hiçbir iki grup merkezi eşikten yakın değildir', () => {
    const noktalar = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37) % 300, y: (i * 53) % 260 }));
    const gruplar = ekrandaKumele(noktalar, 56);
    const merkez = (g: number[]) => ({
      x: g.reduce((t, u) => t + noktalar[u]!.x, 0) / g.length,
      y: g.reduce((t, u) => t + noktalar[u]!.y, 0) / g.length,
    });
    for (let a = 0; a < gruplar.length; a++)
      for (let b = a + 1; b < gruplar.length; b++) {
        const p = merkez(gruplar[a]!);
        const q = merkez(gruplar[b]!);
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(56);
      }
    expect(gruplar.flat().sort((p, q) => p - q)).toEqual(noktalar.map((_, i) => i));
  });

  it('etiket', () => {
    expect(grupEtiketi([2, 3, 4])).toBe('3-5');
    expect(grupEtiketi([0, 4])).toBe('2 durak');
  });
});
