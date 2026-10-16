/**
 * "Hayrat mı Akar mı?": kartlar envanterdeki ders eserlerinden; her tur dengeli;
 * düğme ve klavye ile oynanır; yanlışta açıklama + kaynak, puan düşmez; axe 0 ihlal.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { KARTLAR, TUR_BOYU, turKartlari } from '../src/features/hayrat-akar/kartlar';
import { eserBul } from '../src/features/gunun-eseri/oyun';

describe('kartlar', () => {
  it('her kart gerçek bir ders eseri; gerekçe ve kaynak var', () => {
    expect(new Set(KARTLAR.map((k) => k.eserId)).size).toBe(KARTLAR.length);
    for (const k of KARTLAR) {
      const e = eserBul(k.eserId);
      expect(e, k.eserId).toBeDefined();
      expect(e!.kaynak, k.eserId).toMatch(/^Vakıf Katılım/);
      expect(k.neden.length, k.eserId).toBeGreaterThan(10);
    }
  });

  it('akarlar gelir getiren yapılar (han/hamam/bedesten); külliyeler oyunda yok', () => {
    for (const k of KARTLAR.filter((x) => x.dogru === 'akar')) {
      expect(['Han', 'Hamam', 'Bedesten']).toContain(eserBul(k.eserId)!.kategori);
    }
    for (const k of KARTLAR) expect(eserBul(k.eserId)!.kategori).not.toBe('Külliye');
  });

  it('her tur 10 kart, en az 3 akar, tekrar yok', () => {
    for (let i = 0; i < 20; i++) {
      const t = turKartlari();
      expect(t).toHaveLength(TUR_BOYU);
      expect(new Set(t.map((k) => k.eserId)).size).toBe(TUR_BOYU);
      expect(t.filter((k) => k.dogru === 'akar').length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('oyun ekranı', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '#/hayrat-akar';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL) => {
        if (String(u).includes('/api/auth/ben')) return new Response('{}', { status: 401 });
        const govde = String(u).includes('/api/yol') ? { sehirler: [] } : [];
        return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
  });

  it('düğme, klavye ve yanlış cevap akışı; bitişte özet; ihlalsiz', async () => {
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Bu eser ne yapardı?' });

    const ilkIhlal = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(ilkIhlal.violations.map((v) => v.id)).toEqual([]);

    for (let i = 0; i < TUR_BOYU; i++) {
      const ad = screen.getByRole('heading', { level: 2 }).textContent!;
      const kart = KARTLAR.find((k) => eserBul(k.eserId)!.kisaAd === ad)!;
      if (i === 0) {
        // İlk kartta bilerek YANLIŞ: açıklama ve kaynak gelir
        const yanlis = kart.dogru === 'akar' ? 'Hayrat' : 'Akar';
        await userEvent.click(screen.getByRole('button', { name: new RegExp(`^.?\s*${yanlis}`) }));
        const sonuc = screen.getByText(kart.neden);
        expect(sonuc).toBeInTheDocument();
        expect(screen.getByText(/^Kaynak: Vakıf Katılım/)).toBeInTheDocument();
      } else {
        await userEvent.keyboard(kart.dogru === 'hayrat' ? '{ArrowLeft}' : '{ArrowRight}');
        expect(screen.getByText('Doğru!')).toBeInTheDocument();
      }
      await userEvent.click(screen.getByRole('button', { name: /^(Sonraki|Sonucu gör)$/ }));
    }

    expect(await screen.findByRole('heading', { name: `${TUR_BOYU - 1}/${TUR_BOYU} doğru!` })).toBeInTheDocument();
    const ozet = screen.getByRole('list');
    expect(within(ozet).getAllByRole('listitem')).toHaveLength(TUR_BOYU);
    expect(within(ozet).getByText(/yeni öğrendin/)).toBeInTheDocument();
  });
});
