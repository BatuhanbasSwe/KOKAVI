/**
 * Kimlik doğrulama uçları.
 *
 * POST /api/auth/giris    — giriş (kaba kuvvet korumalı, hız sınırlı)
 * POST /api/auth/cikis    — çıkış (oturumu siler)
 * GET  /api/auth/ben      — aktif kullanıcı
 * POST /api/auth/parola   — kendi parolasını değiştir
 *
 * Yönetici uçları:
 * GET    /api/yonetim/kullanicilar
 * POST   /api/yonetim/kullanicilar
 * PATCH  /api/yonetim/kullanicilar/:id
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  girisYap,
  oturumBitir,
  kullanicilariListele,
  kullaniciOlustur,
  kullaniciVarMi,
  kullaniciGetir,
  kullaniciDurumDegistir,
  kullaniciParolaDegistir,
  basarisizDenemeSayisi,
  OTURUM_SURESI_MS,
  type Rol,
} from '../auth/oturum.ts';
import { belirtecAl, OTURUM_CEREZ_ADI, oturumGerekli, yoneticiGerekli } from '../auth/koruma.ts';
import { parolaZayifMi } from '../auth/parola.ts';

/** Kaba kuvvet eşiği: 15 dakikada 10 başarısız deneme → kilit. */
const BASARISIZ_ESIK = 10;
const PENCERE_DAKIKA = 15;

const GECERLI_ROLLER: Rol[] = ['admin', 'ogretmen'];

class DogrulamaHatasi extends Error {}

function zorunlu(deger: unknown, alan: string): string {
  if (typeof deger !== 'string' || deger.trim() === '') {
    throw new DogrulamaHatasi(`"${alan}" alanı zorunludur.`);
  }
  return deger.trim();
}

/** Basit ama katı e-posta denetimi — ReDoS üretmeyen desen. */
function emailDogrula(email: string): string {
  const temiz = email.trim();
  if (temiz.length > 254) throw new DogrulamaHatasi('E-posta çok uzun.');
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(temiz)) {
    throw new DogrulamaHatasi('Geçerli bir e-posta adresi gir.');
  }
  return temiz;
}

function hataYanit(cevap: FastifyReply, hata: unknown) {
  if (hata instanceof DogrulamaHatasi) {
    return cevap.code(400).send({ hata: hata.message });
  }
  const mesaj = hata instanceof Error ? hata.message : String(hata);
  if (mesaj.includes('duplicate key') || mesaj.includes('idx_app_user_email')) {
    return cevap.code(409).send({ hata: 'Bu e-posta ile bir hesap zaten var.' });
  }
  return cevap.code(500).send({ hata: 'Sunucu hatası' });
}

