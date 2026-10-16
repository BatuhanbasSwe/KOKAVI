/**
 * PWA "ana ekrana ekle" desteği.
 *
 * Tarayıcı kurulum önerisini (`beforeinstallprompt`) sayfa açılır açılmaz
 * yollar; bu modül App ile birlikte yüklendiği için olayı erkenden yakalar ve
 * Ayarlar'daki düğme istediğinde gösterir. iOS Safari bu olayı desteklemez:
 * orada elle "Paylaş → Ana Ekrana Ekle" adımları anlatılır.
 */
import { useEffect, useState } from 'react';

interface KurulumOlayi extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let bekleyen: KurulumOlayi | null = null;
const dinleyiciler = new Set<() => void>();
const haberVer = () => dinleyiciler.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (olay) => {
    olay.preventDefault(); // tarayıcının kendi bandı yerine bizim düğmemiz
    bekleyen = olay as KurulumOlayi;
    haberVer();
  });
  window.addEventListener('appinstalled', () => {
    bekleyen = null;
    haberVer();
  });
}

export function kuruluMu(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  return standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function iosMu(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function useYukleme() {
  const [, yenile] = useState(0);
  useEffect(() => {
    const f = () => yenile((n) => n + 1);
    dinleyiciler.add(f);
    return () => {
      dinleyiciler.delete(f);
    };
  }, []);
  return {
    kurulu: kuruluMu(),
    yuklenebilir: bekleyen !== null,
    ios: iosMu(),
    async yukle(): Promise<boolean> {
      if (!bekleyen) return false;
      const olay = bekleyen;
      await olay.prompt();
      const { outcome } = await olay.userChoice;
      bekleyen = null;
      haberVer();
      return outcome === 'accepted';
    },
  };
}
