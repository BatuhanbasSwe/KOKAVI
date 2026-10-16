/**
 * Ders motoru yardımcıları: karıştırma, Türkçe duyarsız karşılaştırma, biçimleme.
 *
 * PDF taahhütleri:
 *  - "Boşluğu doldur" egzersizinde çocuk 'ı' yerine 'i' yazarsa cevap yanlış
 *    sayılmaz (10–12 yaş için yazım hatası cezalandırılmaz).
 *  - "Sırala" egzersizinde doğru sıra gizli kalır; arayüz karıştırılmış sunar.
 *  - Vakıf Röntgeni'nde oranlar desenli çubuklarla ve metinle birlikte verilir
 *    (renk körü kullanıcı için doku ayrımı).
 */
import type { Eser, GelirKalemi } from '@shared/types';

/**
 * Fisher–Yates karıştırma. Girdi dizisi değiştirilmez, yeni dizi döner.
 * Not: kasıtlı olarak rastgele — çocuk dersin sırasını ezberlemesin.
 */
export function karistir<T>(dizi: readonly T[]): T[] {
  const kopya = [...dizi];
  for (let i = kopya.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const gecici = kopya[i];
    kopya[i] = kopya[j];
    kopya[j] = gecici;
  }
  return kopya;
}

/**
 * "Sırala" egzersizi için karıştırma: sonuç doğru sırayla aynı çıkarsa ilk iki
 * öğe yer değiştirir. Böylece egzersiz asla çözülmüş hâlde başlamaz.
 */
export function karistirFarkli(dogruSira: readonly string[]): string[] {
  const karisik = karistir(dogruSira);
  const ayni = karisik.length > 1 && karisik.every((oge, i) => oge === dogruSira[i]);
  if (ayni) {
    const ilk = karisik[0];
    karisik[0] = karisik[1];
    karisik[1] = ilk;
  }
  return karisik;
}

/** Türkçe harflerin ASCII karşılıkları — karşılaştırma anahtarı için. */
const TURKCE_ESLEME: Record<string, string> = {
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ü: 'u',
  ö: 'o',
  ç: 'c',
  â: 'a',
  î: 'i',
  û: 'u',
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
};

/**
 * Büyük/küçük harf ve Türkçe karakter duyarsız karşılaştırma anahtarı.
 * "İpek Hanı" ile "ipek hani" aynı anahtarı üretir.
 */
export function turkceNormalize(metin: string): string {
  return metin
    .toLocaleLowerCase('tr-TR')
    .replace(/[ışğüöçâîûáéíóú]/g, (harf) => TURKCE_ESLEME[harf] ?? harf)
    .replace(/[.,;:!?'"()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Türkçe ondalık ayracıyla yüzde metni: 60 → "%60", 12.5 → "%12,5". */
export function yuzdeYaz(yuzde: number): string {
  const yuvarlanmis = Math.round(yuzde * 10) / 10;
  return `%${String(yuvarlanmis).replace('.', ',')}`;
}

export type CubukSinifi =
  | 'cubuk__dolgu--d1'
  | 'cubuk__dolgu--d2'
  | 'cubuk__dolgu--d3'
  | 'cubuk__dolgu--d4';

const CUBUK_SINIFLARI: readonly CubukSinifi[] = [
  'cubuk__dolgu--d1',
  'cubuk__dolgu--d2',
  'cubuk__dolgu--d3',
  'cubuk__dolgu--d4',
];

/**
 * Çubuk dolgusu için desen sınıfı (d1 düz, d2–d4 farklı eğimlerde çizgili).
 * PDF: "renk körlüğü uyumlu palet" — ayrım yalnızca renkle değil dokudan gelir.
 */
export function cubukSinifi(sira: number): CubukSinifi {
  const uzunluk = CUBUK_SINIFLARI.length;
  const indeks = ((sira % uzunluk) + uzunluk) % uzunluk;
  return CUBUK_SINIFLARI[indeks];
}

/** Gelir kalemlerini belgelenen sıraya dizer. */
export function gelirKalemleriniSirala(kalemler: readonly GelirKalemi[]): GelirKalemi[] {
  return [...kalemler].sort((a, b) => a.sira - b.sira);
}

/**
 * Eserin gelir dağılımı BELGELİ mi?
 *
 * PDF ilkesi: "doğrulanmamış hiçbir bilgi kesin bilgi olarak sunulmaz."
 * Bu yüzden hem durum alanı 'belgeli' olmalı hem de en az bir kalem bulunmalı.
 */
export function gelirBelgeliMi(eser: Eser): boolean {
  return eser.gelirDagilimiDurumu === 'belgeli' && eser.gelirKalemleri.length > 0;
}
