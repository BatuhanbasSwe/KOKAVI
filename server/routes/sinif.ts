/**
 * Sınıf uçları.
 *
 * İKİ AYRI YETKİ SEVİYESİ
 *  · Herkese açık (`/api/sinif/*`): kod doğrulama, anonim tamamlama kaydı ve
 *    toplu ilerleme okuma. Kişisel veri yok, kimlik yok.
 *  · Öğretmen (`/api/ogretmen/*`): sınıf oluşturma/yönetme. Giriş zorunlu.
 *
 * GÜVENLİK
 *  · Tamamlama ucu hız sınırlıdır — sayaç şişirme denenemez.
 *  · Öğretmen yalnızca KENDİ sınıflarını görür; başkasının kodunu sorsa 403.
 *  · Gönderilen `dersId` gerçek bir derse karşılık gelmezse reddedilir.
 */
import type { FastifyInstance } from 'fastify';
import {
  sinifOlustur,
  sinifGetir,
  sinifIlerlemesi,
  sinifDetayliIlerleme,
  sinifRontgeni,
  ogretmenSiniflari,
  sinifDurumDegistir,
  tamamlamaKaydet,
  koduNormalle,
} from '../repo/sinif.ts';
import { oturumGerekli } from '../auth/koruma.ts';
import { gunlukYaz } from '../yonetim/gunluk.ts';

class DogrulamaHatasi extends Error {}

function zorunlu(deger: unknown, alan: string): string {
  if (typeof deger !== 'string' || deger.trim() === '') {
    throw new DogrulamaHatasi(`"${alan}" alanı zorunludur.`);
  }
  return deger.trim();
}

