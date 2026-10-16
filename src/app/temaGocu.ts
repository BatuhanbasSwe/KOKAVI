import type { Ayarlar } from '@shared/types';

/**
 * Yeniden tasarımda varsayılan tema "açık"tan "koyu"ya geçti. Eski kayıtlarda
 * "açık" çoğunlukla seçim değil eski varsayılandır; bu yüzden bir kez koyuya
 * taşınır. Sonrasında kullanıcının seçimine dokunulmaz. Yalnızca cihazda.
 */
const ANAHTAR = 'kokavi.tema-gocu.v1';

export function temaGocuUygula(ayarlar: Ayarlar): Ayarlar {
  try {
    if (localStorage.getItem(ANAHTAR)) return ayarlar;
    localStorage.setItem(ANAHTAR, '1');
    return ayarlar.tema === 'acik' ? { ...ayarlar, tema: 'koyu' } : ayarlar;
  } catch {
    return ayarlar;
  }
}
