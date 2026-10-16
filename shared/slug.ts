/**
 * Türkçe metni kimlik parçasına çevirir.
 *
 * TEK KAYNAK: Hem seed (`server/seed/run.ts`) hem testler bu işlevi kullanır.
 * Mantığın iki yerde kopyalanması, üretilen kimliklerin sessizce ayrışmasına
 * yol açıyordu (â/î/û eşlemesi bir yerde vardı, diğerinde yoktu).
 *
 * Kural: Türkçe harfler ASCII karşılığına indirgenir, geri kalan her şey
 * tireye döner, uçlardaki tireler kırpılır, 48 karakterde kesilir.
 */

const HARITA: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
  â: 'a',
  Â: 'a',
  î: 'i',
  Î: 'i',
  û: 'u',
  Û: 'u',
};

export const SLUG_AZAMI_UZUNLUK = 48;

export function slug(metin: string): string {
  return metin
    .split('')
    .map((karakter) => HARITA[karakter] ?? karakter)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_AZAMI_UZUNLUK);
}

/**
 * Araştırma kaydından eser kimliğini üretir.
 * Kayıtta açık `id` varsa o kullanılır; yoksa `şehir-eser` kalıbı uygulanır.
 */
export function eserKimligi(kayit: { id?: string | null; ad: string; sehir: string }): string {
  const acik = kayit.id?.trim();
  if (acik) return acik;
  return `${slug(kayit.sehir)}-${slug(kayit.ad)}`;
}
