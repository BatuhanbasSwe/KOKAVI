/**
 * Kombo: üst üste ipucusuz çözülen egzersizler sayılır; ipucu alınca sıfırlanır
 * (ceza yok — yalnızca sayaç sıfırlanır, hiçbir şey eksilmez).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Egzersiz } from '../shared/types';
import { DurumSaglayici } from '../src/app/DurumSaglayici';
import { GeriCagirmaAdimi } from '../src/features/ders/GeriCagirmaAdimi';

const egz = (i: number): Egzersiz<'eser-tani'> => ({
  id: `e${i}`,
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

function Kap({ adet }: { adet: number }) {
  const [sira, setSira] = useState(0);
  const egzersizler = Array.from({ length: adet }, (_, i) => egz(i + 1));
  return sira < adet ? (
    <GeriCagirmaAdimi egzersizler={egzersizler} sirasi={sira} sessizMod onIlerle={() => setSira((s) => s + 1)} />
  ) : (
    <p>Bitti</p>
  );
}

beforeEach(() => {
  cleanup();
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

describe('kombo', () => {
  it('iki egzersiz ipucusuz çözülünce bant çıkar; ipucu alınca kaybolur', async () => {
    render(
      <DurumSaglayici>
        <Kap adet={4} />
      </DurumSaglayici>,
    );
    await coz(1);
    expect(screen.queryByText(/üst üste ilk denemede/)).toBeNull(); // 1 kombo yetmez
    await coz(2);
    expect(await screen.findByText(/üst üste ilk denemede/)).toHaveTextContent('2 egzersiz üst üste ilk denemede!');
    await coz(3, true); // önce yanlış → ipucu
    expect(screen.queryByText(/üst üste ilk denemede/)).toBeNull();
  });
});
