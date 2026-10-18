/**
 * JS animasyonları için "hareketi azalt" kontrolü. CSS animasyonlarını
 * tokens.css'teki genel kural durdurur; Web Animations API ile oynatılanlar
 * buradan sorar. Sistem ayarı ya da uygulamadaki ayar açıksa oynatılmaz.
 */
export function hareketAzaltildiMi(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.dataset.hareketAzalt === 'true') return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Öğe Web Animations API'yi destekliyor ve hareket azaltılmamış mı? */
export function canlandirilabilir(oge: Element | null | undefined): oge is HTMLElement {
  return !!oge && typeof (oge as HTMLElement).animate === 'function' && !hareketAzaltildiMi();
}
