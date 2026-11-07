/**
 * Ortak Redis (Upstash REST) istemcisi.
 *
 * NEDEN VAR
 * Vercel'de API her sunucu örneğinde ayrı bir geçici dosya sisteminde çalışır:
 * her örnek `deploy/pgdata.tgz` dökümünü kendi `/tmp` klasörüne açar. Oturum ve
 * yönetim yazmaları yalnızca o örneğin kopyasında kalırsa, sonraki istek başka
 * bir örneğe düştüğünde "giriş yapmalısın" hatası görülür ve eklenen içerik
 * kaybolur. Çözüm: oturumlar ve yönetim işlemleri Upstash Redis'te tutulur.
 *
 * Redis yapılandırılmamışsa (yerel geliştirme, testler) bu modül `null` döner ve
 * sunucu eskisi gibi yalnızca PGlite ile çalışır — davranış değişmez.
 *
 * Upstash REST protokolü: POST <url> gövde `["KOMUT", "arg1", ...]`,
 * yanıt `{ result: ... }` (hata varsa `{ error: "..." }`).
 */

export interface RedisAyari {
  url: string;
  token: string;
}

const IStek_ZAMAN_ASIMI_MS = 4000;

/** Ortam değişkenlerinden Redis ayarını okur; yoksa `null`. */
export function redisAyari(): RedisAyari | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * Tek bir Redis komutu çalıştırır.
 *
 * Redis yoksa `null` döner (çağıran taraf yerel davranışa düşer). Redis varsa
 * ama komut hata verirse `Error` fırlatır: çağıran taraf bunu yakalayıp
 * bozulmadan devam etmelidir.
 */
export async function redisKomut<T = unknown>(
  ...komut: (string | number)[]
): Promise<T | null> {
  const ayar = redisAyari();
  if (!ayar) return null;

  const yanit = await fetch(ayar.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ayar.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(komut.map(String)),
    signal: AbortSignal.timeout(IStek_ZAMAN_ASIMI_MS),
  });

  const govde = (await yanit.json()) as { result?: T; error?: string };
  if (!yanit.ok || govde.error) {
    throw new Error(`Redis hatası: ${govde.error ?? yanit.status}`);
  }
  return (govde.result ?? null) as T | null;
}
