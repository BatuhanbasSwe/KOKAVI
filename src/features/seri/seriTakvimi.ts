/**
 * Seri takvimi verisi: ders yapılan günlerin listesi (yalnızca cihazda).
 *
 * İlerleme kaydı yalnızca "kaç gün üst üste" ve "son gün"ü tutar; takvim için
 * ayrı bir gün listesi gerekir. İlk açılışta mevcut seri geriye doğru güne
 * çevrilir (eski kullanıcının takvimi boş başlamasın).
 */
import { gunEkle } from '@/lib/tekrar';

const ANAHTAR = 'kokavi-aktif-gunler-v1';
const EN_COK = 400;

export function aktifGunler(seri?: { gunSayisi: number; sonTarih: string | null }): Set<string> {
  let liste: string[] | null = null;
  try {
    const ham = localStorage.getItem(ANAHTAR);
    liste = ham ? (JSON.parse(ham) as string[]) : null;
  } catch {
    liste = null;
  }
  if (!Array.isArray(liste)) {
    // Önyükleme: mevcut seriyi (ardışık günler) takvime çevir.
    liste = [];
    if (seri?.sonTarih && seri.gunSayisi > 0) {
      for (let i = 0; i < Math.min(seri.gunSayisi, EN_COK); i++) liste.push(gunEkle(seri.sonTarih, -i));
    }
    yaz(liste);
  }
  return new Set(liste);
}

function yaz(liste: string[]) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify([...new Set(liste)].sort().slice(-EN_COK)));
  } catch {
    /* depolama kapalı */
  }
}

/** Ders bitince çağrılır. */
export function aktifGunEkle(gun: string): void {
  yaz([...aktifGunler(), gun]);
}

/** En uzun ardışık gün dizisi. */
export function enUzunSeri(gunler: Set<string>): number {
  let en = 0;
  for (const g of gunler) {
    if (gunler.has(gunEkle(g, -1))) continue; // dizinin başı değil
    let n = 1;
    while (gunler.has(gunEkle(g, n))) n++;
    en = Math.max(en, n);
  }
  return en;
}

/** Pazartesi ile başlayan hafta (7 gün, YYYY-MM-DD). */
export function haftaGunleri(bugun: string): string[] {
  const [y, a, g] = bugun.split('-').map(Number) as [number, number, number];
  const haftaninGunu = (new Date(Date.UTC(y, a - 1, g)).getUTCDay() + 6) % 7; // Pzt=0
  const pazartesi = gunEkle(bugun, -haftaninGunu);
  return Array.from({ length: 7 }, (_, i) => gunEkle(pazartesi, i));
}

/** Ay takvimi: haftalar × 7; ay dışı hücreler null. */
export function ayHaftalari(yil: number, ay: number): (string | null)[][] {
  const ilk = new Date(Date.UTC(yil, ay, 1));
  const gunSayisi = new Date(Date.UTC(yil, ay + 1, 0)).getUTCDate();
  const bosluk = (ilk.getUTCDay() + 6) % 7;
  const hucreler: (string | null)[] = Array.from({ length: bosluk }, () => null);
  for (let g = 1; g <= gunSayisi; g++) {
    hucreler.push(`${yil}-${String(ay + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`);
  }
  while (hucreler.length % 7) hucreler.push(null);
  const haftalar: (string | null)[][] = [];
  for (let i = 0; i < hucreler.length; i += 7) haftalar.push(hucreler.slice(i, i + 7));
  return haftalar;
}

export const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const GUN_UZUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
