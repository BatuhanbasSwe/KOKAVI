/**
 * Kişisel sıra: başlangıç sorularındaki ilgiler ders önceliğini değiştirir mi?
 *
 * Kilit modeli `yolHesapla()`'da kalır; burada yalnızca öneri sırası sınanır:
 *  - açık ünitede ilgiye uyan tamamlanmamış ders öne alınır,
 *  - açık ünitede eşleşme yoksa / ilgi boşsa eski davranış korunur,
 *  - zamana göre görünümde ilgiye uyan en eski bitmemiş eser önerilir.
 */
import { describe, expect, it } from 'vitest';
import type { YolIskeletiSehir } from '../src/lib/api';
import { yolHesapla } from '../src/lib/ilerleme';
import { kategoriBul } from '../src/lib/kategori';
import {
  ILGI_KATEGORILERI,
  ilgiKategorileri,
  ilgiOncelikliSiradaki,
  ilgiyeUygun,
  kisiselGuncelDersId,
} from '../src/lib/kisiselSira';
import { ESERLER } from '../src/features/gunun-eseri/oyun';
import { siradakiDers } from '../src/features/bugun/siradaki';

const [ESER_A, ESER_B] = [ESERLER[0]!.eserId, ESERLER[1]!.eserId];

/** Bursa 3 ünite: Ü1 (Han, Cami), Ü2 (Çeşme), Ü3 (Medrese). */
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
          { dersId: 'u1d1', eserId: 'e1', eserAdi: 'Han Eseri', tur: 'Han', sira: 1 },
          { dersId: 'u1d2', eserId: 'e2', eserAdi: 'Cami Eseri', tur: 'Cami', sira: 2 },
        ],
      },
      {
        uniteId: 'bursa-u2',
        ad: 'Bursa Ünite 2',
        sira: 2,
        dersler: [{ dersId: 'u2d1', eserId: 'e3', eserAdi: 'Çeşme Eseri', tur: 'Çeşme', sira: 1 }],
      },
      {
        uniteId: 'bursa-u3',
        ad: 'Bursa Ünite 3',
        sira: 3,
        dersler: [{ dersId: 'u3d1', eserId: 'e4', eserAdi: 'Medrese Eseri', tur: 'Medrese', sira: 1 }],
      },
    ],
  },
];

describe('ilgi → kategori eşlemesi', () => {
  it('her ilgi en az bir kategoriye bağlanır', () => {
    for (const kategoriler of Object.values(ILGI_KATEGORILERI)) {
      expect(kategoriler.length).toBeGreaterThan(0);
    }
  });

  it('çeşme ve köprü ilgisi iki kategoriyi birden kapsar', () => {
    const set = ilgiKategorileri(['cesme-kopru']);
    expect(set.has('Çeşme')).toBe(true);
    expect(set.has('Köprü')).toBe(true);
  });

  it('ilgi yoksa kategori kümesi boştur ve hiçbir tür uymaz', () => {
    expect(ilgiKategorileri([]).size).toBe(0);
    expect(ilgiyeUygun('Cami', ilgiKategorileri([]))).toBe(false);
  });

  it('ham tür metni kategoriye indirgenerek karşılaştırılır', () => {
    const set = ilgiKategorileri(['han']);
    expect(ilgiyeUygun('Han', set)).toBe(true);
    expect(ilgiyeUygun('Han/kervansaray (menzil külliyesi)', set)).toBe(true);
    expect(ilgiyeUygun('Cami ve külliye', set)).toBe(false);
  });
});

describe('kisiselGuncelDersId — açık ünitede ilgi önceliği', () => {
  it('açık ünitede ilgiye uyan tamamlanmamış ders öne alınır', () => {
    const yol = yolHesapla(ISKELET, []);
    expect(yol.guncelDersId).toBe('u1d1'); // varsayılan: ilk ders (Han)
    expect(kisiselGuncelDersId(yol, ['cami'])).toBe('u1d2'); // öneri: Cami
  });

  it('ilgi yoksa kişiselleştirme uygulanmaz', () => {
    const yol = yolHesapla(ISKELET, []);
    expect(kisiselGuncelDersId(yol, [])).toBeNull();
  });

  it('açık ünitede eşleşme yoksa eski davranışa düşülür', () => {
    const yol = yolHesapla(ISKELET, []);
    expect(kisiselGuncelDersId(yol, ['hamam', 'kulliye'])).toBeNull();
  });

  it('ilgiye uyan ders bitince açılan sonraki ünitede arama yapılır', () => {
    const yol = yolHesapla(ISKELET, ['u1d1', 'u1d2']);
    expect(yol.guncelDersId).toBe('u2d1');
    expect(kisiselGuncelDersId(yol, ['cesme-kopru'])).toBe('u2d1');
    expect(kisiselGuncelDersId(yol, ['medrese'])).toBeNull(); // Ü3 henüz kilitli
  });

  it('tamamlanan ilgi dersi tekrar önerilmez', () => {
    const yol = yolHesapla(ISKELET, ['u1d2']);
    expect(kisiselGuncelDersId(yol, ['cami'])).toBeNull();
  });
});

describe('ilgiOncelikliSiradaki — zamana göre öneri', () => {
  const sirali = [
    { eserId: 'a', tur: 'Han' },
    { eserId: 'b', tur: 'Cami' },
    { eserId: 'c', tur: 'Çeşme' },
  ];

  it('ilgiye uyan ilk bitmemiş eseri seçer', () => {
    expect(ilgiOncelikliSiradaki(sirali, new Set(), ['cami'])?.eserId).toBe('b');
  });

  it('ilgi yoksa listedeki ilk bitmemiş esere düşer', () => {
    expect(ilgiOncelikliSiradaki(sirali, new Set(), [])?.eserId).toBe('a');
  });

  it('biten eserler atlanır', () => {
    expect(ilgiOncelikliSiradaki(sirali, new Set(['a', 'b']), ['cami'])?.eserId).toBe('c');
  });
});

describe('siradakiDers — ekranlara yansıyan öneri', () => {
  it('şehir sırasında ilgiye uyan ders sıradaki olur', () => {
    const yol = yolHesapla(ISKELET, []);
    expect(siradakiDers(yol, 'sehir', [])?.dersId).toBe('u1d1');
    expect(siradakiDers(yol, 'sehir', ['cami'])?.dersId).toBe('u1d2');
  });

  it('zamana göre sıradaki ders ilgiye uyan türe taşınır', () => {
    const iskelet: YolIskeletiSehir[] = [
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
              { dersId: 'z1', eserId: ESER_A, eserAdi: 'Han Eseri', tur: 'Han', sira: 1 },
              { dersId: 'z2', eserId: ESER_B, eserAdi: 'Cami Eseri', tur: 'Cami', sira: 2 },
            ],
          },
        ],
      },
    ];
    const yol = yolHesapla(iskelet, []);
    const cami = siradakiDers(yol, 'zaman', ['cami']);
    expect(cami).not.toBeNull();
    expect(kategoriBul(cami!.tur)).toBe('Cami');
  });
});
