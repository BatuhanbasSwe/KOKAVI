/**
 * Sınıf kodu ve anonim sınıf ilerlemesi.
 *
 * PDF Senaryo B: "Öğretmen sınıf kodunu açar. Sınıf **birlikte** bir külliyeyi
 * tamamlar; Vakıf Röntgeni'ni birlikte görür."
 *
 * 🔒 GİZLİLİK SÖZLEŞMESİ
 * Bu modül bilerek SINIRLI veri tutar:
 *   ✓ Sınıf kodu, öğretmen kimliği, ders kimliği, sayaç
 *   ✗ Çocuk kimliği, cihaz kimliği, oturum kimliği, IP, zaman serisi YOK
 *
 * Sonuç: "bu kodla bu ders kaç kez tamamlandı" bilinir; "kaç farklı öğrenci"
 * BİLİNEMEZ ve bilinmediği için arayüz de iddia etmez. Sayaç, tekrar
 * tamamlamalarla şişebilir — bu yüzden etiket "toplam tamamlama"dır.
 */
import { randomInt } from 'node:crypto';
import { sorgu, tekSorgu, veritabaniAl } from '../db/index.ts';
import { KULLIYE_GRUPLARI } from '../../shared/kulliyeler.ts';
import type { GelirDurumu, GelirKalemi, GelirTipi } from '../../shared/types.ts';

/** Karışması kolay karakterler (I, O, 0, 1) çıkarılmış alfabe. */
const ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface Sinif {
  kod: string;
  ogretmenId: string;
  ad: string;
  aktif: boolean;
  createdAt: string;
}

export interface SinifIlerlemesi {
  kod: string;
  ad: string;
  /** Ders kimliği -> toplam tamamlama sayısı. */
  dersSayilari: Record<string, number>;
  /** Tüm derslerin toplam tamamlama sayısı. */
  toplamTamamlama: number;
  /** En az bir kez tamamlanmış farklı ders sayısı. */
  tamamlananDersCesidi: number;
}

function kodUret(): string {
  const parca = (uzunluk: number) =>
    Array.from({ length: uzunluk }, () => ALFABE[randomInt(0, ALFABE.length)]).join('');
  return `${parca(3)}-${parca(4)}`;
}

/** Kodu normalize eder: büyük harf, tek tire, XYZ-2345 biçimi. */
export function koduNormalle(kod: string): string | null {
  const temiz = kod.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (temiz.length !== 7) return null;
  return `${temiz.slice(0, 3)}-${temiz.slice(3)}`;
}

export async function sinifOlustur(ogretmenId: string, ad: string): Promise<Sinif> {
  const db = await veritabaniAl();

  // Çakışma olasılığı çok düşük ama sıfır değil: birkaç kez dene.
  for (let deneme = 0; deneme < 5; deneme++) {
    const kod = kodUret();
    const varMi = await tekSorgu(`SELECT 1 FROM class_code WHERE kod = $1`, [kod]);
    if (varMi) continue;

    await db.query(`INSERT INTO class_code (kod, ogretmen_id, ad) VALUES ($1, $2, $3)`, [
      kod,
      ogretmenId,
      ad.trim().slice(0, 120),
    ]);
    const olusan = await sinifGetir(kod);
    if (olusan) return olusan;
  }
  throw new Error('Sınıf kodu üretilemedi, tekrar dene.');
}

/**
 * Kimliği hazır bir sınıf kaydı ekler.
 *
 * Yönetim işlem günlüğü (`server/yonetim/gunluk.ts`) sınıf kaydını başka bir
 * sunucu örneğinde birebir oluşturabilsin diye kod dışarıdan verilir.
 */
export async function sinifEkle(kod: string, ogretmenId: string, ad: string): Promise<void> {
  const db = await veritabaniAl();
  await db.query(
    `INSERT INTO class_code (kod, ogretmen_id, ad) VALUES ($1, $2, $3)
     ON CONFLICT (kod) DO NOTHING`,
    [kod, ogretmenId, ad.trim().slice(0, 120)],
  );
}

export async function sinifGetir(kod: string): Promise<Sinif | null> {
  const normal = koduNormalle(kod);
  if (!normal) return null;

  const s = await tekSorgu<{
    kod: string;
    ogretmen_id: string;
    ad: string;
    aktif: boolean;
    created_at: string;
  }>(`SELECT * FROM class_code WHERE kod = $1`, [normal]);

  if (!s) return null;
  return {
    kod: s.kod,
    ogretmenId: s.ogretmen_id,
    ad: s.ad,
    aktif: s.aktif,
    createdAt: s.created_at,
  };
}

