/**
 * Öğrenme Yolu'nda iki sıra: "Şehirlere göre" (üniteler) ve "Zamana göre"
 * (dersler yıl sırasıyla). İlerleme ortak; zamanda sıradaki ders en eski
 * bitmemiş eserdir; seçim cihazda hatırlanır; axe 0 ihlal.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';

// Ulucami 1399, Karatay Medresesi 1251, Habib-i Neccar ~636
const YOL = {
  sehirler: [
    {
      sehirId: 'bursa', ad: 'Bursa', sira: 1,
      uniteler: [{ uniteId: 'bursa-u1', ad: 'Ünite 1', sira: 1, dersler: [
        { dersId: 'bursa-u1-d1', eserId: 'bursa-ulucami', eserAdi: 'Ulucami', tur: 'Cami', sira: 1 },
      ] }],
    },
    {
      sehirId: 'konya', ad: 'Konya', sira: 2,
      uniteler: [{ uniteId: 'konya-u1', ad: 'Ünite 1', sira: 1, dersler: [
        { dersId: 'konya-u1-d1', eserId: 'karatay-medresesi', eserAdi: 'Karatay Medresesi', tur: 'Medrese', sira: 1 },
      ] }],
    },
    {
      sehirId: 'hatay', ad: 'Hatay', sira: 3,
      uniteler: [{ uniteId: 'hatay-u1', ad: 'Ünite 1', sira: 1, dersler: [
        { dersId: 'hatay-u1-d1', eserId: 'hatay-habib-i-neccar-camii-ve-kulliyesi', eserAdi: 'Habib-i Neccar', tur: 'Cami', sira: 1 },
      ] }],
    },
  ],
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem('kokavi-tanitim-v1', '2026-10-16');
  // Habib-i Neccar (en eski) bitmiş → zamanda sıradaki Karatay (1251)
  localStorage.setItem(
    'kokavi.ilerleme.v1',
    JSON.stringify({ tamamlananDersler: ['hatay-u1-d1'], defterSayfalari: [], elmas: 0, seri: { gunSayisi: 0, sonTarih: null }, sinifKodu: null }),
  );
  window.location.hash = '#/yol';
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

describe('öğrenme sırası', () => {
  it('Zamana göre: sıradaki en eski bitmemiş eser; seçim hatırlanır; ihlalsiz', async () => {
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    const zaman = await screen.findByRole('button', { name: 'Zamana göre' });
    expect(screen.getByRole('button', { name: 'Şehirlere göre' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(zaman);
    expect(zaman).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Zamanda sıradaki durak').parentElement).toHaveTextContent('1251 · Karatay Medresesi');
    expect(screen.getByRole('link', { name: 'Derse başla' })).toHaveAttribute('href', '#/ders/konya-u1-d1');
    expect(localStorage.getItem('kokavi-yol-gorunum')).toBe('zaman');
    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => v.id)).toEqual([]);
  });
});
