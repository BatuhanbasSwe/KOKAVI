import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { dersEgzersizSecimi } from '../src/features/ders/yardimci';

const dersler: { eserId: string; egzersizler: { tip: string }[] }[] = fs
  .readdirSync('data/content')
  .flatMap((f) => {
    const d = JSON.parse(fs.readFileSync(`data/content/${f}`, 'utf8'));
    return Array.isArray(d) ? d : (d.dersler ?? [d]);
  });

describe('dersEgzersizSecimi (A1)', () => {
  it('aynı ders her seferinde aynı sırayı verir', () => {
    const e = ['a', 'b', 'c', 'd'];
    expect(dersEgzersizSecimi('x-1', e)).toEqual(dersEgzersizSecimi('x-1', e));
  });

  it('girdiyi değiştirmez, yalnızca var olan egzersizleri kullanır', () => {
    const e = ['a', 'b', 'c', 'd'] as const;
    const s = dersEgzersizSecimi('x-2', e);
    expect(e).toEqual(['a', 'b', 'c', 'd']);
    expect(new Set(s).size).toBe(s.length);
    s.forEach((x) => expect(e).toContain(x));
  });

  it('gerçek derslerde 3 veya 4 egzersiz gelir; sıra ve sayı dersten derse değişir', () => {
    expect(dersler.length).toBeGreaterThan(10);
    const sonuclar = dersler.map((d) => dersEgzersizSecimi(d.eserId, d.egzersizler).map((x) => x.tip).join(','));
    sonuclar.forEach((s) => expect([3, 4]).toContain(s.split(',').length));
    expect(new Set(sonuclar).size).toBeGreaterThan(5);
    expect(new Set(sonuclar.map((s) => s.split(',')[0])).size).toBeGreaterThan(1);
    expect(sonuclar.some((s) => s.split(',').length === 3)).toBe(true);
  });

  it('kısa listeler (3 ve altı) kırpılmaz', () => {
    expect(dersEgzersizSecimi('x-3', ['a', 'b', 'c'])).toHaveLength(3);
    expect(dersEgzersizSecimi('x-4', [])).toEqual([]);
  });
});
