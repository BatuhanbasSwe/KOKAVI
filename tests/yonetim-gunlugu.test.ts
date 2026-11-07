/**
 * Yönetim işlem günlüğü testleri.
 *
 * AMAÇ: Vercel'de her sunucu örneği ayrı geçici PGlite kopyasıyla çalışır.
 * Yönetim yazmalarının (eser/kullanıcı/sınıf/sayaç) Redis günlüğü üzerinden
 * BÜTÜN örneklere ulaştığını kanıtlamak. Testte iki `Gunluk` örneği aynı bellek
 * deposunu paylaşarak iki sunucu örneğini taklit eder.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DersGirdisi } from '../server/repo/ders.ts';

let geciciDizin: string;
let baglantiKapat: () => Promise<void>;

let eserRepo: typeof import('../server/repo/eser.ts');
let yolRepo: typeof import('../server/repo/yol.ts');
let dersRepo: typeof import('../server/repo/ders.ts');
let sinifRepo: typeof import('../server/repo/sinif.ts');
let oturum: typeof import('../server/auth/oturum.ts');
let gunlukModulu: typeof import('../server/yonetim/gunluk.ts');
let parolaHashle: typeof import('../server/auth/parola.ts').parolaHashle;

let a: InstanceType<typeof gunlukModulu.Gunluk>;
let b: InstanceType<typeof gunlukModulu.Gunluk>;

beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-gunluk-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
  process.env.KOKAVI_RATE_LIMIT_OFF = '1';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;

  const dbModulu = await import('../server/db/index.ts');
  baglantiKapat = dbModulu.baglantiKapat;
  await dbModulu.semaGarantiEt();

  eserRepo = await import('../server/repo/eser.ts');
  yolRepo = await import('../server/repo/yol.ts');
  dersRepo = await import('../server/repo/ders.ts');
  sinifRepo = await import('../server/repo/sinif.ts');
  oturum = await import('../server/auth/oturum.ts');
  gunlukModulu = await import('../server/yonetim/gunluk.ts');
  parolaHashle = (await import('../server/auth/parola.ts')).parolaHashle;

  // Temel içerik: bir şehir ve bir ünite (ders kaydı bunlara bağlanır).
  await yolRepo.sehirKaydet({ id: 'bursa', ad: 'Bursa', sira: 1 });
  await yolRepo.uniteKaydet({ id: 'bursa-u1', sehirId: 'bursa', ad: 'Bursa Ünite 1', sira: 1 });

  // İki `Gunluk` örneği aynı depoyu paylaşır = iki sunucu örneği.
  const bellek = new gunlukModulu.BellekGunlukDeposu();
  a = new gunlukModulu.Gunluk(bellek);
  b = new gunlukModulu.Gunluk(bellek);
}, 90_000);

afterAll(async () => {
  await baglantiKapat?.();
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
});

describe('Yönetim günlüğü — iki sunucu örneği', () => {
  it('Redis yapılandırılmamışsa günlük devre dışıdır (yerel davranış bozulmaz)', () => {
    expect(gunlukModulu.gunlukAl()).toBeNull();
    expect(gunlukModulu.gunlukEtkinMi()).toBe(false);
  });

  it('örnek A eser ekler, örnek B senkronla aynı eseri görür', async () => {
    expect(await eserRepo.eserGetir('qa-eser')).toBeNull();

    const yazildi = await a.yaz({
      t: 'eser-kaydet',
      d: {
        id: 'qa-eser',
        ad: 'QA Eseri',
        sehirId: 'bursa',
        tur: 'Cami',
        yayinda: true,
        kaynaklar: [{ kunye: 'Kaynak', url: 'https://ornek.test' }],
      },
    });
    expect(yazildi).toBe(true);

    // B henüz senkronlamadı: kendi kopyasında eser yok.
    expect(await eserRepo.eserGetir('qa-eser')).toBeNull();

    expect(await b.senkronize()).toBe(1);
    const eser = await eserRepo.eserGetir('qa-eser');
    expect(eser).not.toBeNull();
    expect(eser!.ad).toBe('QA Eseri');
    expect(eser!.yayinda).toBe(true);
  });

  it('örnek A düzenlemesi örnek B’de görünür (yayından kaldırma dahil)', async () => {
    await a.yaz({
      t: 'eser-kaydet',
      d: { id: 'qa-eser', ad: 'QA Eseri (güncel)', sehirId: 'bursa', tur: 'Cami', yayinda: false },
    });
    await b.senkronize();

    const eser = await eserRepo.eserGetir('qa-eser');
    expect(eser!.ad).toBe('QA Eseri (güncel)');
    expect(eser!.yayinda).toBe(false);
  });

  it('aynı işlem iki kez uygulanmaz (senkron idempotent)', async () => {
    await b.senkronize();
    await b.senkronize();
    expect(await eserRepo.eserGetir('qa-eser')).not.toBeNull();
  });

  it('silme işlemi de örnek B’ye ulaşır', async () => {
    await a.yaz({ t: 'eser-sil', d: { id: 'qa-eser' } });
    await b.senkronize();
    expect(await eserRepo.eserGetir('qa-eser')).toBeNull();
  });

  it('örnek A’nın oluşturduğu kullanıcı örnek B’de giriş yapabilir', async () => {
    const parolaHash = parolaHashle('GucluParola1');
    await a.yaz({
      t: 'kullanici-ekle',
      d: {
        id: 'qa-kullanici',
        email: 'qa-ogretmen@test.local',
        ad: 'QA Öğretmen',
        parolaHash,
        rol: 'ogretmen',
      },
    });

    // B senkronlamadan giriş başarısız.
    expect(await oturum.girisYap('qa-ogretmen@test.local', 'GucluParola1')).toBeNull();

    await b.senkronize();
    const giris = await oturum.girisYap('qa-ogretmen@test.local', 'GucluParola1');
    expect(giris).not.toBeNull();
    expect(giris!.kullanici.rol).toBe('ogretmen');
  });

  it('pasifleştirme tüm örneklerde girişi engeller', async () => {
    await a.yaz({ t: 'kullanici-durum', d: { id: 'qa-kullanici', aktif: false } });
    await b.senkronize();

    expect(await oturum.girisYap('qa-ogretmen@test.local', 'GucluParola1')).toBeNull();
    const kullanici = await oturum.kullaniciGetir('qa-kullanici');
    expect(kullanici!.aktif).toBe(false);
  });

  it('sınıf kaydı örnek B’de açılır', async () => {
    await a.yaz({
      t: 'sinif-ekle',
      d: { kod: 'QAA-2345', ogretmenId: 'qa-kullanici', ad: 'QA Sınıfı' },
    });
    await b.senkronize();

    const sinif = await sinifRepo.sinifGetir('QAA-2345');
    expect(sinif).not.toBeNull();
    expect(sinif!.ad).toBe('QA Sınıfı');
  });

  it('anonim tamamlama sayacı örnekler arasında birleşir', async () => {
    // Sayacın gerçek bir esere/derse bağlanması gerekir.
    await eserRepo.eserKaydet({
      id: 'qa-eser-sinif',
      ad: 'QA Sınıf Eseri',
      sehirId: 'bursa',
      tur: 'Cami',
    });

    const dersGirdisi = {
      id: 'qa-ders-sinif',
      uniteId: 'bursa-u1',
      eserId: 'qa-eser-sinif',
      sira: 1,
      merak: {},
      baglam: {},
      perspektif: {},
      yansima: {},
      egzersizler: [
        { id: 'qa-ders-sinif-e1', tip: 'eser-tani', veri: { secenekler: ['A'], dogruIndex: 0 }, kaynak: null },
      ],
    } as unknown as DersGirdisi;
    await dersRepo.dersKaydet(dersGirdisi);

    // A örneği sayacı yazar (gerçek uygulamada route önce DB'ye yazar, sonra günlüğe ekler).
    await sinifRepo.tamamlamaKaydet('QAA-2345', 'qa-ders-sinif');
    await a.yaz({ t: 'sinif-tamamla', d: { kod: 'QAA-2345', dersId: 'qa-ders-sinif' } });

    // B örneği günlüğü uygular; sayaç 2 olur (A'nın kaydı + B'nin uygulaması).
    await b.senkronize();
    let ilerleme = await sinifRepo.sinifIlerlemesi('QAA-2345');
    expect(ilerleme!.toplamTamamlama).toBe(2);

    // A kendi yazdığı işlemi TEKRAR uygulamamalı.
    await a.senkronize();
    ilerleme = await sinifRepo.sinifIlerlemesi('QAA-2345');
    expect(ilerleme!.toplamTamamlama).toBe(2);
  });
});

describe('Atomic kayıt (transaction)', () => {
  it('ders yazımı yarım kalmaz: çakışan egzersiz kimliğinde eski ders korunur', async () => {
    await eserRepo.eserKaydet({ id: 'qa-eser-tx', ad: 'QA Eser TX', sehirId: 'bursa', tur: 'Cami' });

    const ders = (id: string, sira: number) =>
      ({
        id,
        uniteId: 'bursa-u1',
        eserId: 'qa-eser-tx',
        sira,
        merak: {},
        baglam: {},
        perspektif: {},
        yansima: {},
        egzersizler: [
          { id: 'qa-egzersiz-paylasilan', tip: 'eser-tani', veri: {}, kaynak: null },
        ],
      }) as unknown as DersGirdisi;

    await dersRepo.dersKaydet(ders('qa-ders-a', 9));
    expect(await dersRepo.dersGetir('qa-ders-a')).not.toBeNull();

    // Aynı egzersiz kimliği → duplicate key. Transaction sayesinde:
    // ikinci ders HİÇ yazılmamalı ve ilk dersin egzersizi silinmemeli.
    await expect(dersRepo.dersKaydet(ders('qa-ders-b', 10))).rejects.toThrow();

    expect(await dersRepo.dersGetir('qa-ders-b')).toBeNull();
    const korunan = await dersRepo.dersGetir('qa-ders-a');
    expect(korunan!.egzersizler.length).toBe(1);
  });
});
