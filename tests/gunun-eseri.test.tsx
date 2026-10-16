/**
 * Günün Eseri (Wordle tarzı) testleri.
 *
 * Doğrulanan taahhütler:
 *  - Her gün herkese aynı eser; 57 günde hiçbir eser tekrar etmez.
 *  - İpuçları kaynaklı ders eserlerinden; ilk ipuçları cevabı ELE VERMEZ.
 *  - Paylaşım metni yalnızca kare içerir (cevabı sızdırmaz).
 *  - Ceza yok: hak bitince de eser tanıtılır.
 *  - Ekran axe ile 0 ihlal.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ESERLER,
  HAK,
  bosIstatistik,
  degerlendir,
  eserBul,
  gunNumarasi,
  gununEseri,
  ipuclari,
  istatistikGuncelle,
  normalle,
  oner,
  paylasimMetni,
} from '../src/features/gunun-eseri/oyun';
import { gunAnahtari } from '../src/lib/ilerleme';
import { rotayiCoz } from '../src/lib/yonlendirme';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('Günün Eseri verisi', () => {
  const dersEserleri = new Set(
    readdirSync(join(KOK, 'data/content'))
      .filter((f) => f.endsWith('.json'))
      .flatMap(
        (f) =>
          (JSON.parse(readFileSync(join(KOK, 'data/content', f), 'utf8')) as { dersler: { eserId: string }[] })
            .dersler,
      )
      .map((d) => d.eserId),
  );

  it('her ders eseri bir kez var; fotoğrafı ve envanter kaynağı mevcut', () => {
    expect(ESERLER).toHaveLength(dersEserleri.size);
    expect(new Set(ESERLER.map((e) => e.eserId)).size).toBe(ESERLER.length);
    for (const e of ESERLER) {
      expect(dersEserleri.has(e.eserId), e.eserId).toBe(true);
      expect(existsSync(join(KOK, `public/gorseller/${e.eserId}/1.webp`)), e.eserId).toBe(true);
      expect(e.kaynak, e.eserId).toMatch(/^Vakıf Katılım/);
      expect(e.yil, e.eserId).toBeGreaterThan(600);
      expect(e.yil, e.eserId).toBeLessThan(2000);
    }
  });

  it('ilk dört ipucu eserin adını ele vermez', () => {
    // Genel yapı adları (cami, han…) tür bilgisidir, ad değildir.
    const genel = new Set(
      'camii cami hani hanı hamami hamamı medresesi turbesi türbesi kulliyesi külliyesi cesmesi çeşmesi mescidi mescit koprusu köprüsü imareti kilisesi mektebi bedesteni evi kervansarayi kervansarayı sultan pasa paşa ulu hamam medrese turbe külliye cesme çeşme kilise mektep bedesten kervansaray imaret tekke'
        .split(' ')
        .map(normalle)
        // Şehir zaten ilk ipucu (bilerek verilir).
        .concat(ESERLER.map((e) => normalle(e.sehir))),
    );
    for (const e of ESERLER) {
      const kelimeler = normalle(e.kisaAd)
        .split(/[\s()'.,-]+/)
        .filter((k) => k.length >= 4 && !genel.has(k));
      const ilkDort = ipuclari(e)
        .slice(0, 4)
        .map((i) => (i.tur === 'metin' ? normalle(i.metin) : ''))
        .join(' ');
      for (const k of kelimeler) expect(ilkDort, `${e.kisaAd}: "${k}" ipucunda geçiyor`).not.toContain(k);
    }
  });

  it('ipucu sırası: şehir → kullanım → fotoğraf → zaman → ad → yaptıran', () => {
    const ip = ipuclari(ESERLER[0]!);
    expect(ip.map((i) => i.baslik)).toEqual([
      'Şehir',
      'Ne için kullanıldı?',
      'Fotoğraf',
      'Ne zaman?',
      'Adı',
      'Kim yaptırdı?',
    ]);
    expect(ip).toHaveLength(HAK);
  });
});

describe('Günün Eseri mantığı', () => {
  it('gün numarası takvime göre; herkes aynı eseri görür; 57 günde tekrar yok', () => {
    expect(gunNumarasi('2026-01-01')).toBe(0);
    expect(gunNumarasi('2026-11-07')).toBe(310);
    expect(gununEseri(310).eserId).toBe(gununEseri(310).eserId);
    const tur = new Set(Array.from({ length: ESERLER.length }, (_, i) => gununEseri(400 + i).eserId));
    expect(tur.size).toBe(ESERLER.length);
  });

  it('karşılaştırma: şehir, tür ve dönem', () => {
    const ulucami = eserBul('bursa-ulucami')!; // Bursa, Cami, 1399
    const koza = degerlendir('bursa-koza-hani', ulucami); // Bursa, Han, 1491
    expect(koza).toMatchObject({ dogru: false, sehirAyni: true, turAyni: false, donem: 'eski' });
    const yesil = degerlendir('bursa-yesilcami-yesil-cami', ulucami); // 1419
    expect(yesil).toMatchObject({ sehirAyni: true, turAyni: true, donem: 'yakin-eski' });
    const karatay = degerlendir('karatay-medresesi', ulucami); // Konya, 1251
    expect(karatay).toMatchObject({ sehirAyni: false, donem: 'yeni' });
    expect(degerlendir('bursa-ulucami', ulucami).dogru).toBe(true);
  });

  it('öneri: Türkçe harf ve şapka duyarsız', () => {
    expect(oner('ulu', new Set()).map((e) => e.eserId)).toContain('bursa-ulucami');
    expect(oner('KATİP', new Set()).length).toBeGreaterThanOrEqual(0);
    expect(oner('mevlana', new Set()).map((e) => e.eserId)).toContain('konya-mevlana-turbesi');
    expect(oner('ulu', new Set(['bursa-ulucami'])).map((e) => e.eserId)).not.toContain('bursa-ulucami');
  });

  it('paylaşım metni yalnızca kare içerir, cevabı sızdırmaz', () => {
    const hedef = eserBul('bursa-ulucami')!;
    const sonuclar = ['bursa-koza-hani', 'bursa-yesilcami-yesil-cami', 'bursa-ulucami'].map((t) =>
      degerlendir(t, hedef),
    );
    const metin = paylasimMetni(310, sonuclar, true);
    expect(metin).toBe('Kök Avı · Günün Eseri #311 3/6\n🟩⬜⬜\n🟩🟩🟨\n🟩🟩🟩');
    expect(metin).not.toMatch(/Ulucami|Koza|Yeşil/);
  });

  it('istatistik: seri ardışık günlerde artar, kaybedince sıfırlanır, aynı gün iki kez sayılmaz', () => {
    let i = istatistikGuncelle(bosIstatistik(), 10, true, 3);
    i = istatistikGuncelle(i, 11, true, 1);
    expect(i).toMatchObject({ oynanan: 2, kazanilan: 2, seri: 2, enIyiSeri: 2 });
    expect(i.dagilim).toEqual([1, 0, 1, 0, 0, 0]);
    expect(istatistikGuncelle(i, 11, true, 1)).toBe(i);
    i = istatistikGuncelle(i, 12, false, 6);
    expect(i).toMatchObject({ seri: 0, enIyiSeri: 2, oynanan: 3 });
    i = istatistikGuncelle(i, 14, true, 2);
    expect(i.seri).toBe(1);
  });
});

describe('Günün Eseri ekranı', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (girdi: RequestInfo | URL) => {
        const url = String(girdi);
        if (url.includes('/api/auth/ben')) return new Response('{}', { status: 401 });
        const govde = url.includes('/api/yol') ? { sehirler: [] } : [];
        return new Response(JSON.stringify(govde), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
  });

  it('rota çözülür', () => {
    expect(rotayiCoz('#/gunun-eseri')).toEqual({ ad: 'gunun-eseri' });
  });

  async function ac() {
    window.location.hash = '#/gunun-eseri';
    const { App } = await import('../src/app/App');
    const r = render(<App />);
    await screen.findByRole('heading', { name: 'Bugünün eserini bul!' });
    return r;
  }

  async function ihlaller(kap: HTMLElement) {
    const s = await axe.run(kap, {
      rules: {
        'color-contrast': { enabled: false },
        'scrollable-region-focusable': { enabled: false },
        region: { enabled: false },
      },
      resultTypes: ['violations'],
    });
    return s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`);
  }

  it('yanlış tahmin yeni ipucu açar ve karşılaştırma rozetleri metinle yazılır; ihlalsiz', async () => {
    const hedef = gununEseri(gunNumarasi(gunAnahtari()));
    const yanlis = ESERLER.find((e) => e.eserId !== hedef.eserId && e.sehir !== hedef.sehir)!;
    const { container } = await ac();
    expect(screen.getByText(`Bu eser ${hedef.sehir} ilinde.`)).toBeInTheDocument();
    expect(screen.getByText(hedef.kullanim === '' ? 'x' : '1. yanlış tahminden sonra açılır')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Eserin adını yaz'), yanlis.kisaAd);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${yanlis.ad.replace(/[()]/g, '.')}`) }));

    expect(screen.getByText(hedef.kullanim)).toBeInTheDocument();
    expect(screen.getByText(`Şehir farklı (${yanlis.sehir} değil)`)).toBeInTheDocument();
    expect(await ihlaller(container)).toEqual([]);
  });

  it('doğru tahminde kutlama, kaynak ve paylaşım; hak bitince de eser tanıtılır', async () => {
    const hedef = gununEseri(gunNumarasi(gunAnahtari()));
    const { container } = await ac();
    await userEvent.type(screen.getByLabelText('Eserin adını yaz'), hedef.kisaAd);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${hedef.ad.replace(/[()]/g, '.')}`) }));
    expect(screen.getByText(/İlk tahminde!/)).toBeInTheDocument();
    expect(screen.getByText(`Kaynak: ${hedef.kaynak}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sonucu paylaş' })).toBeInTheDocument();
    expect(await ihlaller(container)).toEqual([]);
  });
});
