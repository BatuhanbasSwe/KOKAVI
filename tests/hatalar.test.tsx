/**
 * "Hatalarımı çalış": derste ipucu alınan egzersiz cihazdaki listeye düşer;
 * pratikte ipucusuz çözülen listeden çıkar, ipucuyla çözülen kalır. Ceza yok.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useState } from 'react';
import type { Egzersiz } from '../shared/types';
import { DurumSaglayici } from '../src/app/DurumSaglayici';
import { GeriCagirmaAdimi } from '../src/features/ders/GeriCagirmaAdimi';
import { HatalarSayfasi } from '../src/features/hatalar/HatalarSayfasi';
import { hataEkle, hatalariOku } from '../src/features/hatalar/hataDeposu';

const egz = (i: number): Egzersiz<'eser-tani'> => ({
  id: `h${i}`,
  tip: 'eser-tani',
  sira: i,
  veri: {
    yonerge: `Soru ${i}`,
    betimleme: `Betimleme ${i}`,
    secenekler: [`Doğru ${i}`, `Yanlış A${i}`, `Yanlış B${i}`],
    dogruIndex: 0,
  },
  kaynak: 'Test',
});

beforeEach(() => {
  cleanup();
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ sehirler: [] }), { status: 200 })),
  );
});

async function coz(i: number, yanlisOnce = false) {
  if (yanlisOnce) await userEvent.click(await screen.findByRole('button', { name: new RegExp(`Yanlış A${i}`) }));
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(`Doğru ${i}`) }));
  await userEvent.click(screen.getByRole('button', { name: /devam/i }));
}

describe('hata listesi', () => {
  it('derste yalnızca ipucu alınan egzersiz eser adıyla kaydedilir', async () => {
    function Kap() {
      const [sira, setSira] = useState(0);
      return sira < 2 ? (
        <GeriCagirmaAdimi
          egzersizler={[egz(1), egz(2)]}
          sirasi={sira}
          sessizMod
          eserAdi="Ulucami"
          onIlerle={() => setSira((s) => s + 1)}
        />
      ) : (
        <p>Bitti</p>
      );
    }
    render(
      <DurumSaglayici>
        <Kap />
      </DurumSaglayici>,
    );
    await coz(1); // ipucusuz
    await coz(2, true); // ipucu
    const liste = hatalariOku();
    expect(liste.map((h) => h.egzersiz.id)).toEqual(['h2']);
    expect(liste[0]!.eserAdi).toBe('Ulucami');
  });

  it('aynı egzersiz iki kez eklenmez; en fazla 30 kayıt', () => {
    hataEkle(egz(1), 'A', '2026-10-16');
    hataEkle(egz(1), 'A', '2026-10-16');
    expect(hatalariOku()).toHaveLength(1);
    for (let i = 0; i < 40; i++) hataEkle(egz(100 + i), 'B', '2026-10-16');
    expect(hatalariOku()).toHaveLength(30);
  });

  it('pratikte ipucusuz çözülen çıkar, ipucuyla çözülen kalır; ihlalsiz', async () => {
    hataEkle(egz(1), 'Koza Hanı', '2026-10-15');
    hataEkle(egz(2), 'Ulucami', '2026-10-15');
    const { container } = render(
      <DurumSaglayici>
        <HatalarSayfasi />
      </DurumSaglayici>,
    );
    expect(screen.getByText('2 soru')).toBeInTheDocument();
    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => v.id)).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: /Pratiğe başla/ }));
    expect(screen.getByText('Koza Hanı dersinden')).toBeInTheDocument();
    await coz(1); // ipucusuz → çıkar
    await coz(2, true); // ipucu → kalır
    expect(await screen.findByRole('heading', { name: '1 soruyu öğrendin!' })).toBeInTheDocument();
    expect(hatalariOku().map((h) => h.egzersiz.id)).toEqual(['h2']);
  });
});
