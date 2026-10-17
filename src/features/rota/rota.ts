/**
 * Keşif rotası — bir ilçedeki eserleri gezi sırasına dizer.
 *
 * DÜRÜSTLÜK: Yol ağı verisi yok; mesafeler KUŞ UÇUŞU (haversine). Sıralama en
 * yakın komşu + 2-opt iyileştirmesi: kısa ve kesişmeyen bir tur, ama gerçek
 * yürüyüş yolu değil. Ekranda bu açıkça yazılır.
 */
export interface RotaNoktasi {
  id: string;
  lat: number;
  lng: number;
}

/** İki nokta arası kuş uçuşu mesafe (metre). */
export function mesafe(a: RotaNoktasi, b: RotaNoktasi): number {
  const R = 6_371_000;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function toplamMesafe<T extends RotaNoktasi>(sira: T[]): number {
  let t = 0;
  for (let i = 1; i < sira.length; i++) t += mesafe(sira[i - 1]!, sira[i]!);
  return t;
}

/**
 * Açık uçlu tur (başa dönmez). Başlangıç: merkezden en uzak nokta (bir uçtan
 * başla), sonra en yakın komşu, sonra 2-opt ile kesişmeleri aç.
 */
export function rotaSirala<T extends RotaNoktasi>(noktalar: T[]): T[] {
  if (noktalar.length <= 2) return [...noktalar];
  const ort = {
    id: '',
    lat: noktalar.reduce((t, n) => t + n.lat, 0) / noktalar.length,
    lng: noktalar.reduce((t, n) => t + n.lng, 0) / noktalar.length,
  };
  const kalan = [...noktalar];
  let bas = 0;
  kalan.forEach((n, i) => {
    if (mesafe(n, ort) > mesafe(kalan[bas]!, ort)) bas = i;
  });
  const sira: T[] = [kalan.splice(bas, 1)[0]!];
  while (kalan.length) {
    const son = sira[sira.length - 1]!;
    let en = 0;
    kalan.forEach((n, i) => {
      if (mesafe(son, n) < mesafe(son, kalan[en]!)) en = i;
    });
    sira.push(kalan.splice(en, 1)[0]!);
  }
  // 2-opt (açık tur): iyileşme kalmayana kadar ters çevir.
  let iyilesti = true;
  while (iyilesti) {
    iyilesti = false;
    for (let i = 0; i < sira.length - 2; i++) {
      for (let j = i + 2; j < sira.length; j++) {
        const a = sira[i]!, b = sira[i + 1]!, c = sira[j]!, d = sira[j + 1];
        const once = mesafe(a, b) + (d ? mesafe(c, d) : 0);
        const sonra = mesafe(a, c) + (d ? mesafe(b, d) : 0);
        if (sonra + 1e-6 < once) {
          sira.splice(i + 1, j - i, ...sira.slice(i + 1, j + 1).reverse());
          iyilesti = true;
        }
      }
    }
  }
  return sira;
}

/** "350 m" / "1,2 km" */
export function mesafeMetni(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Yaklaşık yürüme süresi (dk): kuş uçuşu × 1,3 (sokak payı), 4,5 km/sa. */
export function yurumeDakika(m: number): number {
  return Math.max(1, Math.round(((m * 1.3) / 4500) * 60));
}

/** İki durak arası bu mesafeden uzunsa yürünmez; rota orada yeni bölüme ayrılır. */
export const BOLUM_ESIGI = 1500;

export interface Bolum<T> {
  /** Bölümün ilk durağının rotadaki sırası (0'dan). */
  bas: number;
  duraklar: T[];
  /** Bölüm içindeki yürüyüş mesafesi (kuş uçuşu, metre). */
  mesafe: number;
  /** Bir önceki bölümün son durağından bu bölüme olan mesafe (araçla). */
  oncekindenUzaklik: number;
}

/**
 * Sıralı rotayı yürünebilir bölümlere ayırır: ardışık iki durak arası
 * `esik`'ten uzunsa yeni bölüm başlar (arada araçla geçilir).
 */
export function rotaBol<T extends RotaNoktasi>(sira: T[], esik = BOLUM_ESIGI): Bolum<T>[] {
  const bolumler: Bolum<T>[] = [];
  sira.forEach((n, i) => {
    const onceki = sira[i - 1];
    const ara = onceki ? mesafe(onceki, n) : 0;
    const son = bolumler[bolumler.length - 1];
    if (!son || ara > esik) {
      bolumler.push({ bas: i, duraklar: [n], mesafe: 0, oncekindenUzaklik: ara });
    } else {
      son.duraklar.push(n);
      son.mesafe += ara;
    }
  });
  return bolumler;
}

/** OpenStreetMap yaya yol tarifi (gerçek sokak yolu; yeni sekmede açılır). */
export function yolTarifiAdresi(a: RotaNoktasi, b: RotaNoktasi): string {
  const k = (n: RotaNoktasi) => `${n.lat.toFixed(6)},${n.lng.toFixed(6)}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${k(a)}%3B${k(b)}`;
}
