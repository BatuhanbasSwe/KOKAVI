/**
 * "Dinle ve seç" (PDF egzersiz tipi): ses varsa betimleme açılışta bir kez
 * okunur ve metni altyazı düğmesinin arkasındadır; sessiz modda aynı egzersiz
 * yazılı "Eseri tanı" olarak çözülür. axe ihlali yok.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { EserTaniVerisi } from '@shared/types';

const konusulan: string[] = [];
const VERI = {
  yonerge: 'Betimlemeyi oku ve anlatılan eseri seç.',
  betimleme: 'Çatısında yirmi kubbe olan büyük bir cami.',
  secenekler: ['Ulucami', 'Koza Hanı', 'Yeşil Türbe'],
  dogruIndex: 0,
} as EserTaniVerisi;

function sesKur() {
  class Soz {
    lang = '';
    voice: unknown = null;
    rate = 1;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Soz);
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Soz, configurable: true });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [{ lang: 'tr-TR', name: 'Türkçe' }],
      speak: (s: Soz) => konusulan.push(s.text),
      cancel: () => {},
    },
  });
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  konusulan.length = 0;
  sesKur();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL) =>
      String(u).includes('/api/auth/ben')
        ? new Response('{}', { status: 401 })
        : new Response(JSON.stringify(String(u).includes('/api/yol') ? { sehirler: [] } : []), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function egzersiz(onBitti = vi.fn()) {
  const { DurumSaglayici } = await import('../src/app/DurumSaglayici');
  const { EserTaniEgzersizi } = await import('../src/features/ders/EserTaniEgzersizi');
  const { container } = render(
    <DurumSaglayici>
      <EserTaniEgzersizi veri={VERI} kaynak={null} onBitti={onBitti} />
    </DurumSaglayici>,
  );
  return { container, onBitti };
}

describe('Dinle ve seç', () => {
  it('ses varsa: açılışta okunur, altyazı gizli; düğmeyle açılır; doğru eser seçilir; ihlalsiz', async () => {
    const { container } = await egzersiz();
    expect(await screen.findByRole('region', { name: 'Dinle ve seç egzersizi' })).toBeInTheDocument();
    expect(konusulan).toEqual([VERI.betimleme]);
    expect(screen.queryByText(VERI.betimleme)).toBeNull();

    const altyazi = screen.getByRole('button', { name: 'Altyazıyı göster' });
    expect(altyazi).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(altyazi);
    expect(screen.getByRole('button', { name: 'Altyazıyı gizle' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(VERI.betimleme)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Ulucami/ }));
    expect(screen.getByText('Doğru eser!')).toBeInTheDocument();

    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });

  it('sessiz modda: konuşma yok, betimleme yazılı ("Eseri tanı")', async () => {
    localStorage.setItem(
      'kokavi.ilerleme.v1',
      JSON.stringify({
        ayarlar: { tema: 'koyu', renkKorlugu: 'yok', yaziBoyutu: 1, hareketAzalt: false, sessizMod: true },
      }),
    );
    await egzersiz();
    expect(await screen.findByRole('region', { name: 'Eseri tanı egzersizi' })).toBeInTheDocument();
    expect(konusulan).toEqual([]);
    expect(screen.getByText(VERI.betimleme)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Altyazı/ })).toBeNull();
  });
});
