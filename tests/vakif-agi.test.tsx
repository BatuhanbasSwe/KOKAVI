/**
 * Vakıf ağı: her bağ envanterdeki bir AKAR eserden başlar ve konumu bilinen bir
 * hedefe gider; harita çizgilerinin metin eşdeğeri sayfada her zaman var.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { VAKIF_BAGLARI } from '../src/features/harita/vakifAgi';
import { KARTLAR } from '../src/features/hayrat-akar/kartlar';
import { eserBul } from '../src/features/gunun-eseri/oyun';

describe('vakıf ağı verisi', () => {
  it('her bağ bir akar ders eserinden başlar; hedefin konumu var', () => {
    const akarlar = new Set(KARTLAR.filter((k) => k.dogru === 'akar').map((k) => k.eserId));
    for (const b of VAKIF_BAGLARI) {
      expect(akarlar.has(b.akarId), b.akarId).toBe(true);
      expect(eserBul(b.akarId), b.akarId).toBeDefined();
      const konumlu = b.hedef.eserId ? !!eserBul(b.hedef.eserId) : b.hedef.lat !== undefined && b.hedef.lng !== undefined;
      expect(konumlu, b.hedef.ad).toBe(true);
      if (b.hedef.lat !== undefined) {
        expect(b.hedef.lat).toBeGreaterThan(35.5);
        expect(b.hedef.lat).toBeLessThan(42.5);
      }
      expect(b.cumle).toMatch(/\.$/);
    }
  });
});

describe('harita sayfasında vakıf ağı', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '#/harita';
    const eser = (id: string, ad: string, lat: number, lng: number) => ({
      id, ad, adEn: null, sehirId: 'bursa', kulliyeId: null, tur: 'Han', ilce: 'Osmangazi', koordinat: { lat, lng },
      bani: null, baniDonem: null, yapimYili: null, vakfiyeAmaci: null, hizmet: null, bugunNeOldu: null,
      tarihce: null, tarihceEn: null, gelirDagilimiDurumu: 'belge-bulunamadi', arsivNo: null, kaynaklar: [],
      dogrulamaNotu: null, yayinda: true, gelirKalemleri: [], fotograflar: [], sergiler: [],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL) => {
        const url = String(u);
        if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
        let govde: unknown = [];
        if (url.includes('/api/yol')) govde = { sehirler: [] };
        else if (url.includes('/api/filtreler')) govde = { sehirler: [], turler: [] };
        else if (url.includes('/api/eserler')) govde = [eser('bursa-koza-hani', 'Koza Hanı', 40.18, 29.06)];
        else if (url.includes('liste.json')) govde = [];
        return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
  });

  it('düğme aria-pressed taşır; metin listesi her bağı kaynağıyla söyler; ihlalsiz', async () => {
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    const bolum = await screen.findByRole('region', { name: 'Para nereye akıyordu?' });
    expect(within(bolum).getAllByRole('listitem')).toHaveLength(VAKIF_BAGLARI.length);
    expect(within(bolum).getByText(/Koza Hanı’nın kirası/)).toBeInTheDocument();
    expect(within(bolum).getByText(/^Kaynak: Vakıf Katılım/)).toBeInTheDocument();

    const dugme = await screen.findByRole('button', { name: 'Vakıf ağını göster' });
    expect(dugme).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(dugme);
    expect(screen.getByRole('button', { name: 'Vakıf ağını gizle' })).toHaveAttribute('aria-pressed', 'true');

    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => v.id)).toEqual([]);
  });
});
