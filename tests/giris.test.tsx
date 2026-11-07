/**
 * Giriş: artık ayrı bir sekme DEĞİL, Profil sayfasının bir bölümü.
 * `#/giris` rotası Profil'i açar, giriş bölümüne kaydırır ve odağı bölüm
 * başlığına taşır. Ana gezinmede "Giriş" sekmesi yoktur; yerinde "Ayarlar" vardır.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

describe('Giriş bölümü', () => {
  it('profil sayfasının içinde açılır ve bağlantıları içerir; axe 0 ihlal', async () => {
    window.location.hash = '#/giris';
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Kâşif' });

    const secenekler = screen.getByRole('navigation', { name: 'Giriş seçenekleri' });
    const yollar = [...secenekler.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(yollar).toEqual(['#/canli', '#/ogretmen', '#/panel']);

    const sonuc = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(sonuc.violations).toEqual([]);
  });

  it('ana gezinmede Giriş sekmesi yok; Ayarlar var ve seçili değil', async () => {
    window.location.hash = '#/giris';
    const { App } = await import('../src/app/App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Kâşif' });

    const nav = screen.getByRole('navigation', { name: /ana gezinme/i });
    const etiketler = within(nav)
      .getAllByRole('link')
      .map((a) => a.textContent?.trim());
    expect(etiketler).toEqual(['Bugün', 'Yol', 'Keşfet', 'Defter', 'Ayarlar']);
    expect(within(nav).queryByRole('link', { name: 'Giriş' })).toBeNull();
    // Profil sayfasında üst çubuktaki avatar "geçerli sayfa" işaretini taşır.
    expect(screen.getByRole('link', { name: /profil/i }).getAttribute('aria-current')).toBe('page');
  });

  it('rota gelince odak giriş bölümünün başlığına taşınır (ekran okuyucu duyurusu)', async () => {
    window.location.hash = '#/giris';
    const { App } = await import('../src/app/App');
    render(<App />);
    const baslik = await screen.findByRole('heading', { level: 2, name: 'Giriş' });
    await waitFor(() => expect(baslik).toHaveFocus());
  });
});
