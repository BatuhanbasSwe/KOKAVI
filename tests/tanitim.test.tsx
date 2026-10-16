/**
 * İlk açılış turu: yalnızca yeni kullanıcıya bir kez; Atla ile tek dokunuşta kapanır.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TanitimTuru, tanitimGorulduMu } from '../src/features/yol/TanitimTuru';

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('tanıtım turu', () => {
  it('4 sayfa İleri ile ilerler; son sayfada "Hadi başlayalım!" kapatır ve hatırlanır', async () => {
    const bitti = vi.fn();
    render(<TanitimTuru onBitti={bitti} />);
    expect(screen.getByRole('heading', { name: 'Merhaba, ben Kâşif!' })).toBeInTheDocument();
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole('button', { name: 'İleri' }));
    expect(screen.getByText('Tanışalım · 4/4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atla' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Hadi başlayalım!' }));
    expect(bitti).toHaveBeenCalledOnce();
    expect(tanitimGorulduMu()).toBe(true);
  });

  it('Atla ilk sayfada kapatır', async () => {
    const bitti = vi.fn();
    render(<TanitimTuru onBitti={bitti} />);
    await userEvent.click(screen.getByRole('button', { name: 'Atla' }));
    expect(bitti).toHaveBeenCalledOnce();
    expect(tanitimGorulduMu()).toBe(true);
  });

  it('ceza yok ilkesi turda söylenir', async () => {
    render(<TanitimTuru onBitti={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'İleri' }));
    expect(screen.getByText(/ceza yok/)).toBeInTheDocument();
  });
});
