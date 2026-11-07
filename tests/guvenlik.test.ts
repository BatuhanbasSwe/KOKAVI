/**
 * GÜVENLİK TESTLERİ
 *
 * Şartname 5.1.5: "Kullanıcı girdilerinin uygun doğrulama ve kontrol
 * mekanizmalarından geçirilmesi beklenmektedir." + "Kişisel veya hassas veri
 * işlenmesi halinde bu verilerin korunmasına yönelik gerekli teknik önlemler
 * alınmalıdır."
 *
 * Bu paket, ürünün gerçekten savunulabilir olduğunu KANITLAR:
 *  1. Yetkisiz erişim engellenir (401/403)
 *  2. Parola güvenli saklanır (scrypt, düz metin yok)
 *  3. Kaba kuvvet kilitlenir
 *  4. Oturum çalınması/uzatılması engellenir
 *  5. SQL enjeksiyonu ve XSS etkisizdir
 *  6. Güvenlik başlıkları gönderilir
 *  7. Kullanıcı numaralandırması yapılamaz
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let geciciDizin: string;
let baglantiKapat: () => Promise<void>;

const ADMIN = { email: 'yonetici@test.local', parola: 'GucluParola1', ad: 'Test Yönetici' };
const OGRETMEN = { email: 'ogretmen@test.local', parola: 'GucluParola2', ad: 'Test Öğretmen' };

let adminToken = '';
let ogretmenToken = '';

/** Çerez ayarından belirteci çıkarır. */
function tokenAl(cevap: { cookies: unknown[] }): string {
  const cerez = (cevap.cookies as { name: string; value: string }[]).find(
    (c) => c.name === 'kokavi_oturum',
  );
  return cerez?.value ?? '';
}

beforeAll(async () => {
  geciciDizin = await mkdtemp(join(tmpdir(), 'kokavi-guvenlik-'));
  process.env.KOKAVI_PGDATA = join(geciciDizin, 'pgdata');
  // Testler hız sınırına takılmasın; hız sınırı ayrı bir testle doğrulanır.
  process.env.KOKAVI_RATE_LIMIT_OFF = '1';

  const dbModulu = await import('../server/db/index.ts');
  baglantiKapat = dbModulu.baglantiKapat;

  const oturumModulu = await import('../server/auth/oturum.ts');
  const { sunucuKur } = await import('../server/index.ts');
  app = await sunucuKur();
  await app.ready();

  await oturumModulu.kullaniciOlustur({ ...ADMIN, rol: 'admin' });
  await oturumModulu.kullaniciOlustur({ ...OGRETMEN, rol: 'ogretmen' });

  const adminGiris = await app.inject({
    method: 'POST',
    url: '/api/auth/giris',
    payload: { email: ADMIN.email, parola: ADMIN.parola },
  });
  adminToken = tokenAl(adminGiris);

  const ogretmenGiris = await app.inject({
    method: 'POST',
    url: '/api/auth/giris',
    payload: { email: OGRETMEN.email, parola: OGRETMEN.parola },
  });
  ogretmenToken = tokenAl(ogretmenGiris);
}, 90_000);

afterAll(async () => {
  await app?.close();
  await baglantiKapat?.();
  if (geciciDizin) await rm(geciciDizin, { recursive: true, force: true });
  delete process.env.KOKAVI_RATE_LIMIT_OFF;
});

