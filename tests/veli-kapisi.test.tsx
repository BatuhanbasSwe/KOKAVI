/**
 * Veli kapısı ekranı. Varsayılan kapalı: çocuk derslerle kazandığı elmasla
 * sorusuz harcar (gerçek para yok). Veli Ayarlar'dan açınca harcama onaydan
 * geçer (PDF: "Satın almalar platform kuralı gereği veli onaylıdır"); yanlış
 * cevap harcamaz, doğru cevap harcar, onay 10 dakika geçerlidir; açılmış
 * kuralı kapatmak onay ister. axe ihlali yok.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(
    'kokavi.ilerleme.v1',
    JSON.stringify({ tamamlananDersler: [], defterSayfalari: [], elmas: 100, seri: { gunSayisi: 0, sonTarih: null } }),
  );
  // Soru sabit: "otuz çarpı altı kaç eder?" = 180
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
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

afterEach(() => vi.restoreAllMocks());

async function ac(hash: string, baslik: string) {
  window.location.hash = hash;
  const { App } = await import('../src/app/App');
  const { container } = render(<App />);
  await screen.findByRole('heading', { level: 1, name: baslik });
  return container;
}

describe('veli kapısı', () => {
  it('varsayılanda sorulmaz: kazanılan elmas doğrudan harcanır', async () => {
    await ac('#/carsi', 'Vakıf Çarşısı');
    await userEvent.click(screen.getByRole('button', { name: 'Kubbe: 20 elmas' }));
    expect(screen.queryByRole('heading', { name: 'Bir yetişkin onaylamalı' })).toBeNull();
    expect(screen.getByLabelText('80 elmasın var')).toBeInTheDocument();
  });

  it('veli açtıysa harcama önce onay ister; yanlış cevap harcamaz, doğru cevap harcar; ihlalsiz', async () => {
    localStorage.setItem('kokavi-veli-onayi', 'acik');
    const container = await ac('#/carsi', 'Vakıf Çarşısı');
    await userEvent.click(screen.getByRole('button', { name: 'Kubbe: 20 elmas' }));

    expect(screen.getByRole('heading', { name: 'Bir yetişkin onaylamalı' })).toHaveFocus();
    expect(screen.getByText('Kubbe avatarı · 20 elmas')).toBeInTheDocument();
    const alan = screen.getByRole('textbox', { name: 'Otuz çarpı altı kaç eder?' });

    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);

    await userEvent.type(alan, '181');
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));
    expect(screen.getByText(/Cevap doğru değil/)).toBeInTheDocument();
    expect(screen.getByLabelText('100 elmasın var')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox'), '180');
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));
    expect(screen.queryByRole('heading', { name: 'Bir yetişkin onaylamalı' })).toBeNull();
    expect(screen.getByLabelText('80 elmasın var')).toBeInTheDocument();

    // 10 dakika içinde ikinci harcama yeniden sormaz.
    await userEvent.click(screen.getByRole('button', { name: 'Lale: 20 elmas' }));
    expect(screen.queryByRole('heading', { name: 'Bir yetişkin onaylamalı' })).toBeNull();
    expect(screen.getByLabelText('60 elmasın var')).toBeInTheDocument();
  });

  it('vazgeçince elmas yerinde kalır', async () => {
    localStorage.setItem('kokavi-veli-onayi', 'acik');
    await ac('#/carsi', 'Vakıf Çarşısı');
    await userEvent.click(screen.getByRole('button', { name: 'Kubbe: 20 elmas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    expect(screen.getByLabelText('100 elmasın var')).toBeInTheDocument();
    expect(screen.getAllByText('Harcama yapılmadı; elmasların yerinde.').length).toBeGreaterThan(0);
  });

  it('Ayarlar: açılmış kuralı kapatmak onay ister; kapalıyken çarşı sormaz', async () => {
    localStorage.setItem('kokavi-veli-onayi', 'acik');
    await ac('#/ayarlar', 'Ayarlar');
    const veliSatiri = screen.getByText('Harcamalarda veli onayı').closest('.ayar-satiri')!;
    const dugme = veliSatiri.querySelector('button')!;
    expect(dugme).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(dugme);
    await userEvent.type(screen.getByRole('textbox', { name: 'Otuz çarpı altı kaç eder?' }), '180');
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));
    expect(dugme).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('kokavi-veli-onayi')).toBeNull();
  });
});
