/**
 * Sıradaki ders: seçilen öğrenme sırasına göre (şehir şehir ya da zaman sırası).
 *
 * Şehir sırasında `yolHesapla()`'nın guncelDersId'si; zaman sırasında dersi olan
 * en eski bitmemiş eser (ZamanListesi ile aynı kural).
 *
 * KİŞİSELLEŞTİRME (src/lib/kisiselSira.ts): başlangıç sorularında seçilen ilgi
 * alanları varsa öneri, açık ünitedeki ilgiye uyan derse taşınır. Kilit modeli
 * değişmez; eşleşme yoksa eski davranış aynen korunur.
 */
import type { OgrenmeYolu } from '@shared/types';
import { ilgiOncelikliSiradaki, kisiselGuncelDersId } from '../../lib/kisiselSira';
import type { Ilgi } from '../../lib/tercihler';
import { ESERLER } from '../gunun-eseri/oyun';
import type { YolGorunumu } from '../yol/yolGorunumu';

export interface SiradakiDers {
  dersId: string;
  eserId: string;
  eserAdi: string;
  tur: string;
  sehirAdi: string;
}

export function siradakiDers(
  yol: OgrenmeYolu | null,
  gorunum: YolGorunumu,
  ilgiler: readonly Ilgi[] = [],
): SiradakiDers | null {
  if (!yol) return null;
  const hepsi = yol.sehirler.flatMap((s) =>
    s.uniteler.flatMap((u) => u.dersler.map((d) => ({ ...d, sehirAdi: s.ad }))),
  );
  const kisiselId = kisiselGuncelDersId(yol, ilgiler);
  let hedef = hepsi.find((d) => d.dersId === (kisiselId ?? yol.guncelDersId));
  if (gorunum === 'zaman') {
    const bitmemis = new Map(hepsi.filter((d) => !d.tamamlandi).map((d) => [d.eserId, d]));
    // Yıl sırası: eski eser önce (ZamanListesi ile aynı kural).
    const sirali = [...ESERLER]
      .sort((a, b) => a.yil - b.yil || a.kisaAd.localeCompare(b.kisaAd, 'tr'))
      .filter((e) => bitmemis.has(e.eserId))
      .map((e) => ({ eserId: e.eserId, tur: bitmemis.get(e.eserId)!.tur }));
    // Biten eserler listede yok; ilgiye uyan en eski bitmemiş eser öne alınır.
    const secilen = ilgiOncelikliSiradaki(sirali, new Set<string>(), ilgiler);
    if (secilen) hedef = bitmemis.get(secilen.eserId);
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