export async function ogretmenSiniflari(ogretmenId: string): Promise<Sinif[]> {
  const satirlar = await sorgu<{
    kod: string;
    ogretmen_id: string;
    ad: string;
    aktif: boolean;
    created_at: string;
  }>(`SELECT * FROM class_code WHERE ogretmen_id = $1 ORDER BY created_at DESC`, [ogretmenId]);

  return satirlar.map((s) => ({
    kod: s.kod,
    ogretmenId: s.ogretmen_id,
    ad: s.ad,
    aktif: s.aktif,
    createdAt: s.created_at,
  }));
}

export async function sinifDurumDegistir(kod: string, aktif: boolean): Promise<boolean> {
  const normal = koduNormalle(kod);
  if (!normal) return false;

  const db = await veritabaniAl();
  const sonuc = await db.query(`UPDATE class_code SET aktif = $2 WHERE kod = $1`, [normal, aktif]);
  return (sonuc.affectedRows ?? 0) > 0;
}

/**
 * Anonim tamamlama kaydı. Çocuk bir dersi bitirdiğinde çağrılır.
 *
 * Kimlik ALINMAZ. Aynı dersin tekrar tamamlanması sayacı artırır; bu yüzden
 * sonuç "farklı öğrenci sayısı" değil "toplam tamamlama"dır.
 */
export async function tamamlamaKaydet(kod: string, dersId: string): Promise<boolean> {
  const sinif = await sinifGetir(kod);
  if (!sinif || !sinif.aktif) return false;

  // Ders gerçekten var mı? Uydurma kimliklerle sayaç şişirilmesin.
  const ders = await tekSorgu(`SELECT 1 FROM lesson WHERE id = $1`, [dersId.slice(0, 120)]);
  if (!ders) return false;

  const db = await veritabaniAl();
  await db.query(
    `INSERT INTO class_progress (kod, ders_id, sayi)
     VALUES ($1, $2, 1)
     ON CONFLICT (kod, ders_id)
     DO UPDATE SET sayi = class_progress.sayi + 1, updated_at = NOW()`,
    [sinif.kod, dersId.slice(0, 120)],
  );
  return true;
}

export async function sinifIlerlemesi(kod: string): Promise<SinifIlerlemesi | null> {
  const sinif = await sinifGetir(kod);
  if (!sinif) return null;

  const satirlar = await sorgu<{ ders_id: string; sayi: number }>(
    `SELECT ders_id, sayi FROM class_progress WHERE kod = $1`,
    [sinif.kod],
  );

  const dersSayilari: Record<string, number> = {};
  let toplamTamamlama = 0;
  for (const s of satirlar) {
    dersSayilari[s.ders_id] = Number(s.sayi);
    toplamTamamlama += Number(s.sayi);
  }

  return {
    kod: sinif.kod,
    ad: sinif.ad,
    dersSayilari,
    toplamTamamlama,
    tamamlananDersCesidi: satirlar.length,
  };
}

export interface UniteIlerlemesi {
  uniteId: string;
  uniteAdi: string;
  sehirAdi: string;
  dersler: { dersId: string; eserId: string; eserAdi: string; sira: number; sayi: number }[];
  tamamlananDersCesidi: number;
  toplamDers: number;
}

/**
 * Sınıfın bir külliyedeki ilerlemesi.
 *
 * PDF Senaryo B: "Sınıf birlikte bir külliyeyi tamamlar." Külliyeler
 * `shared/kulliyeler.ts` içinde YALNIZCA kaynakta belgelenmiş bağlarla tanımlı;
 * burada uydurma grup üretilmez. Eşleşen yayın dersi yoksa grup listeye girmez.
 */
export interface KulliyeIlerlemesi {
  id: string;
  ad: string;
  sehirId: string;
  toplamDers: number;
  tamamlananDersCesidi: number;
  /** Sınıfın sıradaki hedefi mi? (yol sırasına göre ilk tamamlanmamış külliye) */
  hedefMi: boolean;
  tamamlandiMi: boolean;
}

/** Birlikte açılan Vakıf Röntgeni'ndeki tek eser. */
export interface SinifRontgenEseri {
  dersId: string;
  eserId: string;
  eserAdi: string;
  tur: string;
  sehirAdi: string;
  uniteAdi: string;
  gelirDagilimiDurumu: GelirDurumu;
  gelirKalemleri: GelirKalemi[];
  /** Dersin Yansıma adımındaki resmî kaynak künyesi (varsa). */
  kaynakKunye: string | null;
}

/** `GET /api/sinif/:kod/rontgen` gövdesi — yalnız anonim sayaçlar + yayın içeriği. */
export interface SinifRontgeni {
  kod: string;
  ad: string;
  toplamTamamlama: number;
  tamamlananDersCesidi: number;
  kulliyeler: KulliyeIlerlemesi[];
  eserler: SinifRontgenEseri[];
}

