/**
 * "Hikâyesini dinle": arşiv eser sayfası metni Türkçe sesle okur; sessiz modda
 * ya da Türkçe ses yoksa düğme hiç çıkmaz (başvuru: sessiz mod taahhüdü).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const konusulan: string[] = [];

beforeEach(() => {
  cleanup();
  localStorage.clear();
  konusulan.length = 0;
  window.location.hash = '#/arsiv/bursa-ulucami';
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL) => {
      const url = String(u);
      if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      let govde: unknown = [];
      if (url.includes('/api/yol')) govde = { sehirler: [] };
      else if (url.includes('/arsiv/liste.json'))
        govde = [{ id: 'bursa-ulucami', ad: 'Ulucami', il: 'bursa', ilce: 'Osmangazi', tur: 'Cami', kaynak: 'Vakıf Katılım, s. 36-83', foto: false }];
      else if (url.includes('/arsiv/metin/')) govde = { paragraflar: ['Ulucami çarşının yanındadır.', 'Yirmi kubbesi vardır.'] };
      return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function ac() {
  const { App } = await import('../src/app/App');
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Ulucami' });
}

describe('hikâyesini dinle', () => {
  it('metni Türkçe sesle okur; tekrar basınca durur', async () => {
    await ac();
    const dugme = screen.getByRole('button', { name: /Hikâyesini dinle/ });
    await userEvent.click(dugme);
    expect(konusulan[0]).toContain('Ulucami. Ulucami çarşının yanındadır.');
    expect(screen.getByRole('button', { name: /Durdur/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sessiz modda düğme yok', async () => {
    localStorage.setItem(
      'kokavi.ilerleme.v1',
      JSON.stringify({
        tamamlananDersler: [], defterSayfalari: [], elmas: 0, seri: { gunSayisi: 0, sonTarih: null }, sinifKodu: null,
        ayarlar: { tema: 'acik', renkKorlugu: 'yok', yaziBoyutu: 1, hareketAzalt: false, sessizMod: true },
      }),
    );
    await ac();
    expect(screen.queryByRole('button', { name: /Hikâyesini dinle/ })).toBeNull();
  });
});
