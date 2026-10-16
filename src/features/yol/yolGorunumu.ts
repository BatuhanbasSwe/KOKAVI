/** Öğrenme Yolu görünümü: şehir şehir ya da zaman sırasıyla (yalnızca cihazda). */
export type YolGorunumu = 'sehir' | 'zaman';
const ANAHTAR = 'kokavi-yol-gorunum';

export function gorunumOku(): YolGorunumu {
  try {
    return localStorage.getItem(ANAHTAR) === 'zaman' ? 'zaman' : 'sehir';
  } catch {
    return 'sehir';
  }
}

export function gorunumYaz(g: YolGorunumu): void {
  try {
    localStorage.setItem(ANAHTAR, g);
  } catch {
    /* depolama kapalı */
  }
}
