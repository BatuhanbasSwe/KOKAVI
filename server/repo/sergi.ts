/**
 * Sergi veri erişimi.
 *
 * Vakıf Eserleri Envanter Projesi Bilgi Notu "sergi bilgileri"ni veri alanı
 * olarak sayıyor. Envanter projesi kapsamındaki sergiler:
 *   · "5 Şubat Hatay" — Hatay envanteri fotoğrafları
 *   · "Ayna" (24 Ocak 2025, Üsküdar Mimar Sinan Galerisi) — Konya envanteri
 *   · Bursa'nın Fethinin 700. Yılı fotoğraf sergisi
 */
import { sorgu, veritabaniAl } from '../db/index.ts';
import type { Sergi } from '../../shared/types.ts';

export async function sergiKaydet(girdi: {
  id: string;
  ad: string;
  adEn?: string | null;
  tarih?: string | null;
  mekan?: string | null;
  aciklama?: string | null;
}): Promise<void> {
  const db = await veritabaniAl();
  await db.query(
    `INSERT INTO exhibition (id, ad, ad_en, tarih, mekan, aciklama)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET
       ad = EXCLUDED.ad, ad_en = EXCLUDED.ad_en, tarih = EXCLUDED.tarih,
       mekan = EXCLUDED.mekan, aciklama = EXCLUDED.aciklama`,
    [
      girdi.id,
      girdi.ad,
      girdi.adEn ?? null,
      girdi.tarih ?? null,
      girdi.mekan ?? null,
      girdi.aciklama ?? null,
    ],
  );
}

/** Sergiyi bir şehirdeki tüm yayında eserlere bağlar. */
export async function sergiyiSehreBagla(sergiId: string, sehirId: string): Promise<number> {
  const db = await veritabaniAl();
  const sonuc = await db.query(
    `INSERT INTO exhibition_work (exhibition_id, work_id)
     SELECT $1, id FROM work WHERE sehir_id = $2 AND yayinda = TRUE
     ON CONFLICT DO NOTHING`,
    [sergiId, sehirId],
  );
  return sonuc.affectedRows ?? 0;
}

export async function sergileriListele(): Promise<Sergi[]> {
  const satirlar = await sorgu<{
    id: string;
    ad: string;
    ad_en: string | null;
    tarih: string | null;
    mekan: string | null;
    aciklama: string | null;
  }>(`SELECT * FROM exhibition ORDER BY tarih NULLS LAST, ad`);

  return satirlar.map((s) => ({
    id: s.id,
    ad: s.ad,
    adEn: s.ad_en,
    tarih: s.tarih,
    mekan: s.mekan,
    aciklama: s.aciklama,
  }));
}
