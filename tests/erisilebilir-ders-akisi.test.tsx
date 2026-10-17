/**
 * Erişilebilirlik doğrulaması (takım planı Aşama 1, madde 3): yüksek kontrast,
 * en büyük yazı (%160), hareketi azalt ve sessiz mod AÇIKKEN bir ders gerçek
 * arayüzden baştan sona bitirilebilir.
 *
 * PDF: "Yüksek kontrast teması, ölçeklenebilir yazı boyutu", "Altyazı ve sessiz
 * mod: ses olmadan da akışın tamamı bitirilebilir", "WCAG 2.2 AA".
 * Ölçülen: ayarlar belgeye uygulanır; hiçbir adımda konuşma, ses efekti ya da
 * titreşim olmaz; her adım axe'den ihlalsiz geçer; ders "Ders tamam!" ile biter.
 * (Renk kontrastı gerçek tarayıcıda ayrıca taranır: docs/GECE-RAPORU.md.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';

const DERS = {
  id: 'bursa-u1-d1',
  uniteId: 'bursa-u1',
  eserId: 'bursa-ulucami',
  sira: 1,
  // API'nin gönderdiği eser kaydı (shared/types Eser) — boş alanlar null/[].
  eser: {
    id: 'bursa-ulucami', ad: 'Ulucami', adEn: null, sehirId: 'bursa', kulliyeId: null, tur: 'Cami',
    ilce: 'Osmangazi', koordinat: null, bani: null, baniDonem: null, yapimYili: '1399', vakfiyeAmaci: null,
    hizmet: null, bugunNeOldu: null, tarihce: null, tarihceEn: null, gelirDagilimiDurumu: 'belge-bulunamadi',
    arsivNo: null, kaynaklar: [], dogrulamaNotu: null, yayinda: true, gelirKalemleri: [], fotograflar: [], sergiler: [],
  },
  merak: {
    soru: 'Bir caminin çatısında kaç kubbe olabilir?',
    secenekler: ['Bir', 'Beş', 'Yirmi'],
    kopru: 'Tahminin kaydedildi; hiçbir tahmin yanlış değil.',
  },
  baglam: {
    baslik: 'Vakıf nedir?',
    metin: 'Bir kişi malının gelirini kalıcı bir hayır işine bağlar.',
    kavramlar: [
      { ad: 'HAYRAT', aciklama: 'Hizmet verir', ornek: 'Cami' },
      { ad: 'AKAR', aciklama: 'Gelir getirir', ornek: 'Han' },
    ],
    kapanis: 'Bu camiyi ayakta tutan neydi?',
  },
  perspektif: {
    baslik: 'Vakıf görevlisi',
    diyalog: [
      { kim: 'ANLATICI', metin: 'Yıl 1500. Çatı akıyor.' },
      { kim: 'SEN', metin: 'Onarım için para bulmalıyım.', ben: true },
    ],
    soru: 'Parayı nereden bulursun?',
    secenekler: [
      { metin: 'Vakfın kiralarından', sonuc: 'Doğru.', dogruMu: true },
      { metin: 'Cemaatten', sonuc: 'Gerçekte akardan gelirdi.', dogruMu: false },
    ],
  },
  yansima: {
    ozet: 'Vakıf kendi kendini finanse eder.',
    rontgenSorusu: 'Bu caminin geliri nereye gidiyordu?',
    rontgenAciklama: 'Oranlar belgelenememiştir; uygulama oran göstermez.',
    kaynakKunye: 'TDV İslam Ansiklopedisi',
  },
  egzersizler: [
    {
      id: 'x1',
      tip: 'eser-tani',
      sira: 0,
      veri: {
        yonerge: 'Betimlemeyi oku ve anlatılan eseri seç.',
        betimleme: 'Çatısında yirmi kubbe olan büyük bir cami.',
        secenekler: ['Ulucami', 'Koza Hanı', 'Yeşil Türbe'],
        dogruIndex: 0,
      },
      kaynak: 'Vakıf Katılım envanteri',
    },
  ],
};

const YOL = {
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
          dersler: [{ dersId: 'bursa-u1-d1', eserId: 'bursa-ulucami', eserAdi: 'Ulucami', tur: 'Cami', sira: 1 }],
        },
      ],
    },
  ],
};

const konusulan: string[] = [];
let sesBaglami = 0;
let titresim = 0;

beforeEach(() => {
  cleanup();
  localStorage.clear();
  konusulan.length = 0;
  sesBaglami = 0;
  titresim = 0;
  localStorage.setItem(
    'kokavi.ilerleme.v1',
    JSON.stringify({
      ayarlar: { tema: 'yuksek-kontrast', renkKorlugu: 'yok', yaziBoyutu: 1.6, hareketAzalt: true, sessizMod: true },
    }),
  );
  localStorage.setItem('kokavi.tema-gocu.v1', '1');
  // Ses olsaydı kullanılacak her kanal sayılır; sessiz modda hiçbiri çalışmamalı.
  class Soz {
    constructor(public text: string) {}
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Soz, configurable: true });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { getVoices: () => [{ lang: 'tr-TR', name: 'Türkçe' }], speak: (s: Soz) => konusulan.push(s.text), cancel: () => {} },
  });
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        sesBaglami++;
      }
    },
  );
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => (titresim++, true) });
  window.location.hash = '#/ders/bursa-u1-d1';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL) => {
      const url = String(u);
      if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      const govde = url.includes('/api/yol')
        ? YOL
        : url.includes('/api/dersler/')
          ? DERS
          : url.includes('/api/eserler/')
            ? DERS.eser
            : [];
      return new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function ihlaller(kap: HTMLElement) {
  const s = await axe.run(kap, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    resultTypes: ['violations'],
  });
  return s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`);
}

describe('erişilebilir ders akışı', () => {
  it('yüksek kontrast + %160 yazı + hareketi azalt + sessiz mod: ders baştan sona biter, ses yok, ihlalsiz', async () => {
    const { App } = await import('../src/app/App');
    const { container } = render(<App />);
    await screen.findByText(DERS.merak.soru);

    const kok = document.documentElement;
    expect(kok.dataset.tema).toBe('yuksek-kontrast');
    expect(kok.style.getPropertyValue('--yazi-olcek')).toBe('1.6');
    expect(kok.dataset.hareketAzalt).toBe('true');

    const ilerle = /^(devam|dersi bitir|bitir|ileri|anladım|sonuca geç)/i;
    let adim = 0;
    const gorulenIhlaller: string[] = [];
    while (!screen.queryByRole('heading', { name: 'Ders tamam!' })) {
      if (++adim > 40) throw new Error('Ders bitirilemedi: akış bir adımda takıldı');
      const ana = screen.getByRole('main');
      if (adim % 3 === 1) gorulenIhlaller.push(...(await ihlaller(container)));
      const ileri = within(ana)
        .queryAllByRole('button')
        .find((b) => ilerle.test(b.textContent?.trim() ?? '') && !(b as HTMLButtonElement).disabled);
      if (ileri) {
        await userEvent.click(ileri);
        continue;
      }
      // Seçim gereken adım: eser tanıda doğru eser, diğerlerinde ilk seçenek.
      const secenekler = [...ana.querySelectorAll<HTMLButtonElement>('.secenek:not(:disabled)')];
      const hedef =
        secenekler.find((b) => b.textContent?.includes('Ulucami')) ??
        secenekler.find((b) => b.getAttribute('aria-pressed') !== 'true');
      if (!hedef) throw new Error(`Adım ${adim}: tıklanacak düğme yok\n${ana.textContent?.slice(0, 300)}`);
      await userEvent.click(hedef);
    }

    expect(gorulenIhlaller).toEqual([]);
    expect(await ihlaller(container)).toEqual([]);
    expect(konusulan).toEqual([]);
    expect(sesBaglami).toBe(0);
    expect(titresim).toBe(0);
    expect(JSON.parse(localStorage.getItem('kokavi.ilerleme.v1')!).tamamlananDersler).toContain('bursa-u1-d1');
  });
});
