/**
 * ERİŞİLEBİLİRLİK DENETİMİ — axe-core ile otomatik tarama.
 *
 * Bu bir "tasarımda var" iddiası değil, ÇALIŞAN DOM üzerinde ölçümdür.
 * Şartname 5.1.4: "Erişilebilirlik özelliklerinin yalnızca tasarım üzerinde
 * gösterilmesi yerine mümkün olduğu ölçüde ÇALIŞAN ÜRÜNE entegre edilmesi
 * beklenmektedir."
 *
 * KAPSAM NOTU (dürüstlük): jsdom'da gerçek yerleşim/renk hesaplaması yoktur,
 * bu yüzden `color-contrast` kuralı ATLANIR — renk kontrastı ayrıca
 * `tests/erisilebilirlik.test.ts` içinde jetonlar üzerinden doğrulanır.
 * Burada yakalananlar: eksik etiket, bozuk ARIA, başlık sırası, dil, landmark,
 * tekrarlanan id, odak sırası gibi yapısal ihlallerdir.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import axe from 'axe-core';

/** jsdom'da hesaplanamayan kurallar hariç tutulur. */
const ATLANAN_KURALLAR = {
  'color-contrast': { enabled: false },
  // jsdom scroll/overflow ölçemez
  'scrollable-region-focusable': { enabled: false },
  region: { enabled: false }, // SPA kabuğunda <main> dışı içerik kasıtlı (üstbilgi/altbilgi)
};

async function tara(kapsayici: HTMLElement) {
  const sonuc = await axe.run(kapsayici, {
    rules: ATLANAN_KURALLAR,
    resultTypes: ['violations'],
  });
  return sonuc.violations;
}

function ihlalleriYaz(ihlaller: axe.Result[]): string {
  return ihlaller
    .map((i) => {
      const dugumler = i.nodes
        .slice(0, 3)
        .map((n) => `      ${n.html.slice(0, 120)}`)
        .join('\n');
      return `  [${i.impact ?? '?'}] ${i.id}: ${i.help}\n${dugumler}`;
    })
    .join('\n');
}

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
          dersler: [
            { dersId: 'bursa-u1-d1', eserId: 'e1', eserAdi: 'Yeşilcami', tur: 'Cami', sira: 1 },
            { dersId: 'bursa-u1-d2', eserId: 'e2', eserAdi: 'İpek Hanı', tur: 'Han', sira: 2 },
          ],
        },
      ],
    },
  ],
};

const DERS_CEVABI = {
  id: 'bursa-u1-d1',
  uniteId: 'bursa-u1',
  eserId: 'e1',
  sira: 1,
  eser: { id: 'e1', ad: 'Yeşilcami', tur: 'Cami', sehirId: 'bursa', gelirDagilimiDurumu: 'belgeli' },
  merak: {
    soru: 'Bir camide her gün yemek pişip dağıtıldığını düşün. Bu yemeğin parası nereden geliyordu?',
    secenekler: ['Padişah gönderiyordu', 'Vakfın kiralarından', 'Köylerden buğday geliyordu'],
    kopru: 'Tahminin kaydedildi — hiçbir tahmin yanlış değil.',
  },
  baglam: {
    baslik: 'Vakıf nedir?',
    metin: 'Bir kişi malını satılamaz şekilde dondurup gelirini kalıcı bir hayır işine bağlar.',
    kavramlar: [
      { ad: 'HAYRAT', aciklama: 'Hizmet verir', ornek: 'Cami' },
      { ad: 'AKAR', aciklama: 'Gelir getirir', ornek: 'Han' },
    ],
    kapanis: 'Bu camiyi ayakta tutan şey neydi?',
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
      id: 'e1',
      tip: 'eslestir',
      sira: 0,
      veri: {
        yonerge: 'Hayrat mı, akar mı?',
        kategoriler: [
          { id: 'hayrat', ad: 'Hayrat' },
          { id: 'akar', ad: 'Akar' },
        ],
        ogeler: [
          { metin: 'Cami', kategoriId: 'hayrat' },
          { metin: 'Medrese', kategoriId: 'hayrat' },
          { metin: 'Han', kategoriId: 'akar' },
          { metin: 'Dükkân', kategoriId: 'akar' },
        ],
      },
      kaynak: 'TDV',
    },
  ],
};

