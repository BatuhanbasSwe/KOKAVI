/**
 * Kâşif Defteri (Batu geri bildirimi, 07.11): öğrenilmemiş eserler "?" yerine
 * adıyla ve bulanık fotoğrafla görünür; ekran okuyucu "henüz öğrenilmedi" duyar.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';

const YOL = {
  sehirler: [
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
            { dersId: 'bursa-u1-d1', eserId: 'bursa-ulucami', eserAdi: 'Ulucami', tur: 'Cami', sira: 1 },
            { dersId: 'bursa-u1-d2', eserId: 'bursa-koza-hani', eserAdi: 'Koza Hanı', tur: 'Han', sira: 2 },
          ],
        },
      ],
    },
  ],
};

const ESERLER = [
  { id: 'bursa-ulucami', ad: 'Ulucami', tur: 'Cami', sehirId: 'bursa' },
  { id: 'bursa-koza-hani', ad: 'Koza Hanı', tur: 'Han', sehirId: 'bursa' },
];

beforeEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = '#/defter';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL) => {
      const url = String(u);
      if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      const govde = url.includes('/api/yol') ? YOL : url.includes('/api/eserler') ? ESERLER : [];
      return new Response(JSON.stringify(govde), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

describe('Defter: kilitli eserler', () => {
  it('adıyla ve bulanık fotoğrafla görünür, "?" yok; axe ihlali yok', async () => {
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    const ad = await screen.findByText('Koza Hanı');
    const pul = ad.closest('.defter-pul') as HTMLElement;
    expect(pul).toHaveClass('defter-pul--kapali');
    expect(within(pul).getByText(/henüz öğrenilmedi/)).toBeInTheDocument();
    expect(pul.textContent).not.toMatch(/\?/);
    const resim = pul.querySelector('.defter-pul__resim--bulanik img');
    expect(resim?.getAttribute('src')).toBe('/gorseller/bursa-koza-hani/k.webp');

    const sonuc = await axe.run(container);
    expect(sonuc.violations.map((v) => v.id)).toEqual([]);
  });
});
