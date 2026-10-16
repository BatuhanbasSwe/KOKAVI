/**
 * Canlı sınıf yarışması uçları (Kahoot tarzı).
 *
 * KİMLİK YOK: Öğretmen giriş yapmadan oyun kurabilir; çocuk yalnızca PIN girer.
 * Yetki, odayı kurana verilen gizli "sunucu anahtarı" ve katılana verilen
 * "oyuncu anahtarı" ile sağlanır. Anahtarlar URL'de değil başlıkta gider
 * (sunucu günlüklerine düşmesin):
 *   x-canli-anahtar  → oyunu yöneten
 *   x-canli-oyuncu   → oyuncu
 *
 * HIZ SINIRI: Bir sınıftaki 30 cihaz genelde AYNI IP'den çıkar. Genel sınır
 * (IP başına 300/dk) saniyede bir yoklayan bir sınıfı keserdi; bu yüzden
 * yoklama uçları IP + anahtar başına sınırlanır.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { sorgu } from '../db/index.ts';
import { dersleriListele } from '../repo/ders.ts';
import { CanliHata, CanliOdalar, type CanliHataKodu } from '../canli/oda.ts';
import { sorulariUret, type SoruKaynagi } from '../canli/sorular.ts';
import {
  CANLI_SORU_SAYISI,
  CANLI_SURELER,
  type CanliKapsam,
  type CanliOdaCevabi,
} from '../../shared/canli.ts';

export interface CanliSecenekleri {
  odalar?: CanliOdalar;
  /** Testler veritabanı olmadan soru verebilsin diye dışarıdan verilebilir. */
  soruKaynagi?: (kapsam: CanliKapsam) => Promise<SoruKaynagi>;
}

const PIN = /^\d{6}$/;
const KAPSAM = /^(hepsi|sehir:[a-z0-9-]{1,60}|unite:[a-z0-9-]{1,80})$/;

const DURUM_KODU: Record<CanliHataKodu, number> = {
  ODA_YOK: 404,
  YETKI_YOK: 403,
  KAPASITE: 503,
  ODA_DOLU: 409,
  OYUN_BITTI: 409,
  OYUNCU_YOK: 409,
  ASAMA_UYGUN_DEGIL: 409,
  GECERSIZ_CEVAP: 400,
  ZATEN_CEVAPLANDI: 409,
  SURE_DOLDU: 409,
};

/** Varsayılan soru kaynağı: yayındaki dersler + her eserin kapak fotoğrafı. */
async function veritabanindanSoruKaynagi(kapsam: CanliKapsam): Promise<SoruKaynagi> {
  const [tur, id] = kapsam.split(':') as [string, string | undefined];
  const dersler = (await dersleriListele()).filter((d) =>
    tur === 'sehir' ? d.eser?.sehirId === id : tur === 'unite' ? d.uniteId === id : true,
  );
  const fotolar = await sorgu<{ work_id: string; url: string; kaynak: string | null }>(
    `SELECT DISTINCT ON (work_id) work_id, url, kaynak FROM work_photo ORDER BY work_id, sira`,
  );
  const sehirler = await sorgu<{ id: string; ad: string }>(`SELECT id, ad FROM city`);
  return {
    dersler,
    fotograflar: new Map(fotolar.map((f) => [f.work_id, { url: f.url, kaynak: f.kaynak }])),
    sehirAdlari: new Map(sehirler.map((s) => [s.id, s.ad])),
  };
}

function baslik(istek: FastifyRequest, ad: string): string | undefined {
  const deger = istek.headers[ad];
  return typeof deger === 'string' && deger.length <= 64 ? deger : undefined;
}

/** Yoklama uçları için sınır anahtarı: aynı sınıftaki cihazlar birbirini kesmesin. */
const anahtarBasina = (ad: string) => (istek: FastifyRequest) =>
  `${istek.ip}|${baslik(istek, ad) ?? '-'}`;

