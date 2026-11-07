/**
 * Oturum ve kullanıcı yönetimi.
 *
 * GÜVENLİK TASARIMI
 *  * Oturum belirteci 32 rastgele bayttır; veritabanında YALNIZCA SHA-256
 *    özeti saklanır. Veritabanı sızsa bile geçerli bir oturum çalınmaz.
 *  * Belirteçler sabit süre sonra dolar (varsayılan 8 saat).
 *  * Kullanıcı adı/e-posta varlığı sızdırılmaz: giriş hatası her zaman aynı
 *    genel mesajı döner.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sorgu, tekSorgu, veritabaniAl } from '../db/index.ts';
import { redisAyari, redisKomut } from '../redis.ts';
import { parolaHashle, parolaDogrula } from './parola.ts';

export type Rol = 'admin' | 'ogretmen';

export interface Kullanici {
  id: string;
  email: string;
  ad: string;
  rol: Rol;
  aktif: boolean;
  sonGiris: string | null;
  createdAt: string;
}

interface KullaniciSatiri {
  id: string;
  email: string;
  ad: string;
  parola_hash: string;
  rol: Rol;
  aktif: boolean;
  son_giris: string | null;
  created_at: string;
}

/** Oturum süresi: 8 saat. */
export const OTURUM_SURESI_MS = 8 * 60 * 60 * 1000;

function kullaniciyaCevir(s: KullaniciSatiri): Kullanici {
  return {
    id: s.id,
    email: s.email,
    ad: s.ad,
    rol: s.rol,
    aktif: s.aktif,
    sonGiris: s.son_giris,
    createdAt: s.created_at,
  };
}