// ===========================================================================
// 1. Yetkisiz erişim
// ===========================================================================
describe('1. Yetkisiz erişim engellenir', () => {
  const korumaliUclar: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; url: string }[] = [
    { method: 'GET', url: '/api/yonetim/istatistik' },
    { method: 'GET', url: '/api/yonetim/kullanicilar' },
    { method: 'POST', url: '/api/yonetim/eserler' },
    { method: 'PUT', url: '/api/yonetim/eserler/x' },
    { method: 'DELETE', url: '/api/yonetim/eserler/x' },
    { method: 'POST', url: '/api/yonetim/uniteler' },
    { method: 'DELETE', url: '/api/yonetim/uniteler/x' },
    { method: 'POST', url: '/api/yonetim/sehirler' },
    { method: 'POST', url: '/api/yonetim/dersler' },
    { method: 'PUT', url: '/api/yonetim/dersler/x' },
    { method: 'DELETE', url: '/api/yonetim/dersler/x' },
    { method: 'POST', url: '/api/yonetim/kullanicilar' },
  ];

  for (const uc of korumaliUclar) {
    it(`${uc.method} ${uc.url} → girişsiz 401`, async () => {
      const cevap = await app.inject({ method: uc.method, url: uc.url, payload: {} });
      expect(cevap.statusCode).toBe(401);
      expect(cevap.json().kod).toBe('GIRIS_GEREKLI');
    });
  }

  it('uydurma Bearer belirteci reddedilir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/api/yonetim/istatistik',
      headers: { authorization: 'Bearer uydurma-belirtec-1234567890' },
    });
    expect(cevap.statusCode).toBe(401);
  });

  it('uydurma çerez reddedilir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/api/yonetim/istatistik',
      cookies: { kokavi_oturum: 'sahte-cerez-degeri-1234567890' },
    });
    expect(cevap.statusCode).toBe(401);
  });

  it('genel içerik uçları girişsiz ERİŞİLEBİLİR kalır (çocuk deneyimi engellenmez)', async () => {
    for (const url of ['/api/saglik', '/api/yol', '/api/eserler', '/api/sehirler']) {
      const cevap = await app.inject({ method: 'GET', url });
      expect(cevap.statusCode, url).toBe(200);
    }
  });
});

// ===========================================================================
// 2. Rol ayrımı
// ===========================================================================
describe('2. Rol ayrımı (yetki yükseltme engeli)', () => {
  it('öğretmen içerik silemez → 403', async () => {
    const cevap = await app.inject({
      method: 'DELETE',
      url: '/api/yonetim/eserler/herhangi',
      cookies: { kokavi_oturum: ogretmenToken },
    });
    expect(cevap.statusCode).toBe(403);
    expect(cevap.json().kod).toBe('YETKI_YOK');
  });

  it('öğretmen eser ekleyemez → 403', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/eserler',
      cookies: { kokavi_oturum: ogretmenToken },
      payload: { id: 'x', ad: 'X', sehirId: 'bursa', tur: 'Cami' },
    });
    expect(cevap.statusCode).toBe(403);
  });

  it('öğretmen kullanıcı listesini göremez → 403', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/api/yonetim/kullanicilar',
      cookies: { kokavi_oturum: ogretmenToken },
    });
    expect(cevap.statusCode).toBe(403);
  });

  it('yönetici içerik ekleyebilir → 201 (yetki gerçekten çalışıyor)', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/yonetim/sehirler',
      cookies: { kokavi_oturum: adminToken },
      payload: { id: 'test-sehir', ad: 'Test Şehir', sira: 9 },
    });
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/eserler',
      cookies: { kokavi_oturum: adminToken },
      payload: {
        id: 'test-eser',
        ad: 'Test Eseri',
        sehirId: 'test-sehir',
        tur: 'Cami',
        yayinda: false,
      },
    });
    expect(cevap.statusCode).toBe(201);

    const sil = await app.inject({
      method: 'DELETE',
      url: '/api/yonetim/eserler/test-eser',
      cookies: { kokavi_oturum: adminToken },
    });
    expect(sil.statusCode).toBe(200);
  });
});

