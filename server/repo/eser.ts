/**
 * Eser (vakıf eseri) veri erişimi.
 *
 * Önemli: PostgreSQL NUMERIC tipi sürücüden string olarak döner.
 * `yuzde` alanı API'de her zaman number|null olmalıdır — burada dönüştürülür.
 */
import { sorgu, tekSorgu, veritabaniAl } from '../db/index.ts';
import type {
  Eser,
  EserFotograf,
  Sergi,
  GelirKalemi,
  GelirDurumu,
  GelirTipi,
  Kaynak,
  Koordinat,
} from '../../shared/types.ts';

interface EserSatiri {
  id: string;
  ad: string;
  ad_en: string | null;
  sehir_id: string;
  kulliye_id: string | null;
  tur: string;
  ilce: string | null;
  lat: number | null;
  lng: number | null;
  bani: string | null;
  bani_donem: string | null;
  yapim_yili: string | null;
  vakfiye_amaci: string | null;
  hizmet: string | null;
  bugun_ne_oldu: string | null;
  tarihce: string | null;
  tarihce_en: string | null;
  gelir_dagilimi_durumu: GelirDurumu;
  arsiv_no: string | null;
  kaynaklar: Kaynak[];
  dogrulama_notu: string | null;
  yayinda: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FotografSatiri {
  id: string;
  work_id: string;
  url: string;
  alt_metin: string;
  alt_metin_en: string | null;
  kaynak: string | null;
  lisans: string | null;
  sira: number;
}

interface SergiSatiri {
  id: string;
  ad: string;
  ad_en: string | null;
  tarih: string | null;
  mekan: string | null;
  aciklama: string | null;
}

function fotografDonustur(s: FotografSatiri): EserFotograf {
  return {
    id: s.id,
    eserId: s.work_id,
    url: s.url,
    altMetin: s.alt_metin,
    altMetinEn: s.alt_metin_en,
    kaynak: s.kaynak,
    lisans: s.lisans,
    sira: Number(s.sira),
  };
}

function sergiDonustur(s: SergiSatiri): Sergi {
  return {
    id: s.id,
    ad: s.ad,
    adEn: s.ad_en,
    tarih: s.tarih,
    mekan: s.mekan,
    aciklama: s.aciklama,
  };
}

interface GelirSatiri {
  id: number;
  work_id: string;
  kalem: string;
  yuzde: string | number | null;
  tip: GelirTipi | null;
  kaynak: string | null;
  sira: number;
}

function gelirDonustur(s: GelirSatiri): GelirKalemi {
  return {
    id: s.id,
    eserId: s.work_id,
    kalem: s.kalem,
    // NUMERIC -> number | null
    yuzde: s.yuzde === null || s.yuzde === undefined ? null : Number(s.yuzde),
    tip: s.tip ?? null,
    kaynak: s.kaynak,
    sira: s.sira,
  };
}

function eserDonustur(
  s: EserSatiri,
  gelirler: GelirKalemi[],
  fotograflar: EserFotograf[] = [],
  sergiler: Sergi[] = [],
): Eser {
  const koordinat: Koordinat | null =
    s.lat !== null && s.lng !== null && s.lat !== undefined && s.lng !== undefined
      ? { lat: Number(s.lat), lng: Number(s.lng) }
      : null;

  return {
    id: s.id,
    ad: s.ad,
    adEn: s.ad_en ?? null,
    sehirId: s.sehir_id,
    kulliyeId: s.kulliye_id,
    tur: s.tur,
    ilce: s.ilce,
    koordinat,
    bani: s.bani,
    baniDonem: s.bani_donem,
    yapimYili: s.yapim_yili,
    vakfiyeAmaci: s.vakfiye_amaci,
    hizmet: s.hizmet,
    bugunNeOldu: s.bugun_ne_oldu,
    tarihce: s.tarihce ?? null,
    tarihceEn: s.tarihce_en ?? null,
    gelirDagilimiDurumu: s.gelir_dagilimi_durumu,
    arsivNo: s.arsiv_no,
    kaynaklar: Array.isArray(s.kaynaklar) ? s.kaynaklar : [],
    dogrulamaNotu: s.dogrulama_notu,
    yayinda: s.yayinda,
    gelirKalemleri: gelirler,
    fotograflar,
    sergiler,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

async function gelirleriGetir(eserId: string): Promise<GelirKalemi[]> {
  const satirlar = await sorgu<GelirSatiri>(
    `SELECT id, work_id, kalem, yuzde, tip, kaynak, sira
       FROM income_item WHERE work_id = $1 ORDER BY sira, id`,
    [eserId],
  );
  return satirlar.map(gelirDonustur);
}

async function fotograflariGetir(eserId: string): Promise<EserFotograf[]> {
  const satirlar = await sorgu<FotografSatiri>(
    `SELECT * FROM work_photo WHERE work_id = $1 ORDER BY sira, id`,
    [eserId],
  );
  return satirlar.map(fotografDonustur);
}

async function sergileriGetir(eserId: string): Promise<Sergi[]> {
  const satirlar = await sorgu<SergiSatiri>(
    `SELECT e.* FROM exhibition e
       JOIN exhibition_work ew ON ew.exhibition_id = e.id
      WHERE ew.work_id = $1
      ORDER BY e.tarih NULLS LAST, e.ad`,
    [eserId],
  );
  return satirlar.map(sergiDonustur);
}

export async function eserleriListele(
  secenekler: { sadeceYayinda?: boolean; sehirId?: string; tur?: string } = {},
) {
  const kosullar: string[] = [];
  const params: unknown[] = [];

  if (secenekler.sadeceYayinda) kosullar.push('yayinda = TRUE');
  if (secenekler.sehirId) {
    params.push(secenekler.sehirId);
    kosullar.push(`sehir_id = $${params.length}`);
  }
  // Bilgi Notu: "kullanıcıların şehir ya da eser türüne göre filtreleme
  // yapabilmesi". Tür filtresi parametrelidir — enjeksiyona kapalı.
  if (secenekler.tur) {
    params.push(secenekler.tur);
    kosullar.push(`tur = $${params.length}`);
  }

  const nerede = kosullar.length ? `WHERE ${kosullar.join(' AND ')}` : '';
  const satirlar = await sorgu<EserSatiri>(
    `SELECT * FROM work ${nerede} ORDER BY sehir_id, ad`,
    params,
  );

  const tumGelirler = await sorgu<GelirSatiri>(
    satirlar.length
      ? `SELECT id, work_id, kalem, yuzde, tip, kaynak, sira FROM income_item
          WHERE work_id = ANY($1::text[]) ORDER BY sira, id`
      : `SELECT NULL WHERE FALSE`,
    satirlar.length ? [satirlar.map((s) => s.id)] : [],
  );

  const gruplu = new Map<string, GelirKalemi[]>();
  for (const g of tumGelirler) {
    const liste = gruplu.get(g.work_id) ?? [];
    liste.push(gelirDonustur(g));
    gruplu.set(g.work_id, liste);
  }

  const idler = satirlar.map((s) => s.id);

  // Fotoğraf ve sergiler TOPLU çekilir (N+1 sorgu yok).
  // ÖNEMLİ: Bu blok eksikti — liste uçları `fotograflar: []` ve `sergiler: []`
  // döndürüyordu, yani harita/koleksiyon görünümlerinde galeri ve sergi
  // bölümleri hiç görünmüyordu. Tekil `eserGetir` doğru çalışıyordu.
  const tumFotograflar = await sorgu<FotografSatiri>(
    idler.length
      ? `SELECT * FROM work_photo WHERE work_id = ANY($1::text[]) ORDER BY work_id, sira, id`
      : `SELECT NULL WHERE FALSE`,
    idler.length ? [idler] : [],
  );
  const fotografGruplu = new Map<string, EserFotograf[]>();
  for (const f of tumFotograflar) {
    const liste = fotografGruplu.get(f.work_id) ?? [];
    liste.push(fotografDonustur(f));
    fotografGruplu.set(f.work_id, liste);
  }

  const tumSergiler = await sorgu<SergiSatiri & { work_id: string }>(
    idler.length
      ? `SELECT e.*, ew.work_id FROM exhibition e
           JOIN exhibition_work ew ON ew.exhibition_id = e.id
          WHERE ew.work_id = ANY($1::text[])
          ORDER BY ew.work_id, e.tarih NULLS LAST, e.ad`
      : `SELECT NULL WHERE FALSE`,
    idler.length ? [idler] : [],
  );
  const sergiGruplu = new Map<string, Sergi[]>();
  for (const s of tumSergiler) {
    const liste = sergiGruplu.get(s.work_id) ?? [];
    liste.push(sergiDonustur(s));
    sergiGruplu.set(s.work_id, liste);
  }

  return satirlar.map((s) =>
    eserDonustur(
      s,
      gruplu.get(s.id) ?? [],
      fotografGruplu.get(s.id) ?? [],
      sergiGruplu.get(s.id) ?? [],
    ),
  );
}

export async function eserGetir(id: string): Promise<Eser | null> {
  const satir = await tekSorgu<EserSatiri>(`SELECT * FROM work WHERE id = $1`, [id]);
  if (!satir) return null;

  const [gelirler, fotograflar, sergiler] = await Promise.all([
    gelirleriGetir(id),
    fotograflariGetir(id),
    sergileriGetir(id),
  ]);
  return eserDonustur(satir, gelirler, fotograflar, sergiler);
}

/**
 * Filtre seçeneklerini döner — Bilgi Notu: "kullanıcıların şehir ya da eser
 * türüne göre filtreleme yapabilmesi".
 */
export async function filtreSecenekleri(): Promise<{
  sehirler: { id: string; ad: string; sayi: number }[];
  turler: { tur: string; sayi: number }[];
}> {
  const sehirler = await sorgu<{ id: string; ad: string; sayi: number }>(
    `SELECT c.id, c.ad, count(w.id)::int AS sayi
       FROM city c LEFT JOIN work w ON w.sehir_id = c.id AND w.yayinda
      GROUP BY c.id, c.ad, c.sira
      HAVING count(w.id) > 0
      ORDER BY c.sira`,
  );
  const turler = await sorgu<{ tur: string; sayi: number }>(
    `SELECT tur, count(*)::int AS sayi FROM work WHERE yayinda GROUP BY tur ORDER BY tur`,
  );
  return { sehirler, turler };
}

export interface EserGirdisi {
  id: string;
  ad: string;
  adEn?: string | null;
  sehirId: string;
  kulliyeId?: string | null;
  tur: string;
  ilce?: string | null;
  koordinat?: Koordinat | null;
  bani?: string | null;
  baniDonem?: string | null;
  yapimYili?: string | null;
  vakfiyeAmaci?: string | null;
  hizmet?: string | null;
  bugunNeOldu?: string | null;
  tarihce?: string | null;
  tarihceEn?: string | null;
  gelirDagilimiDurumu?: GelirDurumu;
  arsivNo?: string | null;
  kaynaklar?: Kaynak[];
  dogrulamaNotu?: string | null;
  yayinda?: boolean;
  gelirKalemleri?: {
    kalem: string;
    yuzde: number | null;
    tip?: GelirTipi | null;
    kaynak?: string | null;
  }[];
}

/**
 * Eser oluşturur/günceller (upsert) ve gelir kalemlerini yeniden yazar.
 * Yönetim panelinin "eser ekleme/düzenleme" işlevi bunu kullanır.
 */
export async function eserKaydet(girdi: EserGirdisi): Promise<Eser> {
  const db = await veritabaniAl();

  // Gelir dağılımı durumu: oran varsa 'belgeli', yoksa 'belge-bulunamadi'.
  // PDF: doğrulanmamış içerik kesin bilgi olarak sunulmaz.
  const kalemler = girdi.gelirKalemleri ?? [];
  const durum: GelirDurumu =
    girdi.gelirDagilimiDurumu ?? (kalemler.some((k) => k.yuzde !== null) ? 'belgeli' : 'belge-bulunamadi');

  // Eser + gelir kalemleri TEK transaction: kalem yazımı hata verirse eski
  // kayıt (ve eski kalemler) korunur. Yarım kayıt oluşmaz.
  await db.transaction(async (tx) => {
    await tx.query(
    `INSERT INTO work (
        id, ad, ad_en, sehir_id, kulliye_id, tur, ilce, lat, lng,
        bani, bani_donem, yapim_yili, vakfiye_amaci, hizmet, bugun_ne_oldu,
        tarihce, tarihce_en,
        gelir_dagilimi_durumu, arsiv_no, kaynaklar, dogrulama_notu, yayinda, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22, now())
     ON CONFLICT (id) DO UPDATE SET
        ad = EXCLUDED.ad,
        ad_en = EXCLUDED.ad_en,
        sehir_id = EXCLUDED.sehir_id,
        kulliye_id = EXCLUDED.kulliye_id,
        tur = EXCLUDED.tur,
        ilce = EXCLUDED.ilce,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        bani = EXCLUDED.bani,
        bani_donem = EXCLUDED.bani_donem,
        yapim_yili = EXCLUDED.yapim_yili,
        vakfiye_amaci = EXCLUDED.vakfiye_amaci,
        hizmet = EXCLUDED.hizmet,
        bugun_ne_oldu = EXCLUDED.bugun_ne_oldu,
        tarihce = EXCLUDED.tarihce,
        tarihce_en = EXCLUDED.tarihce_en,
        gelir_dagilimi_durumu = EXCLUDED.gelir_dagilimi_durumu,
        arsiv_no = EXCLUDED.arsiv_no,
        kaynaklar = EXCLUDED.kaynaklar,
        dogrulama_notu = EXCLUDED.dogrulama_notu,
        yayinda = EXCLUDED.yayinda,
        updated_at = now()`,
    [
      girdi.id,
      girdi.ad,
      girdi.adEn ?? null,
      girdi.sehirId,
      girdi.kulliyeId ?? null,
      girdi.tur,
      girdi.ilce ?? null,
      girdi.koordinat?.lat ?? null,
      girdi.koordinat?.lng ?? null,
      girdi.bani ?? null,
      girdi.baniDonem ?? null,
      girdi.yapimYili ?? null,
      girdi.vakfiyeAmaci ?? null,
      girdi.hizmet ?? null,
      girdi.bugunNeOldu ?? null,
      girdi.tarihce ?? null,
      girdi.tarihceEn ?? null,
      durum,
      girdi.arsivNo ?? null,
      JSON.stringify(girdi.kaynaklar ?? []),
      girdi.dogrulamaNotu ?? null,
      girdi.yayinda ?? false,
    ],
  );

  // Gelir kalemleri: tam yeniden yazma (panelde sıralama/yüzde düzenlenebilir).
  await tx.query(`DELETE FROM income_item WHERE work_id = $1`, [girdi.id]);
  for (const [i, k] of kalemler.entries()) {
    await tx.query(
      `INSERT INTO income_item (work_id, kalem, yuzde, tip, kaynak, sira)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [girdi.id, k.kalem, k.yuzde, k.tip ?? null, k.kaynak ?? null, i],
    );
  }
  });

  const sonuc = await eserGetir(girdi.id);
  if (!sonuc) throw new Error('Eser kaydedilemedi');
  return sonuc;
}

/**
 * Bir eserin fotoğraflarını tamamen yeniden yazar (seed içindir).
 * `altMetin` zorunludur — her görselin metin karşılığı olmalı (şema notu).
 */
export async function fotograflariKaydet(
  eserId: string,
  fotograflar: {
    url: string;
    altMetin: string;
    altMetinEn?: string | null;
    kaynak?: string | null;
    lisans?: string | null;
  }[],
): Promise<void> {
  const db = await veritabaniAl();
  await db.query(`DELETE FROM work_photo WHERE work_id = $1`, [eserId]);
  for (const [i, f] of fotograflar.entries()) {
    await db.query(
      `INSERT INTO work_photo (id, work_id, url, alt_metin, alt_metin_en, kaynak, lisans, sira)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [`${eserId}-f${i + 1}`, eserId, f.url, f.altMetin, f.altMetinEn ?? null, f.kaynak ?? null, f.lisans ?? null, i],
    );
  }
}

export async function eserSil(id: string): Promise<boolean> {
  const db = await veritabaniAl();
  const sonuc = await db.query(`DELETE FROM work WHERE id = $1`, [id]);
  return (sonuc.affectedRows ?? 0) > 0;
}
