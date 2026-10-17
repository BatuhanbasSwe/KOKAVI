/**
 * Sahada mühür: 150 m eşiği; kayıtta konum YOK (yalnızca eser ve gün);
 * yakında mühür basılır, uzakta mesafe söylenir, izin reddinde nazik açıklama;
 * konumu yaklaşık ya da koordinatsız eserde düğme hiç çıkmaz; axe ihlali yok.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MUHUR_YARICAP, konumKontrol, muhurBas, muhurGunu, muhurleriOku } from '../src/lib/muhur';
import { BuradayimDugmesi } from '../src/features/muhur/BuradayimDugmesi';

const ULUCAMI = { lat: 40.183806, lng: 29.061899 };

function konumKur(sonuc: { lat: number; lng: number } | { hataKodu: number }) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (basari: PositionCallback, hata: PositionErrorCallback) => {
        if ('hataKodu' in sonuc) hata({ code: sonuc.hataKodu, PERMISSION_DENIED: 1, message: '' } as GeolocationPositionError);
        else basari({ coords: { latitude: sonuc.lat, longitude: sonuc.lng } } as GeolocationPosition);
      },
    },
  });
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('mühür mantığı', () => {
  it('150 m eşiği', () => {
    expect(MUHUR_YARICAP).toBe(150);
    expect(konumKontrol(ULUCAMI, { lat: 40.18381, lng: 29.0619 }).yakin).toBe(true);
    const uzak = konumKontrol(ULUCAMI, { lat: 40.19, lng: 29.0619 });
    expect(uzak.yakin).toBe(false);
    expect(uzak.mesafe).toBeGreaterThan(600);
  });

  it('kayıtta yalnızca eser ve gün var, konum yok', () => {
    muhurBas('bursa-ulucami', '2026-10-18');
    expect(muhurleriOku()).toEqual({ 'bursa-ulucami': '2026-10-18' });
    expect(localStorage.getItem('kokavi-muhurler')).not.toMatch(/40\.18|29\.06|lat|lng/);
    expect(muhurGunu('bursa-ulucami')).toBe('2026-10-18');
  });
});

describe('Buradayım düğmesi', () => {
  it('yakındaysa mühür basılır; ihlalsiz', async () => {
    konumKur({ lat: 40.18381, lng: 29.0619 });
    const { container } = render(
      <BuradayimDugmesi eserId="bursa-ulucami" eserAd="Ulucami" koordinat={ULUCAMI} yaklasik={false} />,
    );
    expect(screen.getByText(/kaydedilmez/)).toBeInTheDocument();
    const s = await axe.run(container, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false } } });
    expect(s.violations.map((v) => v.id)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: /Buradayım/ }));
    expect(screen.getByText(/Orada bulundun/)).toBeInTheDocument();
    expect(Object.keys(muhurleriOku())).toEqual(['bursa-ulucami']);
  });

  it('uzaktaysa mesafeyi söyler, mühür basmaz', async () => {
    konumKur({ lat: 40.2, lng: 29.0619 });
    render(<BuradayimDugmesi eserId="bursa-ulucami" eserAd="Ulucami" koordinat={ULUCAMI} yaklasik={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Buradayım/ }));
    expect(screen.getByText(/km uzaktasın/)).toBeInTheDocument();
    expect(muhurleriOku()).toEqual({});
  });

  it('izin reddinde nazik açıklama', async () => {
    konumKur({ hataKodu: 1 });
    render(<BuradayimDugmesi eserId="bursa-ulucami" eserAd="Ulucami" koordinat={ULUCAMI} yaklasik={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Buradayım/ }));
    expect(screen.getByText(/Konum izni verilmedi/)).toBeInTheDocument();
  });

  it('konumu yaklaşık ya da koordinatsız eserde düğme yok', () => {
    konumKur({ lat: 0, lng: 0 });
    const { container: a } = render(
      <BuradayimDugmesi eserId="x" eserAd="X" koordinat={ULUCAMI} yaklasik />,
    );
    expect(a.innerHTML).toBe('');
    const { container: b } = render(<BuradayimDugmesi eserId="y" eserAd="Y" koordinat={null} yaklasik={false} />);
    expect(b.innerHTML).toBe('');
  });
});
