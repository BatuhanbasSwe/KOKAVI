/**
 * Canlı yarışma arayüzü: rotalar, erişilebilirlik (axe) ve oyuncu akışı.
 *
 * Sunucu `fetch` taklidiyle verilir; oyun motorunun kendisi tests/canli.test.ts'te.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { rotayiCoz } from '../src/lib/yonlendirme';
import type { CanliOyuncuDurumu, CanliSunucuDurumu } from '../shared/canli';

const PIN = '482915';

const SORU = {
  no: 1,
  toplam: 8,
  tip: 'bosluk' as const,
  soru: 'Evliya Çelebi, Ulucami\'ye "Bursa\'nın _____" dedi.',
  foto: null,
  secenekler: ['Sarayı', 'Ayasofyası', 'Çarşısı', 'Kalesi'],
  sureSn: 20,
  kalanMs: 15_000,
};

let oyuncuDurumu: CanliOyuncuDurumu;
let yonetimDurumu: CanliSunucuDurumu;
const cevapIstekleri: unknown[] = [];

beforeEach(() => {
  cleanup();
  cevapIstekleri.length = 0;
  window.location.hash = '';
  sessionStorage.clear();

  oyuncuDurumu = {
    pin: PIN,
    asama: 'soru',
    takmaAd: 'Turkuaz Kubbe',
    puan: 950,
    sira: 2,
    oyuncuSayisi: 12,
    soru: SORU,
    cevabim: null,
    sonuc: null,
    podyum: [],
  };
  yonetimDurumu = {
    pin: PIN,
    asama: 'lobi',
    oyuncular: ['Turkuaz Kubbe', 'Altın Minare'],
    soru: null,
    cevaplayan: 0,
    sonuc: null,
    siralama: [],
  };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (girdi: RequestInfo | URL, secenek?: RequestInit) => {
      const url = String(girdi);
      let govde: unknown = [];
      if (url.includes('/oyuncu')) govde = oyuncuDurumu;
      else if (url.includes('/yonetim')) govde = yonetimDurumu;
      else if (url.includes('/cevap')) {
        cevapIstekleri.push(JSON.parse(String(secenek?.body)));
        govde = { alindi: true };
      } else if (url.includes('/api/yol')) govde = { sehirler: [] };
      else if (url.includes('/api/auth/ben')) {
        return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(govde), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

async function ac(hash: string) {
  window.location.hash = hash;
  const { App } = await import('../src/app/App');
  return render(<App />);
}

async function ihlaller(kap: HTMLElement) {
  const sonuc = await axe.run(kap, {
    rules: {
      'color-contrast': { enabled: false },
      'scrollable-region-focusable': { enabled: false },
      region: { enabled: false },
    },
    resultTypes: ['violations'],
  });
  return sonuc.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`);
}

describe('canlı yarışma rotaları', () => {
  it('katılma, kurma, yönetme ve oynama rotaları çözülür; bozuk PIN girişe düşer', () => {
    expect(rotayiCoz('#/canli')).toEqual({ ad: 'canli' });
    expect(rotayiCoz('#/canli?pin=482915')).toEqual({ ad: 'canli' });
    expect(rotayiCoz('#/canli/kur')).toEqual({ ad: 'canli-kur' });
    expect(rotayiCoz('#/canli/yonet/482915')).toEqual({ ad: 'canli-yonet', pin: '482915' });
    expect(rotayiCoz('#/canli/oyna/482915')).toEqual({ ad: 'canli-oyna', pin: '482915' });
    expect(rotayiCoz('#/canli/oyna/<script>')).toEqual({ ad: 'canli' });
  });
});

describe('canlı yarışma ekranları', () => {
  it('katılma ekranı ihlalsiz; bağlantıdaki PIN önceden dolar', async () => {
    const { container } = await ac(`#/canli?pin=${PIN}`);
    const girdi = await screen.findByLabelText("Oyun PIN'i");
    expect(girdi).toHaveValue(PIN);
    expect(await ihlaller(container)).toEqual([]);
  });

  it('kurma ekranı ihlalsiz', async () => {
    const { container } = await ac('#/canli/kur');
    await screen.findByRole('heading', { name: 'Canlı sınıf yarışması' });
    expect(await ihlaller(container)).toEqual([]);
  });

  it('tahta ekranı: PIN ve katılanlar görünür, ihlalsiz', async () => {
    sessionStorage.setItem(`kokavi-canli-yonet-${PIN}`, JSON.stringify('gizli-anahtar'));
    const { container } = await ac(`#/canli/yonet/${PIN}`);
    await screen.findByText('2 oyuncu katıldı');
    expect(screen.getByText('Altın Minare')).toBeInTheDocument();
    expect(await ihlaller(container)).toEqual([]);
  });

  it('oyuncu soruyu görür; seçenek şekil adıyla okunur; cevap gönderilir', async () => {
    sessionStorage.setItem(
      `kokavi-canli-oyna-${PIN}`,
      JSON.stringify({ oyuncuAnahtari: 'oyuncu-anahtari', takmaAd: 'Turkuaz Kubbe' }),
    );
    const { container } = await ac(`#/canli/oyna/${PIN}`);
    const dugme = await screen.findByRole('button', { name: 'Elmas: Ayasofyası' });
    expect(await ihlaller(container)).toEqual([]);

    await userEvent.click(dugme);
    await waitFor(() => expect(cevapIstekleri).toEqual([{ soruNo: 1, secim: 1 }]));
    expect(await screen.findByText('Cevabın alındı!')).toBeInTheDocument();
  });

  it('tek tük "oda yok" yanıtı ekranı bozmaz; istek kısa sürede yeniden denenir', async () => {
    // Yayında istek başka bir sunucu örneğine düşünce bir an 404 gelebilir.
    // İstemci bunu yeniden dener; öğrenci "Oyun bulunamadı" ekranı görmez.
    let kalan404 = 2;
    const oncekiFetch = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (girdi: RequestInfo | URL, secenek?: RequestInit) => {
        if (String(girdi).includes('/oyuncu') && kalan404 > 0) {
          kalan404 -= 1;
          return new Response(
            JSON.stringify({ hata: 'Bu PIN ile bir oyun bulunamadı.', kod: 'ODA_YOK' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return oncekiFetch(girdi, secenek);
      }),
    );
    sessionStorage.setItem(
      `kokavi-canli-oyna-${PIN}`,
      JSON.stringify({ oyuncuAnahtari: 'oyuncu-anahtari', takmaAd: 'Turkuaz Kubbe' }),
    );
    const { container } = await ac(`#/canli/oyna/${PIN}`);
    await screen.findByRole('heading', { name: /Bursa'nın/ }, { timeout: 5000 });
    expect(screen.queryByText('Oyun bulunamadı')).not.toBeInTheDocument();
    expect(await ihlaller(container)).toEqual([]);
  });

  it('yanlış cevapta puan düşmez; doğru cevap ve kaynak gösterilir', async () => {
    oyuncuDurumu = {
      ...oyuncuDurumu,
      asama: 'cevap',
      cevabim: 0,
      soru: { ...SORU, kalanMs: 0 },
      sonuc: {
        dogruIndex: 1,
        aciklama: 'Evliya Çelebi, Ulucami\'ye "Bursa\'nın Ayasofyası" dedi.',
        kaynak: "Vakıf Katılım, 'Bursa Vakıf Eserleri', I. Cilt",
        dogruMu: false,
        kazanilan: 0,
      },
    };
    sessionStorage.setItem(
      `kokavi-canli-oyna-${PIN}`,
      JSON.stringify({ oyuncuAnahtari: 'oyuncu-anahtari', takmaAd: 'Turkuaz Kubbe' }),
    );
    const { container } = await ac(`#/canli/oyna/${PIN}`);
    await screen.findByText('Bu sefer olmadı');
    expect(screen.getByText('Puanın düşmedi; bir sonraki soruda yeniden dene.')).toBeInTheDocument();
    expect(screen.getByText(/Kaynak: Vakıf Katılım/)).toBeInTheDocument();
    expect(await ihlaller(container)).toEqual([]);
  });

  it('öğretmene anonim sınıf raporu: en zor soru vurgulanır; ihlalsiz', async () => {
    yonetimDurumu = {
      ...yonetimDurumu,
      asama: 'bitti',
      oyuncular: ['Turkuaz Kubbe', 'Altın Minare'],
      siralama: [
        { sira: 1, takmaAd: 'Turkuaz Kubbe', puan: 1800 },
        { sira: 2, takmaAd: 'Altın Minare', puan: 900 },
      ],
      rapor: [
        { no: 0, soru: 'Bu fotoğraftaki eser hangisi?', dogruCevap: 'Koza Hanı', eserId: 'bursa-koza-hani', dogruSayisi: 2, cevaplayan: 2 },
        { no: 1, soru: 'Evliya Çelebi boşluğu', dogruCevap: 'Ayasofyası', eserId: 'bursa-ulucami', dogruSayisi: 0, cevaplayan: 2 },
      ],
    };
    sessionStorage.setItem(`kokavi-canli-yonet-${PIN}`, JSON.stringify('gizli-anahtar'));
    const { container } = await ac(`#/canli/yonet/${PIN}`);
    await screen.findByRole('heading', { name: 'Sınıf raporu' });
    expect(screen.getByText(/en çok/)).toHaveTextContent('Sınıf en çok 2. soruda zorlandı (%0 doğru)');
    expect(screen.getByText('%100 doğru (2/2)')).toBeInTheDocument();
    expect(await ihlaller(container)).toEqual([]);
  });

  it('oyun bitince podyum ihlalsiz', async () => {
    oyuncuDurumu = {
      ...oyuncuDurumu,
      asama: 'bitti',
      soru: null,
      sira: 1,
      puan: 4200,
      podyum: [
        { sira: 1, takmaAd: 'Turkuaz Kubbe', puan: 4200 },
        { sira: 2, takmaAd: 'Altın Minare', puan: 3900 },
        { sira: 3, takmaAd: 'Mavi Çini', puan: 2100 },
      ],
    };
    sessionStorage.setItem(
      `kokavi-canli-oyna-${PIN}`,
      JSON.stringify({ oyuncuAnahtari: 'oyuncu-anahtari', takmaAd: 'Turkuaz Kubbe' }),
    );
    const { container } = await ac(`#/canli/oyna/${PIN}`);
    await screen.findByText('Harikasın, podyumdasın!');
    expect(screen.getByText('Turkuaz Kubbe (sen)')).toBeInTheDocument();
    expect(await ihlaller(container)).toEqual([]);
  });
});
