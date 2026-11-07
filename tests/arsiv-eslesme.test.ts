/**
 * Arşiv ↔ ders eşleşmesi (26 Ekim düzeltmesi).
 *
 * - Her dersin eseri arşivde bulunabilir olmalı: ya kartın birincil `ders`
 *   alanında ya da külliye kartının `ilgiliDersler` listesinde.
 * - Çift şehir önekli kimlik kalmamalı ("bursa-bursa-…").
 * - Kartın gösterdiği metin/fotoğraf dosyası gerçekten var olmalı.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = process.cwd();
const liste = JSON.parse(fs.readFileSync(path.join(kok, 'public/arsiv/liste.json'), 'utf8')) as {
  id: string;
  il: string;
  foto: boolean;
  ders?: string;
  ilgiliDersler?: string[];
}[];

function dersler(): { eserId: string }[] {
  const sonuc: { eserId: string }[] = [];
  for (const dosya of fs.readdirSync(path.join(kok, 'data/content'))) {
    if (!dosya.endsWith('.json')) continue;
    const grup = JSON.parse(fs.readFileSync(path.join(kok, 'data/content', dosya), 'utf8')) as {
      dersler?: { eserId: string }[];
    };
    for (const ders of grup.dersler ?? []) sonuc.push({ eserId: ders.eserId });
  }
  return sonuc;
}

describe('arşiv ↔ ders eşleşmesi', () => {
  it('57 dersin tamamı arşivden erişilebilir (birincil ya da ilgili ders)', () => {
    const bagli = new Set<string>();
    for (const kart of liste) {
      if (kart.ders) bagli.add(kart.ders);
      for (const eserId of kart.ilgiliDersler ?? []) bagli.add(eserId);
    }
    const eksik = dersler()
      .map((d) => d.eserId)
      .filter((eserId) => !bagli.has(eserId));
    expect(eksik).toEqual([]);
  });

  it('çift şehir önekli kimlik kalmadı', () => {
    const cift = liste.filter((kart) => /^(bursa|konya|hatay)-\1-/u.test(kart.id)).map((k) => k.id);
    expect(cift).toEqual([]);
  });

  it('II. Murad Külliyesi kartı kendi dersine bağlı; hamam ilgili ders', () => {
    const kart = liste.find((k) => k.id === 'bursa-ii-murad-kulliyesi');
    expect(kart?.ders).toBe('bursa-ii-murad-kulliyesi');
    expect(kart?.ilgiliDersler).toContain('bursa-muradiye-hamami-ii-murad-hamami-bekciyan-hamami');
  });

  it('her kartın metni var; fotoğrafı varsa dosyası da var', () => {
    for (const kart of liste) {
      expect(fs.existsSync(path.join(kok, 'public/arsiv/metin', `${kart.id}.json`)), kart.id).toBe(true);
      if (kart.foto) {
        expect(fs.existsSync(path.join(kok, 'public/arsiv/foto', `${kart.id}.webp`)), kart.id).toBe(true);
      }
    }
  });
});
