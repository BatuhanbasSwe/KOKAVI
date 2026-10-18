/**
 * Kök Avı — API sunucusu.
 *
 * İki uç grubu:
 *   /api/*           genel okuma (içerik) — kullanıcı verisi almaz
 *   /api/yonetim/*   içerik yönetimi (eser/ünite/ders ekle-düzenle-sil)
 *
 * Üretimde statik istemci dosyaları da bu sunucudan servis edilir.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { semaGarantiEt, baglantiKapat } from './db/index.ts';
import { genelUclar } from './routes/public.ts';
import { yonetimUclari } from './routes/admin.ts';
import { authUclari } from './routes/auth.ts';
import { sinifUclari } from './routes/sinif.ts';
import { canliUclari } from './routes/canli.ts';
import { sorUclari, type SorSecenekleri } from './routes/sor.ts';
import { suresiGecmisOturumlariTemizle, eskiDenemeleriTemizle } from './auth/oturum.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '127.0.0.1';

/** `sor`: kaynaklı soru-cevap için test seçenekleri (sahte model). */
export async function sunucuKur(secenekler: { sor?: SorSecenekleri } = {}) {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    // Güvenlik: gövde boyutu sınırı — bellek tüketimi saldırısını engeller.
    bodyLimit: 1_048_576, // 1 MB
  });

  // --- Güvenlik başlıkları (şartname 5.1.5) --------------------------------
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // MapLibre inline worker/blob kullanır; stil de inline üretilir.
        scriptSrc: ["'self'", "'wasm-unsafe-eval'", 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'blob:', 'data:'],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // MapLibre tile çekebilsin
  });

  // --- Hız sınırı: varsayılan tüm uçlarda; giriş ucunda daha katı ----------
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    // Testler ve yerel demo sınırlanmasın; üretimde kapatılmaz.
    allowList: process.env.KOKAVI_RATE_LIMIT_OFF === '1' ? ['127.0.0.1', '::1'] : [],
    errorResponseBuilder: () => ({
      hata: 'Çok fazla istek gönderildi. Lütfen biraz bekle.',
      kod: 'HIZ_SINIRI',
    }),
  });

  // --- Gövde ayrıştırma: boş gövdeli POST'lar ---------------------------------
  //
  // CANLI TESTTE BULUNAN HATA: Fastify'ın varsayılan JSON ayrıştırıcısı boş
  // gövdeyi hata sayar. Bu yüzden `POST /api/auth/cikis` gibi gövdesiz uçlar
  // `Content-Type: application/json` ile çağrıldığında 400 dönüyordu — yani
  // uygulamadaki çıkış düğmesi kırıktı. Birim testleri `inject` ile gövde
  // göndermediği için bunu yakalayamamıştı.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_istek, govde, done) => {
      const metin = typeof govde === 'string' ? govde.trim() : '';
      if (metin === '') return done(null, undefined);
      try {
        done(null, JSON.parse(metin));
      } catch {
        const hata = new Error('Gövde geçerli JSON değil.') as Error & { statusCode?: number };
        hata.statusCode = 400;
        done(hata, undefined);
      }
    },
  );

  // İçerik türü belirtilmemiş BOŞ istekler de kabul edilsin (bazı istemciler
  // gövdesiz POST'ta content-type göndermez). Gövdeli bilinmeyen türler
  // reddedilmeye devam eder — katılık korunur.
  app.addContentTypeParser('*', { parseAs: 'string' }, (_istek, govde, done) => {
    if (govde === '' || govde === undefined) return done(null, undefined);
    const hata = new Error('Desteklenmeyen içerik türü.') as Error & { statusCode?: number };
    hata.statusCode = 415;
    done(hata, undefined);
  });

  await app.register(cookie);

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Şema yoksa kur (ilk açılışta otomatik) — içerik + auth tabloları.
  await semaGarantiEt();

  // Süresi dolmuş oturumları ve eski giriş denemelerini temizle.
  await suresiGecmisOturumlariTemizle();
  await eskiDenemeleriTemizle();

  await app.register(authUclari);
  await app.register(sinifUclari);
  await app.register(canliUclari);
  await app.register(genelUclar);
  await app.register(sorUclari, secenekler.sor ?? {});
  await app.register(yonetimUclari);

  // Üretim derlemesi varsa istemciyi de servis et.
  const distYolu = join(__dirname, '..', 'dist');
  if (existsSync(distYolu)) {
    await app.register(fastifyStatic, { root: distYolu });
    app.setNotFoundHandler((istek, cevap) => {
      // SPA yönlendirmesi: /api dışındaki yollar index.html'e düşer.
      if (istek.url.startsWith('/api')) {
        return cevap.code(404).send({ hata: 'Uç bulunamadı' });
      }
      return cevap.sendFile('index.html');
    });
  }

  return app;
}

async function basla() {
  // Yerel geliştirme: .env varsa (ör. GEMINI_API_KEY) yükle. Dosya gitignore'da;
  // Vercel'de değişkenler proje ayarlarından gelir.
  if (existsSync('.env')) process.loadEnvFile('.env');
  const app = await sunucuKur();
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Kök Avı API hazır: http://${HOST}:${PORT}`);
  } catch (hata) {
    app.log.error(hata);
    process.exit(1);
  }

  for (const sinyal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sinyal, async () => {
      await app.close();
      await baglantiKapat();
      process.exit(0);
    });
  }
}

// Yalnızca doğrudan çalıştırıldığında dinle (testler `sunucuKur` kullanır).
const dogrudanCalisti =
  process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/').endsWith(
    process.argv[1].replace(/\\/g, '/').split('/').slice(-2).join('/'),
  );

if (dogrudanCalisti) {
  void basla();
}
