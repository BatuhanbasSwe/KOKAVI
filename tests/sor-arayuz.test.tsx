/**
 * "Köstik'e sor" arayüzü: soru yazınca düğme çıkar; cevap kartı cümle + kaynak
 * numarası + künye bağlantısı; "bilmiyorum" önerilerle; 503'te "kapalı" ve
 * liste çalışmaya devam eder. Eser sayfasında "Bu esere sor" eserId gönderir.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';

const LISTE = [
  { id: 'bursa-ulucami', ad: 'Ulucami', il: 'bursa', ilce: 'Osmangazi', tur: 'Cami', kaynak: 'Vakıf Katılım, s. 36', foto: false },
  { id: 'bursa-koza-hani', ad: 'Koza Hanı', il: 'bursa', ilce: 'Osmangazi', tur: 'Han', kaynak: 'Vakıf Katılım, s. 90', foto: false },
];

let sorCevabi: { durum: number; govde: unknown } = { durum: 200, govde: {} };
const sorIstekleri: unknown[] = [];

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sorIstekleri.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL, ayar?: RequestInit) => {
      const url = String(u);
      if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      if (url.includes('/api/sor')) {
        sorIstekleri.push(JSON.parse(String(ayar?.body)));
        return new Response(JSON.stringify(sorCevabi.govde), { status: sorCevabi.durum });
      }
      const govde = url.includes('/arsiv/liste.json')
        ? LISTE
        : url.includes('/arsiv/metin/')
          ? { paragraflar: ['Ulucami çarşının yanındadır.'] }
          : url.includes('/api/yol')
            ? { sehirler: [] }
            : [];
      return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function arsiviAc() {
  window.location.hash = '#/arsiv';
  const { App } = await import('../src/app/App');
  const { container } = render(<App />);
  await screen.findByText('2 eser bulundu.');
  return container;
}

describe("Köstik'e sor", () => {
  it('soru yazınca düğme çıkar; cevap kartı kaynak numarası ve künye bağlantısıyla; ihlalsiz', async () => {
    sorCevabi = {
      durum: 200,
      govde: {
        cumleler: [{ metin: 'Çatısında yirmi kubbe var.', kaynaklar: [1] }],
        kaynaklar: [{ no: 1, eserId: 'bursa-ulucami', eserAd: 'Ulucami', kunye: 'Vakıf Katılım, s. 36' }],
      },
    };
    const container = await arsiviAc();
    const kutu = screen.getByRole('searchbox', { name: 'Sor ya da ara' });
    await userEvent.type(kutu, 'Ulu');
    expect(screen.queryByRole('button', { name: "Köstik'e sor" })).toBeNull();
    await userEvent.type(kutu, "cami'de kaç kubbe var?");
    // Soru yazılırken liste ad aramasıyla daralmaz.
    expect(screen.getByText('2 eser bulundu.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: "Köstik'e sor" }));

    const kart = await screen.findByRole('region', { name: "Köstik'in cevabı" });
    expect(await within(kart).findByText(/Çatısında yirmi kubbe var\./)).toBeInTheDocument();
    expect(within(kart).getByText('(kaynak 1)')).toBeInTheDocument();
    expect(within(kart).getByRole('link', { name: 'Ulucami' })).toHaveAttribute('href', '#/arsiv/bursa-ulucami');
    expect(sorIstekleri.at(-1)).toEqual({ soru: "Ulucami'de kaç kubbe var?" });

    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });

  it('bilmiyorum: tahmin etmez, eser önerir', async () => {
    sorCevabi = { durum: 200, govde: { bilmiyorum: true, oneriler: [{ eserId: 'bursa-koza-hani', eserAd: 'Koza Hanı' }] } };
    await arsiviAc();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Sor ya da ara' }), 'Koza Hanı kaç odalı?{Enter}');
    expect(await screen.findByText(/tahmin etmeyeceğim/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Koza Hanı' })).toHaveAttribute('href', '#/arsiv/bursa-koza-hani');
  });

  it('anahtar yoksa kapalı mesajı; liste çalışmaya devam eder', async () => {
    sorCevabi = { durum: 503, govde: { hata: 'kapali' } };
    await arsiviAc();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Sor ya da ara' }), 'Ulucami kim yaptırdı?{Enter}');
    expect(await screen.findByText(/şu an kapalı/)).toBeInTheDocument();
    expect(screen.getByText('2 eser bulundu.')).toBeInTheDocument();
  });

  it('eser sayfasında "Bu esere sor" eserId ile sorar', async () => {
    sorCevabi = { durum: 200, govde: { bilmiyorum: true, oneriler: [] } };
    window.location.hash = '#/arsiv/bursa-ulucami';
    const { App } = await import('../src/app/App');
    render(<App />);
    const alan = await screen.findByRole('textbox', { name: 'Ulucami hakkında sorun' });
    await userEvent.type(alan, 'Kim yaptırdı?');
    await userEvent.click(screen.getByRole('button', { name: 'Sor' }));
    await screen.findByText(/tahmin etmeyeceğim/);
    expect(sorIstekleri.at(-1)).toEqual({ soru: 'Kim yaptırdı?', eserId: 'bursa-ulucami' });
  });
});
