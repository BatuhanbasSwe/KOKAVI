/**
 * Profil ilerleme çubukları: rozetIlerlemesi, kazanilanlar ile aynı kuralı söylemeli.
 */
import { describe, expect, it } from 'vitest';
import type { OgrenmeYolu } from '../shared/types';
import { kazanilanlar, rozetIlerlemesi, tumRozetler } from '../src/features/rozetler/rozetMantigi';

const yol = (tamam: number, toplam: number): OgrenmeYolu => ({
  guncelDersId: null,
  sehirler: [
    { sehirId: 'bursa', ad: 'Bursa', sira: 1, uniteler: [], tamamlananSayi: tamam, toplamSayi: toplam, kilitli: false, tamamlandi: tamam >= toplam },
  ],
});

const girdi = (n: number, seri = 0, kusursuz = 0, podyum = 0, kazanilan = 0, ilkTahmin = 0) => ({
  ilerleme: { tamamlananDersler: Array.from({ length: n }, (_, i) => `d${i}`), seri: { gunSayisi: seri, sonTarih: null } },
  yol: yol(Math.min(n, 33), 33),
  sayaclar: { kusursuzDers: kusursuz, podyum },
  gununEseri: { kazanilan, ilkTahmin },
});

describe('rozet ilerlemesi', () => {
  it('eşikler ve kırpma', () => {
    const r = (id: string) => tumRozetler(yol(0, 33)).find((x) => x.id === id)!;
    expect(rozetIlerlemesi(r('bes-ders'), girdi(3))).toEqual({ simdi: 3, hedef: 5 });
    expect(rozetIlerlemesi(r('bes-ders'), girdi(9))).toEqual({ simdi: 5, hedef: 5 });
    expect(rozetIlerlemesi(r('seviye-kalfa'), girdi(2))).toEqual({ simdi: 2, hedef: 6 });
    expect(rozetIlerlemesi(r('seri-7'), girdi(1, 4))).toEqual({ simdi: 4, hedef: 7 });
    expect(rozetIlerlemesi(r('gunluk-5'), girdi(0, 0, 0, 0, 2))).toEqual({ simdi: 2, hedef: 5 });
    expect(rozetIlerlemesi(r('sehir-bursa'), girdi(10))).toEqual({ simdi: 10, hedef: 33 });
  });

  it('kazanıldı ⇔ simdi >= hedef (tüm rozetler, çeşitli girdiler)', () => {
    const girdiler = [girdi(0), girdi(1, 3), girdi(6, 7, 1), girdi(12, 2, 0, 1, 5, 1), girdi(20), girdi(33, 7, 2, 2, 9, 3)];
    for (const g of girdiler) {
      const k = kazanilanlar(g);
      for (const rozet of tumRozetler(g.yol)) {
        const { simdi, hedef } = rozetIlerlemesi(rozet, g);
        expect(simdi <= hedef, rozet.id).toBe(true);
        expect(simdi >= hedef, `${rozet.id} @ ${g.ilerleme.tamamlananDersler.length}`).toBe(k.has(rozet.id));
      }
    }
  });
});
