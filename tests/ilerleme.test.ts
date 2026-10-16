/**
 * İlerleme ve öğrenme yolu mantığı testleri.
 *
 * Bu testler başvuru PDF'indeki iki taahhüdü doğrular:
 *  1) Yol görselindeki kilit sırası: Bursa Ü1 ✅ → Bursa Ü2 ✅ → Bursa Ü3 (burada)
 *     → Konya Ü1 🔒 → Kütahya Ü1 🔒 → İzmir Ü1 🔒
 *  2) "Seviye: Çırak → Kalfa → Usta"
 */
import { describe, expect, it } from 'vitest';
import {
  bosIlerleme,
  dersTamamla,
  gunAnahtari,
  ilerlemeYukle,
  seviyeHesapla,
  seriGuncelle,
  yolHesapla,
} from '../src/lib/ilerleme';
import type { YolIskeletiSehir } from '../src/lib/api';

/** PDF'teki yol görselinin test verisi. */
const ISKELET: YolIskeletiSehir[] = [
  {
    sehirId: 'bursa',
    ad: 'Bursa',
    sira: 1,
    uniteler: [
      {
        uniteId: 'bursa-u1',
        ad: 'Bursa Ünite 1',
        sira: 1,
        dersler: [
          { dersId: 'b1d1', eserId: 'e1', eserAdi: 'Eser 1', tur: 'Han', sira: 1 },
          { dersId: 'b1d2', eserId: 'e2', eserAdi: 'Eser 2', tur: 'Cami', sira: 2 },
        ],
      },
      {
        uniteId: 'bursa-u2',
        ad: 'Bursa Ünite 2',
        sira: 2,
        dersler: [{ dersId: 'b2d1', eserId: 'e3', eserAdi: 'Eser 3', tur: 'Çeşme', sira: 1 }],
      },
      {
        uniteId: 'bursa-u3',
        ad: 'Bursa Ünite 3',
        sira: 3,
        dersler: [{ dersId: 'b3d1', eserId: 'e4', eserAdi: 'Eser 4', tur: 'Medrese', sira: 1 }],
      },
    ],
  },
  {
    sehirId: 'konya',
    ad: 'Konya',
    sira: 2,
    uniteler: [
      {
        uniteId: 'konya-u1',
        ad: 'Konya Ünite 1',
        sira: 1,
        dersler: [{ dersId: 'k1d1', eserId: 'e5', eserAdi: 'Eser 5', tur: 'Cami', sira: 1 }],
      },
    ],
  },
  {
    sehirId: 'kutahya',
    ad: 'Kütahya',
    sira: 3,
    uniteler: [
      {
        uniteId: 'kutahya-u1',
        ad: 'Kütahya Ünite 1',
        sira: 1,
        dersler: [{ dersId: 'kt1d1', eserId: 'e6', eserAdi: 'Eser 6', tur: 'Külliye', sira: 1 }],
      },
    ],
  },
];

