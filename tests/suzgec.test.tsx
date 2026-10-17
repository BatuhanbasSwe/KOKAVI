/**
 * Açılır kapanır süzgeç paneli: başta kapalı (seçim yoksa), düğme
 * aria-expanded ile durumunu söyler, seçili süzgeç sayısı metinle de yazılır,
 * "Temizle" seçim yokken pasif; axe ihlali yok.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { SuzgecPaneli } from '../src/app/SuzgecPaneli';

function Ornek({ sayi, onTemizle = () => {} }: { sayi: number; onTemizle?: () => void }) {
  return (
    <SuzgecPaneli etkinSayisi={sayi} onTemizle={onTemizle}>
      <label htmlFor="s">Şehir</label>
      <select id="s">
        <option>Tümü</option>
      </select>
    </SuzgecPaneli>
  );
}

describe('süzgeç paneli', () => {
  it('seçim yokken kapalı; düğmeyle açılır ve kapanır; ihlalsiz', async () => {
    const { container } = render(<Ornek sayi={0} />);
    const dugme = screen.getByRole('button', { name: 'Süz' });
    expect(dugme).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('combobox', { name: 'Şehir' })).toBeNull();

    await userEvent.click(dugme);
    expect(dugme).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('combobox', { name: 'Şehir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Temizle' })).toBeDisabled();

    const s = await axe.run(container, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false } } });
    expect(s.violations.map((v) => v.id)).toEqual([]);

    await userEvent.click(dugme);
    expect(screen.queryByRole('combobox', { name: 'Şehir' })).toBeNull();
  });

  it('seçim varsa açık başlar, sayı metinle söylenir, Temizle çalışır', async () => {
    const temizle = vi.fn();
    render(<Ornek sayi={2} onTemizle={temizle} />);
    expect(screen.getByRole('button', { name: /Süz 2 süzgeç seçili/ })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Temizle' }));
    expect(temizle).toHaveBeenCalledOnce();
  });
});
