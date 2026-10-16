/**
 * Veritabanı katmanı — PGlite (WASM'da gerçek PostgreSQL).
 *
 * Neden PGlite: başvuru PDF'i "PostgreSQL" taahhüdü veriyor. PGlite, ayrı bir
 * sunucu kurmadan (hackathon demo makinesinde kurulum riski yok) gerçek
 * PostgreSQL çalıştırır; üretimde standart `pg` sürücüsüne geçiş tek dosyada
 * yapılır. SQL ve şema birebir taşınabilir.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Veri dizini. Varsayılan `mvp/.pgdata` (git'e girmez, demo makinesinde kalıcıdır).
 * Testler `KOKAVI_PGDATA` ile geçici bir dizin verir; böylece gerçek veri
 * bozulmaz ve testler birbirinden izole çalışır.
 */
const VERI_DIZINI = process.env.KOKAVI_PGDATA
  ? resolve(process.env.KOKAVI_PGDATA)
  : resolve(__dirname, '..', '..', '.pgdata');

let db: PGlite | null = null;

export async function veritabaniAl(): Promise<PGlite> {
  if (db) return db;
  db = new PGlite(VERI_DIZINI);
  await db.waitReady;
  return db;
}

/** Şemayı sıfırdan kurar. `seed` komutu bunu kullanır. */
export async function semaKur(hedef?: PGlite): Promise<void> {
  const hedefDb = hedef ?? (await veritabaniAl());
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf8');
  await hedefDb.exec(sql);
}

/** Tabloların var olup olmadığını kontrol eder. */
export async function semaHazirMi(hedef?: PGlite): Promise<boolean> {
  const hedefDb = hedef ?? (await veritabaniAl());
  try {
    const sonuc = await hedefDb.query<{ sayi: number }>(
      `SELECT count(*)::int AS sayi
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('city','kulliye','work','income_item','unit','lesson','exercise')`,
    );
    return (sonuc.rows[0]?.sayi ?? 0) === 7;
  } catch {
    return false;
  }
}

/** Uygulama açılışında şemayı garanti eder (idempotent). */
export async function semaGarantiEt(): Promise<void> {
  const hedefDb = await veritabaniAl();
  if (!(await semaHazirMi(hedefDb))) {
    await semaKur(hedefDb);
  }
  // Auth tabloları içerik seed'inden BAĞIMSIZ ve kalıcıdır (IF NOT EXISTS).
  await authSemaGarantiEt(hedefDb);
}

/**
 * Kimlik doğrulama tablolarını kurar. `schema.sql`'den ayrıdır çünkü seed
 * içerik tablolarını düşürür ama kullanıcı hesapları kalıcı olmalıdır.
 */
export async function authSemaGarantiEt(hedef?: PGlite): Promise<void> {
  const hedefDb = hedef ?? (await veritabaniAl());
  const sql = await readFile(join(__dirname, 'auth-schema.sql'), 'utf8');
  await hedefDb.exec(sql);
}

export async function baglantiKapat(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

// --- Yardımcı sorgu sarmalayıcıları -----------------------------------------

export async function sorgu<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const hedefDb = await veritabaniAl();
  const sonuc = await hedefDb.query<T>(sql, params as never[]);
  return sonuc.rows;
}

export async function tekSorgu<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const satirlar = await sorgu<T>(sql, params);
  return satirlar[0] ?? null;
}
