/**
 * Ayarlara bağlı efekt çalıcı. Durum sağlayıcısı olmayan yerde (birim testleri)
 * sessiz kalır, çökmez.
 */
import { useCallback } from 'react';
import { useDurum } from './DurumSaglayici';
import { efekt, type EfektTuru } from './efekt';

export function useEfekt(): (tur: EfektTuru) => void {
  let ayar: { sessizMod: boolean; hareketAzalt: boolean } | null;
  try {
    ayar = useDurum().ayarlar;
  } catch {
    ayar = null; // sağlayıcı yok → sessiz
  }
  const sessiz = ayar?.sessizMod ?? true;
  const hareketAzalt = ayar?.hareketAzalt ?? true;
  return useCallback((tur) => efekt(tur, { sessizMod: sessiz, hareketAzalt }), [sessiz, hareketAzalt]);
}
