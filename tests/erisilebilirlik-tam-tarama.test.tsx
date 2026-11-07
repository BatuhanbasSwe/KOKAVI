/**
 * ERİŞİLEBİLİRLİK TAM TARAMASI — tüm çalışan ekranlar × 3 tema, axe-core.
 *
 * PDF: "WCAG 2.2 AA" taahhüdü. Bu dosya, tek tek "şu sayfa ihlalsiz" demek
 * yerine ROTA LİSTESİNİ dolaşır; yeni bir rota eklendiğinde taramaya girmesi
 * için listeye eklenir (bilinçli kapı).
 *
 * DÜRÜSTLÜK / SINIRLAR:
 *  - Ortam jsdom'dur: gerçek yerleşim, canvas ve renk hesaplaması yoktur.
 *    Bu yüzden axe'in `color-contrast` kuralı KAPATILIR. Renk kontrastı ayrı
 *    dosyada (`tests/tema-kontrast.test.ts`) jetonların gerçek hex değerleri
 *    üzerinden WCAG relative-luminance formülüyle ölçülür.
 *  - `harita`, `rota` (MapLibre canvas) ve eski `canli*` ekranları bu taramada
 *    YOKTUR; MapLibre DOM'u jsdom'da çizilemez. Bu ekranlar finalde gerçek
 *    tarayıcıda ayrıca provalanır (docs/ERISILEBILIRLIK.md).
 *  - Kesin sonuç iddiası değildir: otomatik araç + manuel klavye/ekran okuyucu
 *    provası birlikte gerekir.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { App } from '../src/app/App';

const DEPO_ANAHTARI = 'kokavi.ilerleme.v1';

const TEMALAR = ['koyu', 'acik', 'yuksek-kontrast'] as const;
type Tema = (typeof TEMALAR)[number];

/** Taranan rotalar — kullanıcıya açık, çalışan ekranlar. */
const ROTALAR: { hash: string; ad: string }[] = [
  { hash: '#/bugun', ad: 'Bugün' },
  { hash: '#/kesfet', ad: 'Keşfet' },
  { hash: '#/yasayan', ad: 'Hâlâ yaşayan vakıflar' },
  { hash: '#/profil', ad: 'Profil' },
  { hash: '#/yol', ad: 'Öğrenme yolu' },
  { hash: '#/defter', ad: 'Kâşif Defteri' },
  { hash: '#/arsiv', ad: 'Meraklısına arşivi' },
  { hash: '#/arsiv/bursa-ulucami', ad: 'Arşiv eser detayı' },
  { hash: '#/ayarlar', ad: 'Ayarlar' },
  { hash: '#/carsi', ad: 'Vakıf Çarşısı' },
  { hash: '#/sinif', ad: 'Sınıfım (evde katıl)' },
  { hash: '#/gunun-eseri', ad: 'Günün Eseri' },
  { hash: '#/hayrat-akar', ad: 'Hayrat mı Akar mı?' },
  { hash: '#/hatalar', ad: 'Hatalarımı Çalış' },
  { hash: '#/zaman-tuneli', ad: 'Zaman Tüneli' },
  { hash: '#/seri', ad: 'Keşif Serisi' },
  { hash: '#/sertifika/bursa', ad: 'Şehir sertifikası' },
  { hash: '#/ogretmen', ad: 'Öğretmen paneli (giriş ekranı)' },
  { hash: '#/panel', ad: 'Yönetim paneli (giriş ekranı)' },
  { hash: '#/ders/bursa-u1-d1', ad: 'Ders akışı' },
  { hash: '#/tahta/KTM-4829/bursa-u1-d1', ad: 'Tahta modu (öğretmen)' },
  { hash: '#/tahta/KTM-4829/rontgen', ad: 'Sınıf Vakıf Röntgeni' },
  { hash: '#/boyle-bir-sayfa-yok', ad: '404' },
];

/** jsdom'da ölçülemeyen kurallar — gerekçeleri dosya başında. */
const ATLANAN_KURALLAR = {
  'color-contrast': { enabled: false },
  'scrollable-region-focusable': { enabled: false },
  region: { enabled: false },
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
          ad: 'Ünite 1: İbadet ve İlim',
          sira: 1,
          dersler: [
            {
              dersId: 'bursa-u1-d1',
              eserId: 'bursa-ulucami',
              eserAdi: 'Ulucami',
              tur: 'Cami',
              sira: 1,
            },
          ],
        },
      ],
    },
  ],
};

const ESER_CEVABI = {
  id: 'bursa-ulucami',
  ad: 'Ulucami',
  adEn: null,
  sehirId: 'bursa',
  kulliyeId: null,
  tur: 'Cami',
  ilce: 'Osmangazi',
  koordinat: { lat: 40.18, lng: 29.06 },
  bani: 'Yıldırım Bayezid',
  baniDonem: 'Osmanlı',
  yapimYili: '1399',
  vakfiyeAmaci: null,
  hizmet: null,
  bugunNeOldu: null,
  tarihce: null,
  tarihceEn: null,
  gelirDagilimiDurumu: 'belge-bulunamadi',
  arsivNo: null,
  kaynaklar: [],
  dogrulamaNotu: null,
  yayinda: true,
  gelirKalemleri: [],
  fotograflar: [],
  sergiler: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const DERS_CEVABI = {
  id: 'bursa-u1-d1',
  uniteId: 'bursa-u1',
  eserId: 'bursa-ulucami',
  sira: 1,
  eser: { id: 'bursa-ulucami', ad: 'Ulucami', tur: 'Cami', sehirId: 'bursa' },
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
          { metin: 'Han', kategoriId: 'akar' },
        ],
      },
      kaynak: 'TDV',
    },
  ],
};

