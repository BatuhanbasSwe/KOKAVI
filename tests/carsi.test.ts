/**
 * Vakıf Çarşısı — elmas harcama kuralları.
 *
 * Başvuru PDF'i s. 3: "Kozmetik ve konfor için harcanır: Kâşif Defteri teması,
 * avatar, ek ipucu, çevrimdışı paket." · "Ana öğrenme yolu her zaman
 * ücretsizdir." · s. 2: "yeni şehir paketleri … için kullanılır."
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AVATARLAR,
  CARSI_ANAHTARI,
  DEFTER_TEMALARI,
  IPUCU_PAKETI,
  SEHIR_PAKETI_FIYAT,
  bosCarsiDurumu,
  carsiKaydet,
  carsiYukle,
  ipucuKullan,
  satinAl,
  sec,
  sehirPaketleriniUygula,
  type Urun,
} from '../src/lib/carsi';

const kubbe = AVATARLAR.find((a) => a.id === 'avatar-kubbe')!;
const ebru = DEFTER_TEMALARI.find((t) => t.id === 'tema-ebru')!;
const sehirUrunu: Urun = { id: 'sehir-konya', tur: 'sehir', ad: 'Konya', aciklama: '', fiyat: SEHIR_PAKETI_FIYAT };

describe('Vakıf Çarşısı — satın alma', () => {
  it('ücretsiz avatar ve tema baştan sahiptir', () => {
    const d = bosCarsiDurumu();
    expect(d.avatar).toBe('avatar-yildiz');
    expect(d.defterTemasi).toBe('tema-cini');
  });

  it('elmas yetmezse hiçbir şey değişmez (elmas düşmez)', () => {
    const d = bosCarsiDurumu();
    const s = satinAl(d, 10, kubbe);
    expect(s).toEqual({ tamam: false, neden: 'yetersiz-elmas' });
  });

  it('avatar alınca sahip olunur, seçilir ve fiyat kadar elmas düşer', () => {
    const s = satinAl(bosCarsiDurumu(), 50, kubbe);
    expect(s.tamam).toBe(true);
    if (!s.tamam) return;
    expect(s.kalanElmas).toBe(30);
    expect(s.durum.avatar).toBe('avatar-kubbe');
    expect(s.durum.sahipOlunan).toContain('avatar-kubbe');
  });

  it('aynı şey iki kez satın alınamaz', () => {
    const s = satinAl(bosCarsiDurumu(), 100, ebru);
    if (!s.tamam) throw new Error('alınmalıydı');
    expect(satinAl(s.durum, 100, ebru)).toEqual({ tamam: false, neden: 'zaten-sahip' });
  });

  it('sahip olunmayan tema seçilemez; sahip olunan ücretsiz seçilir', () => {
    const d = bosCarsiDurumu();
    expect(sec(d, ebru).defterTemasi).toBe('tema-cini');
    const s = satinAl(d, 100, ebru);
    if (!s.tamam) throw new Error('alınmalıydı');
    const geri = sec(s.durum, DEFTER_TEMALARI[0]!);
    expect(geri.defterTemasi).toBe('tema-cini');
    expect(sec(geri, ebru).defterTemasi).toBe('tema-ebru');
  });

  it('ek ipucu paketi 3 hak verir; hak bitince kullanılamaz', () => {
    const s = satinAl(bosCarsiDurumu(), IPUCU_PAKETI.fiyat, IPUCU_PAKETI);
    if (!s.tamam) throw new Error('alınmalıydı');
    let d = s.durum;
    expect(d.ipucuHakki).toBe(3);
    for (let i = 0; i < 3; i++) {
      const r = ipucuKullan(d);
      expect(r.kullanildi).toBe(true);
      d = r.durum;
    }
    expect(ipucuKullan(d).kullanildi).toBe(false);
  });

  it('şehir paketi hedef şehir olmadan alınamaz', () => {
    expect(satinAl(bosCarsiDurumu(), 999, sehirUrunu)).toEqual({ tamam: false, neden: 'gecersiz' });
  });
});

describe('Vakıf Çarşısı — öğrenme yolu her zaman ücretsiz', () => {
  const yol = {
    guncelDersId: 'b1',
    sehirler: [
      {
        sehirId: 'bursa',
        kilitli: false,
        uniteler: [{ kilitli: false, dersler: [{ tamamlandi: false }] }],
      },
      {
        sehirId: 'konya',
        kilitli: true,
        uniteler: [
          { kilitli: true, dersler: [{ tamamlandi: true }, { tamamlandi: true }] },
          { kilitli: true, dersler: [{ tamamlandi: false }] },
          { kilitli: true, dersler: [{ tamamlandi: false }] },
        ],
      },
    ],
  };

  it('şehir paketi yoksa yol aynen kalır', () => {
    expect(sehirPaketleriniUygula(yol, [])).toBe(yol);
  });

  it('şehir paketi şehri erken açar; üniteler şehir içinde sırayla açılır', () => {
    const y = sehirPaketleriniUygula(yol, ['konya']);
    const konya = y.sehirler[1]!;
    expect(konya.kilitli).toBe(false);
    expect(konya.uniteler.map((u) => u.kilitli)).toEqual([false, false, true]);
  });

  it('şehir paketi hiçbir açık şeyi kilitlemez', () => {
    const y = sehirPaketleriniUygula(yol, ['bursa']);
    expect(y.sehirler[0]!.kilitli).toBe(false);
    expect(y.sehirler[0]!.uniteler[0]!.kilitli).toBe(false);
  });
});

describe('Vakıf Çarşısı — cihazda saklama', () => {
  beforeEach(() => localStorage.clear());

  it('kaydedilir ve geri yüklenir', () => {
    const s = satinAl(bosCarsiDurumu(), 100, kubbe);
    if (!s.tamam) throw new Error('alınmalıydı');
    carsiKaydet(s.durum);
    expect(carsiYukle()).toEqual(s.durum);
  });

  it('bozuk kayıt boş durumla başlar', () => {
    localStorage.setItem(CARSI_ANAHTARI, 'bozuk');
    expect(carsiYukle()).toEqual(bosCarsiDurumu());
  });
});