/** Yayındaki derslerin yol sırasındaki kimlik çifti. */
export interface YayindakiDers {
  dersId: string;
  eserId: string;
}

/**
 * Yol sırasına göre külliye ilerlemesini hesaplar.
 *
 * `hedefMi`: yol sırasında ilk tamamlanmamış külliye. Sınıf bir külliyeyi
 * bitirince hedef otomatik olarak bir sonrakine geçer; öğretmen seçim yapmaz.
 * Hiçbir grup eşleşmezse boş dizi döner (arayüz külliye kartını göstermez).
 */
export function kulliyeleriHesapla(
  dersler: readonly YayindakiDers[],
  dersSayilari: Record<string, number>,
): KulliyeIlerlemesi[] {
  const hesaplanan: (KulliyeIlerlemesi & { ilkSira: number })[] = [];

  for (const grup of KULLIYE_GRUPLARI) {
    let ilkSira = Number.POSITIVE_INFINITY;
    let toplamDers = 0;
    let tamamlanan = 0;

    dersler.forEach((ders, sira) => {
      if (!grup.eserIdler.includes(ders.eserId)) return;
      toplamDers += 1;
      ilkSira = Math.min(ilkSira, sira);
      if ((dersSayilari[ders.dersId] ?? 0) > 0) tamamlanan += 1;
    });

    if (toplamDers === 0) continue;
    hesaplanan.push({
      id: grup.id,
      ad: grup.ad,
      sehirId: grup.sehirId,
      toplamDers,
      tamamlananDersCesidi: tamamlanan,
      hedefMi: false,
      tamamlandiMi: false,
      ilkSira,
    });
  }

  hesaplanan.sort((a, b) => a.ilkSira - b.ilkSira);
  const hedef = hesaplanan.find((grup) => grup.tamamlananDersCesidi < grup.toplamDers);

  return hesaplanan.map(({ ilkSira: _ilkSira, ...grup }) => ({
    ...grup,
    hedefMi: hedef?.id === grup.id,
    tamamlandiMi: grup.tamamlananDersCesidi >= grup.toplamDers,
  }));
}

/** Yayındaki bir dersin yol sırası, ünitesi, eseri ve kaynağı. */
interface DersSatiri {
  unite_id: string;
  unite_ad: string;
  sehir_ad: string;
  ders_id: string;
  eser_id: string;
  eser_adi: string;
  tur: string;
  gelir_dagilimi_durumu: GelirDurumu;
  kaynak_kunye: string | null;
  sira: number;
}

/**
 * Yayındaki dersleri yol sırasıyla getirir.
 * Öğretmen paneli, sınıf Röntgeni ve külliye hesabı AYNI sırayı kullanır.
 */
async function yayindakiDersleriGetir(): Promise<DersSatiri[]> {
  return sorgu<DersSatiri>(
    `SELECT u.id AS unite_id, u.ad AS unite_ad, c.ad AS sehir_ad,
            l.id AS ders_id, w.id AS eser_id, w.ad AS eser_adi, w.tur,
            w.gelir_dagilimi_durumu,
            (l.yansima->>'kaynakKunye') AS kaynak_kunye,
            l.sira
       FROM lesson l
       JOIN unit u ON u.id = l.unit_id
       JOIN city c ON c.id = u.sehir_id
       JOIN work w ON w.id = l.work_id
      WHERE w.yayinda = TRUE AND c.aktif = TRUE
      ORDER BY c.sira, u.sira, l.sira`,
  );
}

/**
 * Ders bazlı sınıf ilerlemesini ünite/şehir kırılımıyla döner.
 * Öğretmen paneli bunu kullanır; ayrıca hedef külliye hesabı da buradadır.
 */
