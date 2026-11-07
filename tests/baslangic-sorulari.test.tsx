/**
 * Başlangıç soruları (onboarding): 4 atlanabilir soru + özet.
 * Cevaplar yalnızca cihazda (localStorage) tutulur; bozuk kayıt güvenle temizlenir.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { BaslangicSorulari } from '../src/features/giris/BaslangicSorulari';
import {
  BOS_TERCIHLER,
  TERCIH_ANAHTARI,
  hedefDersSayisi,
  tercihVarMi,
  tercihleriOku,
  tercihleriTemizle,
} from '../src/lib/tercihler';

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('tercihler (saf mantık)', () => {
  it('bozuk ya da bilinmeyen değerleri atar', () => {
    expect(tercihleriTemizle(null)).toEqual(BOS_TERCIHLER);
    expect(
      tercihleriTemizle({ sinif: '9', ilgiler: ['cami', 'uzay', 'cami'], gunlukHedef: 7, onBilgi: 'cok' }),
    ).toEqual({ sinif: null, ilgiler: ['cami'], gunlukHedef: null, onBilgi: 'cok' });
  });

  it('bozuk JSON kaydında boş tercih döner', () => {
    localStorage.setItem(TERCIH_ANAHTARI, '{bozuk');
    expect(tercihleriOku()).toEqual(BOS_TERCIHLER);
  });

  it('günlük hedefi ders sayısına çevirir (1 ders ≈ 5 dk)', () => {
    expect(hedefDersSayisi(5)).toBe(1);
    expect(hedefDersSayisi(10)).toBe(2);
    expect(hedefDersSayisi(15)).toBe(3);
  });
});

describe('BaslangicSorulari ekranı', () => {
  it('soruları yanıtlayınca cihaza kaydeder ve özeti gösterir; axe ihlali yok', async () => {
    const { container } = render(<BaslangicSorulari />);
    expect(screen.getByRole('heading', { name: 'Kaçıncı sınıftasın?' })).toBeInTheDocument();
    expect((await axe.run(container)).violations.map((v) => v.id)).toEqual([]);

    const bes = screen.getByRole('button', { name: '5. sınıf' });
    fireEvent.click(bes);
    expect(bes).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));

    fireEvent.click(screen.getByRole('button', { name: 'Han' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hamam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));

    fireEvent.click(screen.getByRole('button', { name: 'Hiç duymadım' }));
    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));

    fireEvent.click(screen.getByRole('button', { name: '10 dakika · 2 ders' }));
    expect(tercihVarMi()).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Bitir' }));

    expect(screen.getByRole('heading', { name: 'Hazırsın!' })).toHaveFocus();
    expect(screen.getByText('Han, Hamam')).toBeInTheDocument();
    expect(screen.getByText('10 dakika · 2 ders')).toBeInTheDocument();
    expect(tercihleriOku()).toEqual({
      sinif: '5',
      ilgiler: ['han', 'hamam'],
      gunlukHedef: 10,
      onBilgi: 'yeni',
    });
    expect((await axe.run(container)).violations.map((v) => v.id)).toEqual([]);
  });

  it('her soru atlanabilir; hepsi atlanınca da "yanıtlandı" sayılır', () => {
    render(<BaslangicSorulari />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Atla' }));
    expect(screen.getByRole('heading', { name: 'Hazırsın!' })).toBeInTheDocument();
    expect(screen.getByText('Hepsi')).toBeInTheDocument();
    expect(screen.getByText('Serbest')).toBeInTheDocument();
    expect(tercihVarMi()).toBe(true);
    expect(tercihleriOku()).toEqual(BOS_TERCIHLER);
  });

  it('Geri ile önceki soruya döner, seçim korunur', () => {
    render(<BaslangicSorulari />);
    fireEvent.click(screen.getByRole('button', { name: '6. sınıf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByRole('button', { name: '6. sınıf' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('kahraman bandı dekoratiftir: aria-hidden, erişilebilirlik ağacında görsel yok', () => {
    const { container } = render(<BaslangicSorulari />);
    const kahraman = container.querySelector('.baslangic__kahraman');
    expect(kahraman).not.toBeNull();
    expect(kahraman).toHaveAttribute('aria-hidden', 'true');
    // Fotoğraf CSS arka planıdır: kırık görsel simgesi oluşmaz, ekran okuyucuya
    // süs görsel olarak da girmez (SC 1.1.1).
    expect(kahraman!.querySelector('img')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('özet ekranı seçilen ilgi alanlarının yolda öncelikli olacağını söyler', () => {
    render(<BaslangicSorulari />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Atla' }));
    expect(screen.getByText(/ilgi alanları yolda öncelikli/)).toBeInTheDocument();
  });
});

describe('Bugün ekranı: tanışma kartı', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL) => {
        const url = String(u);
        if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
        return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
    window.location.hash = '#/bugun';
  });

  it('tercih yokken "Seni tanıyalım" kartı görünür, varsa görünmez', async () => {
    const { App } = await import('../src/app/App');
    const ilk = render(<App />);
    const kart = await screen.findByRole('link', { name: /Seni tanıyalım/ });
    expect(kart).toHaveAttribute('href', '#/baslangic');
    ilk.unmount();

    localStorage.setItem(TERCIH_ANAHTARI, JSON.stringify(BOS_TERCIHLER));
    render(<App />);
    await screen.findByRole('heading', { name: 'Merhaba, kâşif!' });
    expect(screen.queryByRole('link', { name: /Seni tanıyalım/ })).toBeNull();
  });
});
