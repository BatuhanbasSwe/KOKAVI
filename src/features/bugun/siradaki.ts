/**
 * Sıradaki ders: seçilen öğrenme sırasına göre (şehir şehir ya da zaman sırası).
 * Şehir sırasında yolHesapla()'nın guncelDersId'si; zaman sırasında dersi olan
 * en eski bitmemiş eser (ZamanListesi ile aynı kural).
 */
import type { OgrenmeYolu } from '@shared/types';
import { ESERLER } from '../gunun-eseri/oyun';
import type { YolGorunumu } from '../yol/yolGorunumu';

export interface SiradakiDers {
  dersId: string;
  eserId: string;
  eserAdi: string;
  tur: string;
  sehirAdi: string;
}

export function siradakiDers(yol: OgrenmeYolu | null, gorunum: YolGorunumu): SiradakiDers | null {
  if (!yol) return null;
  const hepsi = yol.sehirler.flatMap((s) =>
    s.uniteler.flatMap((u) => u.dersler.map((d) => ({ ...d, sehirAdi: s.ad }))),
  );
  let hedef = hepsi.find((d) => d.dersId === yol.guncelDersId);
  if (gorunum === 'zaman') {
    const bitmemis = new Map(hepsi.filter((d) => !d.tamamlandi).map((d) => [d.eserId, d]));
    const enEski = [...ESERLER]
      .sort((a, b) => a.yil - b.yil || a.kisaAd.localeCompare(b.kisaAd, 'tr'))
      .find((e) => bitmemis.has(e.eserId));
    if (enEski) hedef = bitmemis.get(enEski.eserId);
  }
  if (!hedef) return null;
  return {
    dersId: hedef.dersId,
    eserId: hedef.eserId,
    eserAdi: hedef.eserAdi,
    tur: hedef.tur,
    sehirAdi: hedef.sehirAdi,
  };
}
