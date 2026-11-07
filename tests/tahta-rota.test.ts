/**
 * Tahta modu rotası — #/tahta/<sınıf kodu>/<ders kimliği>
 *
 * Okulda öğrenci telefonu yok; öğretmen tek cihazdan dersi tahtada açar.
 * Rota sınıf kodunu ve ders kimliğini taşır; eksik parametrede öğretmen
 * paneline düşer (yarım URL ile boş ekran gösterme).
 */
import { describe, expect, it } from 'vitest';
import { rotayiCoz } from '../src/lib/yonlendirme';

describe('tahta modu rotası', () => {
  it('sınıf kodunu ve ders kimliğini çözer', () => {
    expect(rotayiCoz('#/tahta/KTM-4829/bursa-u1-d1')).toEqual({
      ad: 'tahta',
      kod: 'KTM-4829',
      dersId: 'bursa-u1-d1',
    });
  });

  it('ders kimliği yoksa öğretmen paneline düşer', () => {
    expect(rotayiCoz('#/tahta/KTM-4829')).toEqual({ ad: 'ogretmen' });
  });

  it('sınıf Röntgeni rotasını ayrı çözer (ders kimliğiyle çakışmaz)', () => {
    expect(rotayiCoz('#/tahta/KTM-4829/rontgen')).toEqual({
      ad: 'sinif-rontgen',
      kod: 'KTM-4829',
    });
  });
});
