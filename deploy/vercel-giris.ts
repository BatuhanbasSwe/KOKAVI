/**
 * Vercel giriş noktası — `server/` sözleşmesine dokunmadan `sunucuKur()`'u sarar.
 *
 * Fonksiyon dosya sistemi salt okunur; seed edilmiş veritabanı taşınabilir
 * PGlite dökümü (`deploy/pgdata.tgz`, dumpDataDir) olarak gelir ve soğuk
 * başlangıçta /tmp'ye açılır. Yazılan ilerleme örnek ömrü kadar yaşar — demo için yeterli.
 *
 * Derleme: npm run build:vercel → api/index.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PGlite } from '@electric-sql/pglite';

const HEDEF = '/tmp/kokavi-pgdata';

const hazir = (async () => {
  if (!existsSync(HEDEF)) {
    const dokum = new Blob([readFileSync(join(process.cwd(), 'deploy', 'pgdata.tgz'))]);
    const acici = new PGlite(HEDEF, { loadDataDir: dokum });
    await acici.waitReady;
    await acici.close();
  }
  process.env.KOKAVI_PGDATA = HEDEF;
  const { sunucuKur } = await import('../server/index.ts');
  const app = await sunucuKur();
  await app.ready();
  return app;
})();

export default async function handler(istek: IncomingMessage, cevap: ServerResponse) {
  const app = await hazir;
  app.server.emit('request', istek, cevap);
}
