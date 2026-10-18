/**
 * Veli onayı (veli kapısı) — başvuru PDF'i s. 3: "Satın almalar platform kuralı
 * gereği veli onaylıdır." ve "tüm satın almalar veli onaylı".
 *
 * Kural gerçek parayla SATIN ALMAYI kapsar; MVP'de gerçek para yoktur. Çocuğun
 * derslerle kazandığı elmasla yaptığı harcama bu yüzden varsayılan olarak
 * sorusuz yapılır (18 Ekim kararı, KARARLAR.md §4). İsteyen veli Ayarlar'dan
 * "Harcamalarda veli onayı"nı açar: o zaman harcamadan önce bir yetişkin,
 * yazıyla verilmiş bir çarpma sorusunu rakamla cevaplar; onay 10 dakika
 * geçerlidir. Açılmış kuralı kapatmak onay ister (çocuk kendisi kapatamaz).
 * İleride gerçek parayla elmas satın alma eklenirse aynı kapı kullanılır.
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

/** Varsayılan kapalı: yalnızca veli Ayarlar'dan açtıysa onay istenir. */
export function veliOnayiAcikMi(): boolean {
  try {
    return localStorage.getItem(AYAR_ANAHTARI) === 'acik';
  } catch {
    return false;
  }
}

export function veliOnayiniAyarla(acik: boolean): void {
  try {
    if (acik) localStorage.setItem(AYAR_ANAHTARI, 'acik');
    else localStorage.removeItem(AYAR_ANAHTARI);
  } catch {
    /* yazılamazsa varsayılan (kapalı) geçerli kalır */
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
