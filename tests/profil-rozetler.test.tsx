/**
 * Profil rozet bölümü: yeni kâşifte sıradaki rozet ilerlemesi ve boş vitrin
 * görünür; tüm rozetler bağlantısı Defter'in rozet sekmesine gider.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

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

describe('Profil · rozetler', () => {
  it('sıradaki rozetleri sayıyla, boş vitrini metinle gösterir', async () => {
    window.location.hash = '#/profil';
    const { App } = await import('../src/app/App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /kâşif/i });

    const bolum = screen.getByRole('region', { name: /rozetlerim/i });
    const sirada = within(bolum).getByRole('heading', { level: 3, name: /sıradaki rozetler/i });
    expect(sirada).toBeTruthy();
    // Yeni kâşif: ilk ders rozeti 0/1 ile sıradakiler arasında.
    expect(within(bolum).getByText('İlk Adım')).toBeTruthy();
    expect(within(bolum).getAllByText(/^0\/\d+$/).length).toBeGreaterThan(0);
    expect(within(bolum).getByText(/ilk rozetin burada parlasın/i)).toBeTruthy();
    expect(within(bolum).getByRole('link', { name: /tüm rozetleri gör/i }).getAttribute('href')).toBe(
      '#/defter?sekme=rozetler',
    );
    expect(screen.getByText(/bir sonraki seviyeye \d+ ders kaldı/i)).toBeTruthy();
  });
});
