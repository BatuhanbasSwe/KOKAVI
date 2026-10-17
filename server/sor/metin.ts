/**
 * Türkçe metin normalleştirme (arama için): küçük harf (tr), şapka ve Türkçe
 * harf katlama (ı→i, ş→s…), kesme ve noktalama temizliği.
 */
const KATLAMA: Record<string, string> = {
  ı: 'i', i̇: 'i', ş: 's', ğ: 'g', ç: 'c', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u',
};

/** Sık geçen, aramaya katkısı olmayan kelimeler (normalleştirilmiş hâlde). */
const DURAK = new Set([
  've', 'ile', 'bir', 'bu', 'su', 'o', 'da', 'de', 'ki', 'mi', 'mu', 'ne', 'icin', 'gibi', 'var', 'yok',
  'olan', 'olarak', 'en', 'cok', 'daha', 'ama', 'ya', 'veya', 'hem', 'ise', 'her', 'nasil', 'neden',
  'hangi', 'hangisi', 'kim', 'nerede', 'zaman', 'midir', 'nedir', 'misin', 'kadar', 'sonra', 'once',
]);

export function normallestir(metin: string): string {
  return metin
    .toLocaleLowerCase('tr')
    .normalize('NFC')
    .replace(/[ıi̇şğçöüâîû]/g, (h) => KATLAMA[h] ?? h)
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aramada kullanılacak kelimeler (2 harften kısa ve durak kelimeleri atılır). */
export function kelimeler(metin: string): string[] {
  return normallestir(metin)
    .split(' ')
    .filter((k) => k.length > 2 && !DURAK.has(k));
}
