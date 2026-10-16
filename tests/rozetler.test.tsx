/**
 * Başarım rozetleri: ilerlemeden hesaplanır, kaybedilmez, yalnızca cihazda.
 * Bildirim ilk açılışta susar (eski kullanıcıya bildirim yağmuru olmasın),
 * yeni kazanılan rozette bir kez çıkar.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { OgrenmeYolu } from '../shared/types';
import {
  kazanilanlar,
  sayacArtir,
  sayaclariOku,
  tumRozetler,
} from '../src/features/rozetler/rozetMantigi';

const yol = (tamam: number, toplam: number): OgrenmeYolu => ({
  guncelDersId: null,
  sehirler: [
    {
      sehirId: 'bursa',
      ad: 'Bursa',
      sira: 1,
      uniteler: [],
      tamamlananSayi: tamam,
      toplamSayi: toplam,
      kilitli: false,
      tamamlandi: tamam >= toplam,
    },
  ],
});

const girdi = (n: number, seri = 0, ekstra: Partial<Parameters<typeof kazanilanlar>[0]> = {}) => ({
  ilerleme: { tamamlananDersler: Array.from({ length: n }, (_, i) => `d${i}`), seri: { gunSayisi: seri, sonTarih: null } },
  yol: yol(n, 33),
  sayaclar: { kusursuzDers: 0, podyum: 0 },
  gununEseri: { kazanilan: 0, ilkTahmin: 0 },
  ...ekstra,
});

describe('rozet hesabı', () => {
  it('ders eşikleri ve şehir rozeti', () => {
    expect([...kazanilanlar(girdi(0))]).toEqual([]);
    expect(kazanilanlar(girdi(1)).has('ilk-ders')).toBe(true);
    expect(kazanilanlar(girdi(5)).has('bes-ders')).toBe(true);
    expect(kazanilanlar(girdi(20)).has('yirmi-ders')).toBe(true);
    // Seviye atlama da rozetle kutlanır (Çırak → Kalfa 6 · Usta 12).
    expect(kazanilanlar(girdi(5)).has('seviye-kalfa')).toBe(false);
    expect(kazanilanlar(girdi(6)).has('seviye-kalfa')).toBe(true);
    expect(kazanilanlar(girdi(12)).has('seviye-usta')).toBe(true);
    const hepsi = kazanilanlar(girdi(33));
    expect(hepsi.has('sehir-bursa')).toBe(true);
    expect(hepsi.has('tum-dersler')).toBe(true);
  });

  it('seri, oyun ve sayaç rozetleri', () => {
    expect(kazanilanlar(girdi(1, 3)).has('seri-3')).toBe(true);
    expect(kazanilanlar(girdi(1, 7)).has('seri-7')).toBe(true);
    const k = kazanilanlar(
      girdi(1, 0, {
        sayaclar: { kusursuzDers: 1, podyum: 1 },
        gununEseri: { kazanilan: 5, ilkTahmin: 1 },
      }),
    );
    for (const id of ['kusursuz', 'podyum', 'gunluk-5', 'dedektif']) expect(k.has(id), id).toBe(true);
  });

  it('şehir rozetleri yoldan üretilir; her rozetin açıklaması var', () => {
    const liste = tumRozetler(yol(0, 33));
    expect(liste.map((r) => r.id)).toContain('sehir-bursa');
    expect(liste.find((r) => r.id === 'sehir-bursa')!.aciklama).toBe('Bursa şehrindeki bütün dersleri bitir.');
    for (const r of liste) expect(r.aciklama.length).toBeGreaterThan(5);
  });

  it('sayaçlar cihazda artar', () => {
    localStorage.clear();
    sayacArtir('kusursuzDers');
    sayacArtir('kusursuzDers');
    expect(sayaclariOku().kusursuzDers).toBe(2);
  });
});

describe('rozet bildirimi', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL) => {
        const govde = String(u).includes('/api/yol')
          ? {
              sehirler: [
                {
                  sehirId: 'bursa',
                  ad: 'Bursa',
                  sira: 1,
                  uniteler: [{ uniteId: 'u1', ad: 'Ü1', sira: 1, dersler: [{ dersId: 'd1', eserId: 'e1', eserAdi: 'X', tur: 'Cami', sira: 1 }] }],
                },
              ],
            }
          : [];
        return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
  });

  async function kur() {
    const { DurumSaglayici } = await import('../src/app/DurumSaglayici');
    const { RozetBildirimi } = await import('../src/features/rozetler/Rozetler');
    return render(
      <DurumSaglayici>
        <RozetBildirimi />
      </DurumSaglayici>,
    );
  }

  it('ilk açılışta susar, sonra yeni rozette bir kez çıkar', async () => {
    await kur();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(screen.queryByText('Yeni rozet!')).toBeNull();
    expect(localStorage.getItem('kokavi-rozet-gorulen-v1')).not.toBeNull();

    await act(async () => {
      sayacArtir('podyum');
    });
    expect(await screen.findByText('Yeni rozet!')).toBeInTheDocument();
    expect(screen.getByText('Sınıfın Yıldızı')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('kokavi-rozet-gorulen-v1')!).liste).toContain('podyum');
  });
});
