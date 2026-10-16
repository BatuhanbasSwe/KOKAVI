/**
 * "Uygulamayı yükle" kartı: tarayıcı kurulum önerisi verince görünür, düğme
 * öneriyi açar; öneri yoksa (ve iOS değilse) kart hiç çizilmez.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YuklemeKarti } from '../src/features/ayarlar/YuklemeKarti';

describe('yükleme kartı', () => {
  it('öneri yokken görünmez', () => {
    const { container } = render(<YuklemeKarti />);
    expect(container).toBeEmptyDOMElement();
  });

  it('kurulum önerisi gelince görünür; düğme öneriyi açar', async () => {
    render(<YuklemeKarti />);
    const prompt = vi.fn(async () => {});
    const olay = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    await act(async () => {
      window.dispatchEvent(olay);
    });
    expect(olay.defaultPrevented).toBe(true);
    await userEvent.click(await screen.findByRole('button', { name: 'Ana ekrana ekle' }));
    expect(prompt).toHaveBeenCalledOnce();
    expect(await screen.findByText('Yüklendi! Ana ekranında Kök Avı var.')).toBeInTheDocument();
  });
});
