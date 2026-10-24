/**
 * Güvenlik başlıkları ve giriş hız sınırı — guvenlik.test.ts'yi tamamlar.
 * (Orada hız sınırı kapalı; burada açık.)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let geciciDizin = '';
let baglantiKapat: () => Promise<void>;

beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-basliklar-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
  delete process.env.KOKAVI_RATE_LIMIT_OFF;
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
});

describe('güvenlik başlıkları (ek)', () => {
  it('CSP dışarıdan betik yüklemeye izin vermez', async () => {
    const c = await app.inject({ method: 'GET', url: '/api/saglik' });
    const csp = String(c.headers['content-security-policy']);
    expect(csp).toMatch(/script-src[^;]*'self'/);
    expect(csp).not.toMatch(/script-src[^;]*\*/);
  });

  it('API yanıtları önbelleğe alınmaz (Cache-Control: no-store)', async () => {
    const c = await app.inject({ method: 'GET', url: '/api/saglik' });
    expect(String(c.headers['cache-control'])).toContain('no-store');
  });
});

describe('giriş hız sınırı', () => {
  // HATA: server/index.ts errorResponseBuilder statusCode döndürmüyor → 429 yerine 500.
  it("aynı IP'den 11. giriş denemesi 429 alır", async () => {
    const kodlar: number[] = [];
    for (let i = 0; i < 11; i++) {
      const c = await app.inject({
        method: 'POST',
        url: '/api/auth/giris',
        remoteAddress: '10.9.9.9',
        payload: { email: `yok${i}@test.local`, parola: 'YanlisParola1' },
      });
      kodlar.push(c.statusCode);
    }
    expect(kodlar.slice(0, 10)).not.toContain(429);
    expect(kodlar[10]).toBe(429);
  });
});
