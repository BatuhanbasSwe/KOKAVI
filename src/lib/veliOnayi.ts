/**
 * Veli onayı (veli kapısı) — başvuru PDF'i s. 3: "Satın almalar platform kuralı
 * gereği veli onaylıdır." ve "tüm satın almalar veli onaylı".
 *
 * MVP'de gerçek parayla satın alma yoktur; elmas harcaması (Vakıf Çarşısı)
 * bu kuralın gösterildiği yerdir. Harcamadan önce bir yetişkin, yazıyla verilmiş
 * bir çarpma sorusunu rakamla cevaplar. Onay 10 dakika geçerlidir (yanındaki
 * veli birkaç alışverişi tek seferde onaylar). Kural Ayarlar'dan kapatılabilir;
 * kapatmak da onay ister.
 *
 * Gizlilik: hiçbir kişisel bilgi sorulmaz ya da saklanmaz. Ayar cihazda
 * (localStorage), onay zamanı yalnızca bu oturumda (sessionStorage) tutulur.
 */

const AYAR_ANAHTARI = 'kokavi-veli-onayi';
const ZAMAN_ANAHTARI = 'kokavi-veli-onay-zamani';
export const ONAY_SURESI_MS = 10 * 60 * 1000;

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

/** 1-99 arası sayıyı Türkçe yazıyla verir: 47 → "kırk yedi". */
export function sayiYaziyla(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new RangeError(`desteklenmeyen sayı: ${n}`);
  return [ONLAR[Math.floor(n / 10)], BIRLER[n % 10]].filter(Boolean).join(' ');
}

export interface VeliSorusu {
  /** Ekranda gösterilecek soru metni. */
  soru: string;
  cevap: number;
}

/** Yazıyla verilmiş iki basamaklı × tek basamaklı çarpma: "on yedi çarpı altı". */
export function veliSorusuUret(rastgele: () => number = Math.random): VeliSorusu {
  const a = 12 + Math.floor(rastgele() * 37); // 12-48
  const b = 3 + Math.floor(rastgele() * 7); // 3-9
  return { soru: `${sayiYaziyla(a)} çarpı ${sayiYaziyla(b)} kaç eder?`, cevap: a * b };
}

/** Cevap rakamla yazılır; boşluk ve nokta (binlik ayırıcı) yok sayılır. */
export function cevapDogruMu(girdi: string, soru: VeliSorusu): boolean {
  const temiz = girdi.replace(/[\s.]/g, '');
  return /^\d+$/.test(temiz) && Number(temiz) === soru.cevap;
}

export function veliOnayiAcikMi(): boolean {
  try {
    return localStorage.getItem(AYAR_ANAHTARI) !== 'kapali';
  } catch {
    return true; // depolama yoksa güvenli taraf: onay istenir
  }
}

export function veliOnayiniAyarla(acik: boolean): void {
  try {
    if (acik) localStorage.removeItem(AYAR_ANAHTARI);
    else localStorage.setItem(AYAR_ANAHTARI, 'kapali');
  } catch {
    /* yazılamazsa varsayılan (açık) geçerli kalır */
  }
}

export function onayKaydet(simdi: number = Date.now()): void {
  try {
    sessionStorage.setItem(ZAMAN_ANAHTARI, String(simdi));
  } catch {
    /* oturum deposu yoksa her alışverişte yeniden sorulur */
  }
}

export function onayGecerliMi(simdi: number = Date.now()): boolean {
  try {
    const zaman = Number(sessionStorage.getItem(ZAMAN_ANAHTARI));
    return Number.isFinite(zaman) && zaman > 0 && simdi - zaman < ONAY_SURESI_MS;
  } catch {
    return false;
  }
}

/** Bu harcama için veli kapısı gösterilmeli mi? */
export function veliOnayiGerekli(simdi: number = Date.now()): boolean {
  return veliOnayiAcikMi() && !onayGecerliMi(simdi);
}
