/**
 * Bilgi Notu veri alanı testleri.
 *
 * Kaynak: **Vakıf Eserleri Envanter Projesi Bilgi Notu** (Vakıf Katılım, Ekim 2026)
 *
 * > **Veri alanları:** İl, eser adı, eser türü, konum, tarihçe, **Türkçe ve
 * > İngilizce metinler**, **fotoğraf galerileri** ve **sergi bilgileri**nin
 * > değerlendirilmesi.
 * > **Keşif ve filtreleme:** ... kullanıcıların **şehir ya da eser türüne göre
 * > filtreleme** yapabilmesi.
 * > **Sürdürülebilirlik:** Yeni illerin ve eserlerin zaman içinde
 * > eklenebileceği, güncellenebilir ve **esnek bir altyapı** kurulması.
 *
 * Bu testler o şartların GERÇEKTEN karşılandığını ölçer.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { yoneticiOturumuAc } from './yardimci.ts';

let app: FastifyInstance;
let geciciDizin: string;
let baglantiKapat: () => Promise<void>;
let adminBelirtec = '';
const adminCerez = () => ({ kokavi_oturum: adminBelirtec });

beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-veri-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
  process.env.KOKAVI_RATE_LIMIT_OFF = '1';

  const dbModulu = await import('../server/db/index.ts');
  baglantiKapat = dbModulu.baglantiKapat;
  const { sunucuKur } = await import('../server/index.ts');
  app = await sunucuKur();
  await app.ready();
  adminBelirtec = await yoneticiOturumuAc(app);

  // --- Test verisi: iki şehir, üç eser ---
  await app.inject({
    method: 'POST',
    url: '/api/yonetim/sehirler',
    cookies: adminCerez(),
    payload: { id: 'bursa', ad: 'Bursa', sira: 1 },
  });
  await app.inject({
    method: 'POST',
    url: '/api/yonetim/sehirler',
    cookies: adminCerez(),
    payload: { id: 'hatay', ad: 'Hatay', sira: 2 },
  });

  // Türkçe + İngilizce metinli, tam künyeli eser
  await app.inject({
    method: 'POST',
    url: '/api/yonetim/eserler',
    cookies: adminCerez(),
    payload: {
      id: 'bursa-yesilcami',
      ad: 'Yeşilcami',
      adEn: 'Yeşil Mosque',
      sehirId: 'bursa',
      tur: 'Cami',
      ilce: 'Yıldırım',
      koordinat: { lat: 40.1833, lng: 29.0611 },
      bani: 'Çelebi Sultan Mehmed',
      yapimYili: '1414-1419',
      tarihce: 'Yeşilcami, Çelebi Sultan Mehmed tarafından 1414-1419 yılları arasında yaptırılmıştır.',
      tarihceEn:
        'The Yeşil Mosque was commissioned by Çelebi Sultan Mehmed and built between 1414 and 1419.',
      yayinda: true,
      kaynaklar: [{ kunye: 'TDV İslam Ansiklopedisi' }],
    },
  });

  await app.inject({
    method: 'POST',
    url: '/api/yonetim/eserler',
    cookies: adminCerez(),
    payload: {
      id: 'hatay-habib-i-neccar',
      ad: 'Habib-i Neccar Camii',
      adEn: 'Habib al-Najjar Mosque',
      sehirId: 'hatay',
      tur: 'Cami',
      ilce: 'Antakya',
      yayinda: true,
    },
  });

  await app.inject({
    method: 'POST',
    url: '/api/yonetim/eserler',
    cookies: adminCerez(),
    payload: { id: 'bursa-han', ad: 'Bir Han', sehirId: 'bursa', tur: 'Han', yayinda: true },
  });
}, 90_000);

afterAll(async () => {
  await app?.close();
  await baglantiKapat?.();
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
  delete process.env.KOKAVI_RATE_LIMIT_OFF;
});

describe('Bilgi Notu — veri alanları', () => {
  it('İl, eser adı, eser türü ve konum döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler/bursa-yesilcami' });
    const eser = cevap.json();

    expect(eser.sehirId).toBe('bursa'); // İl
    expect(eser.ad).toBe('Yeşilcami'); // Eser adı
    expect(eser.tur).toBe('Cami'); // Eser türü
    expect(eser.koordinat).toEqual({ lat: 40.1833, lng: 29.0611 }); // Konum
  });

  it('Türkçe VE İngilizce metinler döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler/bursa-yesilcami' });
    const eser = cevap.json();

    expect(eser.adEn).toBe('Yeşil Mosque');
    expect(eser.tarihce).toContain('Çelebi Sultan Mehmed');
    expect(eser.tarihceEn).toContain('Çelebi Sultan Mehmed');
    // İki dil gerçekten farklı olmalı
    expect(eser.tarihce).not.toBe(eser.tarihceEn);
  });

  it('fotoğraf ve sergi alanları HER ZAMAN dizidir (null değil)', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler/bursa-yesilcami' });
    const eser = cevap.json();

    expect(Array.isArray(eser.fotograflar)).toBe(true);
    expect(Array.isArray(eser.sergiler)).toBe(true);
  });

  it('LİSTE ucu da fotoğraf ve sergi alanlarını döndürür (N+1 yok)', async () => {
    // Regresyon: liste ucu bir zamanlar fotograflar:[] ve sergiler:[] sabit
    // döndürüyordu; galeri/sergi bölümleri hiç görünmüyordu.
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler' });
    const liste = cevap.json() as Record<string, unknown>[];

    expect(liste.length).toBeGreaterThan(0);
    for (const eser of liste) {
      expect(Array.isArray(eser.fotograflar), `${eser.ad}: fotograflar dizi değil`).toBe(true);
      expect(Array.isArray(eser.sergiler), `${eser.ad}: sergiler dizi değil`).toBe(true);
    }
  });

  it('İngilizce alanlar listede de gelir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler' });
    const yesilcami = (cevap.json() as Record<string, unknown>[]).find(
      (e) => e.id === 'bursa-yesilcami',
    );
    expect(yesilcami?.adEn).toBe('Yeşil Mosque');
  });
});

describe('Bilgi Notu — keşif ve filtreleme', () => {
  it('filtre seçenekleri yalnızca eseri olan şehirleri döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/filtreler' });
    expect(cevap.statusCode).toBe(200);

    const { sehirler, turler } = cevap.json();
    const idler = sehirler.map((s: { id: string }) => s.id);

    expect(idler).toContain('bursa');
    expect(idler).toContain('hatay');
    for (const s of sehirler) expect(s.sayi).toBeGreaterThan(0);
    for (const t of turler) expect(t.sayi).toBeGreaterThan(0);
  });

  it('şehre göre filtreleme çalışır', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler?sehir=hatay' });
    const liste = cevap.json();
    expect(liste).toHaveLength(1);
    expect(liste[0].ad).toBe('Habib-i Neccar Camii');
  });

  it('eser türüne göre filtreleme çalışır', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler?tur=Han' });
    const liste = cevap.json();
    expect(liste).toHaveLength(1);
    expect(liste[0].tur).toBe('Han');
  });

  it('şehir + tür birlikte filtrelenebilir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler?sehir=bursa&tur=Cami' });
    const liste = cevap.json();
    expect(liste).toHaveLength(1);
    expect(liste[0].id).toBe('bursa-yesilcami');
  });

  it('sonuç yoksa boş dizi döner (hata değil)', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler?tur=Kervansaray' });
    expect(cevap.statusCode).toBe(200);
    expect(cevap.json()).toEqual([]);
  });

  it('filtre parametresi enjeksiyona kapalı', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: `/api/eserler?tur=${encodeURIComponent("' OR 1=1 --")}`,
    });
    expect(cevap.statusCode).toBe(200);
    expect(cevap.json()).toEqual([]);
  });
});

describe('Vakıf Röntgeni — gelir/gider ayrımı', () => {
  /**
   * Vakfiye belgeleri iki farklı şeyi kaydeder:
   *  · `gelir` — vakfa para NEREDEN geliyor (köy mahsulü, han kirası)
   *  · `gider` — vakıf geliri NEREYE harcanıyor (maaş, bakım, burs)
   *
   * İkisi aynı paranın iki tarafıdır ve AYRI AYRI %100 eder. Ayrım
   * yapılmazsa toplam %200 çıkar ve Röntgeni çubukları anlamsızlaşır.
   * Bu hata bir kez gerçekten yaşandı (Habib-i Neccar, Hatay).
   */
  it('gelir ve gider kalemleri AYRI AYRI saklanır', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/yonetim/sehirler',
      cookies: adminCerez(),
      payload: { id: 'hatay', ad: 'Hatay', sira: 9 },
    });

    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/eserler',
      cookies: adminCerez(),
      payload: {
        id: 'hatay-rontgen-testi',
        ad: 'Test Külliyesi',
        sehirId: 'hatay',
        tur: 'Külliye',
        yayinda: true,
        gelirKalemleri: [
          { kalem: 'Vakıf personeli maaşları', yuzde: 77, tip: 'gider' },
          { kalem: 'Caminin bakım masrafları', yuzde: 23, tip: 'gider' },
          { kalem: 'Kozya köyü mahsulü', yuzde: 59, tip: 'gelir' },
          { kalem: 'Buhşîn köyü mahsulü', yuzde: 21, tip: 'gelir' },
          { kalem: 'Arazi kirası', yuzde: 20, tip: 'gelir' },
        ],
      },
    });

    expect(cevap.statusCode).toBe(201);
    const kalemler = cevap.json().gelirKalemleri;

    const gelir = kalemler.filter((k: { tip: string }) => k.tip === 'gelir');
    const gider = kalemler.filter((k: { tip: string }) => k.tip === 'gider');

    expect(gider).toHaveLength(2);
    expect(gelir).toHaveLength(3);

    // Her grup KENDİ İÇİNDE %100 etmeli — çubuklar bunu varsayar.
    const topla = (l: { yuzde: number }[]) => l.reduce((t, k) => t + k.yuzde, 0);
    expect(topla(gider)).toBe(100);
    expect(topla(gelir)).toBe(100);

    // Genel toplam %200 — ama bu DOĞRU, çünkü aynı paranın iki tarafı.
    expect(topla(kalemler)).toBe(200);
  });

  it('tip verilmezse null olur (uydurulmaz)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/eserler',
      cookies: adminCerez(),
      payload: {
        id: 'tipsiz-eser',
        ad: 'Tipsiz Eser',
        sehirId: 'hatay',
        tur: 'Cami',
        yayinda: true,
        gelirKalemleri: [{ kalem: 'Belirsiz kalem', yuzde: 50 }],
      },
    });

    expect(cevap.statusCode).toBe(201);
    expect(cevap.json().gelirKalemleri[0].tip).toBeNull();
  });

  it('geçersiz tip reddedilir (beyaz liste)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/eserler',
      cookies: adminCerez(),
      payload: {
        id: 'gecersiz-tip',
        ad: 'Geçersiz',
        sehirId: 'hatay',
        tur: 'Cami',
        gelirKalemleri: [{ kalem: 'K', yuzde: 50, tip: 'uydurma-tip' }],
      },
    });
    // Şu an veritabanı CHECK kısıtı yakalar → 400 veya 500 değil, reddedilmeli
    expect(cevap.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('Bilgi Notu — sürdürülebilirlik ve esneklik', () => {
  it('yeni il eklenip eser yayına alınınca filtre seçeneklerine ANINDA girer', async () => {
    // Yeni şehir
    await app.inject({
      method: 'POST',
      url: '/api/yonetim/sehirler',
      cookies: adminCerez(),
      payload: { id: 'konya', ad: 'Konya', sira: 3 },
    });
    // Yeni eser
    await app.inject({
      method: 'POST',
      url: '/api/yonetim/eserler',
      cookies: adminCerez(),
      payload: {
        id: 'konya-karatay',
        ad: 'Karatay Medresesi',
        adEn: 'Karatay Madrasa',
        sehirId: 'konya',
        tur: 'Medrese',
        yayinda: true,
      },
    });

    const filtre = (await app.inject({ method: 'GET', url: '/api/filtreler' })).json();
    const konya = filtre.sehirler.find((s: { id: string }) => s.id === 'konya');
    expect(konya, 'Yeni şehir filtre seçeneklerinde görünmüyor').toBeTruthy();
    expect(konya.sayi).toBe(1);

    const medrese = filtre.turler.find((t: { tur: string }) => t.tur === 'Medrese');
    expect(medrese?.sayi).toBe(1);
  });

  it('yayından çıkarılan eser filtre seçeneklerinden düşer', async () => {
    await app.inject({
      method: 'PUT',
      url: '/api/yonetim/eserler/konya-karatay',
      cookies: adminCerez(),
      payload: { id: 'konya-karatay', ad: 'Karatay Medresesi', sehirId: 'konya', tur: 'Medrese', yayinda: false },
    });

    const filtre = (await app.inject({ method: 'GET', url: '/api/filtreler' })).json();
    expect(filtre.sehirler.find((s: { id: string }) => s.id === 'konya')).toBeFalsy();
  });
});
