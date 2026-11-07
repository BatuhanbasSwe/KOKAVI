/**
 * KİŞİSEL SIRA — başlangıç sorularındaki ilgiler dersin öneri sırasını belirler.
 *
 * Neden: `src/lib/tercihler.ts` ilgi alanlarını zaten cihazda tutuyor ama sıra
 * hesaplanırken kullanılmıyordu; çocuk "cami" seçse de yol aynı sırayla
 * ilerliyordu. Bu modül ilgiyi YOLUN KİLİT MODELİNİ bozmadan kullanır:
 *
 *  - Kilitler `src/lib/ilerleme.ts` içindeki `yolHesapla()`'da kalır (DOKUNULMAZ):
 *    üniteler sırayla açılır, bir ünitenin dersleri birlikte açılır.
 *  - Bu yüzden öncelik YALNIZCA açık (aktif) ünitenin tamamlanmamış dersleri
 *    arasında uygulanır: ilgiye uyan ders "sıradaki ders" olur.
 *  - Açık ünitede ilgiye uyan ders yoksa eski sıra aynen korunur (sessiz geri
 *    düşüş). İlgi seçilmemişse hiçbir şey değişmez.
 *  - Zamana göre görünümde kilit yoktur (`ZamanListesi`): önerilen eser ilgiye
 *    uyan en eski bitmemiş eser olur; yoksa eski kural (en eski bitmemiş).
 *
 * Tamamen istemci: API, `shared/**`, `server/**`, `data/**` ve seed değişmez.
 */

import type { OgrenmeYolu } from '@shared/types';
import { kategoriBul, type Kategori } from './kategori';
import type { Ilgi } from './tercihler';

/**
 * Başlangıç sorusundaki ilgi → eser kategorisi eşlemesi.
 * `src/lib/kategori.ts` sınıflandırmasıyla aynı adları kullanır.
 */
export const ILGI_KATEGORILERI: Record<Ilgi, readonly Kategori[]> = {
  cami: ['Cami'],
  han: ['Han / Kervansaray'],
  hamam: ['Hamam'],
  medrese: ['Medrese'],
  'cesme-kopru': ['Çeşme', 'Köprü'],
  kulliye: ['Külliye'],
};

/** Seçilen ilgileri kategori kümesine çevirir. Boş küme = kişiselleştirme yok. */
export function ilgiKategorileri(ilgiler: readonly Ilgi[]): Set<Kategori> {
  const kategoriler = new Set<Kategori>();
  for (const ilgi of ilgiler) {
    for (const kategori of ILGI_KATEGORILERI[ilgi] ?? []) kategoriler.add(kategori);
  }
  return kategoriler;
}

/** Dersin ham `tur` metni seçilen ilgilerden birine uyuyor mu? */
export function ilgiyeUygun(
  tur: string | null | undefined,
  kategoriler: ReadonlySet<Kategori>,
): boolean {
  if (kategoriler.size === 0) return false;
  return kategoriler.has(kategoriBul(tur));
}

/**
 * Açık ünitedeki tamamlanmamış dersler arasından ilgiye uyan ilk dersin kimliği.
 * Eşleşme yoksa `null` döner; çağıran taraf `yol.guncelDersId`'ye geri düşer.
 */
export function kisiselGuncelDersId(
  yol: OgrenmeYolu,
  ilgiler: readonly Ilgi[],
): string | null {
  const kategoriler = ilgiKategorileri(ilgiler);
  if (kategoriler.size === 0) return null;
  for (const sehir of yol.sehirler) {
    for (const unite of sehir.uniteler) {
      if (!unite.aktif) continue;
      const uygun = unite.dersler.find(
        (ders) => !ders.tamamlandi && ilgiyeUygun(ders.tur, kategoriler),
      );
      // Aktif ünite tektir; ilk bulunan ünitede eşleşme yoksa kişiselleştirme yok.
      return uygun?.dersId ?? null;
    }
  }
  return null;
}

/**
 * Zamana göre sıradaki: ilgiye uyan en eski bitmemiş eser; eşleşme yoksa
 * listedeki ilk bitmemiş eser. `sirali` yıl sırasına göre gelmelidir.
 */
export function ilgiOncelikliSiradaki<T extends { eserId: string; tur: string }>(
  sirali: readonly T[],
  tamamlananEserIdler: ReadonlySet<string>,
  ilgiler: readonly Ilgi[],
): T | undefined {
  const kategoriler = ilgiKategorileri(ilgiler);
  if (kategoriler.size > 0) {
    const uygun = sirali.find(
      (eser) => !tamamlananEserIdler.has(eser.eserId) && ilgiyeUygun(eser.tur, kategoriler),
    );
    if (uygun) return uygun;
  }
  return sirali.find((eser) => !tamamlananEserIdler.has(eser.eserId));
}
