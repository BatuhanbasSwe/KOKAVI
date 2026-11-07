import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { BaglamAdimi } from '@/features/ders/BaglamAdimi';
import type { BaglamAdimi as BaglamVerisi } from '@shared/types';

const baglam: BaglamVerisi = {
  baslik: 'Bursa’nın en büyük camisi',
  metin: 'Birinci paragraf.\n\nİkinci paragraf.\n\nÜçüncü paragraf.',
  kavramlar: [{ ad: 'KUBBE', aciklama: 'Yarım top biçiminde çatı.', ornek: 'Yirmi kubbe var.' }],
  kapanis: 'Peki bu sorun nasıl çözüldü?',
};

describe('Bağlam adımı: okuma kartları', () => {
  it('her paragrafı ayrı kartta gösterir, sonda kavramlar ve kapanış çıkar', () => {
    const onDevam = vi.fn();
    render(<BaglamAdimi baglam={baglam} onDevam={onDevam} />);

    expect(screen.getByText('Birinci paragraf.')).toBeTruthy();
    expect(screen.queryByText('İkinci paragraf.')).toBeNull();
    expect(screen.queryByText('Peki bu sorun nasıl çözüldü?')).toBeNull();
    expect(screen.getByText(/1 \/ 4/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Geri' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));
    expect(screen.getByText('İkinci paragraf.')).toBeTruthy();
    expect(screen.queryByText('Birinci paragraf.')).toBeNull();
    // Odak yeni kartın başlığına taşınır.
    expect(document.activeElement?.id).toBe('ders-okuma-baslik');

    fireEvent.click(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByText('Birinci paragraf.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));
    expect(screen.getByRole('heading', { name: 'Anahtar kavramlar' })).toBeTruthy();
    expect(screen.getByText('KUBBE')).toBeTruthy();
    expect(screen.getByText('Peki bu sorun nasıl çözüldü?')).toBeTruthy();
    expect(onDevam).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));
    expect(onDevam).toHaveBeenCalledTimes(1);
  });

  it('kavram yoksa kapanış son paragraf kartında çıkar', () => {
    const onDevam = vi.fn();
    render(<BaglamAdimi baglam={{ ...baglam, metin: 'Tek paragraf.', kavramlar: [] }} onDevam={onDevam} />);
    expect(screen.getByText('Peki bu sorun nasıl çözüldü?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Devam' }));
    expect(onDevam).toHaveBeenCalledTimes(1);
  });

  it('axe ihlali yok', async () => {
    const { container } = render(<BaglamAdimi baglam={baglam} onDevam={() => {}} />);
    const sonuc = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(sonuc.violations).toEqual([]);
  });
});
