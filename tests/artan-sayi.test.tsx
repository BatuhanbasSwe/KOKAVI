/**
 * Sayarak artan sayı: ara değer yumuşak artar; ekran okuyucu her zaman
 * gerçek değeri okur; oturumda hatırlanan eski değerden sayar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ArtanSayi, araDeger } from '../src/app/ArtanSayi';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

describe('sayarak artan sayı', () => {
  it('ara değer: uçlar doğru, ortada yumuşak çıkış', () => {
    expect(araDeger(10, 20, 0)).toBe(10);
    expect(araDeger(10, 20, 1)).toBe(20);
    expect(araDeger(10, 20, 2)).toBe(20);
    expect(araDeger(10, 20, 0.5)).toBeGreaterThan(15); // çıkış yumuşak: ortada yarıyı geçmiş
  });

  it('ekran okuyucu metni sayma sırasında da gerçek değer; bitince hatırlanır', async () => {
    sessionStorage.setItem('kokavi-sayac-elmas', '10');
    const { container } = render(<ArtanSayi deger={30} anahtar="elmas" sure={50} />);
    expect(container.querySelector('.sr-only')!.textContent).toBe('30');
    await vi.waitFor(() => expect(sessionStorage.getItem('kokavi-sayac-elmas')).toBe('30'));
    await vi.waitFor(() => expect(container.querySelector('[aria-hidden="true"]')!.textContent).toBe('30'));
  });

  it('hatırlanan değer yoksa doğrudan gösterir (açılışta sayma yok)', () => {
    render(<ArtanSayi deger={7} anahtar="seri" />);
    expect(screen.getAllByText('7')).toHaveLength(2);
  });
});
