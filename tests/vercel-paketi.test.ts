/**
 * Vercel paketi (api/index.mjs) require(esm) desteği OLMAYAN Node'da da
 * yüklenebilmeli. 18 Ekim: @fastify/static 10, ES modülü olan
 * content-disposition 3'ü require() ile yüklüyordu; yerel Node buna izin
 * verdiği için fark edilmedi, Vercel'de her istek ERR_REQUIRE_ESM ile düştü.
 * Bu test paketin dış bağımlılıklarını o Node davranışıyla tek tek yükler.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const paket = readFileSync('api/index.mjs', 'utf8');
const dislar = [
  ...new Set(
    [...paket.matchAll(/(?:^|\n)\s*import\s[^'"]*?from\s*["']([^"'.][^"']*)["']|import\(\s*["']([^"'.][^"']*)["']\s*\)/g)]
      .map((m) => m[1] ?? m[2]!)
      .filter((p) => !p.startsWith('node:')),
  ),
];

describe('Vercel paketi', () => {
  it('dış bağımlılıklar bulunur (@fastify/static dahil)', () => {
    expect(dislar).toContain('fastify');
    expect(dislar).toContain('@fastify/static');
  });

  it("her dış bağımlılık require(esm) olmadan yüklenir", () => {
    const betik = `for (const p of ${JSON.stringify(dislar)}) { try { await import(p); } catch (e) { console.error(p + ': ' + (e.code ?? '') + ' ' + e.message.split('\\n')[0]); process.exitCode = 1; } }`;
    const sonuc = spawnSync(process.execPath, ['--no-experimental-require-module', '--input-type=module', '-e', betik], {
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(sonuc.stderr.trim()).toBe('');
    expect(sonuc.status).toBe(0);
  }, 90_000);
});
