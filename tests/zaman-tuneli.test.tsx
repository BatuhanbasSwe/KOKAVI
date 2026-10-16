/**
 * Zaman tüneli: 57 eser yıl sırasıyla; dönem etiketi yüzyıl (hanedan iddiası yok);
 * yaklaşık yıllar metinle söylenir; keşfedilenler derse bağlı; axe 0 ihlal.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { ESERLER } from '../src/features/gunun-eseri/oyun';

const YOL = {
  sehirler: [
    {
      sehirId: 'bursa',
      ad: 'Bursa',
      sira: 1,
      uniteler: [
        {
          uniteId: 'bursa-u1',
          ad: 'Ünite 1',
          sira: 1,
          dersler: [{ dersId: 'bursa-u1-d1', eserId: 'bursa-ulucami', eserAdi: 'Ulucami', tur: 'Cami', sira: 1 }],
        },
      ],
    },
  ],
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem(
    'kokavi.ilerleme.v1',
    JSON.stringify({ tamamlananDersler: ['bursa-u1-d1'], defterSayfalari: [], elmas: 0, seri: { gunSayisi: 0, sonTarih: null }, sinifKodu: null }),
  );
  window.location.hash = '#/zaman-tuneli';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL) => {
      if (String(u).includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      const govde = String(u).includes('/api/yol') ? YOL : [];
      return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});

describe('zaman tüneli', () => {
  it('yıl sırası, yüzyıl başlıkları, keşif durumu; ihlalsiz', async () => {
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Yüzyıllar boyunca vakıf eserleri' });

    const basliklar = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(basliklar[0]).toBe("600'ler");
    for (const b of basliklar) expect(b).toMatch(/^\d+00'ler$/);

    const yillar = [...container.querySelectorAll('.zt-kart__yil')].map((e) =>
      Number(e.textContent!.replace(/[^\d]/g, '')),
    );
    expect(yillar).toHaveLength(ESERLER.length);
    expect([...yillar].sort((a, b) => a - b)).toEqual(yillar);

    // Keşfedilen eser derse bağlantı; yaklaşık yıl ekran okuyucuya söylenir.
    const ulucami = screen.getByRole('link', { name: /1399 Ulucami/ });
    expect(ulucami).toHaveAttribute('href', '#/ders/bursa-u1-d1');
    expect(within(ulucami).queryByText(/keşfedilmedi/)).toBeNull();
    expect(screen.getAllByText('(yaklaşık)').length).toBe(ESERLER.filter((e) => e.yaklasik).length);

    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => v.id)).toEqual([]);
  });
});
