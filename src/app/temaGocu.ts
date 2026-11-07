import type { Ayarlar } from '@shared/types';

/**
 * Varsayılan tekrar açık temaya döndü; eski koyu varsayılan bir kez açığa taşınır.
 * Sonrasında kullanıcının seçimine dokunulmaz. Yalnızca cihazda.
 */
const ANAHTAR = 'kokavi.tema-gocu.v2';

export function temaGocuUygula(ayarlar: Ayarlar): Ayarlar {
  try {
    if (localStorage.getItem(ANAHTAR)) return ayarlar;
    localStorage.setItem(ANAHTAR, '1');
    return ayarlar.tema === 'koyu' ? { ...ayarlar, tema: 'acik' } : ayarlar;
  } catch {
    return ayarlar;
  }
}
