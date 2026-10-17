/**
 * Çocuğun yazdığı sorudan kişisel görünen parçaları çıkarır (modele gitmeden
 * önce). PDF: "Kişisel veri toplanmaz." Soru hiçbir yerde saklanmaz.
 */
const EPOSTA = /[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}/gi;
const TELEFON = /(\+?90[\s-]?)?0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g;
const UZUN_SAYI = /\b\d{7,}\b/g;
export const EN_UZUN_SORU = 200;

export function kisiselVeriTemizle(soru: string): string {
  return soru
    .replace(EPOSTA, '[gizlendi]')
    .replace(TELEFON, '[gizlendi]')
    .replace(UZUN_SAYI, '[gizlendi]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, EN_UZUN_SORU);
}
