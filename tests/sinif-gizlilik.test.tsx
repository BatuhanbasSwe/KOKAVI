/**
 * Sınıf kaydı gizlilik testleri.
 *
 * PDF: "Kişisel veri toplanmaz, sınıf kodu anonim."
 * PDF Senaryo B: "Sınıf birlikte bir külliyeyi tamamlar."
 *
 * Bu iki taahhüt birlikte ancak şöyle karşılanır: sınıf paylaşımı ÇALIŞIR ama
 * sunucuya YALNIZCA {sınıf kodu, ders kimliği} gider. Kimlik, cihaz bilgisi,
 * ilerleme ayrıntısı veya zaman serisi GÖNDERİLMEZ.
 *
 * Bu test, istemcinin gerçekte ne gönderdiğini ölçer — kod okuyarak değil,
 * çalıştırarak.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { DurumSaglayici, useDurum } from '../src/app/DurumSaglayici';

const DEPO_ANAHTARI = 'kokavi.ilerleme.v1';

/** İlerleme kaydını önceden yazar (cihazda saklanan veri). */
function ilerlemeYaz(kismi: Record<string, unknown>) {
  localStorage.setItem(
    DEPO_ANAHTARI,
    JSON.stringify({
      tamamlananDersler: [],
      defterSayfalari: [],
      elmas: 0,
      seri: { gunSayisi: 0, sonTarih: null },
      ayarlar: { tema: 'acik', renkKorlugu: 'yok', yaziBoyutu: 1, hareketAzalt: false, sessizMod: false },
      sinifKodu: null,
      ...kismi,
    }),
  );
}

/** Ders tamamlamayı tetikleyen minimal test bileşeni. */
function Tamamlayici({ dersId, eserId }: { dersId: string; eserId: string }) {
  const { dersTamamla } = useDurum();
  useEffect(() => {
    dersTamamla(dersId, eserId);
  }, [dersTamamla, dersId, eserId]);
  return null;
}

let cagrilar: { url: string; govde: unknown }[] = [];

beforeEach(() => {
  localStorage.clear();
  cagrilar = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (girdi: RequestInfo | URL, secenekler?: RequestInit) => {
      const url = String(girdi);
      let govde: unknown = null;
      if (secenekler?.body) {
        try {
          govde = JSON.parse(String(secenekler.body));
        } catch {
          govde = String(secenekler.body);
        }
      }
      cagrilar.push({ url, govde });

      // Öğrenme yolu isteği boş dönsün; test yalnızca sınıf çağrısıyla ilgili.
      const yanit = url.includes('/api/yol') ? { sehirler: [] } : { tamam: true };
      return new Response(JSON.stringify(yanit), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

function sinifCagrilari() {
  return cagrilar.filter((c) => c.url.includes('/api/sinif/tamamla'));
}

describe('sınıf kaydı — gizlilik', () => {
  it('sınıf kodu YOKSA sunucuya hiçbir şey gönderilmez', async () => {
    ilerlemeYaz({ sinifKodu: null });

    render(
      <DurumSaglayici>
        <Tamamlayici dersId="bursa-u1-d1" eserId="bursa-ipek-hani" />
      </DurumSaglayici>,
    );

    await waitFor(() => {
      // İlerleme cihaza yazılmalı
      expect(JSON.parse(localStorage.getItem(DEPO_ANAHTARI)!).tamamlananDersler).toContain(
        'bursa-u1-d1',
      );
    });

    expect(sinifCagrilari()).toHaveLength(0);
  });

  it('sınıf kodu VARSA yalnızca {kod, dersId} gönderilir', async () => {
    ilerlemeYaz({ sinifKodu: 'KTM-4829' });

    render(
      <DurumSaglayici>
        <Tamamlayici dersId="bursa-u1-d1" eserId="bursa-ipek-hani" />
      </DurumSaglayici>,
    );

    await waitFor(() => expect(sinifCagrilari()).toHaveLength(1));

    const cagri = sinifCagrilari()[0]!;
    const govde = cagri.govde as Record<string, unknown>;

    // Yalnızca iki alan olmalı — fazlası gizlilik ihlali sayılır
    expect(Object.keys(govde).sort()).toEqual(['dersId', 'kod']);
    expect(govde.kod).toBe('KTM-4829');
    expect(govde.dersId).toBe('bursa-u1-d1');
  });

  it('gövdede kimlik/cihaz/konum bilgisi SIZMAZ', async () => {
    ilerlemeYaz({ sinifKodu: 'KTM-4829' });

    render(
      <DurumSaglayici>
        <Tamamlayici dersId="bursa-u2-d1" eserId="bursa-yesilcami" />
      </DurumSaglayici>,
    );

    await waitFor(() => expect(sinifCagrilari()).toHaveLength(1));

    const metin = JSON.stringify(sinifCagrilari()[0]!.govde).toLowerCase();
    for (const yasakli of [
      'email',
      'eposta',
      'ad',
      'isim',
      'cihaz',
      'device',
      'userid',
      'kullanici',
      'token',
      'konum',
      'lat',
      'lng',
      'ip',
      '@',
    ]) {
      expect(metin, `Gövdede "${yasakli}" olmamalı`).not.toContain(yasakli);
    }
  });

  it('aynı ders ikinci kez tamamlanırsa sayaç TEKRAR gönderilmez', async () => {
    ilerlemeYaz({ sinifKodu: 'KTM-4829', tamamlananDersler: ['bursa-u1-d1'] });

    render(
      <DurumSaglayici>
        <Tamamlayici dersId="bursa-u1-d1" eserId="bursa-ipek-hani" />
      </DurumSaglayici>,
    );

    // Kısa bir bekleme: çağrı yapılacaksa yapılırdı
    await new Promise((r) => setTimeout(r, 60));

    // Zaten tamamlanmış ders yeniden gönderilmez (istemci tarafı tekrar engeli).
    // NOT: Sunucu tarafında kimlik olmadığı için kesin tekilleştirme YAPILAMAZ;
    // bu yalnızca iyi niyetli istemciyi korur. Arayüz bu yüzden "toplam
    // tamamlama" der, "öğrenci sayısı" demez.
    expect(sinifCagrilari()).toHaveLength(0);
  });

  it('sunucu hatası çocuğun ilerlemesini ENGELLEMEZ (ateşle-unut)', async () => {
    ilerlemeYaz({ sinifKodu: 'KTM-4829' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (girdi: RequestInfo | URL) => {
        const url = String(girdi);
        if (url.includes('/api/sinif/tamamla')) throw new Error('ağ koptu');
        return new Response(JSON.stringify({ sehirler: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    render(
      <DurumSaglayici>
        <Tamamlayici dersId="bursa-u1-d1" eserId="bursa-ipek-hani" />
      </DurumSaglayici>,
    );

    await waitFor(() => {
      const kayit = JSON.parse(localStorage.getItem(DEPO_ANAHTARI)!);
      // Ağ hatasına rağmen ilerleme cihazda kaydedilmiş olmalı
      expect(kayit.tamamlananDersler).toContain('bursa-u1-d1');
      expect(kayit.defterSayfalari).toContain('bursa-ipek-hani');
    });
  });
});