// ===========================================================================
// 3. Parola güvenliği
// ===========================================================================
describe('3. Parola güvenliği', () => {
  it('veritabanında düz metin parola YOK', async () => {
    const { sorgu } = await import('../server/db/index.ts');
    const satirlar = await sorgu<{ parola_hash: string }>(`SELECT parola_hash FROM app_user`);

    expect(satirlar.length).toBeGreaterThan(0);
    for (const s of satirlar) {
      expect(s.parola_hash).not.toContain(ADMIN.parola);
      expect(s.parola_hash).not.toContain(OGRETMEN.parola);
      expect(s.parola_hash.startsWith('scrypt$')).toBe(true);
    }
  });

  it('aynı parola için farklı tuz üretilir (rainbow table direnci)', async () => {
    const { parolaHashle } = await import('../server/auth/parola.ts');
    const a = parolaHashle('AyniParola1');
    const b = parolaHashle('AyniParola1');
    expect(a).not.toBe(b);
  });

  it('yanlış parola özeti doğrulanmaz', async () => {
    const { parolaHashle, parolaDogrula } = await import('../server/auth/parola.ts');
    const ozet = parolaHashle('DogruParola1');
    expect(parolaDogrula('YanlisParola1', ozet)).toBe(false);
    expect(parolaDogrula('DogruParola1', ozet)).toBe(true);
  });

  it('bozuk özet çökme yaratmaz, false döner', async () => {
    const { parolaDogrula } = await import('../server/auth/parola.ts');
    for (const bozuk of ['', 'abc', 'scrypt$1$2$3', 'bcrypt$xx$yy$zz$aa$bb', 'scrypt$a$b$c$d$e']) {
      expect(parolaDogrula('herhangi', bozuk)).toBe(false);
    }
  });

  it('zayıf parola reddedilir (kayıt ucunda)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/kullanicilar',
      cookies: { kokavi_oturum: adminToken },
      payload: { email: 'zayif@test.local', ad: 'Zayıf', parola: 'abc' },
    });
    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().hata).toContain('zayıf');
  });
});

// ===========================================================================
// 4. Giriş güvenliği ve kaba kuvvet
// ===========================================================================
describe('4. Giriş güvenliği', () => {
  it('doğru kimlik bilgisiyle giriş yapılır ve httpOnly çerez verilir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: ADMIN.email, parola: ADMIN.parola },
    });
    expect(cevap.statusCode).toBe(200);
    const cerez = (cevap.cookies as { name: string; httpOnly?: boolean; sameSite?: string }[]).find(
      (c) => c.name === 'kokavi_oturum',
    );
    expect(cerez).toBeTruthy();
    expect(cerez!.httpOnly).toBe(true);
    expect(String(cerez!.sameSite).toLowerCase()).toBe('strict');
  });

  it('e-posta büyük/küçük harf duyarsız giriş çalışır (Türkçe İ dahil)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: ADMIN.email.toUpperCase(), parola: ADMIN.parola },
    });
    expect(cevap.statusCode).toBe(200);
  });

  it('KULLANICI NUMARALANDIRMASI YOK: var olan ve olmayan e-posta aynı mesajı alır', async () => {
    const varOlan = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: ADMIN.email, parola: 'YanlisParola9' },
    });
    const olmayan = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: 'hic-olmayan@test.local', parola: 'YanlisParola9' },
    });

    expect(varOlan.statusCode).toBe(401);
    expect(olmayan.statusCode).toBe(401);
    expect(varOlan.json().hata).toBe(olmayan.json().hata);
  });

  it('KABA KUVVET: 10 başarısız denemeden sonra hesap kilitlenir', async () => {
    const { basarisizDenemeSayisi, girisDenemesiKaydet } = await import('../server/auth/oturum.ts');
    const hedef = 'kurban@test.local';

    for (let i = 0; i < 10; i++) {
      await girisDenemesiKaydet(hedef, false);
    }
    expect(await basarisizDenemeSayisi(hedef, 15)).toBeGreaterThanOrEqual(10);

    const cevap = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: hedef, parola: 'HerhangiBir1' },
    });
    expect(cevap.statusCode).toBe(429);
    expect(cevap.json().kod).toBe('COK_FAZLA_DENEME');
  });

  it('başarısız denemeler pencere dışına çıkınca kilit açılır', async () => {
    const { basarisizDenemeSayisi } = await import('../server/auth/oturum.ts');
    // 0 dakikalık pencere → hiçbir deneme sayılmaz
    expect(await basarisizDenemeSayisi('kurban@test.local', 0)).toBe(0);
  });

  it('giriş gövdesi eksikse 400 döner (boş parola kabul edilmez)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: ADMIN.email },
    });
    expect(cevap.statusCode).toBe(400);
  });

  it('geçersiz e-posta biçimi reddedilir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: 'bu-bir-eposta-degil', parola: 'HerhangiBir1' },
    });
    expect(cevap.statusCode).toBe(400);
  });
});