export async function sinifUclari(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // Herkese açık — kimlik yok, kişisel veri yok
  // -----------------------------------------------------------------------

  /** Sınıf kodunu doğrular. Çocuk kodu girdiğinde çağrılır. */
  app.get('/api/sinif/:kod', async (istek, cevap) => {
    const { kod } = istek.params as { kod: string };
    const sinif = await sinifGetir(kod);

    if (!sinif || !sinif.aktif) {
      return cevap.code(404).send({ hata: 'Böyle bir sınıf kodu yok.', kod: 'SINIF_YOK' });
    }

    const ilerleme = await sinifIlerlemesi(sinif.kod);
    return {
      kod: sinif.kod,
      ad: sinif.ad,
      // Yalnızca toplu sayaçlar — hiçbir öğrenciye ait veri yok.
      toplamTamamlama: ilerleme?.toplamTamamlama ?? 0,
      tamamlananDersCesidi: ilerleme?.tamamlananDersCesidi ?? 0,
    };
  });

  /**
   * Sınıfın birlikte açtığı Vakıf Röntgeni — öğretmenin tahtasında gösterilir.
   *
   * Sınıf kodu yeterli: pano ekranı öğretmen oturumu gerektirmez. Dönen veri
   * yalnızca toplu sayaçlar ve yayın içeriğidir (eser adı, gelir kalemleri).
   * Hangi çocuğun gördüğü bilinmez; sınıf kapalıysa da geçmiş gösterilir.
   */
  app.get('/api/sinif/:kod/rontgen', async (istek, cevap) => {
    const { kod } = istek.params as { kod: string };
    const rontgen = await sinifRontgeni(kod);
    if (!rontgen) {
      return cevap.code(404).send({ hata: 'Böyle bir sınıf kodu yok.', kod: 'SINIF_YOK' });
    }
    return rontgen;
  });

  /**
   * Anonim tamamlama kaydı. Çocuk dersi bitirince çağrılır.
   * Gönderilen tek şey: sınıf kodu + ders kimliği. Kimlik YOK.
   */
  app.post(
    '/api/sinif/tamamla',
    {
      config: {
        // Sayaç şişirme denemesini sınırla.
        rateLimit: { max: 60, timeWindow: '1 minute' },
      },
    },
    async (istek, cevap) => {
      try {
        const govde = (istek.body ?? {}) as Record<string, unknown>;
        const kod = zorunlu(govde.kod, 'kod');
        const dersId = zorunlu(govde.dersId, 'dersId');

        const tamam = await tamamlamaKaydet(kod, dersId);
        if (!tamam) {
          return cevap.code(404).send({ hata: 'Sınıf kodu veya ders bulunamadı.' });
        }
        // İşlem günlüğü: sayaç bütün sunucu örneklerinde birleşsin.
        await gunlukYaz({ t: 'sinif-tamamla', d: { kod, dersId } });
        return { tamam: true };
      } catch (hata) {
        if (hata instanceof DogrulamaHatasi) {
          return cevap.code(400).send({ hata: hata.message });
        }
        return cevap.code(500).send({ hata: 'Sunucu hatası' });
      }
    },
  );

  // -----------------------------------------------------------------------
  // Öğretmen — giriş zorunlu
  // -----------------------------------------------------------------------

  app.get('/api/ogretmen/siniflar', { preHandler: oturumGerekli }, async (istek) => {
    const siniflar = await ogretmenSiniflari(istek.kullanici!.id);
    // Her sınıf için özet sayaç da dönsün (panel tek istekte doldursun).
    return Promise.all(
      siniflar.map(async (s) => ({
        ...s,
        ozet: await sinifIlerlemesi(s.kod),
      })),
    );
  });

  app.post('/api/ogretmen/siniflar', { preHandler: oturumGerekli }, async (istek, cevap) => {
    try {
      const govde = (istek.body ?? {}) as Record<string, unknown>;
      const ad = zorunlu(govde.ad, 'ad');
      if (ad.length > 120) throw new DogrulamaHatasi('"ad" en fazla 120 karakter olabilir.');

      const sinif = await sinifOlustur(istek.kullanici!.id, ad);
      // İşlem günlüğü: sınıf kodu bütün sunucu örneklerinde açılabilsin.
      await gunlukYaz({
        t: 'sinif-ekle',
        d: { kod: sinif.kod, ogretmenId: sinif.ogretmenId, ad: sinif.ad },
      });
      return cevap.code(201).send(sinif);
    } catch (hata) {
      if (hata instanceof DogrulamaHatasi) {
        return cevap.code(400).send({ hata: hata.message });
      }
      return cevap.code(500).send({ hata: 'Sınıf oluşturulamadı' });
    }
  });

  app.get('/api/ogretmen/siniflar/:kod', { preHandler: oturumGerekli }, async (istek, cevap) => {
    const { kod } = istek.params as { kod: string };
    const normal = koduNormalle(kod);
    if (!normal) return cevap.code(400).send({ hata: 'Geçersiz sınıf kodu biçimi.' });

    const sinif = await sinifGetir(normal);
    if (!sinif) return cevap.code(404).send({ hata: 'Sınıf bulunamadı.' });

    // Yetki: yalnızca sınıfın sahibi öğretmen veya bir yönetici.
    const sahibi = sinif.ogretmenId === istek.kullanici!.id;
    if (!sahibi && istek.kullanici!.rol !== 'admin') {
      return cevap.code(403).send({ hata: 'Bu sınıf sana ait değil.', kod: 'YETKI_YOK' });
    }

    const detay = await sinifDetayliIlerleme(normal);
    return detay ?? cevap.code(404).send({ hata: 'Sınıf bulunamadı.' });
  });

  app.patch('/api/ogretmen/siniflar/:kod', { preHandler: oturumGerekli }, async (istek, cevap) => {
    const { kod } = istek.params as { kod: string };
    const govde = istek.body as Record<string, unknown>;

    const sinif = await sinifGetir(kod);
    if (!sinif) return cevap.code(404).send({ hata: 'Sınıf bulunamadı.' });

    const sahibi = sinif.ogretmenId === istek.kullanici!.id;
    if (!sahibi && istek.kullanici!.rol !== 'admin') {
      return cevap.code(403).send({ hata: 'Bu sınıf sana ait değil.', kod: 'YETKI_YOK' });
    }
    if (typeof govde.aktif !== 'boolean') {
      return cevap.code(400).send({ hata: '"aktif" alanı true/false olmalıdır.' });
    }

    await sinifDurumDegistir(sinif.kod, govde.aktif);
    await gunlukYaz({ t: 'sinif-durum', d: { kod: sinif.kod, aktif: govde.aktif } });
    return { tamam: true };
  });
}
