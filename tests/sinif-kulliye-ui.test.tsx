/**
 * Öğretmen sınıf detayı — sınıf külliyesi kartı.
 *
 * PDF Senaryo B: "Sınıf birlikte bir külliyeyi tamamlar." Bu test, sınıf
 * detayında hedef külliyenin ilerleme çubuğuyla göründüğünü ve tahtadaki
 * Sınıf Röntgeni'ne bağlantı verildiğini kanıtlar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SinifDetayi } from '../src/features/ogretmen/SinifDetayi';

const DETAY = {
  ilerleme: {
    kod: 'KTM-4829',
    ad: '5-B Şehrimiz Dersi',
    dersSayilari: { 'bursa-u1-d2': 1 },
    toplamTamamlama: 1,
    tamamlananDersCesidi: 1,
  },
  uniteler: [
    {
      uniteId: 'bursa-u1',
      uniteAdi: 'Ünite 1: İbadet ve İlim',
      sehirAdi: 'Bursa',
      dersler: [
        {
          dersId: 'bursa-u1-d2',
          eserId: 'bursa-yesilcami-yesil-cami',
          eserAdi: 'Yeşilcami (Yeşil Cami)',
          sira: 2,
          sayi: 1,
        },
      ],
      tamamlananDersCesidi: 1,
      toplamDers: 1,
    },
  ],
  kulliyeler: [
    {
      id: 'yesil-kulliyesi',
      ad: 'Yeşilcami (Yeşil) Külliyesi',
      sehirId: 'bursa',
      toplamDers: 4,
      tamamlananDersCesidi: 1,
      hedefMi: true,
      tamamlandiMi: false,
    },
    {
      id: 'muradiye-kulliyesi',
      ad: 'Muradiye (II. Murad) Külliyesi',
      sehirId: 'bursa',
      toplamDers: 3,
      tamamlananDersCesidi: 0,
      hedefMi: false,
      tamamlandiMi: false,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sınıf detayı — külliye hedefi', () => {
  it('hedef külliyeyi, ilerlemeyi ve Sınıf Röntgeni bağlantısını gösterir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(DETAY), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );

    render(
      <SinifDetayi kod="KTM-4829" aktif onDurumDegisti={() => {}} onGeri={() => {}} />,
    );

    expect(await screen.findByRole('heading', { name: 'Sınıf külliyesi' })).toBeInTheDocument();
    // Külliye adı hem hedef başlığında hem ilerleme listesinde geçer.
    expect(screen.getAllByText('Yeşilcami (Yeşil) Külliyesi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1/4').length).toBeGreaterThan(0);
    expect(screen.getByText(/3 ders kaldı/)).toBeInTheDocument();

    const rontgen = screen.getByRole('link', { name: /Sınıf Röntgeni'ni tahtada aç/ });
    expect(rontgen).toHaveAttribute('href', '#/tahta/KTM-4829/rontgen');
  });
});
