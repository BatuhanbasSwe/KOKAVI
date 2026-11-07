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
  it('açılışta Bugün; sıradaki ders büyük kutucukta, dokununca Yol sekmesinde sıradaki durağa gider', async () => {
    const { mozaik } = await ac();
    const ders = await within(mozaik).findByRole('link', { name: /başla/i });
    expect(ders.getAttribute('href')).toBe('#/yol?odak=siradaki');
    expect(ders).toHaveTextContent('Ulucami');
  });

  it('ders bitince düğme "Derse devam" olur ve bir sonraki eseri gösterir', async () => {
    localStorage.setItem(
      'kokavi.ilerleme.v1',
      JSON.stringify({ tamamlananDersler: ['bursa-u1-d1'], seri: { gunSayisi: 1, sonTarih: null } }),
    );
    const { mozaik } = await ac();
    const ders = await within(mozaik).findByRole('link', { name: /derse devam/i });
    expect(ders.getAttribute('href')).toBe('#/yol?odak=siradaki');
    expect(ders).toHaveTextContent('Koza Hanı');
  });

  it('günlük kutucuklar gerçek bağlantı; seri metinle söylenir', async () => {
    const { mozaik } = await ac();
    const hedefler = within(mozaik)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hedefler).toEqual(
      expect.arrayContaining(['#/seri', '#/gunun-eseri', '#/hayrat-akar']),
    );
    expect(within(mozaik).getByRole('link', { name: /günlük seri/i })).toHaveTextContent('0');
    // Canlı yarışmaya katılım ana ekranda (Batu geri bildirimi, 07.11); kurmak öğretmen panelinde.
    expect(hedefler).toContain('#/canli');
    expect(hedefler).not.toContain('#/canli/kur');
    expect(hedefler).not.toContain('#/sinif');
    // Hatalarımı çalış yalnızca bekleyen soru varsa
    expect(hedefler).not.toContain('#/hatalar');
  });

  it('yeni kullanıcıya tanıtım turu; atlayınca kapanır', async () => {
    await ac();
    expect(screen.getByRole('heading', { name: 'Kök Avı’na hoş geldin!' })).toBeTruthy();
    screen.getByRole('button', { name: 'Atla' }).click();
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Atla' })).toBeNull());
  });

  it('tercihlere göre sıradaki ders değişir: ilgiye uyan ders öne alınır', async () => {
    localStorage.setItem(
      'kokavi.tercihler.v1',
      JSON.stringify({ sinif: null, ilgiler: ['han'], gunlukHedef: null, onBilgi: null }),
    );
    const { mozaik } = await ac();
    const ders = await within(mozaik).findByRole('link', { name: /başla/i });
    expect(ders).toHaveTextContent('Koza Hanı');
    expect(ders).toHaveTextContent('ilgine göre');
  });

  it('Yol ekranında "Devam et" ilgiye uyan derse taşınır', async () => {
    localStorage.setItem(
      'kokavi.tercihler.v1',
      JSON.stringify({ sinif: null, ilgiler: ['han'], gunlukHedef: null, onBilgi: null }),
    );
    window.location.hash = '#/yol';
    const { App } = await import('../src/app/App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /öğrenme yolu/i });
    const devam = await screen.findByRole('link', { name: /Koza Hanı Devam et/i });
    expect(devam.getAttribute('href')).toBe('#/ders/bursa-u1-d2');
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