beforeEach(() => {
  cleanup();
  window.location.hash = '';

  vi.stubGlobal(
    'fetch',
    vi.fn(async (girdi: RequestInfo | URL) => {
      const url = String(girdi);
      let govde: unknown = [];
      if (url.includes('/api/yol')) govde = YOL_CEVABI;
      else if (url.includes('/api/dersler/')) govde = DERS_CEVABI;
      else if (url.includes('/api/auth/ben')) {
        return new Response(JSON.stringify({ hata: 'yok' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(govde), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

async function sayfayiTara(hash: string) {
  window.location.hash = hash;
  const { App } = await import('../src/app/App');
  const { container } = render(<App />);
  await waitFor(() => {
    expect(container.querySelector('h1, h2')).toBeTruthy();
  });
  // Ağ cevaplarının işlenmesini bekle
  await new Promise((r) => setTimeout(r, 50));
  return tara(container);
}

describe('axe-core erişilebilirlik denetimi', () => {
  it('öğrenme yolu sayfası ihlalsiz', async () => {
    const ihlaller = await sayfayiTara('#/yol');
    expect(ihlaller, `İhlaller:\n${ihlalleriYaz(ihlaller)}`).toHaveLength(0);
  });

  it('ayarlar sayfası ihlalsiz', async () => {
    const ihlaller = await sayfayiTara('#/ayarlar');
    expect(ihlaller, `İhlaller:\n${ihlalleriYaz(ihlaller)}`).toHaveLength(0);
  });

  it('Kâşif Defteri sayfası ihlalsiz', async () => {
    const ihlaller = await sayfayiTara('#/defter');
    expect(ihlaller, `İhlaller:\n${ihlalleriYaz(ihlaller)}`).toHaveLength(0);
  });

  it('Vakıf Çarşısı sayfası ihlalsiz', async () => {
    const ihlaller = await sayfayiTara('#/carsi');
    expect(ihlaller, `İhlaller:\n${ihlalleriYaz(ihlaller)}`).toHaveLength(0);
  });

  it('ders sayfası ihlalsiz', async () => {
    const ihlaller = await sayfayiTara('#/ders/bursa-u1-d1');
    expect(ihlaller, `İhlaller:\n${ihlalleriYaz(ihlaller)}`).toHaveLength(0);
  });

  it('giriş ekranı ihlalsiz', async () => {
    const ihlaller = await sayfayiTara('#/panel');
    expect(ihlaller, `İhlaller:\n${ihlalleriYaz(ihlaller)}`).toHaveLength(0);
  });

  it('ders sonu (kutlama) ekranı ihlalsiz', async () => {
    const { DersSonu } = await import('../src/features/ders/DersSonu');
    const { container } = render(
      <DersSonu
        eserAdi="Yeşilcami (Yeşil Cami)"
        eserTur="Cami"
        eserSehir="Yıldırım"
        kazanilanElmas={10}
        seriGun={3}
        tekrarSonucMetni="Yeşilcami tekrarını ipucusuz bildin."
        onDevam={() => {}}
      />,
    );
    const ihlaller = await tara(container);
    expect(ihlaller, `İhlaller:\n${ihlalleriYaz(ihlaller)}`).toHaveLength(0);
  });

  it('404 sayfası ihlalsiz', async () => {
    const ihlaller = await sayfayiTara('#/boyle-bir-sayfa-yok');
    expect(ihlaller, `İhlaller:\n${ihlalleriYaz(ihlaller)}`).toHaveLength(0);
  });
});
