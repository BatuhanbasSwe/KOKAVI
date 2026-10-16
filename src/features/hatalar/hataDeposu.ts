/**
 * "Hatalarımı çalış" listesi — Duolingo'daki "Practice mistakes".
 *
 * Derste ipucu alınan egzersiz, egzersizin KENDİSİYLE birlikte cihaza yazılır;
 * böylece pratik internetsiz de açılır. Pratikte ipucusuz çözülen egzersiz
 * listeden düşer. Yalnızca cihazda; en fazla 30 kayıt (en eskisi düşer).
 */
import type { Egzersiz } from '@shared/types';

export interface HataKaydi {
  egzersiz: Egzersiz;
  eserAdi: string;
  /** YYYY-MM-DD */
  tarih: string;
}

const ANAHTAR = 'kokavi-hatalar-v1';
const EN_COK = 30;
export const HATA_OLAYI = 'kokavi-hatalar';

export function hatalariOku(): HataKaydi[] {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    const liste = ham ? (JSON.parse(ham) as HataKaydi[]) : [];
    return Array.isArray(liste) ? liste.filter((h) => h?.egzersiz?.id) : [];
  } catch {
    return [];
  }
}

function yaz(liste: HataKaydi[]): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(liste.slice(-EN_COK)));
    window.dispatchEvent(new Event(HATA_OLAYI));
  } catch {
    /* depolama kapalı: pratik listesi tutulmaz, ders etkilenmez */
  }
}

/** Aynı egzersiz iki kez eklenmez; yeniden yanlışlanırsa sona taşınır (en taze). */
export function hataEkle(egzersiz: Egzersiz, eserAdi: string, tarih: string): void {
  const liste = hatalariOku().filter((h) => h.egzersiz.id !== egzersiz.id);
  yaz([...liste, { egzersiz, eserAdi, tarih }]);
}

export function hataCikar(egzersizId: string): void {
  yaz(hatalariOku().filter((h) => h.egzersiz.id !== egzersizId));
}
