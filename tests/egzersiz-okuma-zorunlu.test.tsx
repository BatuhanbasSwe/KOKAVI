/**
 * Egzersizler "okumadan geçilemez" olmalı (docs/EGZERSIZ-ANALIZI.md):
 *  - Eseri tanı / boşluk doldur: içerikte doğru şık çoğunlukla ilk sırada;
 *    arayüz şıkları karıştırır, kontrol yine doğru cevaba göre yapılır.
 *  - Sırala: öğelerdeki tarih öneki ilk denemede gizli; ilk kontrolden sonra
 *    ipucu olarak açılır. axe ihlali yok.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { BoslukVerisi, EserTaniVerisi, SiralaVerisi } from '@shared/types';
import { tarihAyir } from '../src/features/ders/yardimci';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('tarihAyir', () => {
  it('yıl, dönem ve "Bugün" öneklerini ayırır', () => {
    expect(tarihAyir('1339: Cami yapıldı')).toEqual({ tarih: '1339', olay: 'Cami yapıldı' });
    expect(tarihAyir("1400'ler: Medrese yapıldı").tarih).toBe("1400'ler");
    expect(tarihAyir('12 Temmuz 1916: Vakfiye yazıldı').olay).toBe('Vakfiye yazıldı');
    expect(tarihAyir('XIV. yüzyıl: Bedesten yapıldı').tarih).toBe('XIV. yüzyıl');
    expect(tarihAyir('Bugün: Müze oldu').olay).toBe('Müze oldu');
  });

  it('tarih olmayan öğeye dokunmaz', () => {
    expect(tarihAyir('Köylerden gelen buğday: 70.615 kuruş').tarih).toBeNull();
    expect(tarihAyir('Divan onay verdi')).toEqual({ tarih: null, olay: 'Divan onay verdi' });
  });
});

async function sarmala(ui: React.ReactElement) {
  const { DurumSaglayici } = await import('../src/app/DurumSaglayici');
  return render(<DurumSaglayici>{ui}</DurumSaglayici>);
}

describe('Sırala: tarih gizleme', () => {
  const VERI: SiralaVerisi = {
    yonerge: 'Olayları eskiden yeniye sırala.',
    dogruSira: ['1339: Cami yapıldı', '1855: Deprem oldu', '1950: Onarıldı'],
  };

  it('ilk denemede tarihler gizli, kontrolden sonra açılır; ihlalsiz', async () => {
    const { SiralaEgzersizi } = await import('../src/features/ders/SiralaEgzersizi');
    const { container } = await sarmala(
      <SiralaEgzersizi veri={VERI} kaynak={null} onBitti={vi.fn()} />,
    );

    const liste = container.querySelector('ol.ders-sirala') as HTMLElement;
    expect(within(liste).queryByText('1339')).toBeNull();
    expect(within(liste).getByText('Cami yapıldı')).toBeInTheDocument();
    expect(screen.getByText(/Tarihler gizli/)).toBeInTheDocument();

    // karistirFarkli asla çözülmüş sırayla başlatmaz → ilk kontrol yanlış olur.
    await userEvent.click(screen.getByRole('button', { name: 'Sıralamayı kontrol et' }));
    expect(within(liste).getByText('1339')).toBeInTheDocument();
    expect(screen.getByText(/tarihleri açtık/)).toBeInTheDocument();

    const s = await axe.run(container);
    expect(s.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('Şık sırası karıştırılır', () => {
  it('eseri tanı: doğru şık ilk sırada olsa da sona düşebilir ve yine doğru sayılır', async () => {
    // Math.random → 0: Fisher–Yates her adımda ilk öğeyle değiştirir; [0,1,2] → [1,2,0].
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const veri: EserTaniVerisi = {
      yonerge: 'Betimlemeyi oku ve eseri seç.',
      betimleme: 'Yirmi kubbeli büyük bir cami.',
      secenekler: ['Ulucami', 'Koza Hanı', 'Yeşil Türbe'],
      dogruIndex: 0,
    };
    const { EserTaniEgzersizi } = await import('../src/features/ders/EserTaniEgzersizi');
    const onBitti = vi.fn();
    await sarmala(<EserTaniEgzersizi veri={veri} kaynak={null} onBitti={onBitti} />);

    const grup = screen.getByRole('group', { name: 'Eser seçenekleri' });
    const dugmeler = within(grup).getAllByRole('button');
    expect(dugmeler[0]).not.toHaveTextContent('Ulucami');

    await userEvent.click(within(grup).getByRole('button', { name: /Ulucami/ }));
    expect(screen.getByText('Doğru eser!')).toBeInTheDocument();
  });

  it('boşluk doldur: cevap ilk şık olarak gösterilmez', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const veri: BoslukVerisi = {
      yonerge: 'Boşluğu doldur.',
      metin: 'Vakfın kuruluş belgesine ___ denir.',
      cevap: 'vakfiye',
      secenekler: ['vakfiye', 'tapu', 'ferman'],
    };
    const { BoslukDoldurEgzersizi } = await import('../src/features/ders/BoslukDoldurEgzersizi');
    await sarmala(<BoslukDoldurEgzersizi veri={veri} kaynak={null} onBitti={vi.fn()} />);

    const grup = screen.getByRole('group', { name: 'Cevap seçenekleri' });
    expect(within(grup).getAllByRole('button')[0]).not.toHaveTextContent('vakfiye');
  });
});
