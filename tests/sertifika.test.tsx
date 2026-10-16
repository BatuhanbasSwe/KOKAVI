/**
 * Şehir sertifikası: şehir bitince açılır; çocuğun adı KAYDEDİLMEZ ve
 * sunucuya GİTMEZ; ekran axe ile 0 ihlal.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { rotayiCoz } from '../src/lib/yonlendirme';

const YOL = {
  sehirler: [
    {
      sehirId: 'hatay',
      ad: 'Hatay',
      sira: 1,
      uniteler: [
        {
          uniteId: 'hatay-u1',
          ad: 'Ünite 1',
          sira: 1,
          dersler: [
            { dersId: 'hatay-u1-d1', eserId: 'e1', eserAdi: 'A', tur: 'Cami', sira: 1 },
            { dersId: 'hatay-u1-d2', eserId: 'e2', eserAdi: 'B', tur: 'Han', sira: 2 },
          ],
        },
      ],
    },
  ],
};

let istekler: string[] = [];
beforeEach(() => {
  cleanup();
  localStorage.clear();
  istekler = [];
  window.location.hash = '';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL, s?: RequestInit) => {
      istekler.push(`${String(u)} ${s?.body ?? ''}`);
      if (String(u).includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      const govde = String(u).includes('/api/yol') ? YOL : [];
      return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});

function ilerleme(dersler: string[]) {
  localStorage.setItem(
    'kokavi.ilerleme.v1',
    JSON.stringify({ tamamlananDersler: dersler, defterSayfalari: [], elmas: 0, seri: { gunSayisi: 0, sonTarih: null }, sinifKodu: null }),
  );
}

async function ac() {
  window.location.hash = '#/sertifika/hatay';
  const { App } = await import('../src/app/App');
  return render(<App />);
}

describe('şehir sertifikası', () => {
  it('rota çözülür', () => {
    expect(rotayiCoz('#/sertifika/hatay')).toEqual({ ad: 'sertifika', sehirId: 'hatay' });
    expect(rotayiCoz('#/sertifika')).toEqual({ ad: 'defter' });
  });

  it('şehir bitmeden kilitli; ilerleme gösterilir', async () => {
    ilerleme(['hatay-u1-d1']);
    await ac();
    expect(await screen.findByRole('progressbar', { name: 'Hatay ilerlemesi' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText(/Hatay şehrindeki bütün dersleri bitirince/)).toBeInTheDocument();
  });

  it('şehir bitince açılır; ad yalnızca ekranda, kaydedilmez ve gönderilmez; ihlalsiz', async () => {
    ilerleme(['hatay-u1-d1', 'hatay-u1-d2']);
    const { container } = await ac();
    const girdi = await screen.findByLabelText('Sertifikadaki ad (isteğe bağlı)');
    expect(screen.getByRole('img', { name: /Genç Kâşif adına Hatay Kâşifi sertifikası/ })).toBeInTheDocument();
    await userEvent.type(girdi, 'Deniz');
    expect(screen.getByRole('img', { name: /Deniz adına Hatay Kâşifi/ })).toBeInTheDocument();

    const depoda = Object.keys(localStorage).map((k) => localStorage.getItem(k)).join(' ');
    expect(depoda).not.toContain('Deniz');
    expect(istekler.join(' ')).not.toContain('Deniz');

    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => v.id)).toEqual([]);
  });
});
