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

/**
 * "Sırala" öğesindeki tarih önekini ayırır: "1339: Cami yapıldı" →
 * { tarih: "1339", olay: "Cami yapıldı" }. Önekte rakam yoksa (ör. "Köylerden
 * gelen buğday: 70.615 kuruş") ya da önek uzunsa öğe olduğu gibi kalır.
 *
 * Neden: Tarih görünürken çocuk metni okumadan sayıları sıralar. Tarihi
 * gizleyince olay akışını hatırlamak zorunda kalır (geri çağırma); ilk
 * denemeden sonra tarih ipucu olarak açılır, çıkmaz sokak olmaz.
 */
export function tarihAyir(oge: string): { tarih: string | null; olay: string } {
  const eslesme = /^([^:]{1,30}):\s+(.+)$/s.exec(oge);
  if (!eslesme || !/\d|yüzyıl|bugün/i.test(eslesme[1])) return { tarih: null, olay: oge };
  return { tarih: eslesme[1].trim(), olay: eslesme[2].trim() };
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

/** Metinden 32 bit tohum (FNV-1a). Aynı metin her zaman aynı sayıyı verir. */
function tohum(metin: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Her dersin egzersiz sırası ve sayısı farklı olsun diye seçim yapar (A1).
 * Aynı ders her açılışta aynı sırayı verir: tekrar açan çocuk kaybolmaz.
 * Dört veya daha fazla egzersizi olan derslerin yaklaşık üçte biri bir egzersiz eksik gelir.
 */
export function dersEgzersizSecimi<T>(dersId: string, egzersizler: readonly T[]): T[] {
  let s = tohum(dersId);
  const rastgele = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sonuc = [...egzersizler];
  for (let i = sonuc.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele() * (i + 1));
    [sonuc[i], sonuc[j]] = [sonuc[j]!, sonuc[i]!];
  }
  if (sonuc.length >= 4 && tohum(`${dersId}#sayi`) % 3 === 0) sonuc.pop();
  return sonuc;
}