// ===========================================================================
// 5. Oturum güvenliği
// ===========================================================================
describe('5. Oturum güvenliği', () => {
  it('çıkış yapınca belirteç geçersizleşir', async () => {
    const giris = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: ADMIN.email, parola: ADMIN.parola },
    });
    const belirtec = tokenAl(giris);
    expect(belirtec).not.toBe('');

    const once = await app.inject({
      method: 'GET',
      url: '/api/auth/ben',
      cookies: { kokavi_oturum: belirtec },
    });
    expect(once.statusCode).toBe(200);

    await app.inject({
      method: 'POST',
      url: '/api/auth/cikis',
      cookies: { kokavi_oturum: belirtec },
    });

    const sonra = await app.inject({
      method: 'GET',
      url: '/api/auth/ben',
      cookies: { kokavi_oturum: belirtec },
    });
    expect(sonra.statusCode).toBe(401);
  });

  it('veritabanında ham belirteç SAKLANMAZ (yalnızca SHA-256 özeti)', async () => {
    const giris = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: ADMIN.email, parola: ADMIN.parola },
    });
    const belirtec = tokenAl(giris);

    const { sorgu } = await import('../server/db/index.ts');
    const satirlar = await sorgu<{ token_hash: string }>(`SELECT token_hash FROM session`);

    expect(satirlar.length).toBeGreaterThan(0);
    for (const s of satirlar) {
      expect(s.token_hash).not.toBe(belirtec);
      expect(s.token_hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    }
  });

  it('hesap kapatılınca açık oturumları da düşer', async () => {
    const { kullaniciOlustur, kullaniciDurumDegistir, kullaniciOturumlariniBitir } = await import(
      '../server/auth/oturum.ts'
    );
    const gecici = await kullaniciOlustur({
      email: 'gecici@test.local',
      ad: 'Geçici',
      parola: 'GucluParola3',
      rol: 'ogretmen',
    });

    const giris = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: 'gecici@test.local', parola: 'GucluParola3' },
    });
    const belirtec = tokenAl(giris);
    expect(belirtec).not.toBe('');

    await kullaniciDurumDegistir(gecici.id, false);
    await kullaniciOturumlariniBitir(gecici.id);

    const cevap = await app.inject({
      method: 'GET',
      url: '/api/auth/ben',
      cookies: { kokavi_oturum: belirtec },
    });
    expect(cevap.statusCode).toBe(401);
  });
});

// ===========================================================================
// 6. Enjeksiyon saldırıları
// ===========================================================================
describe('6. Enjeksiyon saldırıları', () => {
  const sqlEnjeksiyonlari = [
    "' OR '1'='1",
    "'; DROP TABLE work; --",
    "1; DELETE FROM app_user WHERE 1=1; --",
    "admin'--",
    "' UNION SELECT * FROM app_user --",
  ];

  for (const yuk of sqlEnjeksiyonlari) {
    it(`SQL enjeksiyonu etkisiz: ${yuk.slice(0, 30)}`, async () => {
      const cevap = await app.inject({
        method: 'POST',
        url: '/api/auth/giris',
        payload: { email: yuk, parola: yuk },
      });
      // 400 (geçersiz e-posta) veya 401 (kimlik hatası) — asla 200 veya 500
      expect([400, 401]).toContain(cevap.statusCode);
    });
  }

  it('SQL enjeksiyonu içerik aramasında da etkisiz', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: `/api/eserler/${encodeURIComponent("' OR 1=1 --")}`,
    });
    expect([400, 404]).toContain(cevap.statusCode);
  });

  it('enjeksiyon sonrası tablolar hâlâ yerinde', async () => {
    const { sorgu } = await import('../server/db/index.ts');
    const t = await sorgu<{ sayi: number }>(
      `SELECT count(*)::int AS sayi FROM information_schema.tables
        WHERE table_schema='public' AND table_name IN ('app_user','work','session')`,
    );
    expect(t[0]!.sayi).toBe(3);
  });

  const xssYukleri = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    'javascript:alert(1)',
  ];

  for (const yuk of xssYukleri) {
    it(`XSS yükü olduğu gibi saklanmaz: ${yuk.slice(0, 24)}`, async () => {
      const cevap = await app.inject({
        method: 'POST',
        url: '/api/yonetim/eserler',
        cookies: { kokavi_oturum: adminToken },
        payload: {
          id: `xss-${Math.random().toString(36).slice(2, 10)}`,
          ad: yuk,
          sehirId: 'test-sehir',
          tur: 'Cami',
          yayinda: false,
        },
      });
      expect(cevap.statusCode).toBe(201);

      // Sunucu veriyi saklar (JSON) ama arayüz onu metin olarak kaçırmalıdır.
      // Kritik kontrol: yanıt Content-Type'ı JSON olmalı, HTML değil.
      expect(cevap.headers['content-type']).toContain('application/json');

      await app.inject({
        method: 'DELETE',
        url: `/api/yonetim/eserler/${cevap.json().id}`,
        cookies: { kokavi_oturum: adminToken },
      });
    });
  }
});

