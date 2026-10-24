/**
 * Vakfiye/arşiv kaydı metnini arayüze uygun hâle getirir.
 *
 * `Eser.arsivNo` alanı iki tür değer taşıyabilir:
 *  1. Gerçek bir kayıt referansı: "Bursa Şer'iyye Sicilleri: BS. 25/332…",
 *     "Defter nr. 72, s. 114 (966/1559 tarihli vakfiye)".
 *  2. Kaynağı arayan not: "Vakıflar Genel Müdürlüğü arşiv numarası bulunamadı."
 *
 * İkincisi bir arşiv numarası değildir; "Vakfiye arşiv no: … bulunamadı"
 * biçiminde gösterilirse hem yanıltıcı hem de çocuk ekranında gereksiz uzun
 * olur. Bu yardımcı yalnızca gerçek referansları döndürür ve uzun künyeyi
 * kısa tutar. Veriye dokunmaz; sunum katmanı kararıdır.
 */

/** "numarası bulunamadı / tespit edilememiştir" gibi kaynak-yok notları. */
const KAYIT_YOK = /bulunamad[ıi]|bulunamam[ıi]şt[ıi]r|tespit edilememiştir|numara verilmez/iu;

/** Arayüzde gösterilecek en uzun kayıt metni (kabaca iki satır). */
export const ARSIV_KAYDI_SINIRI = 150;

/**
 * Arşiv kaydını kısa metne çevirir; gerçek referans yoksa `null` döner.
 *
 * @param deger `eser.arsivNo` (null olabilir)
 * @param sinir isteğe bağlı karakter sınırı (test için)
 */
export function arsivKaydiMetni(deger: string | null | undefined, sinir: number = ARSIV_KAYDI_SINIRI): string | null {
  if (typeof deger !== 'string') return null;
  const temiz = deger.replace(/\s+/gu, ' ').trim();
  if (temiz === '' || KAYIT_YOK.test(temiz)) return null;

  // "Arşiv numarası yok" demeyen ama numara da içermeyen serbest notları da gösterme.
  if (!/\d/u.test(temiz)) return null;

  if (temiz.length <= sinir) return temiz;

  const kesik = temiz.slice(0, sinir);
  const nokta = Math.max(kesik.lastIndexOf('; '), kesik.lastIndexOf('. '), kesik.lastIndexOf(', '));
  const govde = (nokta > 40 ? kesik.slice(0, nokta) : kesik).replace(/[\s,;.:–—-]+$/u, '').trim();
  return `${govde}…`;
}
