/**
 * Canlı yarışma — çok örnekli sunucu (Vercel) senaryosu.
 *
 * Yayında her istek farklı bir fonksiyon örneğine düşebilir. Odalar örneğin
 * belleğinde tutulduğu sürece öğretmenin A'da kurduğu odayı B'ye düşen çocuk
 * bulamaz: "Bu PIN ile bir oyun bulunamadı" (404 ODA_YOK).
 *
 * Ortak oda deposu (yayında Upstash Redis) bu hatayı giderdi; burada iki örnek
 * aynı bellek deposunu paylaşır.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { CanliOdalar } from "../server/canli/oda";
import { BellekDeposu } from "../server/canli/depo";
import { gercekKaynak } from "./canli-kaynak";

const ortakDepo = new BellekDeposu();

let geciciDizin = "";
let a: FastifyInstance;
let b: FastifyInstance;

async function ornek(): Promise<FastifyInstance> {
  const { canliUclari } = await import("../server/routes/canli");
  const app = Fastify();
  // İki ayrı fonksiyon örneği, tek ortak depo.
  await app.register(canliUclari, {
    odalar: new CanliOdalar(Date.now, ortakDepo),
    soruKaynagi: async () => gercekKaynak(),
  });
  await app.ready();
  return app;
}

beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), "kokavi-cok-ornek-"));
  process.env.KOKAVI_PGDATA = join(geciciDizin, "pgdata");
  [a, b] = await Promise.all([ornek(), ornek()]);
});
afterAll(async () => {
  await Promise.all([a?.close(), b?.close()]);
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
});

async function odaKur(app: FastifyInstance) {
  const c = await app.inject({
    method: "POST",
    url: "/api/canli/odalar",
    payload: { kapsam: "sehir:konya", soruSayisi: 5, sureSn: 30 },
  });
  expect(c.statusCode).toBe(201);
  return c.json<{ pin: string; sunucuAnahtari: string }>();
}

describe("canlı yarışma, iki sunucu örneği", () => {
  it("aynı örnekte akış çalışır (kontrol)", async () => {
    const { pin } = await odaKur(a);
    const k = await a.inject({
      method: "POST",
      url: `/api/canli/odalar/${pin}/katil`,
    });
    expect(k.statusCode).toBe(201);
  });

  it("A örneğinde kurulan odaya B örneğinden katılınabilir", async () => {
    const { pin } = await odaKur(a);
    const k = await b.inject({
      method: "POST",
      url: `/api/canli/odalar/${pin}/katil`,
    });
    expect(k.json()).not.toMatchObject({ kod: "ODA_YOK" });
    expect(k.statusCode).toBeLessThan(300);
  });

  it("öğretmen yoklaması başka örneğe düşünce oda kaybolmaz", async () => {
    const { pin, sunucuAnahtari } = await odaKur(a);
    const y = await b.inject({
      method: "GET",
      url: `/api/canli/odalar/${pin}/yonetim`,
      headers: { "x-canli-anahtar": sunucuAnahtari },
    });
    expect(y.statusCode).toBe(200);
  });
});
