/**
 * Canlı sınıf yarışması (Kahoot tarzı) testleri.
 *
 * Doğrulanan taahhütler:
 *  - Sorular derslerdeki kaynaklı içerikten gelir; doğru cevap seçeneklerde durur.
 *  - Doğru cevap, süre bitmeden oyuncuya SIZMAZ.
 *  - Ceza yok: yanlış cevap puan düşürmez.
 *  - Kişisel veri yok: ad sorulmaz, takma ad üretilir.
 *  - Yalnızca odayı kuran oyunu yönetebilir.
 *  - Aynı IP'deki bir sınıf, yoklama yaparken hız sınırına takılmaz.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Ders } from '../shared/types';
import type { CanliOyuncuDurumu, CanliSunucuDurumu } from '../shared/canli';
import { eserKimligi } from '../shared/slug';
import { sorulariUret, type CanliSoru, type SoruKaynagi } from '../server/canli/sorular';
import { CanliOdalar, CanliHata, SINIRLAR } from '../server/canli/oda';

// Veritabanı modülü yolu YÜKLENDİĞİ AN okur: gerçek .pgdata'ya dokunmamak için
// geçici dizin, sunucu kodu içe aktarılmadan önce ayarlanır (aşağıda hep dinamik import).
let geciciDizin = '';
let baglantiKapat: (() => Promise<void>) | undefined;
beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-canli-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
});
afterAll(async () => {
  await baglantiKapat?.();
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
});

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const oku = <T>(yol: string): T => JSON.parse(readFileSync(join(KOK, yol), 'utf8')) as T;

/** Gerçek içerik dosyalarından seed'in ürettiği Ders listesinin eşdeğeri. */
function gercekKaynak(): SoruKaynagi {
  const eserler = new Map<string, { ad: string; tur: string; sehir: string }>();
  for (const f of readdirSync(join(KOK, 'data/research')).filter((x) => x.endsWith('.json'))) {
    for (const e of oku<{ eserler: { id?: string; ad: string; tur: string; sehir: string }[] }>(
      `data/research/${f}`,
    ).eserler) {
      eserler.set(eserKimligi(e), e);
    }
  }
  const gorseller = oku<Record<string, { kaynak: string }>>('data/gorseller.json');
  const dersler: Ders[] = [];
  for (const f of readdirSync(join(KOK, 'data/content')).filter((x) => x.endsWith('.json'))) {
    const icerik = oku<{ dersler: (Omit<Ders, 'id' | 'uniteId' | 'sira'> & { eserId: string })[] }>(
      `data/content/${f}`,
    );
    icerik.dersler.forEach((d, i) => {
      const e = eserler.get(d.eserId)!;
      dersler.push({
        ...d,
        id: `${f}-${i}`,
        uniteId: f.replace('.json', ''),
        sira: i + 1,
        egzersizler: d.egzersizler.map((x, j) => ({ ...x, sira: j })),
        eser: {
          id: d.eserId,
          ad: e.ad,
          tur: e.tur,
          sehirId: e.sehir.toLocaleLowerCase('tr'),
          gelirDagilimiDurumu: 'belge-bulunamadi',
        },
      });
    });
  }
  return {
    dersler,
    fotograflar: new Map(
      Object.entries(gorseller).map(([id, g]) => [id, { url: `/gorseller/${id}/1.webp`, kaynak: g.kaynak }]),
    ),
    sehirAdlari: new Map([
      ['bursa', 'Bursa'],
      ['konya', 'Konya'],
      ['hatay', 'Hatay'],
    ]),
  };
}

