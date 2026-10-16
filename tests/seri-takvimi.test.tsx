/**
 * Seri takvimi: mevcut seri takvime çevrilir; hafta Pazartesi başlar; en uzun
 * seri doğru; dil olumlu (suçlama yok); axe 0 ihlal.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import {
  aktifGunEkle,
  aktifGunler,
  ayHaftalari,
  enUzunSeri,
  haftaGunleri,
} from '../src/features/seri/seriTakvimi';
import { gunMetni } from '../src/lib/tekrar';

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('seri takvimi mantığı', () => {
  it('ilk açılışta mevcut seri geriye doğru günlere çevrilir', () => {
    const g = aktifGunler({ gunSayisi: 3, sonTarih: '2026-10-16' });
    expect([...g].sort()).toEqual(['2026-10-14', '2026-10-15', '2026-10-16']);
    aktifGunEkle('2026-10-18');
    expect(aktifGunler().has('2026-10-18')).toBe(true);
  });

  it('en uzun seri', () => {
    expect(enUzunSeri(new Set(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06']))).toBe(3);
    expect(enUzunSeri(new Set())).toBe(0);
  });

  it('hafta Pazartesi başlar; ay ızgarası 7 sütun', () => {
    // 16 Ekim 2026 Cuma
    expect(haftaGunleri('2026-10-16')).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ]);
    const ekim = ayHaftalari(2026, 9);
    for (const h of ekim) expect(h).toHaveLength(7);
    expect(ekim[0]!.slice(0, 3)).toEqual([null, null, null]); // 1 Ekim Perşembe
    expect(ekim[0]![3]).toBe('2026-10-01');
    expect(ekim.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe('seri ekranı', () => {
  it('takvim ve olumlu davet; ihlalsiz', async () => {
    const bugun = gunMetni(new Date());
    localStorage.setItem(
      'kokavi.ilerleme.v1',
      JSON.stringify({ tamamlananDersler: [], defterSayfalari: [], elmas: 0, seri: { gunSayisi: 2, sonTarih: bugun }, sinifKodu: null }),
    );
    window.location.hash = '#/seri';
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
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    await screen.findByRole('heading', { level: 1, name: /2 günlük seri/ });
    expect(screen.getByText('Harika! 2 gündür her gün keşfediyorsun.')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText(/ders yapıldı/).length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).not.toMatch(/kaybettin|kırdın|başaramadın/i);
    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => v.id)).toEqual([]);
  });
});
