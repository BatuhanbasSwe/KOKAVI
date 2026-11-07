/**
 * Canlı oda deposu seçimi.
 *
 * Yayında odaların ortak depoda (Redis) tutulması şart: Vercel her isteği ayrı
 * bir fonksiyon örneğine düşürebilir. Env adları iki farklı bağlantı türünde
 * farklı olduğu için (Upstash Marketplace / Vercel KV) ikisi de tanınmalı.
 * Bu test, sessizce belleğe düşme hatasının geri gelmemesini sağlar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BellekDeposu,
  RedisDeposu,
  depoDurumu,
  varsayilanDepo,
} from '../server/canli/depo';

const ADLAR = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
] as const;

function temizle() {
  for (const ad of ADLAR) vi.stubEnv(ad, '');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('canlı oda deposu', () => {
  it('ortam değişkeni yoksa bellek deposu kullanılır (yerel)', () => {
    temizle();
    expect(depoDurumu()).toEqual({ tur: 'bellek', kaynak: null });
    expect(varsayilanDepo()).toBeInstanceOf(BellekDeposu);
  });

  it('Upstash Marketplace adları Redis deposunu açar', () => {
    temizle();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://ornek.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'gizli-token');
    expect(depoDurumu()).toEqual({ tur: 'redis', kaynak: 'upstash' });
    expect(varsayilanDepo()).toBeInstanceOf(RedisDeposu);
  });

  it('Vercel KV adları da Redis deposunu açar', () => {
    temizle();
    vi.stubEnv('KV_REST_API_URL', 'https://ornek.upstash.io');
    vi.stubEnv('KV_REST_API_TOKEN', 'gizli-token');
    expect(depoDurumu()).toEqual({ tur: 'redis', kaynak: 'vercel-kv' });
    expect(varsayilanDepo()).toBeInstanceOf(RedisDeposu);
  });

  it('yarım yapılandırma sessizce belleğe düşer (uyarı görünür)', () => {
    temizle();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://ornek.upstash.io');
    expect(depoDurumu().tur).toBe('bellek');
    expect(varsayilanDepo()).toBeInstanceOf(BellekDeposu);
  });
});