describe('yolHesapla — kilit mantığı', () => {
  it('hiç ders tamamlanmadıysa yalnızca ilk ünite açıktır', () => {
    const yol = yolHesapla(ISKELET, []);

    expect(yol.sehirler[0]!.uniteler[0]!.kilitli).toBe(false);
    expect(yol.sehirler[0]!.uniteler[0]!.aktif).toBe(true);
    expect(yol.sehirler[0]!.uniteler[1]!.kilitli).toBe(true);
    expect(yol.sehirler[0]!.uniteler[2]!.kilitli).toBe(true);
    // Sonraki şehirler tamamen kilitli
    expect(yol.sehirler[1]!.kilitli).toBe(true);
    expect(yol.sehirler[2]!.kilitli).toBe(true);
  });

  it('PDF yol görseli: Bursa Ü1 ve Ü2 bitince Bursa Ü3 aktif, Konya kilitli kalır', () => {
    const yol = yolHesapla(ISKELET, ['b1d1', 'b1d2', 'b2d1']);

    const bursa = yol.sehirler[0]!;
    expect(bursa.uniteler[0]!.tamamlananSayi).toBe(2);
    expect(bursa.uniteler[1]!.tamamlananSayi).toBe(1);
    expect(bursa.uniteler[2]!.aktif).toBe(true);
    expect(bursa.uniteler[2]!.kilitli).toBe(false);

    expect(yol.sehirler[1]!.kilitli).toBe(true);
    expect(yol.sehirler[2]!.kilitli).toBe(true);
    expect(yol.sehirler[1]!.uniteler[0]!.kilitli).toBe(true);
  });

  it('Bursa tamamen bitince Konya açılır', () => {
    const yol = yolHesapla(ISKELET, ['b1d1', 'b1d2', 'b2d1', 'b3d1']);

    expect(yol.sehirler[0]!.tamamlandi).toBe(true);
    expect(yol.sehirler[1]!.kilitli).toBe(false);
    expect(yol.sehirler[1]!.uniteler[0]!.aktif).toBe(true);
    // Kütahya hâlâ kilitli
    expect(yol.sehirler[2]!.kilitli).toBe(true);
  });

  it('güncel ders, aktif ünitedeki ilk tamamlanmamış derstir', () => {
    expect(yolHesapla(ISKELET, []).guncelDersId).toBe('b1d1');
    expect(yolHesapla(ISKELET, ['b1d1']).guncelDersId).toBe('b1d2');
    expect(yolHesapla(ISKELET, ['b1d1', 'b1d2']).guncelDersId).toBe('b2d1');
    expect(yolHesapla(ISKELET, ['b1d1', 'b1d2', 'b2d1', 'b3d1']).guncelDersId).toBe('k1d1');
  });

  it('her şey bitince güncel ders kalmaz', () => {
    const hepsi = ['b1d1', 'b1d2', 'b2d1', 'b3d1', 'k1d1', 'kt1d1'];
    const yol = yolHesapla(ISKELET, hepsi);
    expect(yol.guncelDersId).toBeNull();
    expect(yol.sehirler.every((s) => s.tamamlandi)).toBe(true);
  });

  it('Kuzey Yıldızı metriği: şehir ancak tüm dersleri bitince tamamlanır', () => {
    // Bursa'nın 4 dersi var; 3'ü bitince tamamlanmamış olmalı
    const yol = yolHesapla(ISKELET, ['b1d1', 'b1d2', 'b2d1']);
    expect(yol.sehirler[0]!.tamamlandi).toBe(false);
    expect(yol.sehirler[0]!.tamamlananSayi).toBe(3);
    expect(yol.sehirler[0]!.toplamSayi).toBe(4);
  });
});

describe('seviyeHesapla — Çırak / Kalfa / Usta', () => {
  it('0-5 ders arası Çırak', () => {
    expect(seviyeHesapla(0).ad).toBe('Çırak');
    expect(seviyeHesapla(5).ad).toBe('Çırak');
    expect(seviyeHesapla(5).kalanDers).toBe(1);
  });

  it('6-11 ders arası Kalfa', () => {
    expect(seviyeHesapla(6).ad).toBe('Kalfa');
    expect(seviyeHesapla(11).ad).toBe('Kalfa');
    expect(seviyeHesapla(6).kalanDers).toBe(6);
  });

  it('12 ve üzeri Usta, sonraki seviye yok', () => {
    expect(seviyeHesapla(12).ad).toBe('Usta');
    expect(seviyeHesapla(50).ad).toBe('Usta');
    expect(seviyeHesapla(50).sonrakiEsik).toBeNull();
    expect(seviyeHesapla(50).kalanDers).toBeNull();
  });
});

