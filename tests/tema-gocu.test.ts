import { beforeEach, describe, expect, it, vi } from 'vitest';
import { temaGocuUygula } from '../src/app/temaGocu';
import { VARSAYILAN_AYARLAR } from '../src/lib/ilerleme';

describe('tema göçü (açık varsayılandan koyu varsayılana)', () => {
  beforeEach(() => localStorage.clear());

  it('yeni varsayılan koyu', () => {
    expect(VARSAYILAN_AYARLAR.tema).toBe('koyu');
  });

  it('eski varsayılan açık bir kez koyuya taşınır, sonra kullanıcı seçimine dokunulmaz', () => {
    expect(temaGocuUygula({ ...VARSAYILAN_AYARLAR, tema: 'acik' }).tema).toBe('koyu');
    expect(temaGocuUygula({ ...VARSAYILAN_AYARLAR, tema: 'acik' }).tema).toBe('acik');
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
      expect(temaGocuUygula({ ...VARSAYILAN_AYARLAR, tema: 'acik' }).tema).toBe('acik');
    } finally {
      casus.mockRestore();
    }
  });
});
