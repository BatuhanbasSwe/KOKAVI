import { beforeEach, describe, expect, it, vi } from 'vitest';
import { temaGocuUygula } from '../src/app/temaGocu';
import { VARSAYILAN_AYARLAR } from '../src/lib/ilerleme';

describe('tema göçü (koyu varsayılandan açık varsayılana)', () => {
  beforeEach(() => localStorage.clear());

  it('yeni varsayılan açık', () => {
    expect(VARSAYILAN_AYARLAR.tema).toBe('acik');
  });

  it('eski varsayılan koyu bir kez açığa taşınır, sonra kullanıcı seçimine dokunulmaz', () => {
    expect(temaGocuUygula({ ...VARSAYILAN_AYARLAR, tema: 'koyu' }).tema).toBe('acik');
    expect(temaGocuUygula({ ...VARSAYILAN_AYARLAR, tema: 'koyu' }).tema).toBe('koyu');
  });

  it('yüksek kontrast seçimi korunur', () => {
    expect(temaGocuUygula({ ...VARSAYILAN_AYARLAR, tema: 'yuksek-kontrast' }).tema).toBe(
      'yuksek-kontrast',
    );
  });

  it('depolama kapalıysa ayar olduğu gibi döner', () => {
    const casus = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('kapalı');
    });
    try {
      expect(temaGocuUygula({ ...VARSAYILAN_AYARLAR, tema: 'koyu' }).tema).toBe('koyu');
    } finally {
      casus.mockRestore();
    }
  });
});