export async function canliUclari(
  app: FastifyInstance,
  secenekler: CanliSecenekleri = {},
): Promise<void> {
  const odalar = secenekler.odalar ?? new CanliOdalar();
  const soruKaynagi = secenekler.soruKaynagi ?? veritabanindanSoruKaynagi;

  app.setErrorHandler((hata, _istek, cevap) => {
    if (hata instanceof CanliHata) {
      return cevap.code(DURUM_KODU[hata.kod]).send({ hata: hata.message, kod: hata.kod });
    }
    // Hız sınırı ve gövde hataları üst düzeydeki varsayılan işleyiciye kalır.
    throw hata;
  });

  const pinAl = (istek: FastifyRequest): string => {
    const { pin } = istek.params as { pin: string };
    if (!PIN.test(pin)) throw new CanliHata('ODA_YOK', 'PIN 6 rakamdan oluşur.');
    return pin;
  };

  // --- Oyunu kuran (öğretmen) -------------------------------------------------

  app.post(
    '/api/canli/odalar',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (istek, cevap) => {
      const govde = (istek.body ?? {}) as Record<string, unknown>;
      const kapsam = typeof govde.kapsam === 'string' ? govde.kapsam : 'hepsi';
      const soruSayisi = Number(govde.soruSayisi ?? CANLI_SORU_SAYISI.varsayilan);
      const sureSn = Number(govde.sureSn ?? CANLI_SURELER[0]);

      if (!KAPSAM.test(kapsam)) return cevap.code(400).send({ hata: 'Geçersiz kapsam.' });
      if (
        !Number.isInteger(soruSayisi) ||
        soruSayisi < CANLI_SORU_SAYISI.en_az ||
        soruSayisi > CANLI_SORU_SAYISI.en_cok
      ) {
        return cevap.code(400).send({
          hata: `Soru sayısı ${CANLI_SORU_SAYISI.en_az}–${CANLI_SORU_SAYISI.en_cok} arasında olmalı.`,
        });
      }
      if (!(CANLI_SURELER as readonly number[]).includes(sureSn)) {
        return cevap.code(400).send({ hata: `Süre ${CANLI_SURELER.join(', ')} sn olabilir.` });
      }

      const sorular = sorulariUret(await soruKaynagi(kapsam as CanliKapsam), soruSayisi);
      if (sorular.length < CANLI_SORU_SAYISI.en_az) {
        return cevap
          .code(422)
          .send({ hata: 'Bu seçimde yarışma için yeterli soru yok.', kod: 'SORU_YOK' });
      }
      const oda = odalar.kur(sorular, sureSn);
      const govdeCevap: CanliOdaCevabi = { ...oda, soruSayisi: sorular.length };
      return cevap.code(201).send(govdeCevap);
    },
  );

  const yonetimSiniri = {
    config: {
      rateLimit: { max: 240, timeWindow: '1 minute', keyGenerator: anahtarBasina('x-canli-anahtar') },
    },
  };

  app.get('/api/canli/odalar/:pin/yonetim', yonetimSiniri, async (istek) =>
    odalar.sunucuDurumu(pinAl(istek), baslik(istek, 'x-canli-anahtar')),
  );

  for (const eylem of ['basla', 'sonraki', 'bitir'] as const) {
    app.post(`/api/canli/odalar/:pin/${eylem}`, yonetimSiniri, async (istek) => {
      const pin = pinAl(istek);
      const anahtar = baslik(istek, 'x-canli-anahtar');
      odalar[eylem](pin, anahtar);
      return odalar.sunucuDurumu(pin, anahtar);
    });
  }

  // --- Oyuncu (çocuk) ----------------------------------------------------------

  app.post(
    '/api/canli/odalar/:pin/katil',
    // Bir sınıf aynı IP'den katılır: 30–40 katılım rahat geçmeli, PIN taraması geçmemeli.
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (istek, cevap) => cevap.code(201).send(odalar.katil(pinAl(istek))),
  );

  app.get(
    '/api/canli/odalar/:pin/oyuncu',
    {
      config: {
        rateLimit: { max: 240, timeWindow: '1 minute', keyGenerator: anahtarBasina('x-canli-oyuncu') },
      },
    },
    async (istek) => odalar.oyuncuDurumu(pinAl(istek), baslik(istek, 'x-canli-oyuncu')),
  );

  app.post(
    '/api/canli/odalar/:pin/cevap',
    {
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: anahtarBasina('x-canli-oyuncu') },
      },
    },
    async (istek) => {
      const pin = pinAl(istek);
      const govde = (istek.body ?? {}) as Record<string, unknown>;
      const soruNo = Number(govde.soruNo);
      const secim = Number(govde.secim);
      if (!Number.isInteger(soruNo) || !Number.isInteger(secim)) {
        throw new CanliHata('GECERSIZ_CEVAP', '"soruNo" ve "secim" tam sayı olmalı.');
      }
      odalar.cevapla(pin, baslik(istek, 'x-canli-oyuncu'), soruNo, secim);
      return { alindi: true };
    },
  );
}
