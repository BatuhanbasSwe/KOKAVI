/**
 * Uçtan uca içerik ekleme akışı testi.
 *
 * Şartname 5.1.1: "Sistem yeni vakıf eserleri eklenmesine uygun kurgulanmalı."
 * Şartname 5.1.2: mimari "yeni eser, yeni şehir, yeni içerik türü eklenebilir olmalı."
 * PDF KATMAN 04: "Yönetim paneli — eser ekleme/düzenleme, yeni şehir ünitesi tanımlama."
 *
 * Bu test, jürinin "yeni şehir eklemek ne kadar sürer?" sorusunun CANLI kanıtıdır:
 * yeni şehir → ünite → eser → ders zinciri API üzerinden kurulur ve öğrenme
 * yolunda belirdiği doğrulanır. Hiçbir kod değişikliği gerekmez.
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
/** Zincirin tamamı gerçek bir yönetici oturumuyla çalışır — güvenlik atlanmaz. */
let adminBelirtec = '';
const adminCerez = () => ({ kokavi_oturum: adminBelirtec });

beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-akis-'));
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

/** Test verisi: yeni bir şehir ve onun ilk eseri. */
const YENI_SEHIR = { id: 'kutahya', ad: 'Kütahya', sira: 3 };
const YENI_UNITE = {
  id: 'kutahya-u1',
  sehirId: 'kutahya',
  ad: 'Kütahya Ünite 1',
  sira: 1,
  aciklama: 'Kütahya vakıf eserleri',
};
const YENI_ESER = {
  id: 'kutahya-ulu-camii',
  ad: 'Kütahya Ulu Camii',
  sehirId: 'kutahya',
  tur: 'Cami',
  ilce: 'Merkez',
  bani: 'Yıldırım Bayezid',
  yapimYili: '1381-1401',
  vakfiyeAmaci: 'Şehir merkezinde ibadet mekânı',
  hizmet: 'Cemaate ibadet imkânı',
  bugunNeOldu: 'Cami olarak ibadete açık',
  yayinda: true,
  kaynaklar: [{ kunye: 'TDV İslam Ansiklopedisi, "Kütahya Ulu Camii"' }],
  gelirKalemleri: [{ kalem: 'Vakıf dükkân kiraları', yuzde: null }],
};
const YENI_DERS = {
  id: 'kutahya-u1-d1',
  uniteId: 'kutahya-u1',
  eserId: 'kutahya-ulu-camii',
  sira: 1,
  merak: {
    soru: 'Bir caminin onarım parası nereden geliyordu?',
    secenekler: ['Devlet bütçesinden', 'Vakfın dükkân kiralarından', 'Cemaatin bağışlarından'],
    kopru: 'Tahminin kaydedildi — hiçbir tahmin yanlış değil.',
  },
  baglam: {
    baslik: 'Vakıf nedir?',
    metin:
      'Bir kişi malını satılamaz şekilde dondurup gelirini kalıcı bir hayır işine bağlar. ' +
      'Buna vakıf denir. Yazılı sözleşmesine vakfiye denir.',
    kavramlar: [
      { ad: 'HAYRAT', aciklama: 'Hizmet verir', ornek: 'Cami, medrese' },
      { ad: 'AKAR', aciklama: 'Gelir getirir', ornek: 'Dükkân, han' },
    ],
    kapanis: 'Bu camiyi ayakta tutan şey neydi? Görelim.',
  },
  perspektif: {
    baslik: 'Sen bir vakıf görevlisisin',
    diyalog: [
      { kim: 'ANLATICI', metin: 'Yıl 1500. Caminin çatısı akıyor.' },
      { kim: 'SEN', metin: 'Onarım için para bulmam lazım.', ben: true },
    ],
    soru: 'Parayı nereden bulursun?',
    secenekler: [
      {
        metin: 'Vakfın dükkânlarından gelen kiradan',
        sonuc: 'Doğru. Vakfın akarı onarımı finanse eder.',
        dogruMu: true,
      },
      {
        metin: 'Cemaatten zorla toplarım',
        sonuc: 'Gerçekte vakıflar bunu yapmazdı; gelir akardan gelirdi.',
        dogruMu: false,
      },
    ],
  },
  yansima: {
    ozet: 'Vakıf eseri kendi kendini finanse eder.',
    rontgenSorusu: 'Bu caminin geliri nereye gidiyordu?',
    rontgenAciklama: 'Bu eserin vakfiyesindeki gelir dağılımı oranları belgelenememiştir.',
    kaynakKunye: 'TDV İslam Ansiklopedisi, "Kütahya Ulu Camii"',
  },
  egzersizler: [
    {
      id: 'kutahya-u1-d1-e1',
      tip: 'eslestir',
      veri: {
        yonerge: 'Hayrat mı, akar mı?',
        kategoriler: [
          { id: 'hayrat', ad: 'Hayrat' },
          { id: 'akar', ad: 'Akar' },
        ],
        ogeler: [
          { metin: 'Cami', kategoriId: 'hayrat' },
          { metin: 'Medrese', kategoriId: 'hayrat' },
          { metin: 'Dükkân', kategoriId: 'akar' },
          { metin: 'Han', kategoriId: 'akar' },
        ],
      },
      kaynak: 'TDV İslam Ansiklopedisi',
    },
    {
      id: 'kutahya-u1-d1-e2',
      tip: 'sirala',
      veri: {
        yonerge: 'Gelirleri büyükten küçüğe sırala.',
        dogruSira: ['Vakıf köyleri', 'Dükkân kiraları', 'Bağ öşrü'],
      },
      kaynak: 'Vakfiye kaydı',
    },
    {
      id: 'kutahya-u1-d1-e3',
      tip: 'bosluk-doldur',
      veri: {
        yonerge: 'Boşluğu doldur.',
        metin: 'Vakfın gelir getiren mülklerine ___ denir.',
        cevap: 'akar',
        secenekler: ['akar', 'hayrat', 'vakfiye'],
      },
      kaynak: 'TDV İslam Ansiklopedisi',
    },
    {
      id: 'kutahya-u1-d1-e4',
      tip: 'eser-tani',
      veri: {
        yonerge: 'Betimlenen eseri seç.',
        betimleme: 'Şehrin merkezinde, Yıldırım Bayezid döneminde yaptırılmış büyük bir ibadet mekânı.',
        secenekler: ['Kütahya Ulu Camii', 'Yeşilcami', 'Hisar Camii'],
        dogruIndex: 0,
      },
      kaynak: 'TDV İslam Ansiklopedisi',
    },
  ],
};

