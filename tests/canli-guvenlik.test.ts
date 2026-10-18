/** Canlı yarışma uçları — anahtar, girdi ve hız sınırı saldırıları. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { CanliOdalar } from '../server/canli/oda';
import { gercekKaynak } from './canli-kaynak';

let app: FastifyInstance;

beforeAll(async () => {
  const { canliUclari } = await import('../server/routes/canli');
  app = Fastify();
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });
  await app.register(canliUclari, { odalar: new CanliOdalar(), soruKaynagi: async () => gercekKaynak() });
  await app.ready();
});
afterAll(() => app?.close());

let ip = 0;
const yeniIp = () => `10.0.${Math.floor(++ip / 250)}.${ip % 250}`;

async function oda() {
  const r = await app.inject({
    method: 'POST', url: '/api/canli/odalar', remoteAddress: yeniIp(),
    payload: { kapsam: 'hepsi', soruSayisi: 5, sureSn: 30 },
  });
  expect(r.statusCode).toBe(201);
  return r.json<{ pin: string; sunucuAnahtari: string }>();
}
const yonetim = (pin: string, anahtar?: string) =>
  app.inject({ method: 'GET', url: `/api/canli/odalar/${pin}/yonetim`, remoteAddress: yeniIp(),
    headers: anahtar === undefined ? {} : { 'x-canli-anahtar': anahtar } });

describe('canlı uçlar, yetki', () => {
  it('anahtarsız, boş, yanlış, çok uzun anahtar → 403', async () => {
    const { pin, sunucuAnahtari } = await oda();
    for (const a of [undefined, '', 'yanlis', sunucuAnahtari.slice(0, -1), 'x'.repeat(5000)]) {
      expect((await yonetim(pin, a)).statusCode).toBe(403);
    }
    expect((await yonetim(pin, sunucuAnahtari)).statusCode).toBe(200);
  });

  it('başka odanın anahtarı işe yaramaz', async () => {
    const a = await oda();
    const b = await oda();
    expect((await yonetim(a.pin, b.sunucuAnahtari)).statusCode).toBe(403);
  });

  it('oyuncu anahtarı yönetim anahtarı yerine geçmez', async () => {
    const { pin } = await oda();
    const k = await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/katil`, remoteAddress: yeniIp() });
    expect((await yonetim(pin, k.json().oyuncuAnahtari)).statusCode).toBe(403);
  });
});

describe('canlı uçlar, girdi', () => {
  it.each(["1' OR 1=1", '12345', '1234567', '%00', '../../x', 'abcdef'])('PIN %j reddedilir', async (pin) => {
    const r = await app.inject({ method: 'POST', url: `/api/canli/odalar/${encodeURIComponent(pin)}/katil`, remoteAddress: yeniIp() });
    expect(r.statusCode).toBeGreaterThanOrEqual(400);
    expect(r.statusCode).toBeLessThan(500);
  });

  it.each([-1, 1.5, 99, '0; DROP'])('secim %j → 400', async (secim) => {
    const { pin, sunucuAnahtari } = await oda();
    const k = await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/katil`, remoteAddress: yeniIp() });
    await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/basla`, remoteAddress: yeniIp(), headers: { 'x-canli-anahtar': sunucuAnahtari } });
    const r = await app.inject({
      method: 'POST', url: `/api/canli/odalar/${pin}/cevap`, remoteAddress: yeniIp(),
      headers: { 'x-canli-oyuncu': k.json().oyuncuAnahtari }, payload: { soruNo: 0, secim },
    });
    expect(r.statusCode).toBe(400);
  });

  it('geçersiz kapsam / soru sayısı / süre → 400', async () => {
    for (const payload of [{ kapsam: "sehir:'; --" }, { soruSayisi: 10_000 }, { sureSn: -5 }]) {
      const r = await app.inject({ method: 'POST', url: '/api/canli/odalar', remoteAddress: yeniIp(), payload });
      expect(r.statusCode).toBe(400);
    }
  });
});

describe('canlı uçlar, bilinen açık', () => {
  // BULGU: Number(null) === 0. JSON'da NaN da null olur → boş cevap "0. seçenek" sayılır.
  // Düzeltme server/routes/canli.ts'te (typeof secim === 'number'); gelince `it` yapılmalı.
  it.fails('secim null → 400 (0. seçenek sayılmamalı)', async () => {
    const { pin, sunucuAnahtari } = await oda();
    const k = await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/katil`, remoteAddress: yeniIp() });
    await app.inject({ method: 'POST', url: `/api/canli/odalar/${pin}/basla`, remoteAddress: yeniIp(), headers: { 'x-canli-anahtar': sunucuAnahtari } });
    const r = await app.inject({
      method: 'POST', url: `/api/canli/odalar/${pin}/cevap`, remoteAddress: yeniIp(),
      headers: { 'x-canli-oyuncu': k.json().oyuncuAnahtari }, payload: { soruNo: 0, secim: null },
    });
    expect(r.statusCode).toBe(400);
  });
});

describe('canlı uçlar, hız sınırı', () => {
  it('aynı IP dakikada 60 katılımdan fazlasında 429 alır (PIN taraması)', async () => {
    const tarayici = '172.16.0.1';
    let son = 0;
    for (let i = 0; i < 61; i++) {
      son = (await app.inject({ method: 'POST', url: `/api/canli/odalar/${String(100000 + i)}/katil`, remoteAddress: tarayici })).statusCode;
    }
    expect(son).toBe(429);
  });

  it('aynı IP dakikada 10 odadan fazla kuramaz', async () => {
    const ogretmen = '172.16.0.2';
    let son = 0;
    for (let i = 0; i < 11; i++) {
      son = (await app.inject({ method: 'POST', url: '/api/canli/odalar', remoteAddress: ogretmen, payload: {} })).statusCode;
    }
    expect(son).toBe(429);
  });
});
