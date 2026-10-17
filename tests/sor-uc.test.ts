/**
 * POST /api/sor: anahtarsız 503; geçersiz girdi 400; geçerli cevap künyeli;
 * kaynaksız model çıktısı "bilmiyorum"a düşer; kişisel veri modele gitmez;
 * soru günlüğe yazılmaz. Model sahte (gerçek API çağrılmaz).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Parca } from '../server/sor/bul';
import type { ModelCevabi } from '../server/sor/denetle';

let app: FastifyInstance;
let anahtarsiz: FastifyInstance;
let geciciDizin: string;
let baglantiKapat: () => Promise<void>;
const modeleGiden: { soru: string; parcalar: Parca[] }[] = [];
let siradakiCevap: ModelCevabi = { bilmiyorum: false, cumleler: [] };
const loglar: string[] = [];

beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-sor-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
  process.env.KOKAVI_RATE_LIMIT_OFF = '1';
  const dbModulu = await import('../server/db/index.ts');
  baglantiKapat = dbModulu.baglantiKapat;
  const { sunucuKur } = await import('../server/index.ts');
  app = await sunucuKur({
    sor: {
      anahtarVar: () => true,
      cevapla: async (soru, parcalar) => {
        modeleGiden.push({ soru, parcalar });
        return siradakiCevap;
      },
    },
  });
  app.addHook('onSend', async (istek, _c, yuk) => {
    loglar.push(JSON.stringify({ url: istek.url }));
    return yuk;
  });
  await app.ready();
  anahtarsiz = await sunucuKur({ sor: { anahtarVar: () => false } });
  await anahtarsiz.ready();
}, 90_000);

afterAll(async () => {
  await app?.close();
  await anahtarsiz?.close();
  await baglantiKapat?.();
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
  delete process.env.KOKAVI_RATE_LIMIT_OFF;
});

const sor = (a: FastifyInstance, payload: object) =>
  a.inject({ method: 'POST', url: '/api/sor', payload });

describe('POST /api/sor', () => {
  it('anahtar yoksa 503 kapalı', async () => {
    const r = await sor(anahtarsiz, { soru: 'Ulucami kaç kubbeli?' });
    expect(r.statusCode).toBe(503);
    expect(r.json()).toEqual({ hata: 'kapali' });
  });

  it('geçersiz girdi 400 (kısa soru, bozuk eserId); fazla alan sessizce atılır', async () => {
    expect((await sor(app, { soru: 'a' })).statusCode).toBe(400);
    expect((await sor(app, { soru: 'Ulucami nedir?', eserId: '../etc' })).statusCode).toBe(400);
    siradakiCevap = { bilmiyorum: true, cumleler: [] };
    expect((await sor(app, { soru: 'Ulucami nedir?', fazla: 1 })).statusCode).toBe(200);
  });

  it('geçerli cevap: cümleler, yeniden numaralanmış künyeler', async () => {
    siradakiCevap = { bilmiyorum: false, cumleler: [{ metin: ' Çatısında yirmi kubbe var. ', kaynaklar: [3, 1] }] };
    const r = await sor(app, { soru: 'Ulucami kaç kubbeli?' });
    expect(r.statusCode).toBe(200);
    const g = r.json();
    expect(g.cumleler).toEqual([{ metin: 'Çatısında yirmi kubbe var.', kaynaklar: [2, 1] }]);
    expect(g.kaynaklar.map((k: { no: number }) => k.no)).toEqual([1, 2]);
    expect(g.kaynaklar[0].kunye).toBeTruthy();
    expect(modeleGiden.at(-1)!.parcalar[0]!.eserId).toBe('bursa-ulucami');
  });

  it('kaynaksız model çıktısı düşer: bilmiyorum + öneriler', async () => {
    siradakiCevap = { bilmiyorum: false, cumleler: [{ metin: 'Uydurma bir bilgi.', kaynaklar: [] }] };
    const g = (await sor(app, { soru: 'Ulucami kaç kubbeli?' })).json();
    expect(g.bilmiyorum).toBe(true);
    expect(g.oneriler[0].eserId).toBe('bursa-ulucami');
    expect(g.cumleler).toBeUndefined();
  });

  it('kişisel veri modele gitmez; soru günlüğe yazılmaz', async () => {
    siradakiCevap = { bilmiyorum: true, cumleler: [] };
    await sor(app, { soru: 'Ulucami nedir, mailim cocuk@ornek.com' });
    expect(modeleGiden.at(-1)!.soru).toBe('Ulucami nedir, mailim [gizlendi]');
    expect(loglar.join('\n')).not.toContain('ornek.com');
  });
});
