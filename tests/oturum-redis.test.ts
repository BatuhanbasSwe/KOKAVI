/**
 * Redis (Upstash REST) oturum ve işlem günlüğü testleri.
 *
 * AMAÇ: Üretimde (Vercel) oturumlar ve yönetim yazmaları Upstash Redis'te
 * tutulur. Bu test, gerçek Upstash'e çıkmadan REST komutlarının doğru
 * kullanıldığını ve iki sunucu örneğinin AYNI oturumu gördüğünü kanıtlar:
 * yerel `session` tablosu silinse bile Redis'teki oturum geçerlidir.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Sahte Upstash deposu: string anahtarlar + küme anahtarları. */
class SahteUpstash {
  readonly metinler = new Map<string, string>();
  readonly kumeler = new Map<string, Set<string>>();

  /** Upstash REST komutunu uygular; bilinmeyen komutta hata fırlatır. */
  komut(parcalar: string[]): unknown {
    const [komutHam, ...argumanlar] = parcalar;
    const komut = (komutHam ?? '').toUpperCase();
    const [anahtar = '', deger = ''] = argumanlar;

    switch (komut) {
      case 'SET': {
        this.metinler.set(anahtar, deger);
        return 'OK';
      }
      case 'GET':
        return this.metinler.get(anahtar) ?? null;
      case 'DEL': {
        let sayi = 0;
        for (const k of argumanlar) {
          if (this.metinler.delete(k)) sayi += 1;
          if (this.kumeler.delete(k)) sayi += 1;
        }
        return sayi;
      }
      case 'SADD': {
        const kume = this.kumeler.get(anahtar) ?? new Set<string>();
        let eklenen = 0;
        for (const uye of argumanlar.slice(1)) {
          if (!kume.has(uye)) {
            kume.add(uye);
            eklenen += 1;
          }
        }
        this.kumeler.set(anahtar, kume);
        return eklenen;
      }
      case 'SMEMBERS':
        return [...(this.kumeler.get(anahtar) ?? [])];
      case 'PEXPIRE':
      case 'EXPIRE':
        return this.metinler.has(anahtar) || this.kumeler.has(anahtar) ? 1 : 0;
      case 'RPUSH': {
        const mevcut = (() => {
          const ham = this.metinler.get(anahtar);
          return ham ? (JSON.parse(ham) as string[]) : [];
        })();
        mevcut.push(...argumanlar.slice(1));
        this.metinler.set(anahtar, JSON.stringify(mevcut));
        return mevcut.length;
      }
      case 'LRANGE': {
        const mevcut = (() => {
          const ham = this.metinler.get(anahtar);
          return ham ? (JSON.parse(ham) as string[]) : [];
        })();
        const bas = Number(argumanlar[1] ?? 0);
        const son = Number(argumanlar[2] ?? -1);
        return mevcut.slice(bas, son === -1 ? undefined : son + 1);
      }
      default:
        throw new Error(`Sahte Upstash bilinmeyen komut: ${komut}`);
    }
  }
}

let geciciDizin: string;
let depo: SahteUpstash;
let baglantiKapat: () => Promise<void>;
let oturum: typeof import('../server/auth/oturum.ts');
let gunlukModulu: typeof import('../server/yonetim/gunluk.ts');
let dbModulu: typeof import('../server/db/index.ts');

beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-redis-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
  process.env.KOKAVI_RATE_LIMIT_OFF = '1';
  process.env.UPSTASH_REDIS_REST_URL = 'https://sahte-upstash.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'sahte-token';

  depo = new SahteUpstash();
  vi.stubGlobal('fetch', async (_url: string, secenekler?: { body?: string }) => {
    const parcalar = JSON.parse(secenekler?.body ?? '[]') as string[];
    let sonuc: unknown;
    try {
      sonuc = depo.komut(parcalar);
    } catch (hata) {
      return {
        ok: false,
        json: async () => ({ error: hata instanceof Error ? hata.message : 'hata' }),
      };
    }
    return { ok: true, json: async () => ({ result: sonuc }) };
  });

  dbModulu = await import('../server/db/index.ts');
  baglantiKapat = dbModulu.baglantiKapat;
  await dbModulu.semaGarantiEt();
  oturum = await import('../server/auth/oturum.ts');
  gunlukModulu = await import('../server/yonetim/gunluk.ts');
}, 90_000);

afterAll(async () => {
  vi.unstubAllGlobals();
  await baglantiKapat?.();
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe('Redis oturum deposu', () => {
  it('giriş oturumu Redis’e yazılır', async () => {
    await oturum.kullaniciOlustur({
      email: 'redis-admin@test.local',
      ad: 'Redis Yönetici',
      parola: 'GucluParola1',
      rol: 'admin',
    });

    const giris = await oturum.girisYap('redis-admin@test.local', 'GucluParola1');
    expect(giris).not.toBeNull();

    const oturumAnahtarlari = [...depo.metinler.keys()].filter((k) => k.startsWith('kokavi:oturum:'));
    expect(oturumAnahtarlari.length).toBeGreaterThan(0);
    git = giris!.token;
  });

  let git = '';

  it('YEREL oturum kaydı silinse bile Redis oturumu geçerli (ikinci sunucu örneği)', async () => {
    await dbModulu.sorgu(`DELETE FROM session`);
    expect(await dbModulu.tekSorgu(`SELECT token_hash FROM session`)).toBeNull();

    const kullanici = await oturum.oturumDogrula(git);
    expect(kullanici?.email).toBe('redis-admin@test.local');
  });

  it('çıkış hem yerel hem Redis oturumunu kapatır', async () => {
    await oturum.oturumBitir(git);
    expect(await oturum.oturumDogrula(git)).toBeNull();
    const kalan = [...depo.metinler.keys()].filter((k) => k.startsWith('kokavi:oturum:'));
    expect(kalan.length).toBe(0);
  });

  it('pasifleştirme kullanıcının Redis oturumlarını da düşürür', async () => {
    const giris = await oturum.girisYap('redis-admin@test.local', 'GucluParola1');
    expect(giris).not.toBeNull();
    const kullanici = await oturum.kullaniciGetir(
      (await oturum.girisYap('redis-admin@test.local', 'GucluParola1'))!.kullanici.id,
    );

    await oturum.kullaniciOturumlariniBitir(kullanici!.id);
    expect(await oturum.oturumDogrula(giris!.token)).toBeNull();
  });
});

describe('Redis işlem günlüğü', () => {
  it('Redis varsa günlük etkindir', () => {
    expect(gunlukModulu.gunlukEtkinMi()).toBe(true);
    expect(gunlukModulu.gunlukAl()).not.toBeNull();
  });

  it('bir örneğin yazdığı işlem ikinci örnekte uygulanır', async () => {
    await dbModulu.sorgu(`DELETE FROM city WHERE id = 'redis-sehir'`);

    await gunlukModulu.gunlukYaz({
      t: 'sehir-kaydet',
      d: { id: 'redis-sehir', ad: 'Redis Şehir', sira: 7 },
    });

    // İkinci sunucu örneği: aynı Redis deposundan okuyan yeni bir Gunluk.
    const ikinci = new gunlukModulu.Gunluk(new gunlukModulu.RedisGunlukDeposu());
    expect(await ikinci.senkronize()).toBe(1);

    const sehir = await dbModulu.tekSorgu<{ id: string; ad: string }>(
      `SELECT id, ad FROM city WHERE id = 'redis-sehir'`,
    );
    expect(sehir?.ad).toBe('Redis Şehir');

    // Aynı işlem tekrar uygulanmaz.
    expect(await ikinci.senkronize()).toBe(0);
  });
});
