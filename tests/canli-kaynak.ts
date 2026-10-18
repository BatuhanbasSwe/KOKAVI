/** Canlı yarışma testleri için ortak soru kaynağı: gerçek içerik dosyalarından üretilir. */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Ders } from '../shared/types';
import { eserKimligi } from '../shared/slug';
import type { SoruKaynagi } from '../server/canli/sorular';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const oku = <T>(yol: string): T => JSON.parse(readFileSync(join(KOK, yol), 'utf8')) as T;


/** Gerçek içerik dosyalarından seed'in ürettiği Ders listesinin eşdeğeri. */
export function gercekKaynak(): SoruKaynagi {
  const eserler = new Map<string, { ad: string; tur: string; sehir: string }>();
  for (const f of readdirSync(join(KOK, 'data/research')).filter((x) => x.endsWith('.json'))) {
    for (const e of oku<{ eserler: { id?: string; ad: string; tur: string; sehir: string }[] }>(
      `data/research/${f}`,
    ).eserler) {
      eserler.set(eserKimligi(e), e);
    }
  }
  const gorseller = oku<Record<string, { kaynak: string }>>('data/gorseller.json');
  const dersler: Ders[] = [];
  for (const f of readdirSync(join(KOK, 'data/content')).filter((x) => x.endsWith('.json'))) {
    const icerik = oku<{ dersler: (Omit<Ders, 'id' | 'uniteId' | 'sira'> & { eserId: string })[] }>(
      `data/content/${f}`,
    );
    icerik.dersler.forEach((d, i) => {
      const e = eserler.get(d.eserId)!;
      dersler.push({
        ...d,
        id: `${f}-${i}`,
        uniteId: f.replace('.json', ''),
        sira: i + 1,
        egzersizler: d.egzersizler.map((x, j) => ({ ...x, sira: j })),
        eser: {
          id: d.eserId,
          ad: e.ad,
          tur: e.tur,
          sehirId: e.sehir.toLocaleLowerCase('tr'),
          gelirDagilimiDurumu: 'belge-bulunamadi',
        },
      });
    });
  }
  return {
    dersler,
    fotograflar: new Map(
      Object.entries(gorseller).map(([id, g]) => [id, { url: `/gorseller/${id}/1.webp`, kaynak: g.kaynak }]),
    ),
    sehirAdlari: new Map([
      ['bursa', 'Bursa'],
      ['konya', 'Konya'],
      ['hatay', 'Hatay'],
    ]),
  };
}
