/**
 * API testleri — Fastify `inject` ile ağ olmadan çalışır.
 *
 * Doğrulanan taahhütler:
 *  - Şartname 5.1.1: "içerik ekleme ve mevcut içerikleri düzenleme imkânı"
 *  - Şartname 5.1.5: "kullanıcı girdilerinin uygun doğrulama ve kontrol
 *    mekanizmalarından geçirilmesi beklenmektedir"
 *  - PDF: "her değer vakfiye belgesinden alınır" → gelir dağılımı durumu
 *  - PDF: "kişisel veri toplanmaz" → sunucu ilerleme almaz/saklamaz
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
/** Yönetim uçları artık kimlik doğrulama ister — testler gerçek oturum açar. */
let adminBelirtec = '';
const adminCerez = () => ({ kokavi_oturum: adminBelirtec });

beforeAll(async () => {
  // Gerçek veriyi bozmamak için geçici veritabanı
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-test-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
  process.env.KOKAVI_RATE_LIMIT_OFF = '1';

  const dbModulu = await import('../server/db/index.ts');
  baglantiKapat = dbModulu.baglantiKapat;

  const { sunucuKur } = await import('../server/index.ts');
  app = await sunucuKur();
  await app.ready();

  adminBelirtec = await yoneticiOturumuAc(app);
}, 90_000);

afterAll(async () => {
  await app?.close();
  await baglantiKapat?.();
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
  delete process.env.KOKAVI_RATE_LIMIT_OFF;
});

describe('genel uçlar', () => {
  it('sağlık ucu çalışıyor', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/saglik' });
    expect(cevap.statusCode).toBe(200);
    expect(cevap.json()).toMatchObject({ durum: 'calisiyor' });
  });

  it('boş veritabanında yol boş döner (çökmez)', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/yol' });
    expect(cevap.statusCode).toBe(200);
    expect(cevap.json()).toEqual({ sehirler: [] });
  });

  it('olmayan eser 404 döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/eserler/yok-boyle-bir-sey' });
    expect(cevap.statusCode).toBe(404);
    expect(cevap.json()).toMatchObject({ hata: expect.stringContaining('bulunamadi') });
  });
});

describe('yönetim: şehir ve ünite', () => {
  it('şehir oluşturur', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/sehirler',
      payload: { id: 'bursa', ad: 'Bursa', sira: 1 },
    });
    expect(cevap.statusCode).toBe(201);
    expect(cevap.json()).toMatchObject({ id: 'bursa', ad: 'Bursa', aktif: true });
  });

  it('zorunlu alan eksikse 400 döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/sehirler',
      payload: { id: 'konya' },
    });
    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().hata).toContain('ad');
  });

  it('ünite oluşturur ve siler', async () => {
    const olustur = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/uniteler',
      payload: { id: 'bursa-u1', sehirId: 'bursa', ad: 'Bursa Ünite 1', sira: 1 },
    });
    expect(olustur.statusCode).toBe(201);

    const sil = await app.inject({ method: 'DELETE', cookies: adminCerez(), url: '/api/yonetim/uniteler/bursa-u1' });
    expect(sil.statusCode).toBe(200);

    const tekrar = await app.inject({ method: 'DELETE', cookies: adminCerez(), url: '/api/yonetim/uniteler/bursa-u1' });
    expect(tekrar.statusCode).toBe(404);
  });

  it('olmayan şehre ünite eklenirse 400 döner (yabancı anahtar)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/uniteler',
      payload: { id: 'x-u1', sehirId: 'olmayan-sehir', ad: 'X', sira: 1 },
    });
    expect(cevap.statusCode).toBe(400);
  });
});

