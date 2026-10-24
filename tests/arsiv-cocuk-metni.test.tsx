/**
 * Arşiv eser sayfası — çocuk metni düzeltmesi.
 *
 * Kullanıcı şikâyeti: "Keşfet > Meraklısına arşivi > eser detayı" yetişkin
 * envanter paragraflarını (İngilizce çevirileriyle birlikte) kocaman basıyordu.
 * Bu testler: kısa özet görünür, İngilizce hiç basılmaz, tam Türkçe metin
 * "Büyükler için kaynak metni" altında katlanır, "Dinle" yalnızca özeti okur,
 * derssiz/dersli ayrımı görünür.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const konusulan: string[] = [];

const LISTE = [
  {
    id: 'arsiv-derssiz',
    ad: 'Derssiz Eser',
    il: 'bursa',
    ilce: 'Osmangazi',
    tur: 'Cami',
    kaynak: 'Vakıf Katılım, s. 10-11',
    foto: false,
  },
  {
    id: 'arsiv-dersli',
    ad: 'Dersli Eser',
    il: 'bursa',
    ilce: 'Osmangazi',
    tur: 'Han',
    kaynak: 'Vakıf Katılım, s. 20-21',
    foto: false,
    ders: 'arsiv-dersli',
  },
];

const METINLER: Record<string, string[]> = {
  'arsiv-derssiz': [
    'Kısa Türkçe cümle. İkinci Türkçe cümle.',
    'The mosque is located in Bursa.',
    'Üçüncü Türkçe cümle.',
  ],
  'arsiv-dersli': ['Bu eserin bir dersi var.', 'The han was built in 1490.'],
};

const YOL_CEVABI = {
  sehirler: [
    {
      sehirId: 'bursa',
      ad: 'Bursa',
      sira: 1,
      uniteler: [
        {
          uniteId: 'bursa-u1',
          ad: 'Bursa Ünite 1',
          sira: 1,
          dersler: [{ dersId: 'bursa-u1-d1', eserId: 'arsiv-dersli', eserAdi: 'Dersli Eser', tur: 'Han', sira: 1 }],
        },
      ],
    },
  ],
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
  konusulan.length = 0;

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
    vi.fn(async (girdi: RequestInfo | URL) => {
      const url = String(girdi);
      if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });

      let govde: unknown = [];
      if (url.includes('/api/yol')) govde = YOL_CEVABI;
      else if (url.includes('/api/eserler/')) govde = { koordinat: null, kaynaklar: [] };
      else if (url.includes('/arsiv/liste.json')) govde = LISTE;
      else if (url.includes('/arsiv/metin/')) {
        const id = decodeURIComponent(url.split('/arsiv/metin/')[1]!.replace('.json', ''));
        govde = { paragraflar: METINLER[id] ?? [] };
      }
      return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function ac(hash: string) {
  window.location.hash = hash;
  const { App } = await import('../src/app/App');
  return render(<App />);
}

describe('arşiv eser sayfası: çocuk metni', () => {
  it('özet gösterir; İngilizce hiç basılmaz; tam Türkçe metin details içinde; Dinle yalnızca özeti okur', async () => {
    const { container } = await ac('#/arsiv/arsiv-derssiz');
    await screen.findByRole('heading', { level: 1, name: 'Derssiz Eser' });

    // Derssiz eser notu görünür.
    expect(screen.getByText('Dersi yok · yalnızca keşif')).toBeInTheDocument();

    // Çocuk özeti = ilk iki cümle; eski "Devamını oku" düğmesi kaldırıldı.
    const ozetKutu = container.querySelector('.arsiv-ozet');
    expect(ozetKutu?.textContent).toBe('Kısa Türkçe cümle. İkinci Türkçe cümle.');
    expect(screen.queryByText(/Devamını oku/)).toBeNull();

    // İngilizce çeviri paragrafı arayüzde hiç yok (katlanmış metinde de).
    expect(container.textContent).not.toContain('The mosque is located');
    expect(container.textContent).not.toContain('The han was built');
    expect(container.textContent).not.toContain('Kısalt');

    // Tam Türkçe metin katlanmış "Büyükler için kaynak metni" altında.
    const ozetBasligi = screen.getByText('Büyükler için kaynak metni');
    const details = ozetBasligi.closest('details');
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
    expect(within(details as HTMLElement).getByText('Üçüncü Türkçe cümle.')).toBeInTheDocument();
    // Özetin tekrarı tam metinde bulunur; asıl tam metin kısaltılmamıştır.
    expect(within(details as HTMLElement).getByText('Kısa Türkçe cümle. İkinci Türkçe cümle.')).toBeInTheDocument();

    // "Dinle" yalnızca özeti okur; üçüncü cümleyi ve İngilizceyi okumaz.
    await userEvent.click(screen.getByRole('button', { name: /Hikâyesini dinle/ }));
    expect(konusulan[0]).toBe('Derssiz Eser. Kısa Türkçe cümle. İkinci Türkçe cümle.');
    expect(konusulan[0]).not.toContain('Üçüncü');
    expect(konusulan[0]).not.toContain('The mosque');
  });

  it('dersli eserde mevcut ders kutusu kalır; "dersi yok" notu çıkmaz', async () => {
    await ac('#/arsiv/arsiv-dersli');
    await screen.findByRole('heading', { level: 1, name: 'Dersli Eser' });

    expect(await screen.findByText(/Bu eserin bir dersi var!/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Derse git' })).toHaveAttribute('href', '#/ders/bursa-u1-d1');
    expect(screen.queryByText('Dersi yok · yalnızca keşif')).toBeNull();
    expect(screen.getByText('Büyükler için kaynak metni')).toBeInTheDocument();
  });
});
