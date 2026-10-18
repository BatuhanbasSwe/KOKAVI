/**
 * Köstik sohbeti (yüzen pencere): her ekrandan açılır; cevap balonunda kaynak
 * numarası ve künyeler; takip sorusu aynı eser üzerinden sürer; bilmiyorum ve
 * kapalı mesajları; Arşiv ve eser sayfasından açılır; derste gizli; Esc kapatır
 * ve odak düğmeye döner; axe ihlali yok.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';

const LISTE = [
  { id: 'bursa-ulucami', ad: 'Ulucami', il: 'bursa', ilce: 'Osmangazi', tur: 'Cami', kaynak: 'Vakıf Katılım, s. 36', foto: false },
  { id: 'bursa-koza-hani', ad: 'Koza Hanı', il: 'bursa', ilce: 'Osmangazi', tur: 'Han', kaynak: 'Vakıf Katılım, s. 90', foto: false },
];
const CEVAP = {
  cumleler: [{ metin: 'Çatısında yirmi kubbe var.', kaynaklar: [1] }],
  kaynaklar: [{ no: 1, eserId: 'bursa-ulucami', eserAd: 'Ulucami', kunye: 'Vakıf Katılım, s. 36' }],
};

let sorCevabi: { durum: number; govde: unknown } = { durum: 200, govde: CEVAP };
const sorIstekleri: unknown[] = [];

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sorIstekleri.length = 0;
  sorCevabi = { durum: 200, govde: CEVAP };
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

async function ac(hash: string) {
  window.location.hash = hash;
  const { App } = await import('../src/app/App');
  return render(<App />);
}

describe('Köstik sohbeti', () => {
  it('her ekrandan açılır; cevap kaynak numarası ve künyelerle; takip sorusu aynı esere odaklanır; ihlalsiz', async () => {
    const { container } = await ac('#/bugun');
    await userEvent.click(await screen.findByRole('button', { name: "Köstik'e sor" }));
    const pencere = screen.getByRole('dialog', { name: "Köstik'e sor" });
    const alan = within(pencere).getByRole('textbox', { name: 'Sorunu yaz' });
    expect(alan).toHaveFocus();

    await userEvent.click(within(pencere).getByRole('button', { name: "Ulucami'de kaç kubbe var?" }));
    expect(await within(pencere).findByText(/Çatısında yirmi kubbe var\./)).toBeInTheDocument();
    expect(within(pencere).getByText('(kaynak 1)')).toBeInTheDocument();
    expect(within(pencere).getByRole('link', { name: 'Ulucami' })).toHaveAttribute('href', '#/arsiv/bursa-ulucami');
    expect(sorIstekleri.at(-1)).toEqual({ soru: "Ulucami'de kaç kubbe var?" });

    // Takip sorusu: önceki cevabın eseri üzerinden
    expect(within(pencere).getByText(/Konu: Ulucami/)).toBeInTheDocument();
    await userEvent.type(alan, 'Peki kim yaptırdı?{Enter}');
    await vi.waitFor(() => expect(sorIstekleri.at(-1)).toEqual({ soru: 'Peki kim yaptırdı?', eserId: 'bursa-ulucami' }));

    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);

    // Esc kapatır, odak düğmeye döner
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: "Köstik'e sor" })).toHaveFocus();
  });

  it('bilmiyorum: tahmin etmez, eser önerir; kapalıyken açıklar', async () => {
    sorCevabi = { durum: 200, govde: { bilmiyorum: true, oneriler: [{ eserId: 'bursa-koza-hani', eserAd: 'Koza Hanı' }] } };
    await ac('#/bugun');
    await userEvent.click(await screen.findByRole('button', { name: "Köstik'e sor" }));
    const pencere = screen.getByRole('dialog');
    await userEvent.type(within(pencere).getByRole('textbox'), 'Koza Hanı kaç odalı?{Enter}');
    expect(await within(pencere).findByText(/tahmin etmeyeceğim/)).toBeInTheDocument();
    expect(within(pencere).getByRole('link', { name: 'Koza Hanı' })).toBeInTheDocument();

    sorCevabi = { durum: 503, govde: { hata: 'kapali' } };
    await userEvent.type(within(pencere).getByRole('textbox'), 'Ulucami ne zaman yapıldı?{Enter}');
    expect(await within(pencere).findByText(/soru-cevap kapalı/)).toBeInTheDocument();
  });

  it('konu dışı soruda konusunu söyler ve örnek verir; ısrarda dinlenmeyi önerir', async () => {
    sorCevabi = { durum: 200, govde: { bilmiyorum: true, konuDisi: true, oneriler: [] } };
    await ac('#/bugun');
    await userEvent.click(await screen.findByRole('button', { name: "Köstik'e sor" }));
    const pencere = screen.getByRole('dialog');
    await userEvent.type(within(pencere).getByRole('textbox'), 'Bana bir şiir yaz{Enter}');
    expect(await within(pencere).findByText(/yalnızca vakıf eserleri ve onların tarihi/)).toBeInTheDocument();

    sorCevabi = { durum: 429, govde: { hata: 'cok-deneme' } };
    await userEvent.type(within(pencere).getByRole('textbox'), 'Ulucami ne zaman yapıldı?{Enter}');
    expect(await within(pencere).findByText(/Biraz dinlenelim/)).toBeInTheDocument();
  });

  it('Arşiv: soru yazınca "Köstik\'e sor" sohbeti açar ve soruyu gönderir; liste daralmaz', async () => {
    await ac('#/arsiv');
    await screen.findByText('2 eser bulundu.');
    const kutu = screen.getByRole('searchbox', { name: 'Sor ya da ara' });
    await userEvent.type(kutu, "Ulucami'de kaç kubbe var?");
    expect(screen.getByText('2 eser bulundu.')).toBeInTheDocument();
    const dugmeler = screen.getAllByRole('button', { name: "Köstik'e sor" });
    await userEvent.click(dugmeler.find((d) => d.classList.contains('arsiv-sor'))!);
    expect(await within(screen.getByRole('dialog')).findByText(/Çatısında yirmi kubbe/)).toBeInTheDocument();
    expect(sorIstekleri.at(-1)).toEqual({ soru: "Ulucami'de kaç kubbe var?" });
  });

  it('eser sayfası: "Köstik\'e bu eseri sor" o esere odaklanır', async () => {
    await ac('#/arsiv/bursa-ulucami');
    await userEvent.click(await screen.findByRole('button', { name: "Köstik'e bu eseri sor" }));
    const pencere = screen.getByRole('dialog');
    expect(within(pencere).getByText(/Konu: Ulucami/)).toBeInTheDocument();
    await userEvent.type(within(pencere).getByRole('textbox'), 'Kim yaptırdı?{Enter}');
    await vi.waitFor(() => expect(sorIstekleri.at(-1)).toEqual({ soru: 'Kim yaptırdı?', eserId: 'bursa-ulucami' }));
  });

  it('ders sırasında düğme yok', async () => {
    await ac('#/ders/bursa-u1-d1');
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: "Köstik'e sor" })).toBeNull();
  });
});
