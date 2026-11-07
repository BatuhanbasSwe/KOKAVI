/**
 * Eser formu (panel) — "hızlı giriş" düzeni regresyon testleri.
 *
 * Kullanıcı isteği: "YENİ ESER GİRİŞİNİN KOLAY OLMASI LAZIM". Form 1087 satırdı;
 * zorunlu alanlar üstte tek ekranda, geri kalanı katlanır "Ayrıntılar
 * (isteğe bağlı)" bölümünde. Bu testler düzenin KORUNDUĞUNU ölçer; alan adları,
 * doğrulama kuralları ve API çağrısı değişmedi.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import type { Kulliye, Sehir } from '@shared/types';
import { EserFormu } from '../src/features/panel/EserFormu';

const SEHIRLER: Sehir[] = [
  { id: 'bursa', ad: 'Bursa', sira: 1, aktif: true },
  { id: 'konya', ad: 'Konya', sira: 2, aktif: true },
];

const KULLIYELER: Kulliye[] = [
  { id: 'yesil-kulliyesi', ad: 'Yeşilcami Külliyesi', sehirId: 'bursa', bani: null, aciklama: null },
];

function ciz(onListeyeDon = vi.fn()) {
  return render(
    <EserFormu eserId={null} sehirler={SEHIRLER} kulliyeler={KULLIYELER} onListeyeDon={onListeyeDon} />,
  );
}

/** Zorunlu alanları geçerli değerlerle doldurur. */
function zorunlulariDoldur() {
  fireEvent.change(screen.getByLabelText(/Eser adı \(zorunlu\)/), { target: { value: 'Ulu Cami' } });
  fireEvent.change(screen.getByLabelText(/Şehir \(zorunlu\)/), { target: { value: 'bursa' } });
  fireEvent.change(screen.getByLabelText('Tür (zorunlu)'), { target: { value: 'Cami' } });
}

beforeEach(() => {
  cleanup();
});

describe('EserFormu — hızlı giriş düzeni', () => {
  it('zorunlu alanlar görünür, ayrıntılar başlangıçta kapalı, kaydet erişilebilir', () => {
    const { container } = ciz();

    // Zorunlu alanlar: etiketleri "(zorunlu)" içerir ve formun üstündedir.
    for (const etiket of ['Eser adı (zorunlu)', 'Kimlik (zorunlu)', 'Şehir (zorunlu)', 'Tür (zorunlu)']) {
      const alan = screen.getByLabelText(etiket);
      expect(alan).toBeInTheDocument();
      expect(alan).toHaveAttribute('aria-required', 'true');
    }
    // Yayın durumu da hızlı girişte (yeni eseri hemen yayınlayabilmek için).
    expect(screen.getByLabelText('Yayında')).toBeInTheDocument();

    // Ayrıntılar kapalı: aria-expanded=false ve gövde hidden.
    const ayrintilar = screen.getByRole('button', { name: /Ayrıntılar \(isteğe bağlı\)/ });
    expect(ayrintilar).toHaveAttribute('aria-expanded', 'false');
    const govde = container.querySelector('#eser-ayrintilar-govde');
    expect(govde).not.toBeNull();
    expect(govde).toHaveAttribute('hidden');

    // Görünür alan sayısı: 26 alanın 21'i katlanmış bölümde, 5'i hızlı girişte.
    const tumAlanlar = container.querySelectorAll('input, select, textarea');
    const ayrintiAlanlari = govde!.querySelectorAll('input, select, textarea');
    expect(tumAlanlar).toHaveLength(26);
    expect(ayrintiAlanlari).toHaveLength(21);
    expect(tumAlanlar.length - ayrintiAlanlari.length).toBe(5);

    // Kaydet: üstte ve yapışkan altta olmak üzere iki kez erişilebilir.
    expect(screen.getAllByRole('button', { name: 'Eseri kaydet' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: '← Listeye dön' })).toBeInTheDocument();
  });

  it('zorunlu alan sayacı metinle güncellenir ve ad girilince kimlik türetilir', () => {
    ciz();
    expect(screen.getAllByText('4 zorunlu alan kaldı').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Eser adı/), { target: { value: 'Ulu Cami' } });
    // Kimlik adan otomatik üretilir (davranış aynı kaldı).
    expect(screen.getByLabelText(/Kimlik \(zorunlu\)/)).toHaveValue('ulu-cami');
    expect(screen.getAllByText('2 zorunlu alan kaldı').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Şehir/), { target: { value: 'bursa' } });
    fireEvent.change(screen.getByLabelText('Tür (zorunlu)'), { target: { value: 'Cami' } });
    expect(screen.getAllByText('Zorunlu alanlar tamam').length).toBeGreaterThan(0);
  });

  it('ayrıntılar açılınca isteğe bağlı alanlar görünür olur, tekrar kapanır', () => {
    const { container } = ciz();
    const ayrintilar = screen.getByRole('button', { name: /Ayrıntılar \(isteğe bağlı\)/ });
    const govde = container.querySelector('#eser-ayrintilar-govde')!;

    fireEvent.click(ayrintilar);
    expect(ayrintilar).toHaveAttribute('aria-expanded', 'true');
    expect(govde).not.toHaveAttribute('hidden');
    // İsteğe bağlı alanlar DOM'da ve erişilebilir.
    expect(screen.getByLabelText('İlçe')).toBeInTheDocument();
    expect(screen.getByLabelText('Enlem')).toBeInTheDocument();
    expect(screen.getByLabelText('Bani')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tarihçe \(Türkçe\)/)).toBeInTheDocument();

    fireEvent.click(ayrintilar);
    expect(ayrintilar).toHaveAttribute('aria-expanded', 'false');
    expect(govde).toHaveAttribute('hidden');
  });

  it('boş formda kaydet: hata özeti görünür ve odak ilk hatalı alana gider', async () => {
    ciz();
    fireEvent.click(screen.getAllByRole('button', { name: 'Eseri kaydet' })[0]!);

    // Hem form özeti hem alan hataları role="alert"; özet olanı aranır.
    const uyarilar = await screen.findAllByRole('alert');
    const ozet = uyarilar.find((uyari) => uyari.textContent?.includes('Form gönderilemedi'));
    expect(ozet).toBeDefined();
    expect(ozet).toHaveTextContent('Eser adı zorunludur.');
    await waitFor(() => expect(document.activeElement).toHaveAttribute('id', 'eser-id'));
  });

  it('ayrıntıdaki bir alan hatalıysa bölüm otomatik açılır', async () => {
    const { container } = ciz();
    zorunlulariDoldur();
    // Enlem ayrıntıda; değer geçersiz → kayıt engellenir ve bölüm açılır.
    fireEvent.change(screen.getByLabelText('Enlem'), { target: { value: 'abc' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Eseri kaydet' })[0]!);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Ayrıntılar \(isteğe bağlı\)/ })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );
    expect(container.querySelector('#eser-ayrintilar-govde')).not.toHaveAttribute('hidden');
    const uyarilar = screen.getAllByRole('alert');
    expect(uyarilar.some((uyari) => uyari.textContent?.includes('Enlem sayı olmalıdır'))).toBe(true);
  });

  it('axe ihlali yok (kapalı ve açık hâl)', async () => {
    const { container } = ciz();

    const kapali = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(kapali.violations.map((v) => v.id)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: /Ayrıntılar \(isteğe bağlı\)/ }));
    const acik = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(acik.violations.map((v) => v.id)).toEqual([]);
  });
});