/** Tekrarlanabilir rastgelelik (mulberry32). */
function tohumlu(tohum: number): () => number {
  return () => {
    tohum = (tohum + 0x6d2b79f5) | 0;
    let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ornekSoru = (i: number): CanliSoru => ({
  tip: 'bosluk',
  eserId: `eser-${i}`,
  soru: `Soru ${i}: Vakıf ___ olur.`,
  foto: null,
  secenekler: ['kalıcı', 'geçici', 'satılık', 'kiralık'],
  dogruIndex: 0,
  aciklama: 'Vakıf kalıcı olur.',
  kaynak: 'Test künyesi',
});

describe('soru üretimi (gerçek ders içeriğiyle)', () => {
  const kaynak = gercekKaynak();

  it('57 dersten bol soru çıkar; her sorunun doğru cevabı seçeneklerde ve kaynağı var', () => {
    const sorular = sorulariUret(kaynak, 200, tohumlu(1));
    expect(sorular.length).toBeGreaterThan(100);
    for (const s of sorular) {
      expect(s.secenekler.length, s.soru).toBeGreaterThanOrEqual(2);
      expect(s.secenekler.length, s.soru).toBeLessThanOrEqual(4);
      expect(new Set(s.secenekler).size, s.soru).toBe(s.secenekler.length);
      expect(s.secenekler[s.dogruIndex], s.soru).toBeDefined();
      expect(s.kaynak, s.soru).toBeTruthy();
    }
  });

  it('fotoğraf sorusunun alt metni ve sorusu cevabı söylemez', () => {
    const foto = sorulariUret(kaynak, 200, tohumlu(2)).filter((s) => s.tip === 'foto');
    expect(foto.length).toBeGreaterThan(40);
    for (const s of foto) {
      const cevap = s.secenekler[s.dogruIndex]!;
      expect(s.foto!.alt).not.toContain(cevap);
      expect(s.soru).not.toContain(cevap);
      expect(s.aciklama).toContain(cevap);
    }
  });

  it('8 soruluk oyunda tipler karışık ve hiçbir eser iki kez sorulmaz', () => {
    const sorular = sorulariUret(kaynak, 8, tohumlu(3));
    expect(sorular).toHaveLength(8);
    expect(new Set(sorular.map((s) => s.tip)).size).toBe(3);
    expect(new Set(sorular.map((s) => s.eserId)).size).toBe(8);
  });

  it('doğru cevap hep aynı sırada durmaz (içerikte ilk seçenek doğru olsa bile)', () => {
    const konumlar = new Set(sorulariUret(kaynak, 40, tohumlu(4)).map((s) => s.dogruIndex));
    expect(konumlar.size).toBeGreaterThanOrEqual(3);
  });

  it('şehir adı doğru ekle yazılır', () => {
    const s = sorulariUret(kaynak, 200, tohumlu(5)).find((x) => x.tip === 'foto' && x.aciklama.includes('Bursa'));
    expect(s!.aciklama).toMatch(/^Bu, Bursa'daki /);
  });
});

describe('oyun motoru', () => {
  let saat = 0;
  let odalar: CanliOdalar;
  const simdi = () => saat;
  const ileri = (ms: number) => {
    saat += ms;
  };

  beforeEach(() => {
    saat = 1_000_000;
    odalar = new CanliOdalar(simdi);
  });

  function kurVeKatil(oyuncuSayisi = 2, sureSn = 20) {
    const { pin, sunucuAnahtari } = odalar.kur([ornekSoru(1), ornekSoru(2)], sureSn);
    const oyuncular = Array.from({ length: oyuncuSayisi }, () => odalar.katil(pin));
    return { pin, anahtar: sunucuAnahtari, oyuncular };
  }

  it('PIN 6 rakam; takma adlar tekil ve kişisel veri içermez', () => {
    const { pin, oyuncular } = kurVeKatil(40);
    expect(pin).toMatch(/^[1-9]\d{5}$/);
    const adlar = oyuncular.map((o) => o.takmaAd);
    expect(new Set(adlar).size).toBe(40);
    for (const ad of adlar) expect(ad).toMatch(/^\p{Lu}\p{Ll}+ \p{Lu}\p{Ll}+( \d+)?$/u);
  });

  it('soru açıkken doğru cevap oyuncuya ve yönetime gönderilmez', () => {
    const { pin, anahtar, oyuncular } = kurVeKatil();
    odalar.basla(pin, anahtar);
    const oyuncu = odalar.oyuncuDurumu(pin, oyuncular[0]!.oyuncuAnahtari);
    const yonetim = odalar.sunucuDurumu(pin, anahtar);
    expect(oyuncu.asama).toBe('soru');
    expect(oyuncu.sonuc).toBeNull();
    expect(yonetim.sonuc).toBeNull();
    expect(JSON.stringify(oyuncu)).not.toContain('dogruIndex');
    expect(JSON.stringify(oyuncu)).not.toContain('Vakıf kalıcı olur');
  });

  it('hızlı doğru cevap daha çok puan alır; yanlış cevap puan düşürmez', () => {
    const { pin, anahtar, oyuncular } = kurVeKatil(3);
    const [hizli, yavas, yanlis] = oyuncular.map((o) => o.oyuncuAnahtari);
    odalar.basla(pin, anahtar);
    ileri(2_000);
    odalar.cevapla(pin, hizli, 0, 0);
    odalar.cevapla(pin, yanlis, 0, 2);
    ileri(14_000);
    odalar.cevapla(pin, yavas, 0, 0); // herkes cevapladı → sonuç açılır

    const h = odalar.oyuncuDurumu(pin, hizli);
    const y = odalar.oyuncuDurumu(pin, yavas);
    const w = odalar.oyuncuDurumu(pin, yanlis);
    expect(h.asama).toBe('cevap');
    expect(h.sonuc).toMatchObject({ dogruMu: true, dogruIndex: 0 });
    expect(h.sonuc!.kazanilan).toBe(950);
    expect(y.sonuc!.kazanilan).toBe(600);
    expect(w.sonuc).toMatchObject({ dogruMu: false, kazanilan: 0 });
    expect(w.puan).toBe(0);
    expect(h.sira).toBe(1);
    expect(w.sira).toBe(3);
    expect(odalar.sunucuDurumu(pin, anahtar).sonuc!.dagilim).toEqual([2, 0, 1, 0]);
  });

  it('süre bitince soru kendiliğinden kapanır; geç cevap reddedilir', () => {
    const { pin, anahtar, oyuncular } = kurVeKatil();
    odalar.basla(pin, anahtar);
    ileri(20_000 + SINIRLAR.gecikmePayiMs + 1);
    expect(() => odalar.cevapla(pin, oyuncular[0]!.oyuncuAnahtari, 0, 0)).toThrow(CanliHata);
    expect(odalar.sunucuDurumu(pin, anahtar).asama).toBe('cevap');
  });

  it('aynı soruya iki kez cevap verilemez; geçersiz seçenek reddedilir', () => {
    const { pin, anahtar, oyuncular } = kurVeKatil(2);
    const a = oyuncular[0]!.oyuncuAnahtari;
    odalar.basla(pin, anahtar);
    expect(() => odalar.cevapla(pin, a, 0, 9)).toThrow(/Geçersiz/);
    odalar.cevapla(pin, a, 0, 1);
    expect(() => odalar.cevapla(pin, a, 0, 0)).toThrow(/zaten/);
  });

  it('soru açıkken sıralama o sorunun puanını sızdırmaz', () => {
    const { pin, anahtar, oyuncular } = kurVeKatil(2);
    odalar.basla(pin, anahtar);
    odalar.cevapla(pin, oyuncular[0]!.oyuncuAnahtari, 0, 0);
    expect(odalar.oyuncuDurumu(pin, oyuncular[0]!.oyuncuAnahtari).puan).toBe(0);
  });

  it('sonraki → ikinci soru → bitti; podyumda ilk üç', () => {
    const { pin, anahtar, oyuncular } = kurVeKatil(2);
    odalar.basla(pin, anahtar);
    odalar.sonraki(pin, anahtar); // erken kapat
    expect(odalar.sunucuDurumu(pin, anahtar).asama).toBe('cevap');
    odalar.sonraki(pin, anahtar);
    expect(odalar.sunucuDurumu(pin, anahtar).soru!.no).toBe(1);
    odalar.cevapla(pin, oyuncular[0]!.oyuncuAnahtari, 1, 0);
    odalar.sonraki(pin, anahtar);
    odalar.sonraki(pin, anahtar);
    const son = odalar.oyuncuDurumu(pin, oyuncular[0]!.oyuncuAnahtari);
    expect(son.asama).toBe('bitti');
    expect(son.podyum[0]!.takmaAd).toBe(oyuncular[0]!.takmaAd);
    expect(() => odalar.katil(pin)).toThrow(/bitti/);
  });

  it('yalnızca odayı kuran yönetebilir', () => {
    const { pin, oyuncular } = kurVeKatil();
    expect(() => odalar.basla(pin, undefined)).toThrow(/yalnızca kuran/);
    expect(() => odalar.basla(pin, oyuncular[0]!.oyuncuAnahtari)).toThrow(/yalnızca kuran/);
    expect(() => odalar.sunucuDurumu(pin, 'x'.repeat(32))).toThrow(/yalnızca kuran/);
  });

  it('oyuncusuz oyun başlamaz; dolu odaya katılınmaz', () => {
    const { pin, sunucuAnahtari } = odalar.kur([ornekSoru(1)], 20);
    expect(() => odalar.basla(pin, sunucuAnahtari)).toThrow(/en az bir oyuncu/);
    for (let i = 0; i < SINIRLAR.oyuncuSayisi; i++) odalar.katil(pin);
    expect(() => odalar.katil(pin)).toThrow(/dolu/);
  });

  it('terk edilen odalar silinir', () => {
    kurVeKatil();
    expect(odalar.odaSayisi).toBe(1);
    ileri(SINIRLAR.bosOdaMs + 1);
    odalar.temizle();
    expect(odalar.odaSayisi).toBe(0);
  });
});

describe('canlı yarışma uçları', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { canliUclari } = await import('../server/routes/canli');
    app = Fastify();
    // Üretimdeki genel sınırın aynısı: IP başına 300/dk.
    await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });
    await app.register(canliUclari, {
      odalar: new CanliOdalar(),
      soruKaynagi: async () => gercekKaynak(),
    });
    await app.ready();
  });
  afterAll(() => app.close());

  async function odaKur() {
    const c = await app.inject({
      method: 'POST',
      url: '/api/canli/odalar',
      payload: { kapsam: 'sehir:konya', soruSayisi: 5, sureSn: 30 },
    });
    expect(c.statusCode).toBe(201);
    return c.json<{ pin: string; sunucuAnahtari: string; soruSayisi: number }>();
  }

  it('geçersiz istekler reddedilir', async () => {
    const kotu = [
      { kapsam: "sehir:'; DROP TABLE work;--", soruSayisi: 5, sureSn: 20 },
      { kapsam: 'hepsi', soruSayisi: 500, sureSn: 20 },
      { kapsam: 'hepsi', soruSayisi: 5, sureSn: 1 },
    ];
    for (const payload of kotu) {
      const c = await app.inject({ method: 'POST', url: '/api/canli/odalar', payload });
      expect(c.statusCode).toBe(400);
    }
    const yok = await app.inject({ method: 'POST', url: '/api/canli/odalar/abc/katil' });
    expect(yok.statusCode).toBe(404);
    const bilinmeyen = await app.inject({ method: 'POST', url: '/api/canli/odalar/123456/katil' });
    expect(bilinmeyen.json()).toMatchObject({ kod: 'ODA_YOK' });
  });

  it('tam akış: kur → katıl → başla → cevapla → sonuç', async () => {
    const { pin, sunucuAnahtari, soruSayisi } = await odaKur();
    expect(soruSayisi).toBe(5);
    const katilim = (await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/katil` })).json<{
      oyuncuAnahtari: string;
      takmaAd: string;
    }>();
    const oyuncu = { 'x-canli-oyuncu': katilim.oyuncuAnahtari };
    const yonetim = { 'x-canli-anahtar': sunucuAnahtari };

    const izinsiz = await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/basla`, headers: oyuncu });
    expect(izinsiz.statusCode).toBe(403);

    const basla = await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/basla`, headers: yonetim });
    expect(basla.json<CanliSunucuDurumu>().asama).toBe('soru');

    const durum = (
      await app.inject({ method: 'GET', url: `/api/canli/odalar/${pin}/oyuncu`, headers: oyuncu })
    ).json<CanliOyuncuDurumu>();
    expect(durum.soru!.secenekler.length).toBeGreaterThanOrEqual(2);
    expect(durum).not.toHaveProperty('soru.dogruIndex');

    const cevap = await app.inject({
      method: 'POST',
      url: `/api/canli/odalar/${pin}/cevap`,
      headers: oyuncu,
      payload: { soruNo: 0, secim: 0 },
    });
    expect(cevap.json()).toEqual({ alindi: true });

    const sonra = (
      await app.inject({ method: 'GET', url: `/api/canli/odalar/${pin}/oyuncu`, headers: oyuncu })
    ).json<CanliOyuncuDurumu>();
    expect(sonra.asama).toBe('cevap'); // tek oyuncu cevapladı → sonuç açıldı
    expect(sonra.sonuc!.kaynak).toBeTruthy();
  });

  it('aynı IP\'deki 30 kişilik sınıf saniyede bir yoklayınca hız sınırına takılmaz', async () => {
    const { pin } = await odaKur();
    const anahtarlar: string[] = [];
    for (let i = 0; i < 30; i++) {
      const c = await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/katil` });
      expect(c.statusCode).toBe(201);
      anahtarlar.push(c.json<{ oyuncuAnahtari: string }>().oyuncuAnahtari);
    }
    // 30 cihaz × 20 yoklama = 600 istek (genel sınırın iki katı), hepsi aynı IP'den.
    for (let tur = 0; tur < 20; tur++) {
      const cevaplar = await Promise.all(
        anahtarlar.map((a) =>
          app.inject({ method: 'GET', url: `/api/canli/odalar/${pin}/oyuncu`, headers: { 'x-canli-oyuncu': a } }),
        ),
      );
      for (const c of cevaplar) expect(c.statusCode).toBe(200);
    }
  });

  it('tek cihaz aşırı istek atarsa sınırlanır', async () => {
    const { pin } = await odaKur();
    const { oyuncuAnahtari } = (
      await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/katil` })
    ).json<{ oyuncuAnahtari: string }>();
    let sinirlandi = false;
    for (let i = 0; i < 260 && !sinirlandi; i++) {
      const c = await app.inject({
        method: 'GET',
        url: `/api/canli/odalar/${pin}/oyuncu`,
        headers: { 'x-canli-oyuncu': oyuncuAnahtari },
      });
      sinirlandi = c.statusCode === 429;
    }
    expect(sinirlandi).toBe(true);
  });
});

describe('canlı yarışma gerçek sunucuda', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    baglantiKapat = (await import('../server/db/index.ts')).baglantiKapat;
    const { sunucuKur } = await import('../server/index.ts');
    app = await sunucuKur();
    await app.ready();
  }, 90_000);

  afterAll(async () => {
    await app?.close();
  });

  it('testler gerçek veritabanına dokunmaz', () => {
    expect(process.env.KOKAVI_PGDATA).toContain('kokavi-canli-');
  });

  it('uçlar kayıtlı; ders yokken anlaşılır hata döner (çökmez)', async () => {
    const c = await app.inject({
      method: 'POST',
      url: '/api/canli/odalar',
      payload: { kapsam: 'hepsi', soruSayisi: 5, sureSn: 20 },
    });
    expect(c.statusCode).toBe(422);
    expect(c.json()).toMatchObject({ kod: 'SORU_YOK' });
  });
});