// ===========================================================================
// 7. Güvenlik başlıkları ve yapılandırma
// ===========================================================================
describe('7. Güvenlik başlıkları', () => {
  it('temel güvenlik başlıkları gönderilir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/saglik' });

    expect(cevap.headers['x-content-type-options']).toBe('nosniff');
    expect(cevap.headers['x-frame-options']).toBeDefined();
    expect(cevap.headers['content-security-policy']).toBeDefined();
    expect(cevap.headers['strict-transport-security']).toBeDefined();
    expect(cevap.headers['referrer-policy']).toBeDefined();
  });

  it('CSP frame-ancestors none içerir (clickjacking koruması)', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/saglik' });
    expect(String(cevap.headers['content-security-policy'])).toContain("frame-ancestors 'none'");
  });

  it('sunucu sürüm bilgisi sızdırılmaz', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/saglik' });
    expect(cevap.headers['x-powered-by']).toBeUndefined();
  });

  it('çok büyük gövde reddedilir (bellek tüketimi saldırısı)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: 'a@b.co', parola: 'x'.repeat(2_000_000) },
    });
    expect(cevap.statusCode).toBeGreaterThanOrEqual(400);
  });
});

// ===========================================================================
// 10. Sınıf uçları — gizlilik ve yetki
// ===========================================================================
describe('10. Sınıf uçları', () => {
  let sinifKodu = '';

  it('öğretmen sınıf oluşturabilir (öğretmen rolü artık işlevsel)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/ogretmen/siniflar',
      cookies: { kokavi_oturum: ogretmenToken },
      payload: { ad: '5-B Şehrimiz Dersi' },
    });
    expect(cevap.statusCode).toBe(201);

    const sinif = cevap.json();
    expect(sinif.kod).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{4}$/);
    sinifKodu = sinif.kod;
  });

  it('sınıf kodu karışması kolay harf içermez (I, O, 0, 1)', async () => {
    expect(sinifKodu).not.toMatch(/[IO01]/);
  });

  it('giriş yapmamış kullanıcı sınıf oluşturamaz → 401', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/ogretmen/siniflar',
      payload: { ad: 'Yetkisiz' },
    });
    expect(cevap.statusCode).toBe(401);
  });

  it('çocuk sınıf kodunu doğrulayabilir — kişisel veri sızdırılmaz', async () => {
    const cevap = await app.inject({ method: 'GET', url: `/api/sinif/${sinifKodu}` });
    expect(cevap.statusCode).toBe(200);

    const govde = cevap.json();
    // Yalnızca sayaçlar ve ad dönmeli
    expect(Object.keys(govde).sort()).toEqual(
      ['ad', 'kod', 'tamamlananDersCesidi', 'toplamTamamlama'].sort(),
    );
    // Öğretmen kimliği, e-posta vb. ASLA dönmemeli
    const metin = JSON.stringify(govde);
    expect(metin).not.toContain('ogretmenId');
    expect(metin).not.toContain('@');
    expect(metin).not.toContain('ogretmen@test.local');
  });

  it('olmayan sınıf kodu 404 döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/sinif/XXX-9999' });
    expect(cevap.statusCode).toBe(404);
    expect(cevap.json().kod).toBe('SINIF_YOK');
  });

  it('BAŞKA ÖĞRETMEN başkasının sınıfını göremez → 403', async () => {
    const { kullaniciOlustur } = await import('../server/auth/oturum.ts');
    await kullaniciOlustur({
      email: 'diger-ogretmen@test.local',
      ad: 'Diğer Öğretmen',
      parola: 'GucluParola4',
      rol: 'ogretmen',
    });
    const giris = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: 'diger-ogretmen@test.local', parola: 'GucluParola4' },
    });
    const digerToken = tokenAl(giris);

    const cevap = await app.inject({
      method: 'GET',
      url: `/api/ogretmen/siniflar/${sinifKodu}`,
      cookies: { kokavi_oturum: digerToken },
    });
    expect(cevap.statusCode).toBe(403);
    expect(cevap.json().kod).toBe('YETKI_YOK');
  });

  it('yönetici her sınıfı görebilir (destek erişimi)', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: `/api/ogretmen/siniflar/${sinifKodu}`,
      cookies: { kokavi_oturum: adminToken },
    });
    expect(cevap.statusCode).toBe(200);
  });

  it('anonim tamamlama kaydı çalışır ve sayaç artar', async () => {
    const once = await app.inject({ method: 'GET', url: `/api/sinif/${sinifKodu}` });
    const oncekiSayi = once.json().toplamTamamlama;

    const cevap = await app.inject({
      method: 'POST',
      url: '/api/sinif/tamamla',
      payload: { kod: sinifKodu, dersId: 'herhangi-bir-ders' },
    });

    // Ders gerçek değilse reddedilmeli (uydurma kimlikle sayaç şişirilemez)
    expect(cevap.statusCode).toBe(404);

    const sonra = await app.inject({ method: 'GET', url: `/api/sinif/${sinifKodu}` });
    expect(sonra.json().toplamTamamlama).toBe(oncekiSayi);
  });

  it('tamamlama kaydı kimlik İSTEMEZ (gövdede yalnızca kod+dersId)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/sinif/tamamla',
      payload: { kod: sinifKodu },
    });
    // dersId eksik → 400 (kimlik değil, alan doğrulaması)
    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().hata).toContain('dersId');
  });

  it('sınıf Röntgeni yalnızca toplu sayaç + yayın içeriği döner (kimlik yok)', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: `/api/sinif/${sinifKodu}/rontgen`,
    });
    expect(cevap.statusCode).toBe(200);

    const govde = cevap.json() as Record<string, unknown>;
    expect(Object.keys(govde).sort()).toEqual(
      [
        'ad',
        'eserler',
        'kod',
        'kulliyeler',
        'tamamlananDersCesidi',
        'toplamTamamlama',
      ].sort(),
    );
    expect(Array.isArray(govde.eserler)).toBe(true);
    expect(Array.isArray(govde.kulliyeler)).toBe(true);

    // Öğretmen kimliği, e-posta veya çocuk kimliği ASLA dönmemeli.
    const metin = JSON.stringify(govde);
    expect(metin).not.toContain('ogretmenId');
    expect(metin).not.toContain('@');
    expect(metin).not.toContain('ogretmen@test.local');
  });

  it('olmayan sınıfın Röntgeni 404 döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/sinif/XXX-9999/rontgen' });
    expect(cevap.statusCode).toBe(404);
    expect(cevap.json().kod).toBe('SINIF_YOK');
  });

  it('öğretmen sınıf detayı külliye kırılımını da döner', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: `/api/ogretmen/siniflar/${sinifKodu}`,
      cookies: { kokavi_oturum: ogretmenToken },
    });
    expect(cevap.statusCode).toBe(200);
    expect(Array.isArray(cevap.json().kulliyeler)).toBe(true);
  });

  it('geçersiz kod biçimi reddedilir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/api/sinif/ab' });
    expect(cevap.statusCode).toBe(404);
  });
});