describe('seriGuncelle — keşif serisi', () => {
  it('ilk çalışmada seri 1 olur', () => {
    expect(seriGuncelle({ gunSayisi: 0, sonTarih: null }, '2026-10-12')).toEqual({
      gunSayisi: 1,
      sonTarih: '2026-10-12',
    });
  });

  it('aynı gün tekrar çalışmak seriyi artırmaz', () => {
    const seri = { gunSayisi: 3, sonTarih: '2026-10-12' };
    expect(seriGuncelle(seri, '2026-10-12')).toEqual(seri);
  });

  it('ertesi gün çalışmak seriyi artırır', () => {
    expect(seriGuncelle({ gunSayisi: 3, sonTarih: '2026-10-12' }, '2026-10-13')).toEqual({
      gunSayisi: 4,
      sonTarih: '2026-10-13',
    });
  });

  it('gün atlanırsa seri sıfırlanır', () => {
    expect(seriGuncelle({ gunSayisi: 7, sonTarih: '2026-10-12' }, '2026-10-14')).toEqual({
      gunSayisi: 1,
      sonTarih: '2026-10-14',
    });
  });

  it('ay geçişi doğru hesaplanır', () => {
    expect(seriGuncelle({ gunSayisi: 2, sonTarih: '2026-10-31' }, '2026-11-01')).toEqual({
      gunSayisi: 3,
      sonTarih: '2026-11-01',
    });
  });
});

describe('dersTamamla — elmas ve defter', () => {
  it('yeni ders elmas kazandırır ve deftere sayfa ekler', () => {
    const { ilerleme, yeniTamamlandi } = dersTamamla(bosIlerleme(), 'b1d1', 'e1', '2026-10-12');
    expect(yeniTamamlandi).toBe(true);
    expect(ilerleme.elmas).toBe(10);
    expect(ilerleme.tamamlananDersler).toEqual(['b1d1']);
    expect(ilerleme.defterSayfalari).toEqual(['e1']);
    expect(ilerleme.seri.gunSayisi).toBe(1);
  });

  it('aynı ders tekrar tamamlanırsa elmas tekrar verilmez', () => {
    const ilk = dersTamamla(bosIlerleme(), 'b1d1', 'e1', '2026-10-12').ilerleme;
    const ikinci = dersTamamla(ilk, 'b1d1', 'e1', '2026-10-13');
    expect(ikinci.yeniTamamlandi).toBe(false);
    expect(ikinci.ilerleme.elmas).toBe(10);
    expect(ikinci.ilerleme.tamamlananDersler).toHaveLength(1);
  });

  it('aynı eserin ikinci dersi deftere ikinci sayfa eklemez', () => {
    const ilk = dersTamamla(bosIlerleme(), 'b1d1', 'e1', '2026-10-12').ilerleme;
    const ikinci = dersTamamla(ilk, 'b1d2', 'e1', '2026-10-12').ilerleme;
    expect(ikinci.defterSayfalari).toEqual(['e1']);
    expect(ikinci.elmas).toBe(20);
  });
});

describe('gunAnahtari', () => {
  it('YYYY-MM-DD biçiminde ve sıfır dolgulu', () => {
    expect(gunAnahtari(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(gunAnahtari(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('ilerlemeYukle — bozuk kayıt dayanıklılığı', () => {
  it('kayıt yoksa boş ilerleme döner', () => {
    localStorage.clear();
    expect(ilerlemeYukle()).toEqual(bosIlerleme());
  });

  it('eksik alanlı eski kayıt varsayılanlarla tamamlanır', () => {
    localStorage.setItem('kokavi.ilerleme.v1', JSON.stringify({ elmas: 40 }));
    const yuklenen = ilerlemeYukle();
    expect(yuklenen.elmas).toBe(40);
    expect(yuklenen.tamamlananDersler).toEqual([]);
    expect(yuklenen.ayarlar.tema).toBe('koyu');
    expect(yuklenen.seri.gunSayisi).toBe(0);
  });

  it('bozuk JSON çökmez', () => {
    localStorage.setItem('kokavi.ilerleme.v1', '{bozuk');
    expect(ilerlemeYukle()).toEqual(bosIlerleme());
  });
});