export async function authUclari(app: FastifyInstance): Promise<void> {
  // --- Giriş ---------------------------------------------------------------
  app.post(
    '/api/auth/giris',
    {
      config: {
        // Hız sınırı: aynı IP'den dakikada en fazla 10 giriş denemesi.
        rateLimit: { max: 10, timeWindow: '1 minute' },
      },
    },
    async (istek, cevap) => {
      try {
        const govde = istek.body as Record<string, unknown>;
        const email = emailDogrula(zorunlu(govde.email, 'email'));
        const parola = zorunlu(govde.parola, 'parola');

        // Kaba kuvvet: bu hesap için çok fazla başarısız deneme varsa reddet.
        const basarisiz = await basarisizDenemeSayisi(email, PENCERE_DAKIKA);
        if (basarisiz >= BASARISIZ_ESIK) {
          return cevap.code(429).send({
            hata: `Çok fazla başarısız deneme. ${PENCERE_DAKIKA} dakika sonra tekrar dene.`,
            kod: 'COK_FAZLA_DENEME',
          });
        }

        const sonuc = await girisYap(email, parola, istek.headers['user-agent']);

        if (!sonuc) {
          // Genel mesaj: e-posta var mı yok mu bilgisi SIZDIRILMAZ.
          return cevap.code(401).send({
            hata: 'E-posta veya parola hatalı.',
            kod: 'KIMLIK_HATASI',
            kalanDeneme: Math.max(0, BASARISIZ_ESIK - basarisiz - 1),
          });
        }

        // httpOnly + sameSite=strict: JavaScript okuyamaz, siteler arası gönderilmez.
        cevap.setCookie(OTURUM_CEREZ_ADI, sonuc.token, {
          path: '/',
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          maxAge: Math.floor(OTURUM_SURESI_MS / 1000),
        });

        return { kullanici: sonuc.kullanici, belirtec: sonuc.token };
      } catch (hata) {
        return hataYanit(cevap, hata);
      }
    },
  );

  // --- Çıkış ---------------------------------------------------------------
  app.post('/api/auth/cikis', async (istek, cevap) => {
    const belirtec = belirtecAl(istek);
    if (belirtec) await oturumBitir(belirtec);
    cevap.clearCookie(OTURUM_CEREZ_ADI, { path: '/' });
    return { tamam: true };
  });

  // --- Aktif kullanıcı -----------------------------------------------------
  app.get('/api/auth/ben', { preHandler: oturumGerekli }, async (istek) => ({
    kullanici: istek.kullanici,
  }));

  // --- Kendi parolasını değiştir -------------------------------------------
  app.post('/api/auth/parola', { preHandler: oturumGerekli }, async (istek, cevap) => {
    try {
      const govde = istek.body as Record<string, unknown>;
      const yeni = zorunlu(govde.yeniParola, 'yeniParola');

      const sorunlar = parolaZayifMi(yeni);
      if (sorunlar.length) {
        return cevap.code(400).send({ hata: 'Parola zayıf.', detay: sorunlar });
      }

      await kullaniciParolaDegistir(istek.kullanici!.id, yeni);
      cevap.clearCookie(OTURUM_CEREZ_ADI, { path: '/' });
      return { tamam: true, mesaj: 'Parola değişti. Yeniden giriş yapmalısın.' };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  // --- Yönetici: kullanıcı yönetimi ----------------------------------------
  app.get('/api/yonetim/kullanicilar', { preHandler: yoneticiGerekli }, async () =>
    kullanicilariListele(),
  );

  app.post('/api/yonetim/kullanicilar', { preHandler: yoneticiGerekli }, async (istek, cevap) => {
    try {
      const govde = istek.body as Record<string, unknown>;
      const email = emailDogrula(zorunlu(govde.email, 'email'));
      const ad = zorunlu(govde.ad, 'ad');
      const parola = zorunlu(govde.parola, 'parola');
      const rol = (govde.rol as Rol) ?? 'ogretmen';

      if (!GECERLI_ROLLER.includes(rol)) {
        throw new DogrulamaHatasi(`"rol" şunlardan biri olmalı: ${GECERLI_ROLLER.join(', ')}`);
      }
      const sorunlar = parolaZayifMi(parola);
      if (sorunlar.length) {
        return cevap.code(400).send({ hata: 'Parola zayıf.', detay: sorunlar });
      }
      if (await kullaniciVarMi(email)) {
        return cevap.code(409).send({ hata: 'Bu e-posta ile bir hesap zaten var.' });
      }

      const kullanici = await kullaniciOlustur({ email, ad, parola, rol });
      return cevap.code(201).send(kullanici);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  app.patch('/api/yonetim/kullanicilar/:id', { preHandler: yoneticiGerekli }, async (istek, cevap) => {
    try {
      const { id } = istek.params as { id: string };
      const govde = istek.body as Record<string, unknown>;

      // Yönetici kendi hesabını kapatamaz — kendini kilitleme koruması.
      if (id === istek.kullanici!.id && govde.aktif === false) {
        return cevap.code(400).send({ hata: 'Kendi hesabını kapatamazsın.' });
      }
      if (typeof govde.aktif !== 'boolean') {
        throw new DogrulamaHatasi('"aktif" alanı true/false olmalıdır.');
      }
      if (!(await kullaniciGetir(id))) {
        return cevap.code(404).send({ hata: 'Kullanıcı bulunamadı.' });
      }

      await kullaniciDurumDegistir(id, govde.aktif);
      // Hesap kapatıldıysa açık oturumları da düşür.
      if (!govde.aktif) {
        const { kullaniciOturumlariniBitir } = await import('../auth/oturum.ts');
        await kullaniciOturumlariniBitir(id);
      }
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
}
