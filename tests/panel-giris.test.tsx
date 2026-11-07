/**
 * Admin paneli giriş akışı — regresyon testi.
 *
 * Hata: `GirisEkrani` kendi `useOturum()` örneğini kullanıyordu. Başarılı
 * giriş o örneğin state'ine yazılıyor, `KorumaliPanel` haberdar olmuyor ve
 * ekran "Giriş yapılıyor…" sonrası giriş formunda kalıyordu.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/features/panel/PanelSayfasi', () => ({
  PanelSayfasi: () => <p>PANEL İÇERİĞİ</p>,
}));

import { KorumaliPanel } from '../src/features/panel/KorumaliPanel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('KorumaliPanel giriş', () => {
  it('başarılı girişten sonra paneli gösterir (sayfa yenilemeden)', async () => {
    const fetchSahte = vi.fn(async (adres: string) => {
      if (adres.endsWith('/auth/ben')) {
        return new Response(JSON.stringify({ hata: 'Oturum yok' }), { status: 401 });
      }
      if (adres.endsWith('/auth/giris')) {
        return new Response(
          JSON.stringify({
            kullanici: {
              id: '1',
              email: 'admin@kokavi.local',
              ad: 'Yönetici',
              rol: 'admin',
              sonGiris: null,
            },
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchSahte);

    render(<KorumaliPanel />);

    const kullanici = userEvent.setup();
    await kullanici.type(await screen.findByLabelText(/e-posta/i), 'admin@kokavi.local');
    await kullanici.type(screen.getByLabelText(/parola/i), 'deneme-parola');
    await kullanici.click(screen.getByRole('button', { name: /giriş yap/i }));

    expect(await screen.findByText('PANEL İÇERİĞİ')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /yönetim girişi/i })).toBeNull();
  });
});
