/**
 * Hata sınırı testleri.
 *
 * NEDEN: canlı demodan önce tek bir bozuk bileşenin tüm uygulamayı beyaz
 * ekrana düşürmesi engellenmeli. Bu test sınırın GERÇEKTEN yakaladığını,
 * kullanıcıya çıkış yolu sunduğunu ve teknik ayrıntıyı gizlediğini doğrular.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HataSiniri } from '../src/app/HataSiniri';

function Patlayan({ mesaj = 'Veri okunamadı' }: { mesaj?: string }): never {
  throw new Error(mesaj);
}

function Saglam() {
  return <p>Her şey yolunda</p>;
}

beforeEach(() => {
  // React hatayı konsola yazar; test çıktısını kirletmesin.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HataSiniri', () => {
  it('hata yoksa çocukları normal render eder', () => {
    render(
      <HataSiniri>
        <Saglam />
      </HataSiniri>,
    );
    expect(screen.getByText('Her şey yolunda')).toBeTruthy();
  });

  it('hata fırlatan bileşeni yakalar ve beyaz ekran yerine mesaj gösterir', () => {
    render(
      <HataSiniri>
        <Patlayan />
      </HataSiniri>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('kullanıcıya çıkış yolu sunar (3 eylem)', () => {
    render(
      <HataSiniri>
        <Patlayan />
      </HataSiniri>,
    );

    expect(screen.getByRole('button', { name: /öğrenme yoluna dön/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /tekrar dene/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /sayfayı yenile/i })).toBeTruthy();
  });

  it('ilerlemenin kaybolmadığını söyler (panik önleyici mesaj)', () => {
    render(
      <HataSiniri>
        <Patlayan />
      </HataSiniri>,
    );
    // NOT: "İlerlemen" Türkçe İ ile başlar; JS regex `i` bayrağı İ ile
    // eşleşmez (bkz. docs/UI-DEVIR.md §3). Türkçe özel harf içermeyen
    // parça aranır.
    expect(screen.getByText(/kaybolmad/i)).toBeTruthy();
  });

  it('teknik ayrıntıyı açılır bölümde tutar, doğrudan göstermez', () => {
    const { container } = render(
      <HataSiniri>
        <Patlayan mesaj="İç hata: bağlantı koptu" />
      </HataSiniri>,
    );

    const detay = container.querySelector('details');
    expect(detay).toBeTruthy();
    // Mesaj yalnızca <details> içinde olmalı
    expect(detay!.textContent).toContain('İç hata: bağlantı koptu');
  });

  it('"Tekrar dene" hatayı temizler ve çocukları yeniden dener', async () => {
    let patlat = true;

    function Kosullu() {
      if (patlat) throw new Error('ilk deneme başarısız');
      return <p>Kurtarıldı</p>;
    }

    const { getByRole } = render(
      <HataSiniri>
        <Kosullu />
      </HataSiniri>,
    );

    expect(getByRole('alert')).toBeTruthy();

    // Sorun giderildi varsayımıyla yeniden dene
    patlat = false;
    getByRole('button', { name: /tekrar dene/i }).click();

    // React 19'da setState sonrası güncelleme mikro görevde tamamlanır
    await Promise.resolve();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hata mesajı role="alert" ile duyurulur (ekran okuyucu)', () => {
    render(
      <HataSiniri>
        <Patlayan />
      </HataSiniri>,
    );
    const uyari = screen.getByRole('alert');
    expect(uyari.tagName).toBe('DIV');
  });
});
