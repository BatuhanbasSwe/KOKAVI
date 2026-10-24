/**
 * Yayın veritabanı dökümü — `deploy/pgdata.tgz` üretir.
 *
 * Vercel fonksiyonu bu dosyayı açılışta PGlite `loadDataDir` ile /tmp'ye açar
 * (bkz. `deploy/vercel-giris.ts`). Bu yüzden döküm, `seed` sonrası `.pgdata`
 * dizininin PGlite `dumpDataDir` çıktısı olmalıdır.
 *
 * Kullanım (API/dev sunucusu KAPALIYKEN):
 *   1) npm run seed
 *   2) npm run pgdata:dump
 *   3) npm run build:vercel
 *   4) deploy/pgdata.tgz + api/index.mjs dosyalarını commit'le ve yayınla
 */
import { statSync, writeFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const kaynak = process.env.KOKAVI_PGDATA ?? '.pgdata';
const hedef = process.argv[2] ?? 'deploy/pgdata.tgz';

const pg = new PGlite(kaynak);
await pg.waitReady;

const dokum = await pg.dumpDataDir('gzip');
const bayt = Buffer.from(await dokum.arrayBuffer());
writeFileSync(hedef, bayt);
await pg.close();

const mb = (statSync(hedef).size / 1024 / 1024).toFixed(1);
console.log(`✓ ${hedef} yazıldı (${mb} MB, kaynak: ${kaynak})`);
