/**
 * Panel içi ortak yardımcılar.
 *
 * Hem eser formu hem ünite yönetimi aynı kuralları kullanır: Türkçe karakterden
 * arındırılmış kimlik üretimi ve Türkçe ondalık ayracını (virgül) kabul eden
 * sayı çözümlemesi.
 */

/** Türkçe karakterlerin ASCII karşılıkları. */
const TURKCE_HARITA: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

/** "Bursa Ulu Cami" → "bursa-ulu-cami". Kimlikler URL'de göründüğü için sadeleştirilir. */
export function kimlikUret(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (harf) => TURKCE_HARITA[harf] ?? harf)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "12,5" ve "12.5" biçimlerini kabul eder; boş veya sayı olmayan değerde null döner. */
export function sayiyaCevir(ham: string): number | null {
  const temiz = ham.trim().replace(',', '.');
  if (temiz === '') return null;
  const sayi = Number(temiz);
  return Number.isFinite(sayi) ? sayi : null;
}

/** Boş metin veritabanına null olarak yazılır — "boş" ile "yok" ayrımı korunur. */
export function metinVeyaNull(ham: string): string | null {
  const temiz = ham.trim();
  return temiz === '' ? null : temiz;
}

/** Panel formlarında alan hatası taşımayan yardımcı tip. */
export type AlanHatalari = Record<string, string>;
