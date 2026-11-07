/**
 * Çevrimdışı paket: internet varken ders verisi + kapak fotoğrafları önbelleğe
 * alınır; internet yokken hiç istek atılmaz ve paket 12 saatte bir yenilenir.
 *
 * Not: gerçek önbellek yazımı service worker'ın işi (vite.config.ts workbox);
 * burada yalnız ısıtma isteklerinin doğru URL'lere gittiği sınanır.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const YOL = {
  sehirler: [
    {
      sehirId: 'bursa',
      ad: 'Bursa',
      sira: 1,
      uniteler: [
        {
          uniteId: 'bursa-u1',
          ad: 'Ünite 1',
          sira: 1,
          dersler: [
            { dersId: 'bursa-u1-d1', eserId: 'bursa-ulucami', eserAdi: 'Ulucami', tur: 'Cami', sira: 1 },
            { dersId: 'bursa-u1-d2', eserId: 'bursa-koza-hani', eserAdi: 'Koza Hanı', tur: 'Han', sira: 2 },
          ],
        },
      ],
    },
  ],
};

const json = (govde: unknown) =>
  new Response(JSON.stringify(govde), { status: 200, headers: { 'Content-Type': 'application/json' } });

let cagrilan: string[];

beforeEach(() => {
  localStorage.clear();
  cagrilan = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (girdi: RequestInfo | URL) => {
      const url = String(girdi);
      cagrilan.push(url);
      if (url.includes('/api/yol')) return json(YOL);
      if (url.includes('/api/filtreler')) return json({ sehirler: [], turler: [] });
      if (
        url.includes('/api/eserler') ||
        url.includes('/api/sehirler') ||
        url.includes('/api/uniteler') ||
        url.includes('/api/kulliyeler')
      )
        return json([]);
      if (url.includes('/api/dersler/')) return json({ id: 'ders' });
      return new Response('', { status: 200 });
    }),
  );
});

describe('cevrimdisiHazirla', () => {
  it('ders verisini ve eser kapak fotoğraflarını çeker', async () => {
    const { cevrimdisiHazirla } = await import('../src/lib/cevrimdisi');
    const oldu = await cevrimdisiHazirla();
    expect(oldu).toBe(true);
    expect(cagrilan).toEqual(
      expect.arrayContaining([
        '/api/dersler/bursa-u1-d1',
        '/api/dersler/bursa-u1-d2',
        '/gorseller/bursa-ulucami/k.webp',
        '/gorseller/bursa-ulucami/1.webp',
        '/gorseller/bursa-koza-hani/k.webp',
        '/gorseller/bursa-koza-hani/1.webp',
      ]),
    );
  });

  it('paket hazırsa 12 saat içinde yeniden çalışmaz', async () => {
    const { cevrimdisiHazirla, cevrimdisiHazirMi } = await import('../src/lib/cevrimdisi');
    expect(await cevrimdisiHazirla()).toBe(true);
    expect(cevrimdisiHazirMi()).toBe(true);
    cagrilan = [];
    expect(await cevrimdisiHazirla()).toBe(false);
    expect(cagrilan).toEqual([]);
  });

  it('internet yokken hiç istek atmaz', async () => {
    localStorage.clear();
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
    try {
      const { cevrimdisiHazirla } = await import('../src/lib/cevrimdisi');
      cagrilan = [];
      expect(await cevrimdisiHazirla()).toBe(false);
      expect(cagrilan).toEqual([]);
    } finally {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });
    }
  });
});

describe('service worker yapılandırması', () => {
  const yapilandirma = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

  it('küçük kapak fotoğrafları ön yüklemeye (precache) girer', () => {
    expect(yapilandirma).toContain("'gorseller/**/k.webp'");
    // Büyük galeri fotoğrafları precache'e girmez (paket şişmesin).
    expect(yapilandirma).toContain("'gorseller/**/[0-9].webp'");
  });

  it('API çalışma zamanı önbelleği tüm içerik uçlarını kapsar', () => {
    expect(yapilandirma).toContain('eserler|uniteler|sehirler|kulliyeler|yol|dersler|filtreler');
  });
});
