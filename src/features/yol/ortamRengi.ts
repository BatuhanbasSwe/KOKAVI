/**
 * Ortam rengi: Yol ekranında kaydırırken ekranın ortasındaki eserin fotoğrafı
 * çok bulanık ve soluk biçimde arka plana yayılır; sayfa o eserin renklerini
 * alır (Duolingo'daki ünite rengi, Apple Music'teki kapak arka planı gibi).
 *
 * Fotoğraf adresi `--ortam-foto` değişkenine yazılır; CSS `.ortam-zemin`
 * katmanında bulanıklaştırıp düşük opaklıkla gösterir, metin kontrastı bozulmaz.
 * Süs amaçlıdır: anlam taşımaz, yüksek kontrast temasında gizlidir.
 */
import { useEffect } from 'react';

const FOTO_SECICI = '.patika__madalyon img, .zt-kart__foto';

/** Ekranın dikey ortasına en yakın, görünür fotoğraf. */
export function ortadakiFoto(): HTMLImageElement | null {
  const orta = window.innerHeight / 2;
  let enYakin: HTMLImageElement | null = null;
  let enAzUzaklik = Infinity;
  for (const img of document.querySelectorAll<HTMLImageElement>(FOTO_SECICI)) {
    const k = img.getBoundingClientRect();
    if (k.height === 0 || k.bottom < 0 || k.top > window.innerHeight) continue;
    const uzaklik = Math.abs(k.top + k.height / 2 - orta);
    if (uzaklik < enAzUzaklik) {
      enAzUzaklik = uzaklik;
      enYakin = img;
    }
  }
  return enYakin;
}

/** Kaydırdıkça ortadaki fotoğrafı `--ortam-foto`ya yazar. */
export function useOrtamRengi(etkin: boolean): void {
  useEffect(() => {
    if (!etkin) return;
    const kok = document.documentElement;
    let bekleyen = 0;
    let son = '';

    function guncelle() {
      bekleyen = 0;
      const img = ortadakiFoto();
      const adres = img?.getAttribute('src');
      if (adres && adres !== son) {
        son = adres;
        kok.style.setProperty('--ortam-foto', `url("${adres}")`);
      }
    }
    const planla = () => {
      if (!bekleyen) bekleyen = window.requestAnimationFrame(guncelle);
    };

    window.addEventListener('scroll', planla, { passive: true });
    window.addEventListener('resize', planla);
    planla();
    // İlk açılışta sıradaki durağa kaydırma (odak=siradaki) bittikten sonra da ölç.
    const gec = window.setTimeout(planla, 900);
    return () => {
      window.removeEventListener('scroll', planla);
      window.removeEventListener('resize', planla);
      window.clearTimeout(gec);
      if (bekleyen) window.cancelAnimationFrame(bekleyen);
      kok.style.removeProperty('--ortam-foto');
    };
  }, [etkin]);
}
