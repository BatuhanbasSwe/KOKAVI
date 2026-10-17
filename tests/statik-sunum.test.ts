/**
 * Üretim derlemesinin sunumu (@fastify/static): istemci dosyaları gelir, SPA
 * yolları index.html'e düşer, kök dışına çıkma (path traversal) engellenir,
 * bilinmeyen /api uçları JSON 404 verir.
 *
 * Güvenlik güncellemesi (@fastify/static 8 -> 10) için koruma testi. `dist/`
 * yoksa (derleme yapılmamışsa) atlanır.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';

const DIST_VAR = existsSync(join(__dirname, '..', 'dist', 'index.html'));

let app: FastifyInstance;
let geciciDizin: string;
let baglantiKapat: () => Promise<void>;

beforeAll(async () => {
  if (!DIST_VAR) return;
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-statik-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
  process.env.KOKAVI_RATE_LIMIT_OFF = '1';
  const dbModulu = await import('../server/db/index.ts');
  baglantiKapat = dbModulu.baglantiKapat;
  const { sunucuKur } = await import('../server/index.ts');
  app = await sunucuKur();
  await app.ready();
}, 90_000);

afterAll(async () => {
  await app?.close();
  await baglantiKapat?.();
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
  delete process.env.KOKAVI_RATE_LIMIT_OFF;
});

describe.skipIf(!DIST_VAR)('üretim dosyalarının sunumu', () => {
  it('ana sayfa ve statik dosya gelir', async () => {
    const ana = await app.inject({ method: 'GET', url: '/' });
    expect(ana.statusCode).toBe(200);
    expect(ana.headers['content-type']).toContain('text/html');
    const ikon = await app.inject({ method: 'GET', url: '/favicon.svg' });
    expect(ikon.statusCode).toBe(200);
  });

  it('SPA yolu index.html döner; bilinmeyen /api ucu JSON 404', async () => {
    const spa = await app.inject({ method: 'GET', url: '/bir/olmayan/sayfa' });
    expect(spa.statusCode).toBe(200);
    expect(spa.body).toContain('<div id="kok">');
    const api = await app.inject({ method: 'GET', url: '/api/olmayan-uc' });
    expect(api.statusCode).toBe(404);
    expect(api.json()).toEqual({ hata: 'Uç bulunamadı' });
  });

  it('kök dışına çıkılamaz (path traversal), kodlanmış ayırıcılar dahil', async () => {
    for (const url of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/assets/..%2f..%2fpackage.json']) {
      const r = await app.inject({ method: 'GET', url });
      expect(r.body, url).not.toContain('"kok-avi-mvp"');
    }
  });
});
