/**
 * Canlı yarışma odalarının deposu.
 *
 * Yerelde (tek süreç) bellek yeterli. Vercel'de her istek farklı bir fonksiyon
 * örneğine düşebileceği için odalar ortak bir yerde durmalı: Upstash Redis
 * (REST). `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` tanımlıysa
 * Redis, değilse bellek kullanılır.
 *
 * Eşzamanlılık: her kayıt bir sürüm taşır. `yaz` yalnızca sürüm beklenenle
 * aynıysa yazar (compare-and-set); çakışmada çağıran yeniden dener.
 */

export interface DepoKaydi {
  json: string;
  surum: number;
}

export interface OdaDeposu {
  al(pin: string): Promise<DepoKaydi | null>;
  /** beklenenSurum 0 → kayıt yoksa oluştur. Başarılıysa true. */
  yaz(pin: string, json: string, beklenenSurum: number, ttlMs: number): Promise<boolean>;
  sil(pin: string): Promise<void>;
  sayi(): Promise<number>;
}

export class BellekDeposu implements OdaDeposu {
  private readonly kayitlar = new Map<string, DepoKaydi & { sonaErme: number }>();

  constructor(private readonly simdi: () => number = Date.now) {}

  private gecerli(pin: string) {
    const k = this.kayitlar.get(pin);
    if (k && k.sonaErme <= this.simdi()) {
      this.kayitlar.delete(pin);
      return undefined;
    }
    return k;
  }

  async al(pin: string): Promise<DepoKaydi | null> {
    const k = this.gecerli(pin);
    return k ? { json: k.json, surum: k.surum } : null;
  }

  async yaz(pin: string, json: string, beklenenSurum: number, ttlMs: number): Promise<boolean> {
    const k = this.gecerli(pin);
    if ((k?.surum ?? 0) !== beklenenSurum) return false;
    this.kayitlar.set(pin, { json, surum: beklenenSurum + 1, sonaErme: this.simdi() + ttlMs });
    return true;
  }

  async sil(pin: string): Promise<void> {
    this.kayitlar.delete(pin);
  }

  async sayi(): Promise<number> {
    for (const pin of [...this.kayitlar.keys()]) this.gecerli(pin);
    return this.kayitlar.size;
  }
}

const ONEK = 'kokavi:oda:';

// KEYS[1] = anahtar, ARGV = beklenen sürüm, yeni değer (sürümsüz JSON), ttl ms
const CAS_BETIGI = `
local eski = redis.call('GET', KEYS[1])
local surum = 0
if eski then surum = cjson.decode(eski).s end
if surum ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], cjson.encode({s = surum + 1, d = ARGV[2]}), 'PX', ARGV[3])
return 1
`;

export class RedisDeposu implements OdaDeposu {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async komut(...args: (string | number)[]): Promise<unknown> {
    const yanit = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args.map(String)),
    });
    const govde = (await yanit.json()) as { result?: unknown; error?: string };
    if (!yanit.ok || govde.error) throw new Error(`Redis hatası: ${govde.error ?? yanit.status}`);
    return govde.result;
  }

  async al(pin: string): Promise<DepoKaydi | null> {
    const ham = await this.komut('GET', ONEK + pin);
    if (typeof ham !== 'string') return null;
    const { s, d } = JSON.parse(ham) as { s: number; d: string };
    return { json: d, surum: s };
  }

  async yaz(pin: string, json: string, beklenenSurum: number, ttlMs: number): Promise<boolean> {
    const sonuc = await this.komut('EVAL', CAS_BETIGI, 1, ONEK + pin, beklenenSurum, json, Math.max(1, Math.round(ttlMs)));
    return Number(sonuc) === 1;
  }

  async sil(pin: string): Promise<void> {
    await this.komut('DEL', ONEK + pin);
  }

  async sayi(): Promise<number> {
    const anahtarlar = await this.komut('KEYS', `${ONEK}*`);
    return Array.isArray(anahtarlar) ? anahtarlar.length : 0;
  }
}

/** Ortak depo var mı? Teşhis için: yayında bellek = her örnek kendi odasında. */
export type DepoTuru = 'redis' | 'bellek';

export interface DepoDurumu {
  tur: DepoTuru;
  /** Redis'i hangi ortam değişkeni çiftinin açtığı (gizli değer döndürülmez). */
  kaynak: 'upstash' | 'vercel-kv' | null;
}

/**
 * Vercel'de iki farklı env adlandırması görülüyor:
 *  · Upstash Marketplace: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *  · Vercel KV (Upstash tabanlı): KV_REST_API_URL / KV_REST_API_TOKEN
 * İkisi de aynı REST protokolünü konuşur; yalnız birini tanımak, env bağlıyken
 * sessizce belleğe düşmeye ve "Oyun bulunamadı" hatasına yol açıyordu.
 */
export function depoDurumu(): DepoDurumu {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) return { tur: 'redis', kaynak: 'upstash' };
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) return { tur: 'redis', kaynak: 'vercel-kv' };
  return { tur: 'bellek', kaynak: null };
}

export function varsayilanDepo(simdi: () => number = Date.now): OdaDeposu {
  const durum = depoDurumu();
  if (durum.tur === 'redis') {
    const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!;
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!;
    return new RedisDeposu(url, token);
  }
  return new BellekDeposu(simdi);
}
