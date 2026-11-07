/**
 * 26 Ekim veri düzeltmeleri — resmî envanter künyesi ve konya-konut etiketi.
 *
 * - 13 dersin künyesi arşivdeki resmî cilt/sayfa bilgisiyle tamamlandı.
 *   Sonuç: 55/57 derste resmî envanter künyesi var; eksik kalan 2 çeşme
 *   arşivde yok (uydurma künye yazılmaz).
 * - `konya-konut` tek eser değil, 42 sayfalık "Konut" bölümü; kart adı
 *   yanıltmamalı.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const contentDizini = path.resolve(process.cwd(), 'data/content');
const arsivListesi = path.resolve(process.cwd(), 'public/arsiv/liste.json');

function dersler() {
  const sonuc: { eserId: string; kunye: string }[] = [];
  for (const dosya of fs.readdirSync(contentDizini)) {
    if (!dosya.endsWith('.json')) continue;
    const grup = JSON.parse(fs.readFileSync(path.join(contentDizini, dosya), 'utf8')) as {
      dersler?: { eserId: string; yansima?: { kaynakKunye?: string } }[];
    };
    for (const ders of grup.dersler ?? []) {
      sonuc.push({ eserId: ders.eserId, kunye: ders.yansima?.kaynakKunye ?? '' });
    }
  }
  return sonuc;
}

describe('resmî envanter künyesi', () => {
  it('55/57 derste resmî cilt+sayfa künyesi var; eksik 2 çeşme arşivde yok', () => {
    const liste = dersler();
    expect(liste.length).toBe(57);
    const resmi = liste.filter((d) => /Vakıf Katılım/u.test(d.kunye));
    expect(resmi.length).toBe(55);
    expect(liste.filter((d) => !resmi.includes(d)).map((d) => d.eserId).sort()).toEqual([
      'bursa-besir-aga-cesmesi',
      'bursa-muradiye-medresesi-cesmesi',
    ]);
  });

  it('her künye boş değil ve 20 karakterden uzun', () => {
    for (const ders of dersler()) {
      expect(ders.kunye.trim().length, ders.eserId).toBeGreaterThan(20);
    }
  });
});

describe('konya-konut etiketi', () => {
  it('kart adı bölüm olduğunu söyler, tek eser gibi görünmez', () => {
    const liste = JSON.parse(fs.readFileSync(arsivListesi, 'utf8')) as { id: string; ad: string; tur: string }[];
    const konut = liste.find((e) => e.id === 'konya-konut');
    expect(konut?.ad).toBe('Konut bölümü (42 sayfa)');
    expect(konut?.tur).toBe('Bölüm');
  });
});
