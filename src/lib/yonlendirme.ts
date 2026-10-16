/**
 * Basit hash tabanlı yönlendirme.
 *
 * Neden hash: PWA çevrimdışı çalışırken ve statik olarak servis edilirken
 * sunucu tarafı yönlendirme kuralı gerektirmez. Tek dosyalık, bağımlılıksız.
 */
import { useEffect, useState } from 'react';

export type Rota =
  | { ad: 'yol' }
  | { ad: 'ders'; dersId: string }
  | { ad: 'defter' }
  | { ad: 'harita' }
  | { ad: 'arsiv' }
  | { ad: 'arsiv-eser'; arsivId: string }
  | { ad: 'ayarlar' }
  | { ad: 'carsi' }
  | { ad: 'sinif' }
  | { ad: 'gunun-eseri' }
  | { ad: 'hayrat-akar' }
  | { ad: 'sertifika'; sehirId: string }
  | { ad: 'canli' }
  | { ad: 'canli-kur' }
  | { ad: 'canli-yonet'; pin: string }
  | { ad: 'canli-oyna'; pin: string }
  | { ad: 'ogretmen' }
  | { ad: 'panel' }
  | { ad: 'panel-eser'; eserId: string }
  | { ad: 'bulunamadi'; yol: string };

export function rotayiCoz(hash: string): Rota {
  const temiz = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const parcalar = temiz.split('/').filter(Boolean);

  if (parcalar.length === 0) return { ad: 'yol' };

  switch (parcalar[0]) {
    case 'yol':
      return { ad: 'yol' };
    case 'ders':
      return parcalar[1] ? { ad: 'ders', dersId: decodeURIComponent(parcalar[1]) } : { ad: 'yol' };
    case 'defter':
      return { ad: 'defter' };
    case 'harita':
      return { ad: 'harita' };
    case 'arsiv':
      return parcalar[1]
        ? { ad: 'arsiv-eser', arsivId: decodeURIComponent(parcalar[1]) }
        : { ad: 'arsiv' };
    case 'ayarlar':
      return { ad: 'ayarlar' };
    case 'carsi':
      return { ad: 'carsi' };
    case 'sinif':
      return { ad: 'sinif' };
    case 'gunun-eseri':
      return { ad: 'gunun-eseri' };
    case 'hayrat-akar':
      return { ad: 'hayrat-akar' };
    case 'sertifika':
      return parcalar[1] ? { ad: 'sertifika', sehirId: decodeURIComponent(parcalar[1]) } : { ad: 'defter' };
    case 'canli': {
      // #/canli · #/canli/kur · #/canli/yonet/123456 · #/canli/oyna/123456
      const pin = /^\d{6}$/.test(parcalar[2] ?? '') ? parcalar[2]! : null;
      if (parcalar[1] === 'kur') return { ad: 'canli-kur' };
      if (parcalar[1] === 'yonet' && pin) return { ad: 'canli-yonet', pin };
      if (parcalar[1] === 'oyna' && pin) return { ad: 'canli-oyna', pin };
      return { ad: 'canli' };
    }
    case 'ogretmen':
      return { ad: 'ogretmen' };
    case 'panel':
      return parcalar[1]
        ? { ad: 'panel-eser', eserId: decodeURIComponent(parcalar[1]) }
        : { ad: 'panel' };
    default:
      return { ad: 'bulunamadi', yol: temiz };
  }
}

export function useRota(): Rota {
  const [rota, setRota] = useState<Rota>(() => rotayiCoz(window.location.hash));

  useEffect(() => {
    const dinleyici = () => setRota(rotayiCoz(window.location.hash));
    window.addEventListener('hashchange', dinleyici);
    return () => window.removeEventListener('hashchange', dinleyici);
  }, []);

  return rota;
}

export function git(yol: string): void {
  window.location.hash = yol.startsWith('#') ? yol : `#/${yol.replace(/^\//, '')}`;
}

/** Sayfa başlığını günceller — ekran okuyucu ve sekme başlığı için. */
export function baslikAyarla(baslik: string): void {
  document.title = baslik ? `${baslik} · Kök Avı` : 'Kök Avı';
}
