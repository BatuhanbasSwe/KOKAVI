/**
 * Keşif rotası: kuş uçuşu mesafe doğru; sıralama kesişmesiz ve uçtan başlar;
 * ekran numaralı durak + "Gördüm" + dürüst mesafe notu; axe 0 ihlal.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { mesafe, mesafeMetni, rotaBol, rotaSirala, toplamMesafe, yolTarifiAdresi } from '../src/features/rota/rota';

describe('rota hesabı', () => {
  it('kuş uçuşu mesafe makul (Ulucami → Koza Hanı ~ 130 m)', () => {
    const ulucami = { id: 'u', lat: 40.183806, lng: 29.061899 };
    const koza = { id: 'k', lat: 40.18267, lng: 29.06267 };
    const m = mesafe(ulucami, koza);
    expect(m).toBeGreaterThan(80);
    expect(m).toBeLessThan(250);
    expect(mesafeMetni(1234)).toBe('1,2 km');
    expect(mesafeMetni(347)).toBe('350 m');
  });

  it('bir çizgi üzerindeki noktalar uçtan uca sıralanır', () => {
    const n = [3, 0, 4, 1, 2].map((i) => ({ id: String(i), lat: 40, lng: 29 + i * 0.001 }));
    const sira = rotaSirala(n).map((p) => p.id);
    expect([sira.join(''), [...sira].reverse().join('')]).toContain('01234');
  });

  it('2-opt sonrası tur, rastgele sıradan uzun değildir', () => {
    const noktalar = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      lat: 40 + Math.sin(i * 1.7) * 0.01,
      lng: 29 + Math.cos(i * 2.3) * 0.01,
    }));
    expect(toplamMesafe(rotaSirala(noktalar))).toBeLessThanOrEqual(toplamMesafe(noktalar));
    expect(rotaSirala(noktalar)).toHaveLength(12);
  });
});

describe('rota bölümleri', () => {
  it("1,5 km'den uzun aralıkta yeni yürüyüş bölümü başlar", () => {
    // 0-1-2 birbirine ~85 m; 3 ise ~4 km uzakta; 4 ona ~85 m
    const n = [0, 0.001, 0.002, 0.05, 0.051].map((d, i) => ({ id: String(i), lat: 40, lng: 29 + d }));
    const b = rotaBol(n);
    expect(b.map((x) => x.duraklar.map((d) => d.id).join(''))).toEqual(['012', '34']);
    expect(b[1]!.bas).toBe(3);
    expect(b[1]!.oncekindenUzaklik).toBeGreaterThan(3500);
    expect(b[0]!.mesafe).toBeLessThan(250);
  });

  it('yol tarifi OpenStreetMap yaya yönlendirmesine gider', () => {
    const url = yolTarifiAdresi({ id: 'a', lat: 40.1838, lng: 29.0619 }, { id: 'b', lat: 40.1827, lng: 29.0627 });
    expect(url).toBe(
      'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=40.183800,29.061900%3B40.182700,29.062700',
    );
  });
});

describe('rota ekranı', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '#/rota?ilce=bursa|Osmangazi';
    const e = (id: string, ad: string, lat: number, lng: number, yaklasik = false) => ({
      id, ad, tur: 'Han', sehirId: 'bursa', ilce: 'Osmangazi', koordinat: { lat, lng },
      kaynaklar: yaklasik ? [{ kunye: 'Koordinat — YAKLAŞIK' }] : [],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL) => {
        const url = String(u);
        if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
        let govde: unknown = [];
        if (url.includes('/api/yol')) govde = { sehirler: [] };
        else if (url.includes('/api/eserler'))
          govde = [
            e('a', 'Ulucami', 40.1838, 29.0619),
            e('b', 'Koza Hanı', 40.1827, 29.0627),
            e('c', 'Pirinç Hanı (Bursa)', 40.1832, 29.0645, true),
          ];
        return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
  });

  it('bağlantıdaki ilçe seçili gelir; duraklar numaralı; Gördüm işaretlenir; ihlalsiz', async () => {
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: /Osmangazi, Bursa: 3 durak/ });
    const liste = screen.getAllByRole('list').find((l) => l.classList.contains('rota-liste'))!;
    expect(within(liste).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/konum yaklaşık/)).toBeInTheDocument();
    expect(screen.getByText(/kuş uçuşudur/)).toBeInTheDocument();
    const kutu = within(liste).getAllByRole('checkbox', { name: 'Gördüm' })[0]!;
    await userEvent.click(kutu);
    expect(kutu).toBeChecked();
    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('rota ekranı: bölümler ve hatırlama', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '#/rota?ilce=bursa|Osmangazi';
    const e = (id: string, ad: string, lat: number, lng: number) => ({
      id, ad, tur: 'Cami', sehirId: 'bursa', ilce: 'Osmangazi', koordinat: { lat, lng }, kaynaklar: [],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL) => {
        const url = String(u);
        if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
        let govde: unknown = [];
        if (url.includes('/api/yol')) govde = { sehirler: [] };
        else if (url.includes('/api/eserler'))
          govde = [
            e('a', 'Ulucami', 40.1838, 29.0619),
            e('b', 'Koza Hanı', 40.1827, 29.0627),
            // ~6 km uzakta: ayrı bölüm
            e('c', 'Uzak Cami', 40.2238, 29.1119),
            e('d', 'Uzak Han', 40.2245, 29.1125),
          ];
        return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
  });

  it('uzak duraklar ayrı bölüm olur; bölüm seçilince liste süzülür; Gördüm cihazda hatırlanır', async () => {
    const { App } = await import('../src/app/App');
    render(<App />);
    await screen.findByRole('heading', { name: /Osmangazi, Bursa: 4 durak/ });
    const grup = screen.getByRole('group', { name: 'Bölüm seç' });
    expect(within(grup).getByRole('button', { name: 'Hepsi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 3, name: /Bölüm 2/ })).toBeInTheDocument();
    expect(screen.getByText(/toplu taşıma ya da araçla/)).toBeInTheDocument();

    await userEvent.click(within(grup).getByRole('button', { name: /Bölüm 1/ }));
    expect(screen.queryByRole('heading', { level: 3, name: /Bölüm 2/ })).toBeNull();

    const tarif = screen.getAllByRole('link', { name: /Yol tarifi/ })[0]!;
    expect(tarif).toHaveAttribute('target', '_blank');
    expect(tarif.getAttribute('href')).toContain('openstreetmap.org/directions');

    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Gördüm' })[0]!);
    expect(JSON.parse(localStorage.getItem('kokavi-rota-gorulen')!)['bursa|Osmangazi']).toHaveLength(1);
    expect(screen.getByRole('progressbar', { name: 'Görülen duraklar' })).toHaveAttribute('aria-valuenow', '1');
  });
});