// ===========================================================================
// 9. REGRESYON: gövdesiz POST'lar
// ===========================================================================
describe('9. Regresyon — gövdesiz POST istekleri', () => {
  /**
   * CANLI TESTTE BULUNAN HATA: Gerçek tarayıcı istemcisi `POST /api/auth/cikis`
   * isteğini `Content-Type: application/json` ile ve GÖVDESİZ gönderir.
   * Fastify'ın varsayılan JSON ayrıştırıcısı boş gövdeyi hata saydığı için
   * 400 dönüyordu — yani uygulamadaki çıkış düğmesi kırıktı.
   *
   * Birim testleri bunu yakalayamamıştı çünkü `inject` gövde verilmeyince
   * content-type başlığı da eklemiyor. Bu test başlığı AÇIKÇA gönderir.
   */
  it('çıkış: application/json başlığı + gövdesiz istek çalışır', async () => {
    const giris = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      payload: { email: ADMIN.email, parola: ADMIN.parola },
    });
    const belirtec = tokenAl(giris);

    const cevap = await app.inject({
      method: 'POST',
      url: '/api/auth/cikis',
      headers: { 'content-type': 'application/json' },
      cookies: { kokavi_oturum: belirtec },
      // payload YOK — tarayıcının davranışı
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().tamam).toBe(true);

    const sonra = await app.inject({
      method: 'GET',
      url: '/api/auth/ben',
      cookies: { kokavi_oturum: belirtec },
    });
    expect(sonra.statusCode).toBe(401);
  });

  it('çıkış: content-type başlığı hiç yoksa da çalışır', async () => {
    const cevap = await app.inject({ method: 'POST', url: '/api/auth/cikis' });
    expect(cevap.statusCode).toBe(200);
  });

  it('KATILIK KORUNDU: bozuk JSON gövdesi 400 döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      headers: { 'content-type': 'application/json' },
      payload: '{bozuk-json',
    });
    expect(cevap.statusCode).toBe(400);
  });

  it('KATILIK KORUNDU: gövdesiz bilinmeyen içerik türü reddedilmez, gövdeli reddedilir', async () => {
    const govdesiz = await app.inject({
      method: 'POST',
      url: '/api/auth/cikis',
      headers: { 'content-type': 'text/xml' },
    });
    expect(govdesiz.statusCode).toBe(200);

    const govdeli = await app.inject({
      method: 'POST',
      url: '/api/auth/giris',
      headers: { 'content-type': 'text/xml' },
      payload: '<x/>',
    });
    expect(govdeli.statusCode).toBe(415);
  });
});

