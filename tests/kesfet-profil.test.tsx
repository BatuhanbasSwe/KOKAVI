/**
 * Keşfet merkezi ve Profil sayfası: doğru yerlere bağlanır, yetişkin
 * girişleri ayrı etiketli gezinmede durur; axe ihlali yok.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL) => {
      if (String(u).includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify(String(u).includes('/api/yol') ? { sehirler: [] } : []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

async function ac(hash: string, baslik: RegExp) {
  window.location.hash = hash;
  const { App } = await import('../src/app/App');
  const { container } = render(<App />);
  await screen.findByRole('heading', { level: 1, name: baslik });
  return container;
}

async function ihlaller(container: HTMLElement) {
  const s = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    resultTypes: ['violations'],
  });
  return s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`);
}

describe('Keşfet', () => {
  it('harita, arşiv, zaman tüneli ve rota kutucukları; ihlalsiz', async () => {
    const container = await ac('#/kesfet', /keşfet/i);
    const liste = screen.getByRole('list', { name: /keşif alanları/i });
    const hedefler = within(liste)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hedefler).toEqual(['#/harita', '#/arsiv', '#/zaman-tuneli', '#/kesfet/yasayan', '#/rota']);
    expect(await ihlaller(container)).toEqual([]);
  });

  it('Hâlâ yaşayan vakıflar: liste, her kayıtta açılır kaynak; Keşfet sekmesi seçili; ihlalsiz', async () => {
    const container = await ac('#/kesfet/yasayan', /hâlâ yaşayan vakıflar/i);
    const ogeler = screen.getAllByRole('heading', { level: 2 });
    expect(ogeler.length).toBeGreaterThanOrEqual(10);
    expect(screen.getByRole('heading', { level: 2, name: 'Nasuh Paşa Hamamı' })).toBeInTheDocument();
    expect(screen.getByText('Hâlâ hamam olarak çalışmaktadır.', { exact: false })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /ana gezinme/i });
    expect(within(nav).getByRole('link', { name: 'Keşfet' })).toHaveAttribute('aria-current', 'page');
    expect(await ihlaller(container)).toEqual([]);
  });
});

describe('Profil', () => {
  it('ayarlar, çarşı, seri ve sınıf satırları; yetişkin gezinmesi ayrı; ihlalsiz', async () => {
    const container = await ac('#/profil', /kâşif/i);
    const ana = screen.getByRole('main');
    for (const [ad, href] of [
      [/ayarlar/i, '#/ayarlar'],
      [/vakıf çarşısı/i, '#/carsi'],
      [/seri takvimi/i, '#/seri'],
      [/sınıfım/i, '#/sinif'],
    ] as const) {
      expect(within(ana).getByRole('link', { name: ad }).getAttribute('href')).toBe(href);
    }
    const yetiskin = screen.getByRole('navigation', { name: /yetişkinler için/i });
    expect(
      within(yetiskin)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    ).toEqual(['#/ogretmen', '#/canli/kur', '#/panel']);
    expect(await ihlaller(container)).toEqual([]);
  });

  it('ayarlar profil sekmesine ait; ana gezinmede seçili sekme yok', async () => {
    await ac('#/ayarlar', /ayarlar/i);
    const nav = screen.getByRole('navigation', { name: /ana gezinme/i });
    expect(nav.querySelector('[aria-current="page"]')).toBeNull();
    expect(screen.getByRole('link', { name: /profil/i }).getAttribute('href')).toBe('#/profil');
  });
});
