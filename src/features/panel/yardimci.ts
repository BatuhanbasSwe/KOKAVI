/**
 * Panel içi ortak yardımcılar.
 *
 * Hem eser formu hem ünite yönetimi aynı kuralları kullanır: Türkçe karakterden
 * arındırılmış kimlik üretimi ve Türkçe ondalık ayracını (virgül) kabul eden
 * sayı çözümlemesi.
 */
import { ApiHatasi } from '../../lib/api';

/** Türkçe karakterlerin ASCII karşılıkları. */
const TURKCE_HARITA: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

/** "Bursa Ulu Cami" → "bursa-ulu-cami". Kimlikler URL'de göründüğü için sadeleştirilir. */
export function kimlikUret(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (harf) => TURKCE_HARITA[harf] ?? harf)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "12,5" ve "12.5" biçimlerini kabul eder; boş veya sayı olmayan değerde null döner. */
export function sayiyaCevir(ham: string): number | null {
  const temiz = ham.trim().replace(',', '.');
  if (temiz === '') return null;
  const sayi = Number(temiz);
  return Number.isFinite(sayi) ? sayi : null;
}

/** Boş metin veritabanına null olarak yazılır — "boş" ile "yok" ayrımı korunur. */
export function metinVeyaNull(ham: string): string | null {
  const temiz = ham.trim();
  return temiz === '' ? null : temiz;
}

/** Panel formlarında alan hatası taşımayan yardımcı tip. */
export type AlanHatalari = Record<string, string>;

/**
 * Panelde gösterilecek kullanıcı dostu hata metni.
 *
 * Oturumun düştüğü (401) durumda ham sunucu metni yerine ne yapılacağını
 * söyleyen bir cümle döner; KorumaliPanel aynı anda yeniden giriş katmanı açar.
 */
export function panelHataMesaji(hata: unknown, varsayilan: string): string {
  if (hata instanceof ApiHatasi) {
    if (hata.durum === 401) {
      return 'Oturumun sona ermiş. Girdiğin bilgiler bu sayfada duruyor; üstteki yeniden giriş kutusundan giriş yapıp kaydetmeyi yeniden deneyebilirsin.';
    }
    if (hata.durum === 403) return 'Bu işlem için yetkin yok.';
    if (hata.durum === 429) return 'Çok fazla deneme yapıldı. Kısa bir süre bekleyip yeniden dene.';
    if (hata.durum >= 500) return 'Sunucuda beklenmeyen bir sorun oldu. Kısa bir süre sonra yeniden dene.';
  }
  return hata instanceof Error ? hata.message : varsayilan;
}