const RONTGEN_CEVABI = {
  kod: 'KTM-4829',
  ad: '5-B Şehrimiz Dersi',
  toplamTamamlama: 3,
  tamamlananDersCesidi: 1,
  kulliyeler: [
    {
      id: 'yesil-kulliyesi',
      ad: 'Yeşilcami (Yeşil) Külliyesi',
      sehirId: 'bursa',
      toplamDers: 4,
      tamamlananDersCesidi: 1,
      hedefMi: true,
      tamamlandiMi: false,
    },
  ],
  eserler: [
    {
      dersId: 'bursa-u1-d1',
      eserId: 'bursa-ulucami',
      eserAdi: 'Ulucami',
      tur: 'Cami',
      sehirAdi: 'Bursa',
      uniteAdi: 'Ünite 1: İbadet ve İlim',
      gelirDagilimiDurumu: 'belge-bulunamadi',
      gelirKalemleri: [],
      kaynakKunye: 'Vakıf Katılım, Bursa Vakıf Eserleri',
    },
  ],
};

function yanit(govde: unknown, durum = 200): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sahteFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (girdi: RequestInfo | URL) => {
      const url = String(girdi);
      if (url.includes('/api/auth/ben')) return yanit({ hata: 'oturum yok' }, 401);
      if (url.includes('/api/ogretmen/')) return yanit({ hata: 'oturum yok' }, 401);
      if (url.includes('/api/sinif/') && url.includes('/rontgen')) return yanit(RONTGEN_CEVABI);
      if (url.includes('/api/sinif/tamamla')) return yanit({ tamam: true });
      if (url.includes('/api/sinif/')) {
        return yanit({ kod: 'KTM-4829', ad: '5-B', toplamTamamlama: 3, tamamlananDersCesidi: 1 });
      }
      if (url.includes('/api/dersler/')) return yanit(DERS_CEVABI);
      if (url.includes('/api/eserler/')) return yanit(ESER_CEVABI);
      if (url.includes('/arsiv/liste.json')) {
        return yanit([
          {
            id: 'bursa-ulucami',
            ad: 'Ulucami',
            il: 'bursa',
            ilce: 'Osmangazi',
            tur: 'Cami',
            kaynak: "Vakıf Katılım, 'Bursa Vakıf Eserleri', I. Cilt (2026), s. 36-83",
            foto: false,
          },
        ]);
      }
      if (url.includes('/arsiv/metin/')) {
        return yanit({
          paragraflar: ['Ulucami, Bursa’nın en büyük cuma camisidir. Yıldırım Bayezid yaptırmıştır.'],
        });
      }
      if (url.includes('/api/yol')) return yanit(YOL_CEVABI);
      if (url.includes('/api/')) return yanit([]);
      return yanit({});
    }),
  );
}

function temaYaz(tema: Tema): void {
  localStorage.setItem(
    DEPO_ANAHTARI,
    JSON.stringify({
      tamamlananDersler: [],
      defterSayfalari: [],
      elmas: 0,
      seri: { gunSayisi: 0, sonTarih: null },
      ayarlar: {
        tema,
        renkKorlugu: 'yok',
        yaziBoyutu: 1,
        hareketAzalt: false,
        sessizMod: false,
      },
      sinifKodu: null,
    }),
  );
}

async function taramaninIhlalleri(hash: string): Promise<string> {
  window.location.hash = hash;
  const { container } = render(<App />);
  await waitFor(() => {
    expect(container.querySelector('h1, h2, form')).toBeTruthy();
  });
  await new Promise((r) => setTimeout(r, 60));
  const sonuc = await axe.run(container, {
    rules: ATLANAN_KURALLAR,
    resultTypes: ['violations'],
  });
  return sonuc.violations
    .map((i) => `[${i.impact ?? '?'}] ${i.id}: ${i.help} (${i.nodes.length} düğüm)`)
    .join('\n');
}

describe('erişilebilirlik tam taraması — tüm rotalar × 3 tema', () => {
  for (const tema of TEMALAR) {
    describe(`tema: ${tema}`, () => {
      beforeEach(() => {
        cleanup();
        localStorage.clear();
        temaYaz(tema);
        window.location.hash = '';
        sahteFetch();
      });

      afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        document.documentElement.removeAttribute('data-tema');
      });

      for (const rota of ROTALAR) {
        it(`${rota.ad} ihlalsiz`, async () => {
          const ihlaller = await taramaninIhlalleri(rota.hash);
          expect(ihlaller, `${rota.ad} (${rota.hash}) axe ihlalleri:\n${ihlaller}`).toBe('');
        });
      }
    });
  }
});
