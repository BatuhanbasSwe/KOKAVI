/**
 * Genel (okuma) uçları — istemcinin içerik için kullandığı API.
 * Bu uçlar HİÇBİR kullanıcı verisi almaz veya saklamaz.
 */
import { arsivEkleriListele, arsivFotoGetir, arsivMetniGetir } from '../repo/arsiv.ts';
import type { FastifyInstance } from 'fastify';
import { eserleriListele, eserGetir, filtreSecenekleri } from '../repo/eser.ts';
import { sehirleriListele, uniteListele, kulliyeListele, yolIskeleti } from '../repo/yol.ts';
import { dersleriListele, dersGetir } from '../repo/ders.ts';
import { depoDurumu } from '../canli/depo.ts';
import { gunlukEtkinMi } from '../yonetim/gunluk.ts';
import { redisAyari } from '../redis.ts';

export async function genelUclar(app: FastifyInstance): Promise<void> {
  // "depo": canlı yarışma odalarının ortak depoda mı (redis) yoksa her sunucu
  // örneğinin belleğinde mi (bellek) tutulduğunu gösterir. Yayında "bellek"
  // görünüyorsa canlı yarışma örnekler arasında bölünür; env bağlanmalı.
  //
  // "gunluk": yönetim yazmalarının (eser/kullanıcı/sınıf) örnekler arasında
  // paylaşılıp paylaşılmadığını gösterir. "kapali" ise Vercel'de yazma yapan
  // örnek ile okuyan örnek ayrışabilir; Upstash bağlanmalı.
  // --- Arşive panelden eklenen eserler (statik arşivle birleştirilir) ------
  app.get('/api/arsiv/ekler', async () => arsivEkleriListele());

  app.get('/api/arsiv/ekler/:id/metin', async (istek, cevap) => {
    const { id } = istek.params as { id: string };
    const paragraflar = await arsivMetniGetir(id);
    if (!paragraflar) return cevap.code(404).send({ hata: 'Kayıt bulunamadı' });
    return { paragraflar };
  });

  app.get('/api/arsiv/foto/:id', async (istek, cevap) => {
    const { id } = istek.params as { id: string };
    const foto = await arsivFotoGetir(id);
    if (!foto) return cevap.code(404).send({ hata: 'Fotoğraf yok' });
    // Adres ?v=<sürüm> taşır; fotoğraf değişince adres de değişir.
    return cevap
      .header('Content-Type', foto.tur)
      .header('Cache-Control', 'public, max-age=86400')
      .header('X-Content-Type-Options', 'nosniff')
      .send(foto.veri);
  });

  app.get('/api/saglik', async () => ({
    durum: 'calisiyor',
    depo: depoDurumu().tur,
    gunluk: gunlukEtkinMi() ? 'redis' : 'kapali',
    oturumDeposu: redisAyari() ? 'redis' : 'yerel',
    zaman: new Date().toISOString(),
  }));

  app.get('/api/sehirler', async () => sehirleriListele());

  app.get('/api/uniteler', async (istek) => {
    const { sehir } = istek.query as { sehir?: string };
    return uniteListele(sehir);
  });

  app.get('/api/kulliyeler', async () => kulliyeListele());

  /**
   * Öğrenme yolu iskeleti.
   * NOT: İlerleme/kilit durumu DÖNMEZ — o cihazda hesaplanır (kişisel veri yok).
   */
  app.get('/api/yol', async () => {
    const satirlar = await yolIskeleti();

    const sehirler = new Map<
      string,
      {
        sehirId: string;
        ad: string;
        sira: number;
        uniteler: Map<
          string,
          {
            uniteId: string;
            ad: string;
            sira: number;
            dersler: { dersId: string; eserId: string; eserAdi: string; tur: string; sira: number }[];
          }
        >;
      }
    >();

    for (const s of satirlar) {
      if (!sehirler.has(s.sehir_id)) {
        sehirler.set(s.sehir_id, {
          sehirId: s.sehir_id,
          ad: s.sehir_ad,
          sira: Number(s.sehir_sira),
          uniteler: new Map(),
        });
      }
      const sehir = sehirler.get(s.sehir_id)!;

      if (!sehir.uniteler.has(s.unite_id)) {
        sehir.uniteler.set(s.unite_id, {
          uniteId: s.unite_id,
          ad: s.unite_ad,
          sira: Number(s.unite_sira),
          dersler: [],
        });
      }
      sehir.uniteler.get(s.unite_id)!.dersler.push({
        dersId: s.ders_id,
        eserId: s.eser_id,
        eserAdi: s.eser_adi,
        tur: s.tur,
        sira: Number(s.sira),
      });
    }

    return {
      sehirler: [...sehirler.values()]
        .sort((a, b) => a.sira - b.sira)
        .map((s) => ({
          ...s,
          uniteler: [...s.uniteler.values()].sort((a, b) => a.sira - b.sira),
        })),
    };
  });

  app.get('/api/eserler', async (istek) => {
    const { hepsi, sehir, tur } = istek.query as { hepsi?: string; sehir?: string; tur?: string };
    return eserleriListele({ sadeceYayinda: hepsi !== '1', sehirId: sehir, tur });
  });

  /**
   * Filtre seçenekleri — Bilgi Notu: "kullanıcıların şehir ya da eser türüne
   * göre filtreleme yapabilmesi". Yalnızca gerçekten eseri olan seçenekler
   * döner; boş kategori gösterilmez.
   */
  app.get('/api/filtreler', async () => filtreSecenekleri());

  app.get('/api/eserler/:id', async (istek, cevap) => {
    const { id } = istek.params as { id: string };
    const eser = await eserGetir(id);
    if (!eser) return cevap.code(404).send({ hata: 'Eser bulunamadi' });
    return eser;
  });

  app.get('/api/dersler', async () => dersleriListele());

  app.get('/api/dersler/:id', async (istek, cevap) => {
    const { id } = istek.params as { id: string };
    const ders = await dersGetir(id);
    if (!ders) return cevap.code(404).send({ hata: 'Ders bulunamadi' });
    return ders;
  });
}