describe('yeni şehir → ünite → eser → ders zinciri', () => {
  it('1) yeni şehir eklenir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/sehirler',
      payload: YENI_SEHIR,
    });
    expect(cevap.statusCode).toBe(201);
  });

  it('2) yeni ünite tanımlanır (PDF KATMAN 04)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/uniteler',
      payload: YENI_UNITE,
    });
    expect(cevap.statusCode).toBe(201);
  });

  it('3) yeni eser eklenir ve gelir durumu doğru hesaplanır', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/eserler',
      payload: YENI_ESER,
    });
    expect(cevap.statusCode).toBe(201);

    const eser = cevap.json();
    expect(eser.ad).toBe('Kütahya Ulu Camii');
    // Yüzde null verildi → oran uydurulmaz, durum "belge-bulunamadi" olur
    expect(eser.gelirDagilimiDurumu).toBe('belge-bulunamadi');
    expect(eser.gelirKalemleri[0].yuzde).toBeNull();
  });

  it('4) ders eklenir (beş adım + dört egzersiz)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/dersler',
      payload: YENI_DERS,
    });
    expect(cevap.statusCode).toBe(201);
    expect(cevap.json().egzersizler).toHaveLength(4);
  });

  it('5) yeni eser ÖĞRENME YOLUNDA belirir — kod değişikliği gerekmedi', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/yol' });
    expect(cevap.statusCode).toBe(200);

    const yol = cevap.json() as {
      sehirler: { sehirId: string; ad: string; uniteler: { uniteId: string; dersler: unknown[] }[] }[];
    };

    const kutahya = yol.sehirler.find((s) => s.sehirId === 'kutahya');
    expect(kutahya, 'Yeni şehir öğrenme yolunda görünmüyor').toBeTruthy();
    expect(kutahya!.ad).toBe('Kütahya');
    expect(kutahya!.uniteler[0]!.uniteId).toBe('kutahya-u1');
    expect(kutahya!.uniteler[0]!.dersler).toHaveLength(1);
  });

  it('6) yeni ders tam içerikle okunabilir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/dersler/kutahya-u1-d1' });
    expect(cevap.statusCode).toBe(200);

    const ders = cevap.json();
    expect(ders.merak.secenekler).toHaveLength(3);
    expect(ders.baglam.kavramlar).toHaveLength(2);
    expect(ders.perspektif.secenekler.filter((s: { dogruMu: boolean }) => s.dogruMu)).toHaveLength(1);
    expect(ders.egzersizler.map((e: { tip: string }) => e.tip).sort()).toEqual([
      'bosluk-doldur',
      'eser-tani',
      'eslestir',
      'sirala',
    ]);
    expect(ders.yansima.kaynakKunye).toContain('TDV');
  });

  it('7) yayında olmayan eser yolunda görünmez (içerik kontrolü çalışıyor)', async () => {
    // Eseri yayından çıkar
    await app.inject({
      method: 'PUT',
      cookies: adminCerez(), url: '/api/yonetim/eserler/kutahya-ulu-camii',
      payload: { ...YENI_ESER, yayinda: false },
    });

    const cevap = await app.inject({ method: 'GET', url: '/api/yol' });
    const yol = cevap.json() as { sehirler: { sehirId: string }[] };
    expect(yol.sehirler.find((s) => s.sehirId === 'kutahya')).toBeFalsy();
  });

  it('8) geçersiz ders reddedilir (egzersizsiz ders kaydedilemez)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/dersler',
      payload: { ...YENI_DERS, id: 'gecersiz-ders', egzersizler: [] },
    });
    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().hata).toContain('egzersiz');
  });

  it('9) geçersiz egzersiz tipi reddedilir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      cookies: adminCerez(), url: '/api/yonetim/dersler',
      payload: {
        ...YENI_DERS,
        id: 'gecersiz-ders-2',
        egzersizler: [{ id: 'x-e1', tip: 'uydurma-tip', veri: {} }],
      },
    });
    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().hata).toContain('tip');
  });
});
