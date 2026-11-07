/**
 * Ders ve egzersiz veri erişimi.
 *
 * Bir ders = bir vakıf eseri + beş adımlı akış:
 *   01 Merak · 02 Bağlam · 03 Perspektif · 04 Geri çağırma · 05 Yansıma
 * Adım 1,2,3,5 JSONB kolonlarında; adım 4 (egzersizler) ayrı tabloda.
 */
import { sorgu, tekSorgu, veritabaniAl } from '../db/index.ts';
import type {
  Ders,
  Egzersiz,
  EgzersizTipi,
  MerakAdimi,
  BaglamAdimi,
  PerspektifAdimi,
  YansimaAdimi,
  EgzersizVeriHaritasi,
} from '../../shared/types.ts';

export interface DersSatiri {
  id: string;
  unit_id: string;
  work_id: string;
  sira: number;
  merak: MerakAdimi;
  baglam: BaglamAdimi;
  perspektif: PerspektifAdimi;
  yansima: YansimaAdimi;
  eser_ad?: string;
  eser_tur?: string;
  eser_sehir_id?: string;
  eser_gelir_durumu?: 'belgeli' | 'belge-bulunamadi';
}

interface EgzersizSatiri {
  id: string;
  lesson_id: string;
  tip: EgzersizTipi;
  sira: number;
  veri: EgzersizVeriHaritasi[EgzersizTipi];
  kaynak: string | null;
}

function egzersizDonustur(s: EgzersizSatiri): Egzersiz {
  return {
    id: s.id,
    tip: s.tip,
    sira: Number(s.sira),
    veri: s.veri,
    kaynak: s.kaynak,
  };
}

const DERS_SELECT = `
  SELECT l.*,
         w.ad                            AS eser_ad,
         w.tur                           AS eser_tur,
         w.sehir_id                      AS eser_sehir_id,
         w.gelir_dagilimi_durumu         AS eser_gelir_durumu
    FROM lesson l
    JOIN work w ON w.id = l.work_id`;

export async function dersleriListele(): Promise<Ders[]> {
  const satirlar = await sorgu<DersSatiri>(`${DERS_SELECT} ORDER BY l.unit_id, l.sira`);
  const hepsi = await sorgu<EgzersizSatiri>(
    satirlar.length
      ? `SELECT * FROM exercise WHERE lesson_id = ANY($1::text[]) ORDER BY lesson_id, sira`
      : `SELECT NULL WHERE FALSE`,
    satirlar.length ? [satirlar.map((s) => s.id)] : [],
  );

  const gruplu = new Map<string, Egzersiz[]>();
  for (const e of hepsi) {
    const liste = gruplu.get(e.lesson_id) ?? [];
    liste.push(egzersizDonustur(e));
    gruplu.set(e.lesson_id, liste);
  }

  return satirlar.map((s) => dersDonustur(s, gruplu.get(s.id) ?? []));
}

export async function dersGetir(id: string): Promise<Ders | null> {
  const satir = await tekSorgu<DersSatiri>(`${DERS_SELECT} WHERE l.id = $1`, [id]);
  if (!satir) return null;
  const egzersizler = await sorgu<EgzersizSatiri>(
    `SELECT * FROM exercise WHERE lesson_id = $1 ORDER BY sira`,
    [id],
  );
  return dersDonustur(satir, egzersizler.map(egzersizDonustur));
}

function dersDonustur(s: DersSatiri, egzersizler: Egzersiz[]): Ders {
  return {
    id: s.id,
    uniteId: s.unit_id,
    eserId: s.work_id,
    sira: Number(s.sira),
    merak: s.merak,
    baglam: s.baglam,
    perspektif: s.perspektif,
    yansima: s.yansima,
    egzersizler,
    eser: s.eser_ad
      ? {
          id: s.work_id,
          ad: s.eser_ad,
          tur: s.eser_tur ?? '',
          sehirId: s.eser_sehir_id ?? '',
          gelirDagilimiDurumu: s.eser_gelir_durumu ?? 'belge-bulunamadi',
        }
      : undefined,
  };
}

export interface DersGirdisi {
  id: string;
  uniteId: string;
  eserId: string;
  sira: number;
  merak: MerakAdimi;
  baglam: BaglamAdimi;
  perspektif: PerspektifAdimi;
  yansima: YansimaAdimi;
  egzersizler: {
    id: string;
    tip: EgzersizTipi;
    veri: EgzersizVeriHaritasi[EgzersizTipi];
    kaynak?: string | null;
  }[];
}

/** Ders oluşturur/günceller. Yönetim panelindeki ders düzenleme bunu kullanır. */
export async function dersKaydet(girdi: DersGirdisi): Promise<Ders> {
  const db = await veritabaniAl();

  // Ders + egzersizler TEK transaction: çakışan egzersiz kimliği gibi bir hata
  // olursa eski ders/egzersizler korunur; yarım kayıt oluşmaz.
  await db.transaction(async (tx) => {
    await tx.query(
    `INSERT INTO lesson (id, unit_id, work_id, sira, merak, baglam, perspektif, yansima, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
     ON CONFLICT (id) DO UPDATE SET
       unit_id = EXCLUDED.unit_id, work_id = EXCLUDED.work_id, sira = EXCLUDED.sira,
       merak = EXCLUDED.merak, baglam = EXCLUDED.baglam,
       perspektif = EXCLUDED.perspektif, yansima = EXCLUDED.yansima, updated_at = now()`,
    [
      girdi.id,
      girdi.uniteId,
      girdi.eserId,
      girdi.sira,
      JSON.stringify(girdi.merak),
      JSON.stringify(girdi.baglam),
      JSON.stringify(girdi.perspektif),
      JSON.stringify(girdi.yansima),
    ],
  );

  await tx.query(`DELETE FROM exercise WHERE lesson_id = $1`, [girdi.id]);
  for (const [i, e] of girdi.egzersizler.entries()) {
    await tx.query(
      `INSERT INTO exercise (id, lesson_id, tip, sira, veri, kaynak)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [e.id, girdi.id, e.tip, i, JSON.stringify(e.veri), e.kaynak ?? null],
    );
  }
  });

  const sonuc = await dersGetir(girdi.id);
  if (!sonuc) throw new Error('Ders kaydedilemedi');
  return sonuc;
}

export async function dersSil(id: string): Promise<boolean> {
  const db = await veritabaniAl();
  const sonuc = await db.query(`DELETE FROM lesson WHERE id = $1`, [id]);
  return (sonuc.affectedRows ?? 0) > 0;
}