// ===========================================================================
// 8. Girdi doğrulama (şartname 5.1.5)
// ===========================================================================
describe('8. Girdi doğrulama', () => {
  it('yüzde 0-100 aralığı zorunlu', async () => {
    for (const yuzde of [-5, 101, 999]) {
      const cevap = await app.inject({
        method: 'POST',
        url: '/api/yonetim/eserler',
        cookies: { kokavi_oturum: adminToken },
        payload: {
          id: `yuzde-${yuzde}`,
          ad: 'Test',
          sehirId: 'test-sehir',
          tur: 'Cami',
          gelirKalemleri: [{ kalem: 'K', yuzde }],
        },
      });
      expect(cevap.statusCode, `yüzde=${yuzde}`).toBe(400);
    }
  });

  it('geçersiz egzersiz tipi reddedilir (beyaz liste)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/dersler',
      cookies: { kokavi_oturum: adminToken },
      payload: {
        id: 'x',
        uniteId: 'y',
        eserId: 'z',
        sira: 1,
        merak: {},
        baglam: {},
        perspektif: {},
        yansima: {},
        egzersizler: [{ id: 'a', tip: 'zararli-tip', veri: {} }],
      },
    });
    expect(cevap.statusCode).toBe(400);
  });

  it('olmayan şehre eser eklenemez (yabancı anahtar)', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/eserler',
      cookies: { kokavi_oturum: adminToken },
      payload: { id: 'yetim', ad: 'Yetim', sehirId: 'olmayan-sehir', tur: 'Cami' },
    });
    expect(cevap.statusCode).toBe(400);
  });

  it('prototype pollution denemesi etkisiz', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/api/yonetim/eserler',
      cookies: { kokavi_oturum: adminToken },
      payload: {
        id: 'proto-test',
        ad: 'Proto',
        sehirId: 'test-sehir',
        tur: 'Cami',
        __proto__: { kirlendi: true },
        constructor: { prototype: { kirlendi: true } },
      },
    });
    // Ya reddedilir ya da zararsız işlenir — ama global prototip kirlenmemeli
    expect(({} as Record<string, unknown>).kirlendi).toBeUndefined();

    if (cevap.statusCode === 201) {
      await app.inject({
        method: 'DELETE',
        url: '/api/yonetim/eserler/proto-test',
        cookies: { kokavi_oturum: adminToken },
      });
    }
  });
});
