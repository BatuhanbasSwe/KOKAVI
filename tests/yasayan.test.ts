/**
 * Hâlâ yaşayan vakıflar (data/yasayan.json): uydurma bilgi olamaz.
 * Her kayıt gerçek bir ders eserine ait; alıntı o eserin "bugün" metninde
 * BİREBİR geçer; künye eserin kendi kaynaklarından biridir.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { eserKimligi } from '../shared/slug';
import yasayan from '../data/yasayan.json';

interface ArastirmaEseri {
  id?: string;
  ad: string;
  sehir: string;
  bugunNeOldu?: string | null;
  kaynaklar?: { kunye: string }[];
}

const eserler = new Map<string, ArastirmaEseri>();
for (const f of readdirSync('data/research').filter((x) => x.endsWith('.json'))) {
  for (const e of (JSON.parse(readFileSync(join('data/research', f), 'utf8')) as { eserler: ArastirmaEseri[] }).eserler) {
    eserler.set(eserKimligi(e), e);
  }
}

describe('hâlâ yaşayan vakıflar verisi', () => {
  it('en az 10 kayıt; kimlikler tekil', () => {
    expect(yasayan.eserler.length).toBeGreaterThanOrEqual(10);
    expect(new Set(yasayan.eserler.map((k) => k.eserId)).size).toBe(yasayan.eserler.length);
  });

  it.each(yasayan.eserler.map((k) => [k.eserId, k] as const))('%s: alıntı ve künye kaynaktan birebir', (_, k) => {
    const e = eserler.get(k.eserId);
    expect(e, 'ders eseri bulunamadı').toBeDefined();
    expect(k.durum).toBe('asil-islevinde');
    expect(e!.bugunNeOldu ?? '').toContain(k.alinti);
    expect((e!.kaynaklar ?? []).map((x) => x.kunye)).toContain(k.kaynak);
    expect(k.aciklama.length).toBeGreaterThan(10);
    expect(k.aciklama.length).toBeLessThanOrEqual(90);
    expect(e!.ad.startsWith(k.ad)).toBe(true);
  });
});