export async function sinifDetayliIlerleme(kod: string): Promise<{
  ilerleme: SinifIlerlemesi;
  uniteler: UniteIlerlemesi[];
  kulliyeler: KulliyeIlerlemesi[];
} | null> {
  const ilerleme = await sinifIlerlemesi(kod);
  if (!ilerleme) return null;

  const satirlar = await yayindakiDersleriGetir();

  const gruplu = new Map<string, UniteIlerlemesi>();
  const uniteler: UniteIlerlemesi[] = [];
  const yayindakiDersler: YayindakiDers[] = [];

  for (const s of satirlar) {
    if (!gruplu.has(s.unite_id)) {
      const yeni: UniteIlerlemesi = {
        uniteId: s.unite_id,
        uniteAdi: s.unite_ad,
        sehirAdi: s.sehir_ad,
        dersler: [],
        tamamlananDersCesidi: 0,
        toplamDers: 0,
      };
      gruplu.set(s.unite_id, yeni);
      uniteler.push(yeni);
    }
    const unite = gruplu.get(s.unite_id)!;
    const sayi = ilerleme.dersSayilari[s.ders_id] ?? 0;
    unite.dersler.push({
      dersId: s.ders_id,
      eserId: s.eser_id,
      eserAdi: s.eser_adi,
      sira: Number(s.sira),
      sayi,
    });
    unite.toplamDers += 1;
    if (sayi > 0) unite.tamamlananDersCesidi += 1;

    yayindakiDersler.push({ dersId: s.ders_id, eserId: s.eser_id });
  }

  return {
    ilerleme,
    uniteler,
    kulliyeler: kulliyeleriHesapla(yayindakiDersler, ilerleme.dersSayilari),
  };
}

// ---------------------------------------------------------------------------
// Sınıf Vakıf Röntgeni — birlikte açılan büyük ekran
// ---------------------------------------------------------------------------

interface SinifGelirSatiri {
  id: number;
  work_id: string;
  kalem: string;
  yuzde: string | number | null;
  tip: GelirTipi | null;
  kaynak: string | null;
  sira: number;
}

/** Tamamlanan eserlerin gelir kalemlerini tek sorguda getirir. */
async function sinifGelirleriGetir(
  eserIdler: readonly string[],
): Promise<Map<string, GelirKalemi[]>> {
  const gruplu = new Map<string, GelirKalemi[]>();
  if (eserIdler.length === 0) return gruplu;

  const yerTutucu = eserIdler.map((_, i) => `$${i + 1}`).join(', ');
  const satirlar = await sorgu<SinifGelirSatiri>(
    `SELECT id, work_id, kalem, yuzde, tip, kaynak, sira
       FROM income_item
      WHERE work_id IN (${yerTutucu})
      ORDER BY work_id, sira`,
    [...eserIdler],
  );

  for (const s of satirlar) {
    const kalem: GelirKalemi = {
      id: s.id,
      eserId: s.work_id,
      kalem: s.kalem,
      // NUMERIC -> number | null; belge yoksa oran uydurulmaz.
      yuzde: s.yuzde === null || s.yuzde === undefined ? null : Number(s.yuzde),
      tip: s.tip ?? null,
      kaynak: s.kaynak,
      sira: s.sira,
    };
    const liste = gruplu.get(s.work_id) ?? [];
    liste.push(kalem);
    gruplu.set(s.work_id, liste);
  }

  return gruplu;
}

/**
 * Sınıfın birlikte gördüğü eserlerin Vakıf Röntgeni verisi.
 *
 * GİZLİLİK: Bu uç yalnızca sınıf kodunu, toplu sayaçları ve YAYIN İÇERİĞİNİ
 * döner. Hangi çocuğun hangi dersi bitirdiği bilinmez; `class_progress`
 * tablosunda kimlik yoktur. Sınıf kapalı olsa da tahtada gösterilebilir
 * (kapatmak yeni tamamlamayı durdurur, geçmişi gizlemez).
 */
export async function sinifRontgeni(kod: string): Promise<SinifRontgeni | null> {
  const sinif = await sinifGetir(kod);
  if (!sinif) return null;

  const ilerleme = await sinifIlerlemesi(sinif.kod);
  if (!ilerleme) return null;

  const satirlar = await yayindakiDersleriGetir();
  const tamamlanan = satirlar.filter((s) => (ilerleme.dersSayilari[s.ders_id] ?? 0) > 0);
  const eserIdler = [...new Set(tamamlanan.map((s) => s.eser_id))];
  const gelirler = await sinifGelirleriGetir(eserIdler);

  const eserler: SinifRontgenEseri[] = tamamlanan.map((s) => ({
    dersId: s.ders_id,
    eserId: s.eser_id,
    eserAdi: s.eser_adi,
    tur: s.tur,
    sehirAdi: s.sehir_ad,
    uniteAdi: s.unite_ad,
    gelirDagilimiDurumu: s.gelir_dagilimi_durumu,
    gelirKalemleri: gelirler.get(s.eser_id) ?? [],
    kaynakKunye: s.kaynak_kunye,
  }));

  return {
    kod: sinif.kod,
    ad: sinif.ad,
    toplamTamamlama: ilerleme.toplamTamamlama,
    tamamlananDersCesidi: ilerleme.tamamlananDersCesidi,
    kulliyeler: kulliyeleriHesapla(
      satirlar.map((s) => ({ dersId: s.ders_id, eserId: s.eser_id })),
      ilerleme.dersSayilari,
    ),
    eserler,
  };
}