function tokenOzeti(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// Ortak (Redis) oturum deposu
//
// Vercel'de her sunucu örneği ayrı bir geçici PGlite kopyasıyla çalıştığı için
// oturum kaydı yalnızca o örnekte kalıyordu: giriş bir örnekte yapılıyor, sonraki
// istek başka bir örneğe düşünce "Bu işlem için giriş yapmalısın." hatası
// görünüyordu. Oturumlar Redis'te tutulunca bütün örnekler aynı oturumu görür.
// Redis yoksa (yerel geliştirme/testler) yerel `session` tablosu kullanılmaya
// devam eder — davranış değişmez.
// ---------------------------------------------------------------------------

const OTURUM_ONEK = 'kokavi:oturum:';
const KULLANICI_OTURUM_ONEK = 'kokavi:oturum:kullanici:';

interface RedisOturum {
  kullaniciId: string;
  bitis: string;
}

/** Oturumu Redis'e yazar. Hata olsa bile girişi engellemez (yerel kayıt yeterli). */
async function redisOturumYaz(
  tokenHash: string,
  kullaniciId: string,
  gecerlilikSonu: Date,
): Promise<void> {
  try {
    const kalanMs = Math.max(1000, gecerlilikSonu.getTime() - Date.now());
    await redisKomut(
      'SET',
      OTURUM_ONEK + tokenHash,
      JSON.stringify({ kullaniciId, bitis: gecerlilikSonu.toISOString() } satisfies RedisOturum),
      'PX',
      kalanMs,
    );
    // Kullanıcının açık oturumlarını toplu iptal edebilmek için ters indeks.
    await redisKomut('SADD', KULLANICI_OTURUM_ONEK + kullaniciId, tokenHash);
    await redisKomut('PEXPIRE', KULLANICI_OTURUM_ONEK + kullaniciId, OTURUM_SURESI_MS);
  } catch (hata) {
    console.warn('[oturum] Redis oturumu yazılamadı:', hata);
  }
}

async function redisOturumSil(tokenHash: string): Promise<void> {
  if (!redisAyari()) return;
  try {
    await redisKomut('DEL', OTURUM_ONEK + tokenHash);
  } catch {
    /* Redis erişilemez: yerel temizlik yine yapılır. */
  }
}

async function redisKullaniciOturumlariniSil(userId: string): Promise<void> {
  if (!redisAyari()) return;
  try {
    const anahtarlar = await redisKomut<string[]>('SMEMBERS', KULLANICI_OTURUM_ONEK + userId);
    if (Array.isArray(anahtarlar)) {
      for (const anahtar of anahtarlar) await redisKomut('DEL', OTURUM_ONEK + anahtar);
    }
    await redisKomut('DEL', KULLANICI_OTURUM_ONEK + userId);
  } catch {
    /* Redis erişilemez: yerel temizlik yine yapılır. */
  }
}

// ---------------------------------------------------------------------------
// Kullanıcılar
// ---------------------------------------------------------------------------

export async function kullaniciOlustur(girdi: {
  email: string;
  ad: string;
  parola: string;
  rol: Rol;
}): Promise<Kullanici> {
  const db = await veritabaniAl();
  const id = randomUUID();

  await db.query(
    `INSERT INTO app_user (id, email, ad, parola_hash, rol, aktif)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [id, girdi.email.trim(), girdi.ad.trim(), parolaHashle(girdi.parola), girdi.rol],
  );

  const olusan = await kullaniciGetir(id);
  if (!olusan) throw new Error('Kullanıcı oluşturulamadı');
  return olusan;
}

/**
 * Kimliği ve parola özeti hazır bir kullanıcıyı ekler.
 *
 * Yönetim işlem günlüğü (`server/yonetim/gunluk.ts`) başka bir sunucu
 * örneğinde aynı kullanıcıyı birebir oluşturabilsin diye kimlik ve parola
 * özeti dışarıdan verilir; rastgele kimlik üretilmez.
 */
export async function kullaniciEkleHashli(girdi: {
  id: string;
  email: string;
  ad: string;
  parolaHash: string;
  rol: Rol;
}): Promise<Kullanici> {
  const db = await veritabaniAl();
  await db.query(
    `INSERT INTO app_user (id, email, ad, parola_hash, rol, aktif)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [girdi.id, girdi.email.trim(), girdi.ad.trim(), girdi.parolaHash, girdi.rol],
  );
  const olusan = await kullaniciGetir(girdi.id);
  if (!olusan) throw new Error('Kullanıcı oluşturulamadı');
  return olusan;
}

export async function kullaniciGetir(id: string): Promise<Kullanici | null> {
  const s = await tekSorgu<KullaniciSatiri>(`SELECT * FROM app_user WHERE id = $1`, [id]);
  return s ? kullaniciyaCevir(s) : null;
}

/** E-posta araması büyük/küçük harf duyarsızdır (Türkçe İ/I dahil). */
async function kullaniciSatiriEmailIle(email: string): Promise<KullaniciSatiri | null> {
  return tekSorgu<KullaniciSatiri>(`SELECT * FROM app_user WHERE LOWER(email) = LOWER($1)`, [
    email.trim(),
  ]);
}

export async function kullaniciVarMi(email: string): Promise<boolean> {
  return (await kullaniciSatiriEmailIle(email)) !== null;
}

export async function kullanicilariListele(): Promise<Kullanici[]> {
  const satirlar = await sorgu<KullaniciSatiri>(`SELECT * FROM app_user ORDER BY created_at`);
  return satirlar.map(kullaniciyaCevir);
}

export async function kullaniciDurumDegistir(id: string, aktif: boolean): Promise<boolean> {
  const db = await veritabaniAl();
  const sonuc = await db.query(
    `UPDATE app_user SET aktif = $2, updated_at = NOW() WHERE id = $1`,
    [id, aktif],
  );
  return (sonuc.affectedRows ?? 0) > 0;
}

export async function kullaniciParolaDegistir(id: string, yeniParola: string): Promise<boolean> {
  return kullaniciParolaHashGuncelle(id, parolaHashle(yeniParola));
}

/**
 * Parola özetini günceller ve kullanıcının TÜM oturumlarını düşürür.
 * Günlükten gelen işlemler özeti hazır verdiği için ayrı bir sürüm gerekir.
 */
export async function kullaniciParolaHashGuncelle(id: string, parolaHash: string): Promise<boolean> {
  const db = await veritabaniAl();
  const sonuc = await db.query(
    `UPDATE app_user SET parola_hash = $2, updated_at = NOW() WHERE id = $1`,
    [id, parolaHash],
  );
  await oturumlariTemizle(id);
  return (sonuc.affectedRows ?? 0) > 0;
}

/** Kullanıcının açık oturumlarını hem yerelde hem Redis'te kapatır. */
async function oturumlariTemizle(userId: string): Promise<void> {
  const db = await veritabaniAl();
  await db.query(`DELETE FROM session WHERE user_id = $1`, [userId]);
  await redisKullaniciOturumlariniSil(userId);
}

// ---------------------------------------------------------------------------
// Oturumlar
// ---------------------------------------------------------------------------

export interface OturumSonucu {
  token: string;
  gecerlilikSonu: Date;
  kullanici: Kullanici;
}

/**
 * Giriş denemesi. Başarılıysa oturum açar, değilse `null` döner.
 * Başarısız deneme HER ZAMAN aynı genel sebeple döner (kullanıcı numaralandırması yok).
 */
export async function girisYap(
  email: string,
  parola: string,
  userAgent?: string,
): Promise<OturumSonucu | null> {
  const satir = await kullaniciSatiriEmailIle(email);

  // Kullanıcı yoksa da parola doğrulaması yapılır: yanıt süresi farkı
  // kullanıcı varlığını sızdırmasın (zamanlama saldırısı).
  const ozet = satir?.parola_hash ?? 'scrypt$16384$8$1$AAAA$AAAA';
  const parolaDogru = parolaDogrula(parola, ozet);

  if (!satir || !parolaDogru || !satir.aktif) {
    await girisDenemesiKaydet(email, false);
    return null;
  }

  const db = await veritabaniAl();
  const token = randomBytes(32).toString('base64url');
  const gecerlilikSonu = new Date(Date.now() + OTURUM_SURESI_MS);

  await db.query(
    `INSERT INTO session (token_hash, user_id, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [tokenOzeti(token), satir.id, gecerlilikSonu.toISOString(), userAgent?.slice(0, 200) ?? null],
  );
  await db.query(`UPDATE app_user SET son_giris = NOW() WHERE id = $1`, [satir.id]);
  await girisDenemesiKaydet(email, true);

  // Ortak depoya da yaz: sonraki istek başka bir sunucu örneğine düşse bile
  // oturum geçerli olsun. Redis yoksa/başarısızsa yerel oturum yine çalışır.
  await redisOturumYaz(tokenOzeti(token), satir.id, gecerlilikSonu);

  return { token, gecerlilikSonu, kullanici: kullaniciyaCevir(satir) };
}

/**
 * Belirteci doğrular; süresi dolmuşsa siler ve null döner.
 *
 * Redis yapılandırılmışsa oturum oradan okunur (bütün sunucu örnekleri aynı
 * oturumu görür). Redis'te YOKLUK geçersizlik demektir: çıkış/parola değişimi
 * başka bir örnekte yapıldıysa bu örnekteki eski yerel kayıt oturumu diriltmez.
 * Yalnızca Redis'e hiç ulaşılamazsa yerel `session` tablosuna düşülür.
 */
export async function oturumDogrula(token: string): Promise<Kullanici | null> {
  if (!token || token.length < 20) return null;
  const ozet = tokenOzeti(token);

  if (redisAyari()) {
    let kayit: string | null = null;
    try {
      kayit = await redisKomut<string>('GET', OTURUM_ONEK + ozet);
    } catch {
      // Redis erişilemez: yerel doğrulamaya düş, kullanıcıyı kilitleme.
      return yerelOturumDogrula(ozet);
    }

    if (!kayit) return null;

    let bilgi: RedisOturum;
    try {
      bilgi = JSON.parse(kayit) as RedisOturum;
    } catch {
      await redisOturumSil(ozet);
      return null;
    }

    if (new Date(bilgi.bitis).getTime() < Date.now()) {
      await oturumBitir(token);
      return null;
    }

    const kullanici = await kullaniciGetir(bilgi.kullaniciId);
    if (!kullanici || !kullanici.aktif) {
      await oturumBitir(token);
      return null;
    }
    return kullanici;
  }

  return yerelOturumDogrula(ozet);
}

/** Yerel `session` tablosundan doğrulama (Redis'siz ortamlar). */
async function yerelOturumDogrula(tokenHash: string): Promise<Kullanici | null> {
  const satir = await tekSorgu<{ user_id: string; expires_at: string }>(
    `SELECT user_id, expires_at FROM session WHERE token_hash = $1`,
    [tokenHash],
  );
  if (!satir) return null;

  if (new Date(satir.expires_at).getTime() < Date.now()) {
    await yerelOturumBitir(tokenHash);
    return null;
  }

  const kullanici = await kullaniciGetir(satir.user_id);
  if (!kullanici || !kullanici.aktif) {
    await yerelOturumBitir(tokenHash);
    return null;
  }
  return kullanici;
}

async function yerelOturumBitir(tokenHash: string): Promise<void> {
  const db = await veritabaniAl();
  await db.query(`DELETE FROM session WHERE token_hash = $1`, [tokenHash]);
}

export async function oturumBitir(token: string): Promise<void> {
  const ozet = tokenOzeti(token);
  await yerelOturumBitir(ozet);
  await redisOturumSil(ozet);
}

export async function kullaniciOturumlariniBitir(userId: string): Promise<void> {
  await oturumlariTemizle(userId);
}

/** Süresi dolmuş oturumları temizler (sunucu açılışında çağrılır). */
export async function suresiGecmisOturumlariTemizle(): Promise<number> {
  const db = await veritabaniAl();
  const sonuc = await db.query(`DELETE FROM session WHERE expires_at < NOW()`);
  return sonuc.affectedRows ?? 0;
}

// ---------------------------------------------------------------------------
// Giriş denemeleri — kaba kuvvet tespiti
// ---------------------------------------------------------------------------

export async function girisDenemesiKaydet(email: string, basarili: boolean): Promise<void> {
  const db = await veritabaniAl();
  await db.query(`INSERT INTO login_attempt (email, basarili) VALUES ($1, $2)`, [
    email.slice(0, 200),
    basarili,
  ]);
}

/**
 * Son `pencereDakika` içinde aynı e-posta için kaç başarısız deneme var?
 * Kaba kuvvet korumasının veri kaynağı.
 */
export async function basarisizDenemeSayisi(
  email: string,
  pencereDakika = 15,
): Promise<number> {
  const satir = await tekSorgu<{ sayi: number }>(
    `SELECT count(*)::int AS sayi
       FROM login_attempt
      WHERE LOWER(email) = LOWER($1)
        AND basarili = FALSE
        AND created_at > NOW() - ($2 || ' minutes')::interval`,
    [email, String(pencereDakika)],
  );
  return satir?.sayi ?? 0;
}

export async function eskiDenemeleriTemizle(gunOnce = 7): Promise<void> {
  const db = await veritabaniAl();
  await db.query(`DELETE FROM login_attempt WHERE created_at < NOW() - ($1 || ' days')::interval`, [
    String(gunOnce),
  ]);
}
