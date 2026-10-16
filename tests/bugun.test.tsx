/**
 * Bugün (Mozaik) ana ekranı: açılışta görünür, sıradaki derse tek dokunuşla
 * gider, günlük oyun kutucukları gerçek bağlantıdır, yeni kullanıcıya
 * tanıtım turu çıkar; axe ihlali yok.
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

beforeEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = '';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL) => {
      if (String(u).includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify(String(u).includes('/api/yol') ? YOL : []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

async function ac() {
  const { App } = await import('../src/app/App');
  const { container } = render(<App />);
  await screen.findByRole('heading', { level: 1, name: /merhaba/i });
  const mozaik = await screen.findByRole('list', { name: /bugün yapabileceklerin/i });
  return { container, mozaik };
}

describe('Bugün ekranı', () => {
  it('açılışta Bugün; sıradaki ders büyük kutucukta, tek dokunuşla derse gider', async () => {
    const { mozaik } = await ac();
    const ders = await within(mozaik).findByRole('link', { name: /başla/i });
    expect(ders.getAttribute('href')).toBe('#/ders/bursa-u1-d1');
    expect(ders).toHaveTextContent('Ulucami');
  });

  it('ders bitince düğme "Derse devam" olur ve bir sonraki derse gider', async () => {
    localStorage.setItem(
      'kokavi.ilerleme.v1',
      JSON.stringify({ tamamlananDersler: ['bursa-u1-d1'], seri: { gunSayisi: 1, sonTarih: null } }),
    );
    const { mozaik } = await ac();
    const ders = await within(mozaik).findByRole('link', { name: /derse devam/i });
    expect(ders.getAttribute('href')).toBe('#/ders/bursa-u1-d2');
  });

  it('günlük kutucuklar gerçek bağlantı; seri metinle söylenir', async () => {
    const { mozaik } = await ac();
    const hedefler = within(mozaik)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hedefler).toEqual(
      expect.arrayContaining(['#/seri', '#/gunun-eseri', '#/hayrat-akar', '#/canli', '#/sinif']),
    );
    expect(within(mozaik).getByRole('link', { name: /günlük seri/i })).toHaveTextContent('0');
    // Hatalarımı çalış yalnızca bekleyen soru varsa
    expect(hedefler).not.toContain('#/hatalar');
  });

  it('yeni kullanıcıya tanıtım turu; atlayınca kapanır', async () => {
    await ac();
    expect(screen.getByRole('heading', { name: 'Merhaba, ben Köstik!' })).toBeTruthy();
    screen.getByRole('button', { name: 'Atla' }).click();
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Atla' })).toBeNull());
  });

  it('axe ihlali yok', async () => {
    const { container } = await ac();
    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});
