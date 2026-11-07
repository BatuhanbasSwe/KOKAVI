/**
 * Arşive panelden eklenen eserler (archive_item). Doğrulama: server/arsiv/dogrula.ts.
 */
import { sorgu, tekSorgu } from '../db/index.ts';
import type { ArsivGirdisi } from '../arsiv/dogrula.ts';

/** Arşiv sayfasının ArsivEseri biçimi + ek alanlar (fotoğraf verisi hariç). */
export interface ArsivEki {
  id: string;
  ad: string;
  il: string;
  ilAd: string;
  ilce: string | null;
  tur: string;
  kaynak: string;
  foto: boolean;
  fotoUrl: string | null;
  ders?: string;
  ek: true;
  paragrafSayisi: number;
  guncellendi: string;
}

interface Satir {
  id: string;
  ad: string;
  il: string;
  il_ad: string;
  ilce: string | null;
  tur: string;
  kaynak: string;
  foto_url: string | null;
  foto_var: boolean;
  ders: string | null;
  paragraf_sayisi: number;
  updated_at: string | Date;
}

const LISTE_SQL = `SELECT id, ad, il, il_ad, ilce, tur, kaynak, foto_url, (foto_veri IS NOT NULL) AS foto_var,
         ders, jsonb_array_length(paragraflar)::int AS paragraf_sayisi, updated_at
    FROM archive_item`;

function donustur(s: Satir): ArsivEki {
  const surum = new Date(s.updated_at).getTime().toString(36);
  const fotoUrl = s.foto_var ? `/api/arsiv/foto/${encodeURIComponent(s.id)}?v=${surum}` : s.foto_url;
  return {
    id: s.id,
    ad: s.ad,
    il: s.il,
    ilAd: s.il_ad,
    ilce: s.ilce,
    tur: s.tur,
    kaynak: s.kaynak,
    foto: !!fotoUrl,
    fotoUrl,
    ...(s.ders ? { ders: s.ders } : {}),
    ek: true,
    paragrafSayisi: Number(s.paragraf_sayisi),
    guncellendi: new Date(s.updated_at).toISOString(),
  };
}

export async function arsivEkleriListele(): Promise<ArsivEki[]> {
  const satirlar = await sorgu<Satir>(`${LISTE_SQL} ORDER BY updated_at DESC, id`);
  return satirlar.map(donustur);
}

export async function arsivEkiVarMi(id: string): Promise<boolean> {
  return !!(await tekSorgu(`SELECT 1 FROM archive_item WHERE id = $1`, [id]));
}

export async function arsivMetniGetir(id: string): Promise<string[] | null> {
  const s = await tekSorgu<{ paragraflar: unknown }>(`SELECT paragraflar FROM archive_item WHERE id = $1`, [id]);
  if (!s) return null;
  const p = typeof s.paragraflar === 'string' ? JSON.parse(s.paragraflar) : s.paragraflar;
  return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
}

/** Yüklenmiş fotoğrafı ikili veri olarak döndürür. */
export async function arsivFotoGetir(id: string): Promise<{ tur: string; veri: Buffer } | null> {
  const s = await tekSorgu<{ foto_veri: string | null }>(`SELECT foto_veri FROM archive_item WHERE id = $1`, [id]);
  const m = s?.foto_veri?.match(/^data:(image\/(?:webp|jpeg|png));base64,(.+)$/);
  if (!m) return null;
  return { tur: m[1]!, veri: Buffer.from(m[2]!, 'base64') };
}

/**
 * Ekler ya da günceller. `fotoVeri === undefined` ise var olan yüklenmiş
 * fotoğraf korunur (JSON'da fotoğraf yoksa önceki yükleme silinmez).
 */
export async function arsivEkiKaydet(g: ArsivGirdisi): Promise<'eklendi' | 'guncellendi'> {
  const vardi = await arsivEkiVarMi(g.id);
  const fotoDokun = g.fotoVeri !== undefined;
  await sorgu(
    `INSERT INTO archive_item (id, ad, il, il_ad, ilce, tur, kaynak, paragraflar, foto_url, foto_veri, ders, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11, now())
     ON CONFLICT (id) DO UPDATE SET
       ad = EXCLUDED.ad, il = EXCLUDED.il, il_ad = EXCLUDED.il_ad, ilce = EXCLUDED.ilce,
       tur = EXCLUDED.tur, kaynak = EXCLUDED.kaynak, paragraflar = EXCLUDED.paragraflar,
       foto_url = COALESCE(EXCLUDED.foto_url, archive_item.foto_url),
       foto_veri = CASE WHEN $12 THEN EXCLUDED.foto_veri ELSE archive_item.foto_veri END,
       ders = EXCLUDED.ders, updated_at = now()`,
    [
      g.id, g.ad, g.il, g.ilAd, g.ilce, g.tur, g.kaynak, JSON.stringify(g.paragraflar),
      g.fotoUrl, g.fotoVeri ?? null, g.ders, fotoDokun,
    ],
  );
  return vardi ? 'guncellendi' : 'eklendi';
}

/** Fotoğrafı değiştirir (`null` → kaldırır; dış adres de temizlenir). */
export async function arsivFotoKaydet(id: string, veri: string | null): Promise<boolean> {
  const sonuc = await sorgu<{ id: string }>(
    `UPDATE archive_item SET foto_veri = $2, foto_url = CASE WHEN $2::text IS NULL THEN NULL ELSE foto_url END,
            updated_at = now()
      WHERE id = $1 RETURNING id`,
    [id, veri],
  );
  return sonuc.length > 0;
}

export async function arsivEkiSil(id: string): Promise<boolean> {
  const sonuc = await sorgu<{ id: string }>(`DELETE FROM archive_item WHERE id = $1 RETURNING id`, [id]);
  return sonuc.length > 0;
}