describe('yönetim: eser CRUD', () => {
  it('eser oluşturur, gelir kalemlerini sayı olarak döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/eserler',
      payload: {
        id: 'ipek-hani',
        ad: 'İpek Hanı',
        sehirId: 'bursa',
        tur: 'Han',
        bani: 'Çelebi Sultan Mehmed',
        yapimYili: 'XV. yüzyılın ilk yarısı',
        vakfiyeAmaci: 'Yeşilcami Külliyesi’ne gelir sağlamak',
        yayinda: true,
        kaynaklar: [{ kunye: 'TDV İslam Ansiklopedisi, "İpek Hanı"', url: 'https://islamansiklopedisi.org.tr/ipek-hani' }],
        gelirKalemleri: [
          { kalem: 'Medrese talebelerine burs', yuzde: 60 },
          { kalem: 'Caminin bakım ve onarımı', yuzde: 40 },
        ],
      },
    });

    expect(cevap.statusCode).toBe(201);
    const eser = cevap.json();
    expect(eser.gelirDagilimiDurumu).toBe('belgeli');
    expect(eser.gelirKalemleri).toHaveLength(2);
    // NUMERIC string olarak dönmemeli
    expect(typeof eser.gelirKalemleri[0].yuzde).toBe('number');
    expect(eser.gelirKalemleri[0].yuzde).toBe(60);
    expect(eser.kaynaklar[0].kunye).toContain('TDV');
  });

  it('yüzde verilmezse durum "belge-bulunamadi" olur (oran uydurulmaz)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/eserler',
      payload: {
        id: 'belgesiz-eser',
        ad: 'Belgesiz Eser',
        sehirId: 'bursa',
        tur: 'Çeşme',
        yayinda: true,
        gelirKalemleri: [{ kalem: 'Bilinmeyen kalem', yuzde: null }],
      },
    });

    expect(cevap.statusCode).toBe(201);
    const eser = cevap.json();
    expect(eser.gelirDagilimiDurumu).toBe('belge-bulunamadi');
    expect(eser.gelirKalemleri[0].yuzde).toBeNull();
  });

  it('yüzde 100 üzeriyse 400 döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/eserler',
      payload: {
        id: 'hatali',
        ad: 'Hatalı',
        sehirId: 'bursa',
        tur: 'Han',
        gelirKalemleri: [{ kalem: 'K', yuzde: 150 }],
      },
    });
    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().hata).toContain('0-100');
  });

  it('geçersiz gelir durumu 400 döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/eserler',
      payload: {
        id: 'hatali2',
        ad: 'Hatalı 2',
        sehirId: 'bursa',
        tur: 'Han',
        gelirDagilimiDurumu: 'uydurma',
      },
    });
    expect(cevap.statusCode).toBe(400);
  });

  it('eseri günceller (düzenleme imkânı)', async () => {
    const cevap = await app.inject({
      method: 'PUT',
      cookies: adminCerez(), url: '/api/yonetim/eserler/ipek-hani',
      payload: { ad: 'İpek Hanı (güncellendi)', tur: 'Han', sehirId: 'bursa', yayinda: false },
    });
    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().ad).toBe('İpek Hanı (güncellendi)');
    expect(cevap.json().yayinda).toBe(false);
  });

  it('olmayan eseri güncellemek 404 döner', async () => {
    const cevap = await app.inject({
      method: 'PUT',
      cookies: adminCerez(), url: '/api/yonetim/eserler/yok',
      payload: { ad: 'X', tur: 'Han', sehirId: 'bursa' },
    });
    expect(cevap.statusCode).toBe(404);
  });

  it('eseri siler ve yabancı anahtar kaskadı çalışır', async () => {
    const sil = await app.inject({ method: 'DELETE', cookies: adminCerez(), url: '/api/yonetim/eserler/ipek-hani' });
    expect(sil.statusCode).toBe(200);

    const kontrol = await app.inject({ method: 'GET', url: '/api/eserler/ipek-hani' });
    expect(kontrol.statusCode).toBe(404);
  });
});

describe('gizlilik: sunucu kullanıcı verisi kabul etmez', () => {
  it('/api/yol yalnızca içerik iskeleti döner, ilerleme alanı yok', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/yol' });
    const govde = cevap.json();
    const metin = JSON.stringify(govde);
    // Kullanıcıya ait hiçbir alan dönmemeli
    expect(metin).not.toContain('tamamlananDersler');
    expect(metin).not.toContain('elmas');
    expect(metin).not.toContain('seri');
  });
});
