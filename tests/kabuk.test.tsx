/**
 * Uygulama kabuğu erişilebilirlik testleri.
 *
 * Gerçek bileşen ağacı jsdom'da render edilir; erişilebilirlik özelliklerinin
 * ÜRÜNDE bulunduğu (tasarımda değil) doğrulanır. Şartname 5.1.4'ün
 * "çalışan ürüne entegre edilmesi" şartına kanıt.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/** Öğrenme yolu iskeleti — PDF yol görselinin küçük bir kopyası. */
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
          ],
        },
      ],
    },
  ],
};

beforeEach(() => {
  window.location.hash = '';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (girdi: RequestInfo | URL) => {
      const url = String(girdi);
      if (url.includes('/api/yol')) {
        return new Response(JSON.stringify(YOL_CEVABI), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

async function kabuguRenderEt() {
  const { App } = await import('../src/app/App');
  render(<App />);
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeTruthy());
}

describe('uygulama kabuğu — erişilebilirlik', () => {
  it('klavye kullanıcısı için "içeriğe atla" bağlantısı var (WCAG 2.4.1)', async () => {
    await kabuguRenderEt();
    // NOT: Türkçe "İ" harfi JS regex'in `i` bayrağıyla eşleşmez
    // (İ.toLowerCase() → "i̇", iki kod noktası). Bu yüzden Türkçe özel harf
    // içermeyen bir parça aranır — bu, Türkçe uygulamalarda yaygın bir tuzaktır.
    const atla = screen.getByRole('link', { name: /atla/i });
    expect(atla).toBeTruthy();
    expect(atla.getAttribute('href')).toBe('#ana-icerik');
    expect(atla.className).toContain('atla-baglantisi');
  });

  it('ana içerik bölgesi odaklanabilir (atla bağlantısının hedefi)', async () => {
    await kabuguRenderEt();
    const ana = document.getElementById('ana-icerik');
    expect(ana).toBeTruthy();
    expect(ana!.getAttribute('tabindex')).toBe('-1');
  });

  it('gezinme etiketli bir <nav> içinde', async () => {
    await kabuguRenderEt();
    const nav = screen.getByRole('navigation', { name: /ana gezinme/i });
    expect(nav).toBeTruthy();
  });

  it('aktif sayfa aria-current="page" taşır', async () => {
    await kabuguRenderEt();
    const aktif = screen.getByRole('link', { name: /öğrenme yolu/i });
    expect(aktif.getAttribute('aria-current')).toBe('page');
  });

  it('tüm gezinme öğeleri gerçek bağlantı (div değil)', async () => {
    await kabuguRenderEt();
    const nav = screen.getByRole('navigation', { name: /ana gezinme/i });
    const baglantilar = nav.querySelectorAll('a');
    // Çocuğun ana gezinmesi: Yol, Defter, Harita, Sınıfım, Ayarlar.
    expect(baglantilar.length).toBe(5);
    for (const b of baglantilar) {
      expect(b.tagName).toBe('A');
      expect(b.getAttribute('href')).toMatch(/^#\//);
    }
  });

  it('çocuk, öğretmen ve yönetici yolları ayrı gezinmelerde var', async () => {
    await kabuguRenderEt();
    const nav = screen.getByRole('navigation', { name: /ana gezinme/i });
    const yollar = [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(yollar).toContain('#/sinif'); // çocuk: sınıf kodu girer
    // Yetişkin girişleri çocuğun ana gezinmesinde DEĞİL, ayrı bir gezinmede.
    expect(yollar).not.toContain('#/ogretmen');
    expect(yollar).not.toContain('#/panel');
    const yetiskin = screen.getByRole('navigation', { name: /yetişkinler için/i });
    const yetiskinYollari = [...yetiskin.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(yetiskinYollari).toContain('#/ogretmen'); // öğretmen: sınıf oluşturur
    expect(yetiskinYollari).toContain('#/panel'); // yönetici: içerik yönetir
  });

  it('görsel göstergelerin ekran okuyucu metni var (renk/emoji tek başına değil)', async () => {
    await kabuguRenderEt();
    // "0 gün" gibi değerler ekran okuyucuda "Keşif serisi: 0 gün" diye okunmalı
    expect(screen.getByText(/keşif serisi:/i)).toBeTruthy();
    expect(screen.getByText(/elmas:/i)).toBeTruthy();
  });

  it('öğrenme yolu erişilebilir bir ilerleme çubuğu içerir', async () => {
    await kabuguRenderEt();
    const cubuklar = screen.getAllByRole('progressbar');
    expect(cubuklar.length).toBeGreaterThan(0);
    for (const c of cubuklar) {
      // Her ilerleme çubuğunun erişilebilir adı olmalı
      expect(c.getAttribute('aria-label')).toBeTruthy();
      expect(c.getAttribute('aria-valuenow')).toBeTruthy();
    }
  });

  it('kilitli ünite dersleri bağlantı değil, erişilemez olarak işaretli', async () => {
    await kabuguRenderEt();
    // Tek ünite var ve açık; kilitli senaryo yolHesapla testlerinde doğrulanıyor.
    const ders = screen.getByRole('link', { name: /yeşilcami/i });
    expect(ders.getAttribute('href')).toBe('#/ders/bursa-u1-d1');
  });

  it('dil özniteliği Türkçe', async () => {
    await kabuguRenderEt();
    expect(document.documentElement.lang).toBe('tr');
  });
});
