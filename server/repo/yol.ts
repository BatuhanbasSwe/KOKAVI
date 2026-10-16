/**
 * Şehir, külliye ve ünite veri erişimi + öğrenme yolu kurgusu.
 *
 * Tasarım kararı: ÖĞRENME YOLU İLERLEMESİ SUNUCUDA TUTULMAZ.
 * PDF: "kişisel veri toplanmaz, sınıf kodu anonim". İlerleme cihazda saklanır;
 * sunucu yalnızca içerik yapısını döner, kilit/tamamlanma durumunu istemci
 * hesaplar. Böylece "hiç kişisel veri toplamıyoruz" iddiası mimari olarak
 * doğrulanabilir olur.
 */
import { sorgu, tekSorgu, veritabaniAl } from '../db/index.ts';
import type { Sehir, Unite, Kulliye } from '../../shared/types.ts';

interface SehirSatiri {
  id: string;
  ad: string;
  sira: number;
  aktif: boolean;
}
interface UniteSatiri {
  id: string;
  sehir_id: string;
  ad: string;
  sira: number;
  aciklama: string | null;
}
interface KulliyeSatiri {
  id: string;
  ad: string;
  sehir_id: string;
  bani: string | null;
  aciklama: string | null;
}

const sehirDonustur = (s: SehirSatiri): Sehir => ({
  id: s.id,
  ad: s.ad,
  sira: Number(s.sira),
  aktif: s.aktif,
});

const uniteDonustur = (s: UniteSatiri): Unite => ({
  id: s.id,
  sehirId: s.sehir_id,
  ad: s.ad,
  sira: Number(s.sira),
  aciklama: s.aciklama,
});

export async function sehirleriListele(): Promise<Sehir[]> {
  const satirlar = await sorgu<SehirSatiri>(`SELECT * FROM city ORDER BY sira, ad`);
  return satirlar.map(sehirDonustur);
}

export async function uniteListele(sehirId?: string): Promise<Unite[]> {
  const satirlar = sehirId
    ? await sorgu<UniteSatiri>(`SELECT * FROM unit WHERE sehir_id = $1 ORDER BY sira`, [sehirId])
    : await sorgu<UniteSatiri>(`SELECT * FROM unit ORDER BY sehir_id, sira`);
  return satirlar.map(uniteDonustur);
}

export async function kulliyeListele(): Promise<Kulliye[]> {
  const satirlar = await sorgu<KulliyeSatiri>(`SELECT * FROM kulliye ORDER BY ad`);
  return satirlar.map((s) => ({
    id: s.id,
    ad: s.ad,
    sehirId: s.sehir_id,
    bani: s.bani,
    aciklama: s.aciklama,
  }));
}

export async function sehirKaydet(girdi: { id: string; ad: string; sira: number; aktif?: boolean }) {
  const db = await veritabaniAl();
  await db.query(
    `INSERT INTO city (id, ad, sira, aktif, updated_at)
     VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (id) DO UPDATE SET
       ad = EXCLUDED.ad, sira = EXCLUDED.sira, aktif = EXCLUDED.aktif, updated_at = now()`,
    [girdi.id, girdi.ad, girdi.sira, girdi.aktif ?? true],
  );
  const s = await tekSorgu<SehirSatiri>(`SELECT * FROM city WHERE id = $1`, [girdi.id]);
  return s ? sehirDonustur(s) : null;
}

export async function uniteKaydet(girdi: {
  id: string;
  sehirId: string;
  ad: string;
  sira: number;
  aciklama?: string | null;
}) {
  const db = await veritabaniAl();
  await db.query(
    `INSERT INTO unit (id, sehir_id, ad, sira, aciklama, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (id) DO UPDATE SET
       sehir_id = EXCLUDED.sehir_id, ad = EXCLUDED.ad, sira = EXCLUDED.sira,
       aciklama = EXCLUDED.aciklama, updated_at = now()`,
    [girdi.id, girdi.sehirId, girdi.ad, girdi.sira, girdi.aciklama ?? null],
  );
  const u = await tekSorgu<UniteSatiri>(`SELECT * FROM unit WHERE id = $1`, [girdi.id]);
  return u ? uniteDonustur(u) : null;
}

export async function uniteSil(id: string): Promise<boolean> {
  const db = await veritabaniAl();
  const sonuc = await db.query(`DELETE FROM unit WHERE id = $1`, [id]);
  return (sonuc.affectedRows ?? 0) > 0;
}

export async function kulliyeKaydet(girdi: {
  id: string;
  ad: string;
  sehirId: string;
  bani?: string | null;
  aciklama?: string | null;
}) {
  const db = await veritabaniAl();
  await db.query(
    `INSERT INTO kulliye (id, ad, sehir_id, bani, aciklama, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (id) DO UPDATE SET
       ad = EXCLUDED.ad, sehir_id = EXCLUDED.sehir_id, bani = EXCLUDED.bani,
       aciklama = EXCLUDED.aciklama, updated_at = now()`,
    [girdi.id, girdi.ad, girdi.sehirId, girdi.bani ?? null, girdi.aciklama ?? null],
  );
}

// ---------------------------------------------------------------------------
// Öğrenme yolu — içerik iskeleti (ilerleme YOK, o istemcide)
// ---------------------------------------------------------------------------

export interface YolDersSatiri {
  ders_id: string;
  eser_id: string;
  eser_adi: string;
  tur: string;
  sira: number;
  unite_id: string;
  unite_ad: string;
  unite_sira: number;
  sehir_id: string;
  sehir_ad: string;
  sehir_sira: number;
}

/** Tüm yolu tek sorguda çeker; istemci kilit ve tamamlanma durumunu hesaplar. */
export async function yolIskeleti(): Promise<YolDersSatiri[]> {
  return sorgu<YolDersSatiri>(
    `SELECT l.id   AS ders_id,
            w.id   AS eser_id,
            w.ad   AS eser_adi,
            w.tur  AS tur,
            l.sira AS sira,
            u.id   AS unite_id,
            u.ad   AS unite_ad,
            u.sira AS unite_sira,
            c.id   AS sehir_id,
            c.ad   AS sehir_ad,
            c.sira AS sehir_sira
       FROM lesson l
       JOIN unit  u ON u.id = l.unit_id
       JOIN city  c ON c.id = u.sehir_id
       JOIN work  w ON w.id = l.work_id
      WHERE w.yayinda = TRUE AND c.aktif = TRUE
      ORDER BY c.sira, u.sira, l.sira`,
  );
}

export async function istatistikler() {
  const s = await tekSorgu<{
    sehir: number;
    unite: number;
    eser: number;
    ders: number;
    yayinda: number;
    belgeli: number;
  }>(
    `SELECT (SELECT count(*)::int FROM city)                       AS sehir,
            (SELECT count(*)::int FROM unit)                       AS unite,
            (SELECT count(*)::int FROM work)                       AS eser,
            (SELECT count(*)::int FROM lesson)                     AS ders,
            (SELECT count(*)::int FROM work WHERE yayinda)         AS yayinda,
            (SELECT count(*)::int FROM work
              WHERE gelir_dagilimi_durumu = 'belgeli')             AS belgeli`,
  );
  return s ?? { sehir: 0, unite: 0, eser: 0, ders: 0, yayinda: 0, belgeli: 0 };
}
