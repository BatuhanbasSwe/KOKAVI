var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db/index.ts
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
async function veritabaniAl() {
  if (db) return db;
  db = new PGlite(VERI_DIZINI);
  await db.waitReady;
  return db;
}
async function semaKur(hedef) {
  const hedefDb = hedef ?? await veritabaniAl();
  const sql = await readFile(join(__dirname, "schema.sql"), "utf8");
  await hedefDb.exec(sql);
}
async function semaHazirMi(hedef) {
  const hedefDb = hedef ?? await veritabaniAl();
  try {
    const sonuc = await hedefDb.query(
      `SELECT count(*)::int AS sayi
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('city','kulliye','work','income_item','unit','lesson','exercise')`
    );
    return (sonuc.rows[0]?.sayi ?? 0) === 7;
  } catch {
    return false;
  }
}
async function semaGarantiEt() {
  const hedefDb = await veritabaniAl();
  if (!await semaHazirMi(hedefDb)) {
    await semaKur(hedefDb);
  }
  await authSemaGarantiEt(hedefDb);
}
async function authSemaGarantiEt(hedef) {
  const hedefDb = hedef ?? await veritabaniAl();
  const sql = await readFile(join(__dirname, "auth-schema.sql"), "utf8");
  await hedefDb.exec(sql);
}
async function baglantiKapat() {
  if (db) {
    await db.close();
    db = null;
  }
}
async function sorgu(sql, params = []) {
  const hedefDb = await veritabaniAl();
  const sonuc = await hedefDb.query(sql, params);
  return sonuc.rows;
}
async function tekSorgu(sql, params = []) {
  const satirlar = await sorgu(sql, params);
  return satirlar[0] ?? null;
}
var __dirname, VERI_DIZINI, db;
var init_db = __esm({
  "server/db/index.ts"() {
    __dirname = dirname(fileURLToPath(import.meta.url));
    VERI_DIZINI = process.env.KOKAVI_PGDATA ? resolve(process.env.KOKAVI_PGDATA) : resolve(__dirname, "..", "..", ".pgdata");
    db = null;
  }
});

// server/repo/eser.ts
function fotografDonustur(s) {
  return {
    id: s.id,
    eserId: s.work_id,
    url: s.url,
    altMetin: s.alt_metin,
    altMetinEn: s.alt_metin_en,
    kaynak: s.kaynak,
    lisans: s.lisans,
    sira: Number(s.sira)
  };
}
function sergiDonustur(s) {
  return {
    id: s.id,
    ad: s.ad,
    adEn: s.ad_en,
    tarih: s.tarih,
    mekan: s.mekan,
    aciklama: s.aciklama
  };
}
function gelirDonustur(s) {
  return {
    id: s.id,
    eserId: s.work_id,
    kalem: s.kalem,
    // NUMERIC -> number | null
    yuzde: s.yuzde === null || s.yuzde === void 0 ? null : Number(s.yuzde),
    tip: s.tip ?? null,
    kaynak: s.kaynak,
    sira: s.sira
  };
}
function eserDonustur(s, gelirler, fotograflar = [], sergiler = []) {
  const koordinat = s.lat !== null && s.lng !== null && s.lat !== void 0 && s.lng !== void 0 ? { lat: Number(s.lat), lng: Number(s.lng) } : null;
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
    updatedAt: s.updated_at
  };
}
async function gelirleriGetir(eserId) {
  const satirlar = await sorgu(
    `SELECT id, work_id, kalem, yuzde, tip, kaynak, sira
       FROM income_item WHERE work_id = $1 ORDER BY sira, id`,
    [eserId]
  );
  return satirlar.map(gelirDonustur);
}
async function fotograflariGetir(eserId) {
  const satirlar = await sorgu(
    `SELECT * FROM work_photo WHERE work_id = $1 ORDER BY sira, id`,
    [eserId]
  );
  return satirlar.map(fotografDonustur);
}
async function sergileriGetir(eserId) {
  const satirlar = await sorgu(
    `SELECT e.* FROM exhibition e
       JOIN exhibition_work ew ON ew.exhibition_id = e.id
      WHERE ew.work_id = $1
      ORDER BY e.tarih NULLS LAST, e.ad`,
    [eserId]
  );
  return satirlar.map(sergiDonustur);
}
async function eserleriListele(secenekler = {}) {
  const kosullar = [];
  const params = [];
  if (secenekler.sadeceYayinda) kosullar.push("yayinda = TRUE");
  if (secenekler.sehirId) {
    params.push(secenekler.sehirId);
    kosullar.push(`sehir_id = $${params.length}`);
  }
  if (secenekler.tur) {
    params.push(secenekler.tur);
    kosullar.push(`tur = $${params.length}`);
  }
  const nerede = kosullar.length ? `WHERE ${kosullar.join(" AND ")}` : "";
  const satirlar = await sorgu(
    `SELECT * FROM work ${nerede} ORDER BY sehir_id, ad`,
    params
  );
  const tumGelirler = await sorgu(
    satirlar.length ? `SELECT id, work_id, kalem, yuzde, tip, kaynak, sira FROM income_item
          WHERE work_id = ANY($1::text[]) ORDER BY sira, id` : `SELECT NULL WHERE FALSE`,
    satirlar.length ? [satirlar.map((s) => s.id)] : []
  );
  const gruplu = /* @__PURE__ */ new Map();
  for (const g of tumGelirler) {
    const liste = gruplu.get(g.work_id) ?? [];
    liste.push(gelirDonustur(g));
    gruplu.set(g.work_id, liste);
  }
  const idler = satirlar.map((s) => s.id);
  const tumFotograflar = await sorgu(
    idler.length ? `SELECT * FROM work_photo WHERE work_id = ANY($1::text[]) ORDER BY work_id, sira, id` : `SELECT NULL WHERE FALSE`,
    idler.length ? [idler] : []
  );
  const fotografGruplu = /* @__PURE__ */ new Map();
  for (const f of tumFotograflar) {
    const liste = fotografGruplu.get(f.work_id) ?? [];
    liste.push(fotografDonustur(f));
    fotografGruplu.set(f.work_id, liste);
  }
  const tumSergiler = await sorgu(
    idler.length ? `SELECT e.*, ew.work_id FROM exhibition e
           JOIN exhibition_work ew ON ew.exhibition_id = e.id
          WHERE ew.work_id = ANY($1::text[])
          ORDER BY ew.work_id, e.tarih NULLS LAST, e.ad` : `SELECT NULL WHERE FALSE`,
    idler.length ? [idler] : []
  );
  const sergiGruplu = /* @__PURE__ */ new Map();
  for (const s of tumSergiler) {
    const liste = sergiGruplu.get(s.work_id) ?? [];
    liste.push(sergiDonustur(s));
    sergiGruplu.set(s.work_id, liste);
  }
  return satirlar.map(
    (s) => eserDonustur(
      s,
      gruplu.get(s.id) ?? [],
      fotografGruplu.get(s.id) ?? [],
      sergiGruplu.get(s.id) ?? []
    )
  );
}
async function eserGetir(id) {
  const satir = await tekSorgu(`SELECT * FROM work WHERE id = $1`, [id]);
  if (!satir) return null;
  const [gelirler, fotograflar, sergiler] = await Promise.all([
    gelirleriGetir(id),
    fotograflariGetir(id),
    sergileriGetir(id)
  ]);
  return eserDonustur(satir, gelirler, fotograflar, sergiler);
}
async function filtreSecenekleri() {
  const sehirler = await sorgu(
    `SELECT c.id, c.ad, count(w.id)::int AS sayi
       FROM city c LEFT JOIN work w ON w.sehir_id = c.id AND w.yayinda
      GROUP BY c.id, c.ad, c.sira
      HAVING count(w.id) > 0
      ORDER BY c.sira`
  );
  const turler = await sorgu(
    `SELECT tur, count(*)::int AS sayi FROM work WHERE yayinda GROUP BY tur ORDER BY tur`
  );
  return { sehirler, turler };
}
async function eserKaydet(girdi) {
  const db2 = await veritabaniAl();
  const kalemler = girdi.gelirKalemleri ?? [];
  const durum = girdi.gelirDagilimiDurumu ?? (kalemler.some((k) => k.yuzde !== null) ? "belgeli" : "belge-bulunamadi");
  await db2.query(
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
      girdi.yayinda ?? false
    ]
  );
  await db2.query(`DELETE FROM income_item WHERE work_id = $1`, [girdi.id]);
  for (const [i, k] of kalemler.entries()) {
    await db2.query(
      `INSERT INTO income_item (work_id, kalem, yuzde, tip, kaynak, sira)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [girdi.id, k.kalem, k.yuzde, k.tip ?? null, k.kaynak ?? null, i]
    );
  }
  const sonuc = await eserGetir(girdi.id);
  if (!sonuc) throw new Error("Eser kaydedilemedi");
  return sonuc;
}
async function eserSil(id) {
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(`DELETE FROM work WHERE id = $1`, [id]);
  return (sonuc.affectedRows ?? 0) > 0;
}
var init_eser = __esm({
  "server/repo/eser.ts"() {
    init_db();
  }
});

// server/repo/yol.ts
async function sehirleriListele() {
  const satirlar = await sorgu(`SELECT * FROM city ORDER BY sira, ad`);
  return satirlar.map(sehirDonustur);
}
async function uniteListele(sehirId) {
  const satirlar = sehirId ? await sorgu(`SELECT * FROM unit WHERE sehir_id = $1 ORDER BY sira`, [sehirId]) : await sorgu(`SELECT * FROM unit ORDER BY sehir_id, sira`);
  return satirlar.map(uniteDonustur);
}
async function kulliyeListele() {
  const satirlar = await sorgu(`SELECT * FROM kulliye ORDER BY ad`);
  return satirlar.map((s) => ({
    id: s.id,
    ad: s.ad,
    sehirId: s.sehir_id,
    bani: s.bani,
    aciklama: s.aciklama
  }));
}
async function sehirKaydet(girdi) {
  const db2 = await veritabaniAl();
  await db2.query(
    `INSERT INTO city (id, ad, sira, aktif, updated_at)
     VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (id) DO UPDATE SET
       ad = EXCLUDED.ad, sira = EXCLUDED.sira, aktif = EXCLUDED.aktif, updated_at = now()`,
    [girdi.id, girdi.ad, girdi.sira, girdi.aktif ?? true]
  );
  const s = await tekSorgu(`SELECT * FROM city WHERE id = $1`, [girdi.id]);
  return s ? sehirDonustur(s) : null;
}
async function uniteKaydet(girdi) {
  const db2 = await veritabaniAl();
  await db2.query(
    `INSERT INTO unit (id, sehir_id, ad, sira, aciklama, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (id) DO UPDATE SET
       sehir_id = EXCLUDED.sehir_id, ad = EXCLUDED.ad, sira = EXCLUDED.sira,
       aciklama = EXCLUDED.aciklama, updated_at = now()`,
    [girdi.id, girdi.sehirId, girdi.ad, girdi.sira, girdi.aciklama ?? null]
  );
  const u = await tekSorgu(`SELECT * FROM unit WHERE id = $1`, [girdi.id]);
  return u ? uniteDonustur(u) : null;
}
async function uniteSil(id) {
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(`DELETE FROM unit WHERE id = $1`, [id]);
  return (sonuc.affectedRows ?? 0) > 0;
}
async function kulliyeKaydet(girdi) {
  const db2 = await veritabaniAl();
  await db2.query(
    `INSERT INTO kulliye (id, ad, sehir_id, bani, aciklama, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (id) DO UPDATE SET
       ad = EXCLUDED.ad, sehir_id = EXCLUDED.sehir_id, bani = EXCLUDED.bani,
       aciklama = EXCLUDED.aciklama, updated_at = now()`,
    [girdi.id, girdi.ad, girdi.sehirId, girdi.bani ?? null, girdi.aciklama ?? null]
  );
}
async function yolIskeleti() {
  return sorgu(
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
      ORDER BY c.sira, u.sira, l.sira`
  );
}
async function istatistikler() {
  const s = await tekSorgu(
    `SELECT (SELECT count(*)::int FROM city)                       AS sehir,
            (SELECT count(*)::int FROM unit)                       AS unite,
            (SELECT count(*)::int FROM work)                       AS eser,
            (SELECT count(*)::int FROM lesson)                     AS ders,
            (SELECT count(*)::int FROM work WHERE yayinda)         AS yayinda,
            (SELECT count(*)::int FROM work
              WHERE gelir_dagilimi_durumu = 'belgeli')             AS belgeli`
  );
  return s ?? { sehir: 0, unite: 0, eser: 0, ders: 0, yayinda: 0, belgeli: 0 };
}
var sehirDonustur, uniteDonustur;
var init_yol = __esm({
  "server/repo/yol.ts"() {
    init_db();
    sehirDonustur = (s) => ({
      id: s.id,
      ad: s.ad,
      sira: Number(s.sira),
      aktif: s.aktif
    });
    uniteDonustur = (s) => ({
      id: s.id,
      sehirId: s.sehir_id,
      ad: s.ad,
      sira: Number(s.sira),
      aciklama: s.aciklama
    });
  }
});

// server/repo/ders.ts
function egzersizDonustur(s) {
  return {
    id: s.id,
    tip: s.tip,
    sira: Number(s.sira),
    veri: s.veri,
    kaynak: s.kaynak
  };
}
async function dersleriListele() {
  const satirlar = await sorgu(`${DERS_SELECT} ORDER BY l.unit_id, l.sira`);
  const hepsi = await sorgu(
    satirlar.length ? `SELECT * FROM exercise WHERE lesson_id = ANY($1::text[]) ORDER BY lesson_id, sira` : `SELECT NULL WHERE FALSE`,
    satirlar.length ? [satirlar.map((s) => s.id)] : []
  );
  const gruplu = /* @__PURE__ */ new Map();
  for (const e of hepsi) {
    const liste = gruplu.get(e.lesson_id) ?? [];
    liste.push(egzersizDonustur(e));
    gruplu.set(e.lesson_id, liste);
  }
  return satirlar.map((s) => dersDonustur(s, gruplu.get(s.id) ?? []));
}
async function dersGetir(id) {
  const satir = await tekSorgu(`${DERS_SELECT} WHERE l.id = $1`, [id]);
  if (!satir) return null;
  const egzersizler = await sorgu(
    `SELECT * FROM exercise WHERE lesson_id = $1 ORDER BY sira`,
    [id]
  );
  return dersDonustur(satir, egzersizler.map(egzersizDonustur));
}
function dersDonustur(s, egzersizler) {
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
    eser: s.eser_ad ? {
      id: s.work_id,
      ad: s.eser_ad,
      tur: s.eser_tur ?? "",
      sehirId: s.eser_sehir_id ?? "",
      gelirDagilimiDurumu: s.eser_gelir_durumu ?? "belge-bulunamadi"
    } : void 0
  };
}
async function dersKaydet(girdi) {
  const db2 = await veritabaniAl();
  await db2.query(
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
      JSON.stringify(girdi.yansima)
    ]
  );
  await db2.query(`DELETE FROM exercise WHERE lesson_id = $1`, [girdi.id]);
  for (const [i, e] of girdi.egzersizler.entries()) {
    await db2.query(
      `INSERT INTO exercise (id, lesson_id, tip, sira, veri, kaynak)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [e.id, girdi.id, e.tip, i, JSON.stringify(e.veri), e.kaynak ?? null]
    );
  }
  const sonuc = await dersGetir(girdi.id);
  if (!sonuc) throw new Error("Ders kaydedilemedi");
  return sonuc;
}
async function dersSil(id) {
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(`DELETE FROM lesson WHERE id = $1`, [id]);
  return (sonuc.affectedRows ?? 0) > 0;
}
var DERS_SELECT;
var init_ders = __esm({
  "server/repo/ders.ts"() {
    init_db();
    DERS_SELECT = `
  SELECT l.*,
         w.ad                            AS eser_ad,
         w.tur                           AS eser_tur,
         w.sehir_id                      AS eser_sehir_id,
         w.gelir_dagilimi_durumu         AS eser_gelir_durumu
    FROM lesson l
    JOIN work w ON w.id = l.work_id`;
  }
});

// server/routes/public.ts
async function genelUclar(app) {
  app.get("/api/saglik", async () => ({ durum: "calisiyor", zaman: (/* @__PURE__ */ new Date()).toISOString() }));
  app.get("/api/sehirler", async () => sehirleriListele());
  app.get("/api/uniteler", async (istek) => {
    const { sehir } = istek.query;
    return uniteListele(sehir);
  });
  app.get("/api/kulliyeler", async () => kulliyeListele());
  app.get("/api/yol", async () => {
    const satirlar = await yolIskeleti();
    const sehirler = /* @__PURE__ */ new Map();
    for (const s of satirlar) {
      if (!sehirler.has(s.sehir_id)) {
        sehirler.set(s.sehir_id, {
          sehirId: s.sehir_id,
          ad: s.sehir_ad,
          sira: Number(s.sehir_sira),
          uniteler: /* @__PURE__ */ new Map()
        });
      }
      const sehir = sehirler.get(s.sehir_id);
      if (!sehir.uniteler.has(s.unite_id)) {
        sehir.uniteler.set(s.unite_id, {
          uniteId: s.unite_id,
          ad: s.unite_ad,
          sira: Number(s.unite_sira),
          dersler: []
        });
      }
      sehir.uniteler.get(s.unite_id).dersler.push({
        dersId: s.ders_id,
        eserId: s.eser_id,
        eserAdi: s.eser_adi,
        tur: s.tur,
        sira: Number(s.sira)
      });
    }
    return {
      sehirler: [...sehirler.values()].sort((a, b) => a.sira - b.sira).map((s) => ({
        ...s,
        uniteler: [...s.uniteler.values()].sort((a, b) => a.sira - b.sira)
      }))
    };
  });
  app.get("/api/eserler", async (istek) => {
    const { hepsi, sehir, tur } = istek.query;
    return eserleriListele({ sadeceYayinda: hepsi !== "1", sehirId: sehir, tur });
  });
  app.get("/api/filtreler", async () => filtreSecenekleri());
  app.get("/api/eserler/:id", async (istek, cevap) => {
    const { id } = istek.params;
    const eser = await eserGetir(id);
    if (!eser) return cevap.code(404).send({ hata: "Eser bulunamadi" });
    return eser;
  });
  app.get("/api/dersler", async () => dersleriListele());
  app.get("/api/dersler/:id", async (istek, cevap) => {
    const { id } = istek.params;
    const ders = await dersGetir(id);
    if (!ders) return cevap.code(404).send({ hata: "Ders bulunamadi" });
    return ders;
  });
}
var init_public = __esm({
  "server/routes/public.ts"() {
    init_eser();
    init_yol();
    init_ders();
  }
});

// server/auth/parola.ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
function parolaHashle(parola) {
  if (parola.length < 8) {
    throw new Error("Parola en az 8 karakter olmal\u0131d\u0131r.");
  }
  const tuz = randomBytes(TUZ_UZUNLUK);
  const ozet = scryptSync(parola.normalize("NFKC"), tuz, OZET_UZUNLUK, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${tuz.toString("base64")}$${ozet.toString("base64")}`;
}
function parolaDogrula(parola, kayitliOzet) {
  try {
    const parcalar = kayitliOzet.split("$");
    if (parcalar.length !== 6 || parcalar[0] !== "scrypt") return false;
    const n = Number(parcalar[1]);
    const r = Number(parcalar[2]);
    const p = Number(parcalar[3]);
    const tuz = Buffer.from(parcalar[4], "base64");
    const beklenen = Buffer.from(parcalar[5], "base64");
    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    if (tuz.length === 0 || beklenen.length === 0) return false;
    const hesaplanan = scryptSync(parola.normalize("NFKC"), tuz, beklenen.length, { N: n, r, p });
    return timingSafeEqual(hesaplanan, beklenen);
  } catch {
    return false;
  }
}
function parolaZayifMi(parola) {
  const sorunlar = [];
  if (parola.length < 8) sorunlar.push("En az 8 karakter olmal\u0131.");
  if (!/[a-zçğıöşü]/.test(parola)) sorunlar.push("En az bir k\xFC\xE7\xFCk harf i\xE7ermeli.");
  if (!/[A-ZÇĞİÖŞÜ]/.test(parola)) sorunlar.push("En az bir b\xFCy\xFCk harf i\xE7ermeli.");
  if (!/[0-9]/.test(parola)) sorunlar.push("En az bir rakam i\xE7ermeli.");
  if (/^(.)\1+$/.test(parola)) sorunlar.push("Tek karakter tekrar\u0131 olamaz.");
  return sorunlar;
}
var N, R, P, TUZ_UZUNLUK, OZET_UZUNLUK;
var init_parola = __esm({
  "server/auth/parola.ts"() {
    N = 16384;
    R = 8;
    P = 1;
    TUZ_UZUNLUK = 16;
    OZET_UZUNLUK = 64;
  }
});

// server/auth/oturum.ts
var oturum_exports = {};
__export(oturum_exports, {
  OTURUM_SURESI_MS: () => OTURUM_SURESI_MS,
  basarisizDenemeSayisi: () => basarisizDenemeSayisi,
  eskiDenemeleriTemizle: () => eskiDenemeleriTemizle,
  girisDenemesiKaydet: () => girisDenemesiKaydet,
  girisYap: () => girisYap,
  kullaniciDurumDegistir: () => kullaniciDurumDegistir,
  kullaniciGetir: () => kullaniciGetir,
  kullaniciOlustur: () => kullaniciOlustur,
  kullaniciOturumlariniBitir: () => kullaniciOturumlariniBitir,
  kullaniciParolaDegistir: () => kullaniciParolaDegistir,
  kullaniciVarMi: () => kullaniciVarMi,
  kullanicilariListele: () => kullanicilariListele,
  oturumBitir: () => oturumBitir,
  oturumDogrula: () => oturumDogrula,
  suresiGecmisOturumlariTemizle: () => suresiGecmisOturumlariTemizle
});
import { createHash, randomBytes as randomBytes2, randomUUID } from "node:crypto";
function kullaniciyaCevir(s) {
  return {
    id: s.id,
    email: s.email,
    ad: s.ad,
    rol: s.rol,
    aktif: s.aktif,
    sonGiris: s.son_giris,
    createdAt: s.created_at
  };
}
function tokenOzeti(token) {
  return createHash("sha256").update(token).digest("hex");
}
async function kullaniciOlustur(girdi) {
  const db2 = await veritabaniAl();
  const id = randomUUID();
  await db2.query(
    `INSERT INTO app_user (id, email, ad, parola_hash, rol, aktif)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [id, girdi.email.trim(), girdi.ad.trim(), parolaHashle(girdi.parola), girdi.rol]
  );
  const olusan = await kullaniciGetir(id);
  if (!olusan) throw new Error("Kullan\u0131c\u0131 olu\u015Fturulamad\u0131");
  return olusan;
}
async function kullaniciGetir(id) {
  const s = await tekSorgu(`SELECT * FROM app_user WHERE id = $1`, [id]);
  return s ? kullaniciyaCevir(s) : null;
}
async function kullaniciSatiriEmailIle(email) {
  return tekSorgu(`SELECT * FROM app_user WHERE LOWER(email) = LOWER($1)`, [
    email.trim()
  ]);
}
async function kullaniciVarMi(email) {
  return await kullaniciSatiriEmailIle(email) !== null;
}
async function kullanicilariListele() {
  const satirlar = await sorgu(`SELECT * FROM app_user ORDER BY created_at`);
  return satirlar.map(kullaniciyaCevir);
}
async function kullaniciDurumDegistir(id, aktif) {
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(
    `UPDATE app_user SET aktif = $2, updated_at = NOW() WHERE id = $1`,
    [id, aktif]
  );
  return (sonuc.affectedRows ?? 0) > 0;
}
async function kullaniciParolaDegistir(id, yeniParola) {
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(
    `UPDATE app_user SET parola_hash = $2, updated_at = NOW() WHERE id = $1`,
    [id, parolaHashle(yeniParola)]
  );
  await db2.query(`DELETE FROM session WHERE user_id = $1`, [id]);
  return (sonuc.affectedRows ?? 0) > 0;
}
async function girisYap(email, parola, userAgent) {
  const satir = await kullaniciSatiriEmailIle(email);
  const ozet = satir?.parola_hash ?? "scrypt$16384$8$1$AAAA$AAAA";
  const parolaDogru = parolaDogrula(parola, ozet);
  if (!satir || !parolaDogru || !satir.aktif) {
    await girisDenemesiKaydet(email, false);
    return null;
  }
  const db2 = await veritabaniAl();
  const token = randomBytes2(32).toString("base64url");
  const gecerlilikSonu = new Date(Date.now() + OTURUM_SURESI_MS);
  await db2.query(
    `INSERT INTO session (token_hash, user_id, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [tokenOzeti(token), satir.id, gecerlilikSonu.toISOString(), userAgent?.slice(0, 200) ?? null]
  );
  await db2.query(`UPDATE app_user SET son_giris = NOW() WHERE id = $1`, [satir.id]);
  await girisDenemesiKaydet(email, true);
  return { token, gecerlilikSonu, kullanici: kullaniciyaCevir(satir) };
}
async function oturumDogrula(token) {
  if (!token || token.length < 20) return null;
  const satir = await tekSorgu(
    `SELECT user_id, expires_at FROM session WHERE token_hash = $1`,
    [tokenOzeti(token)]
  );
  if (!satir) return null;
  if (new Date(satir.expires_at).getTime() < Date.now()) {
    await oturumBitir(token);
    return null;
  }
  const kullanici = await kullaniciGetir(satir.user_id);
  if (!kullanici || !kullanici.aktif) {
    await oturumBitir(token);
    return null;
  }
  return kullanici;
}
async function oturumBitir(token) {
  const db2 = await veritabaniAl();
  await db2.query(`DELETE FROM session WHERE token_hash = $1`, [tokenOzeti(token)]);
}
async function kullaniciOturumlariniBitir(userId) {
  const db2 = await veritabaniAl();
  await db2.query(`DELETE FROM session WHERE user_id = $1`, [userId]);
}
async function suresiGecmisOturumlariTemizle() {
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(`DELETE FROM session WHERE expires_at < NOW()`);
  return sonuc.affectedRows ?? 0;
}
async function girisDenemesiKaydet(email, basarili) {
  const db2 = await veritabaniAl();
  await db2.query(`INSERT INTO login_attempt (email, basarili) VALUES ($1, $2)`, [
    email.slice(0, 200),
    basarili
  ]);
}
async function basarisizDenemeSayisi(email, pencereDakika = 15) {
  const satir = await tekSorgu(
    `SELECT count(*)::int AS sayi
       FROM login_attempt
      WHERE LOWER(email) = LOWER($1)
        AND basarili = FALSE
        AND created_at > NOW() - ($2 || ' minutes')::interval`,
    [email, String(pencereDakika)]
  );
  return satir?.sayi ?? 0;
}
async function eskiDenemeleriTemizle(gunOnce = 7) {
  const db2 = await veritabaniAl();
  await db2.query(`DELETE FROM login_attempt WHERE created_at < NOW() - ($1 || ' days')::interval`, [
    String(gunOnce)
  ]);
}
var OTURUM_SURESI_MS;
var init_oturum = __esm({
  "server/auth/oturum.ts"() {
    init_db();
    init_parola();
    OTURUM_SURESI_MS = 8 * 60 * 60 * 1e3;
  }
});

// server/auth/koruma.ts
function belirtecAl(istek) {
  const cerez = istek.cookies?.[OTURUM_CEREZ_ADI];
  if (cerez) return cerez;
  const baslik = istek.headers.authorization;
  if (baslik?.startsWith("Bearer ")) return baslik.slice(7).trim();
  return null;
}
async function kimlikCoz(istek) {
  const belirtec = belirtecAl(istek);
  if (!belirtec) return;
  const kullanici = await oturumDogrula(belirtec);
  if (kullanici) istek.kullanici = kullanici;
}
async function oturumGerekli(istek, cevap) {
  await kimlikCoz(istek);
  if (!istek.kullanici) {
    await cevap.code(401).send({
      hata: "Bu i\u015Flem i\xE7in giri\u015F yapmal\u0131s\u0131n.",
      kod: "GIRIS_GEREKLI"
    });
  }
}
async function yoneticiGerekli(istek, cevap) {
  await kimlikCoz(istek);
  if (!istek.kullanici) {
    await cevap.code(401).send({
      hata: "Bu i\u015Flem i\xE7in giri\u015F yapmal\u0131s\u0131n.",
      kod: "GIRIS_GEREKLI"
    });
    return;
  }
  if (istek.kullanici.rol !== "admin") {
    await cevap.code(403).send({
      hata: "Bu i\u015Flem i\xE7in yetkin yok.",
      kod: "YETKI_YOK"
    });
  }
}
var OTURUM_CEREZ_ADI;
var init_koruma = __esm({
  "server/auth/koruma.ts"() {
    init_oturum();
    OTURUM_CEREZ_ADI = "kokavi_oturum";
  }
});

// server/routes/admin.ts
function zorunlu(deger, alan) {
  if (typeof deger !== "string" || deger.trim() === "") {
    throw new DogrulamaHatasi(`"${alan}" alan\u0131 zorunludur.`);
  }
  return deger.trim();
}
function sayi(deger, alan) {
  const n = typeof deger === "string" ? Number(deger) : deger;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new DogrulamaHatasi(`"${alan}" say\u0131 olmal\u0131d\u0131r.`);
  }
  return n;
}
function hataYanit(cevap, hata) {
  if (hata instanceof DogrulamaHatasi) {
    return cevap.code(400).send({ hata: hata.message });
  }
  const mesaj = hata instanceof Error ? hata.message : String(hata);
  if (mesaj.includes("duplicate key")) {
    return cevap.code(409).send({ hata: "Bu kay\u0131t zaten var (kimlik veya s\u0131ra \xE7ak\u0131\u015Fmas\u0131)." });
  }
  if (mesaj.includes("foreign key")) {
    return cevap.code(400).send({ hata: "\u0130li\u015Fkili kay\u0131t bulunamad\u0131 (\u015Fehir/\xFCnite/eser)." });
  }
  return cevap.code(500).send({ hata: "Sunucu hatas\u0131", detay: mesaj });
}
async function yonetimUclari(app) {
  app.addHook("preHandler", yoneticiGerekli);
  app.get("/api/yonetim/istatistik", async () => istatistikler());
  app.post("/api/yonetim/sehirler", async (istek, cevap) => {
    try {
      const g = istek.body;
      const sonuc = await sehirKaydet({
        id: zorunlu(g.id, "id"),
        ad: zorunlu(g.ad, "ad"),
        sira: sayi(g.sira, "sira"),
        aktif: g.aktif === void 0 ? true : Boolean(g.aktif)
      });
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.post("/api/yonetim/kulliyeler", async (istek, cevap) => {
    try {
      const g = istek.body;
      await kulliyeKaydet({
        id: zorunlu(g.id, "id"),
        ad: zorunlu(g.ad, "ad"),
        sehirId: zorunlu(g.sehirId, "sehirId"),
        bani: g.bani ?? null,
        aciklama: g.aciklama ?? null
      });
      return cevap.code(201).send({ tamam: true });
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.post("/api/yonetim/uniteler", async (istek, cevap) => {
    try {
      const g = istek.body;
      const sonuc = await uniteKaydet({
        id: zorunlu(g.id, "id"),
        sehirId: zorunlu(g.sehirId, "sehirId"),
        ad: zorunlu(g.ad, "ad"),
        sira: sayi(g.sira, "sira"),
        aciklama: g.aciklama ?? null
      });
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.delete("/api/yonetim/uniteler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      const silindi = await uniteSil(id);
      if (!silindi) return cevap.code(404).send({ hata: "\xDCnite bulunamad\u0131" });
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.post("/api/yonetim/eserler", async (istek, cevap) => {
    try {
      const girdi = eserGirdisiDogrula(istek.body);
      const sonuc = await eserKaydet(girdi);
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.put("/api/yonetim/eserler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      if (!await eserGetir(id)) return cevap.code(404).send({ hata: "Eser bulunamad\u0131" });
      const girdi = eserGirdisiDogrula({ ...istek.body, id });
      return await eserKaydet(girdi);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.delete("/api/yonetim/eserler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      const silindi = await eserSil(id);
      if (!silindi) return cevap.code(404).send({ hata: "Eser bulunamad\u0131" });
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.post("/api/yonetim/dersler", async (istek, cevap) => {
    try {
      const girdi = dersGirdisiDogrula(istek.body);
      const sonuc = await dersKaydet(girdi);
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.put("/api/yonetim/dersler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      const girdi = dersGirdisiDogrula({ ...istek.body, id });
      return await dersKaydet(girdi);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.delete("/api/yonetim/dersler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      const silindi = await dersSil(id);
      if (!silindi) return cevap.code(404).send({ hata: "Ders bulunamad\u0131" });
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
}
function eserGirdisiDogrula(g) {
  const durum = g.gelirDagilimiDurumu;
  if (durum !== void 0 && !GECERLI_GELIR_DURUMLARI.includes(durum)) {
    throw new DogrulamaHatasi(
      `"gelirDagilimiDurumu" \u015Funlardan biri olmal\u0131: ${GECERLI_GELIR_DURUMLARI.join(", ")}`
    );
  }
  const hamKalemler = Array.isArray(g.gelirKalemleri) ? g.gelirKalemleri : [];
  const gelirKalemleri = hamKalemler.map((k, i) => {
    const kalem = k;
    const yuzde = kalem.yuzde;
    if (yuzde !== null && yuzde !== void 0) {
      const n = Number(yuzde);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new DogrulamaHatasi(`Gelir kalemi #${i + 1}: y\xFCzde 0-100 aras\u0131nda olmal\u0131d\u0131r.`);
      }
    }
    const tipHam = kalem.tip;
    if (tipHam !== null && tipHam !== void 0 && !GECERLI_GELIR_TIPLERI.includes(tipHam)) {
      throw new DogrulamaHatasi(
        `Gelir kalemi #${i + 1}: "tip" \u015Funlardan biri olmal\u0131: ${GECERLI_GELIR_TIPLERI.join(", ")}`
      );
    }
    return {
      kalem: zorunlu(kalem.kalem, `gelirKalemleri[${i}].kalem`),
      yuzde: yuzde === null || yuzde === void 0 ? null : Number(yuzde),
      tip: tipHam === null || tipHam === void 0 ? null : tipHam,
      kaynak: kalem.kaynak ?? null
    };
  });
  const koordinatHam = g.koordinat;
  const koordinat = koordinatHam && koordinatHam.lat !== void 0 && koordinatHam.lng !== void 0 ? { lat: sayi(koordinatHam.lat, "koordinat.lat"), lng: sayi(koordinatHam.lng, "koordinat.lng") } : null;
  return {
    id: zorunlu(g.id, "id"),
    ad: zorunlu(g.ad, "ad"),
    adEn: g.adEn ?? null,
    sehirId: zorunlu(g.sehirId, "sehirId"),
    kulliyeId: g.kulliyeId ?? null,
    tur: zorunlu(g.tur, "tur"),
    ilce: g.ilce ?? null,
    koordinat,
    bani: g.bani ?? null,
    baniDonem: g.baniDonem ?? null,
    yapimYili: g.yapimYili ?? null,
    vakfiyeAmaci: g.vakfiyeAmaci ?? null,
    hizmet: g.hizmet ?? null,
    bugunNeOldu: g.bugunNeOldu ?? null,
    // Bilgi Notu veri alanı: "tarihçe, Türkçe ve İngilizce metinler"
    tarihce: g.tarihce ?? null,
    tarihceEn: g.tarihceEn ?? null,
    gelirDagilimiDurumu: durum,
    arsivNo: g.arsivNo ?? null,
    kaynaklar: Array.isArray(g.kaynaklar) ? g.kaynaklar : [],
    dogrulamaNotu: g.dogrulamaNotu ?? null,
    yayinda: g.yayinda === void 0 ? false : Boolean(g.yayinda),
    gelirKalemleri
  };
}
function dersGirdisiDogrula(g) {
  for (const adim of ["merak", "baglam", "perspektif", "yansima"]) {
    const deger = g[adim];
    if (!deger || typeof deger !== "object") {
      throw new DogrulamaHatasi(`"${adim}" ad\u0131m\u0131 zorunludur.`);
    }
  }
  const hamEgzersizler = Array.isArray(g.egzersizler) ? g.egzersizler : [];
  if (hamEgzersizler.length === 0) {
    throw new DogrulamaHatasi("En az bir egzersiz gereklidir (04 \xB7 Geri \xE7a\u011F\u0131rma ad\u0131m\u0131).");
  }
  const egzersizler = hamEgzersizler.map((e, i) => {
    const eg = e;
    const tip = eg.tip;
    if (!GECERLI_TIPLER.includes(tip)) {
      throw new DogrulamaHatasi(
        `Egzersiz #${i + 1}: tip \u015Funlardan biri olmal\u0131: ${GECERLI_TIPLER.join(", ")}`
      );
    }
    if (!eg.veri || typeof eg.veri !== "object") {
      throw new DogrulamaHatasi(`Egzersiz #${i + 1}: "veri" zorunludur.`);
    }
    return {
      id: zorunlu(eg.id, `egzersizler[${i}].id`),
      tip,
      veri: eg.veri,
      kaynak: eg.kaynak ?? null
    };
  });
  return {
    id: zorunlu(g.id, "id"),
    uniteId: zorunlu(g.uniteId, "uniteId"),
    eserId: zorunlu(g.eserId, "eserId"),
    sira: sayi(g.sira, "sira"),
    merak: g.merak,
    baglam: g.baglam,
    perspektif: g.perspektif,
    yansima: g.yansima,
    egzersizler
  };
}
var GECERLI_TIPLER, GECERLI_GELIR_DURUMLARI, GECERLI_GELIR_TIPLERI, DogrulamaHatasi;
var init_admin = __esm({
  "server/routes/admin.ts"() {
    init_eser();
    init_yol();
    init_ders();
    init_koruma();
    GECERLI_TIPLER = ["eslestir", "sirala", "bosluk-doldur", "eser-tani"];
    GECERLI_GELIR_DURUMLARI = ["belgeli", "belge-bulunamadi"];
    GECERLI_GELIR_TIPLERI = ["gelir", "gider"];
    DogrulamaHatasi = class extends Error {
    };
  }
});

// server/routes/auth.ts
function zorunlu2(deger, alan) {
  if (typeof deger !== "string" || deger.trim() === "") {
    throw new DogrulamaHatasi2(`"${alan}" alan\u0131 zorunludur.`);
  }
  return deger.trim();
}
function emailDogrula(email) {
  const temiz = email.trim();
  if (temiz.length > 254) throw new DogrulamaHatasi2("E-posta \xE7ok uzun.");
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(temiz)) {
    throw new DogrulamaHatasi2("Ge\xE7erli bir e-posta adresi gir.");
  }
  return temiz;
}
function hataYanit2(cevap, hata) {
  if (hata instanceof DogrulamaHatasi2) {
    return cevap.code(400).send({ hata: hata.message });
  }
  const mesaj = hata instanceof Error ? hata.message : String(hata);
  if (mesaj.includes("duplicate key") || mesaj.includes("idx_app_user_email")) {
    return cevap.code(409).send({ hata: "Bu e-posta ile bir hesap zaten var." });
  }
  return cevap.code(500).send({ hata: "Sunucu hatas\u0131" });
}
async function authUclari(app) {
  app.post(
    "/api/auth/giris",
    {
      config: {
        // Hız sınırı: aynı IP'den dakikada en fazla 10 giriş denemesi.
        rateLimit: { max: 10, timeWindow: "1 minute" }
      }
    },
    async (istek, cevap) => {
      try {
        const govde = istek.body;
        const email = emailDogrula(zorunlu2(govde.email, "email"));
        const parola = zorunlu2(govde.parola, "parola");
        const basarisiz = await basarisizDenemeSayisi(email, PENCERE_DAKIKA);
        if (basarisiz >= BASARISIZ_ESIK) {
          return cevap.code(429).send({
            hata: `\xC7ok fazla ba\u015Far\u0131s\u0131z deneme. ${PENCERE_DAKIKA} dakika sonra tekrar dene.`,
            kod: "COK_FAZLA_DENEME"
          });
        }
        const sonuc = await girisYap(email, parola, istek.headers["user-agent"]);
        if (!sonuc) {
          return cevap.code(401).send({
            hata: "E-posta veya parola hatal\u0131.",
            kod: "KIMLIK_HATASI",
            kalanDeneme: Math.max(0, BASARISIZ_ESIK - basarisiz - 1)
          });
        }
        cevap.setCookie(OTURUM_CEREZ_ADI, sonuc.token, {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          maxAge: Math.floor(OTURUM_SURESI_MS / 1e3)
        });
        return { kullanici: sonuc.kullanici, belirtec: sonuc.token };
      } catch (hata) {
        return hataYanit2(cevap, hata);
      }
    }
  );
  app.post("/api/auth/cikis", async (istek, cevap) => {
    const belirtec = belirtecAl(istek);
    if (belirtec) await oturumBitir(belirtec);
    cevap.clearCookie(OTURUM_CEREZ_ADI, { path: "/" });
    return { tamam: true };
  });
  app.get("/api/auth/ben", { preHandler: oturumGerekli }, async (istek) => ({
    kullanici: istek.kullanici
  }));
  app.post("/api/auth/parola", { preHandler: oturumGerekli }, async (istek, cevap) => {
    try {
      const govde = istek.body;
      const yeni = zorunlu2(govde.yeniParola, "yeniParola");
      const sorunlar = parolaZayifMi(yeni);
      if (sorunlar.length) {
        return cevap.code(400).send({ hata: "Parola zay\u0131f.", detay: sorunlar });
      }
      await kullaniciParolaDegistir(istek.kullanici.id, yeni);
      cevap.clearCookie(OTURUM_CEREZ_ADI, { path: "/" });
      return { tamam: true, mesaj: "Parola de\u011Fi\u015Fti. Yeniden giri\u015F yapmal\u0131s\u0131n." };
    } catch (hata) {
      return hataYanit2(cevap, hata);
    }
  });
  app.get(
    "/api/yonetim/kullanicilar",
    { preHandler: yoneticiGerekli },
    async () => kullanicilariListele()
  );
  app.post("/api/yonetim/kullanicilar", { preHandler: yoneticiGerekli }, async (istek, cevap) => {
    try {
      const govde = istek.body;
      const email = emailDogrula(zorunlu2(govde.email, "email"));
      const ad = zorunlu2(govde.ad, "ad");
      const parola = zorunlu2(govde.parola, "parola");
      const rol = govde.rol ?? "ogretmen";
      if (!GECERLI_ROLLER.includes(rol)) {
        throw new DogrulamaHatasi2(`"rol" \u015Funlardan biri olmal\u0131: ${GECERLI_ROLLER.join(", ")}`);
      }
      const sorunlar = parolaZayifMi(parola);
      if (sorunlar.length) {
        return cevap.code(400).send({ hata: "Parola zay\u0131f.", detay: sorunlar });
      }
      if (await kullaniciVarMi(email)) {
        return cevap.code(409).send({ hata: "Bu e-posta ile bir hesap zaten var." });
      }
      const kullanici = await kullaniciOlustur({ email, ad, parola, rol });
      return cevap.code(201).send(kullanici);
    } catch (hata) {
      return hataYanit2(cevap, hata);
    }
  });
  app.patch("/api/yonetim/kullanicilar/:id", { preHandler: yoneticiGerekli }, async (istek, cevap) => {
    try {
      const { id } = istek.params;
      const govde = istek.body;
      if (id === istek.kullanici.id && govde.aktif === false) {
        return cevap.code(400).send({ hata: "Kendi hesab\u0131n\u0131 kapatamazs\u0131n." });
      }
      if (typeof govde.aktif !== "boolean") {
        throw new DogrulamaHatasi2('"aktif" alan\u0131 true/false olmal\u0131d\u0131r.');
      }
      if (!await kullaniciGetir(id)) {
        return cevap.code(404).send({ hata: "Kullan\u0131c\u0131 bulunamad\u0131." });
      }
      await kullaniciDurumDegistir(id, govde.aktif);
      if (!govde.aktif) {
        const { kullaniciOturumlariniBitir: kullaniciOturumlariniBitir2 } = await Promise.resolve().then(() => (init_oturum(), oturum_exports));
        await kullaniciOturumlariniBitir2(id);
      }
      return { tamam: true };
    } catch (hata) {
      return hataYanit2(cevap, hata);
    }
  });
}
var BASARISIZ_ESIK, PENCERE_DAKIKA, GECERLI_ROLLER, DogrulamaHatasi2;
var init_auth = __esm({
  "server/routes/auth.ts"() {
    init_oturum();
    init_koruma();
    init_parola();
    BASARISIZ_ESIK = 10;
    PENCERE_DAKIKA = 15;
    GECERLI_ROLLER = ["admin", "ogretmen"];
    DogrulamaHatasi2 = class extends Error {
    };
  }
});

// server/repo/sinif.ts
import { randomInt } from "node:crypto";
function kodUret() {
  const parca = (uzunluk) => Array.from({ length: uzunluk }, () => ALFABE[randomInt(0, ALFABE.length)]).join("");
  return `${parca(3)}-${parca(4)}`;
}
function koduNormalle(kod) {
  const temiz = kod.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (temiz.length !== 7) return null;
  return `${temiz.slice(0, 3)}-${temiz.slice(3)}`;
}
async function sinifOlustur(ogretmenId, ad) {
  const db2 = await veritabaniAl();
  for (let deneme = 0; deneme < 5; deneme++) {
    const kod = kodUret();
    const varMi = await tekSorgu(`SELECT 1 FROM class_code WHERE kod = $1`, [kod]);
    if (varMi) continue;
    await db2.query(`INSERT INTO class_code (kod, ogretmen_id, ad) VALUES ($1, $2, $3)`, [
      kod,
      ogretmenId,
      ad.trim().slice(0, 120)
    ]);
    const olusan = await sinifGetir(kod);
    if (olusan) return olusan;
  }
  throw new Error("S\u0131n\u0131f kodu \xFCretilemedi, tekrar dene.");
}
async function sinifGetir(kod) {
  const normal = koduNormalle(kod);
  if (!normal) return null;
  const s = await tekSorgu(`SELECT * FROM class_code WHERE kod = $1`, [normal]);
  if (!s) return null;
  return {
    kod: s.kod,
    ogretmenId: s.ogretmen_id,
    ad: s.ad,
    aktif: s.aktif,
    createdAt: s.created_at
  };
}
async function ogretmenSiniflari(ogretmenId) {
  const satirlar = await sorgu(`SELECT * FROM class_code WHERE ogretmen_id = $1 ORDER BY created_at DESC`, [ogretmenId]);
  return satirlar.map((s) => ({
    kod: s.kod,
    ogretmenId: s.ogretmen_id,
    ad: s.ad,
    aktif: s.aktif,
    createdAt: s.created_at
  }));
}
async function sinifDurumDegistir(kod, aktif) {
  const normal = koduNormalle(kod);
  if (!normal) return false;
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(`UPDATE class_code SET aktif = $2 WHERE kod = $1`, [normal, aktif]);
  return (sonuc.affectedRows ?? 0) > 0;
}
async function tamamlamaKaydet(kod, dersId) {
  const sinif = await sinifGetir(kod);
  if (!sinif || !sinif.aktif) return false;
  const ders = await tekSorgu(`SELECT 1 FROM lesson WHERE id = $1`, [dersId.slice(0, 120)]);
  if (!ders) return false;
  const db2 = await veritabaniAl();
  await db2.query(
    `INSERT INTO class_progress (kod, ders_id, sayi)
     VALUES ($1, $2, 1)
     ON CONFLICT (kod, ders_id)
     DO UPDATE SET sayi = class_progress.sayi + 1, updated_at = NOW()`,
    [sinif.kod, dersId.slice(0, 120)]
  );
  return true;
}
async function sinifIlerlemesi(kod) {
  const sinif = await sinifGetir(kod);
  if (!sinif) return null;
  const satirlar = await sorgu(
    `SELECT ders_id, sayi FROM class_progress WHERE kod = $1`,
    [sinif.kod]
  );
  const dersSayilari = {};
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
    tamamlananDersCesidi: satirlar.length
  };
}
async function sinifDetayliIlerleme(kod) {
  const ilerleme = await sinifIlerlemesi(kod);
  if (!ilerleme) return null;
  const satirlar = await sorgu(
    `SELECT u.id AS unite_id, u.ad AS unite_ad, c.ad AS sehir_ad,
            l.id AS ders_id, w.ad AS eser_adi, l.sira
       FROM lesson l
       JOIN unit u ON u.id = l.unit_id
       JOIN city c ON c.id = u.sehir_id
       JOIN work w ON w.id = l.work_id
      WHERE w.yayinda = TRUE AND c.aktif = TRUE
      ORDER BY c.sira, u.sira, l.sira`
  );
  const gruplu = /* @__PURE__ */ new Map();
  const uniteler = [];
  for (const s of satirlar) {
    if (!gruplu.has(s.unite_id)) {
      const yeni = {
        uniteId: s.unite_id,
        uniteAdi: s.unite_ad,
        sehirAdi: s.sehir_ad,
        dersler: [],
        tamamlananDersCesidi: 0,
        toplamDers: 0
      };
      gruplu.set(s.unite_id, yeni);
      uniteler.push(yeni);
    }
    const unite = gruplu.get(s.unite_id);
    const sayi2 = ilerleme.dersSayilari[s.ders_id] ?? 0;
    unite.dersler.push({
      dersId: s.ders_id,
      eserAdi: s.eser_adi,
      sira: Number(s.sira),
      sayi: sayi2
    });
    unite.toplamDers += 1;
    if (sayi2 > 0) unite.tamamlananDersCesidi += 1;
  }
  return { ilerleme, uniteler };
}
var ALFABE;
var init_sinif = __esm({
  "server/repo/sinif.ts"() {
    init_db();
    ALFABE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  }
});

// server/routes/sinif.ts
function zorunlu3(deger, alan) {
  if (typeof deger !== "string" || deger.trim() === "") {
    throw new DogrulamaHatasi3(`"${alan}" alan\u0131 zorunludur.`);
  }
  return deger.trim();
}
async function sinifUclari(app) {
  app.get("/api/sinif/:kod", async (istek, cevap) => {
    const { kod } = istek.params;
    const sinif = await sinifGetir(kod);
    if (!sinif || !sinif.aktif) {
      return cevap.code(404).send({ hata: "B\xF6yle bir s\u0131n\u0131f kodu yok.", kod: "SINIF_YOK" });
    }
    const ilerleme = await sinifIlerlemesi(sinif.kod);
    return {
      kod: sinif.kod,
      ad: sinif.ad,
      // Yalnızca toplu sayaçlar — hiçbir öğrenciye ait veri yok.
      toplamTamamlama: ilerleme?.toplamTamamlama ?? 0,
      tamamlananDersCesidi: ilerleme?.tamamlananDersCesidi ?? 0
    };
  });
  app.post(
    "/api/sinif/tamamla",
    {
      config: {
        // Sayaç şişirme denemesini sınırla.
        rateLimit: { max: 60, timeWindow: "1 minute" }
      }
    },
    async (istek, cevap) => {
      try {
        const govde = istek.body;
        const kod = zorunlu3(govde.kod, "kod");
        const dersId = zorunlu3(govde.dersId, "dersId");
        const tamam = await tamamlamaKaydet(kod, dersId);
        if (!tamam) {
          return cevap.code(404).send({ hata: "S\u0131n\u0131f kodu veya ders bulunamad\u0131." });
        }
        return { tamam: true };
      } catch (hata) {
        if (hata instanceof DogrulamaHatasi3) {
          return cevap.code(400).send({ hata: hata.message });
        }
        return cevap.code(500).send({ hata: "Sunucu hatas\u0131" });
      }
    }
  );
  app.get("/api/ogretmen/siniflar", { preHandler: oturumGerekli }, async (istek) => {
    const siniflar = await ogretmenSiniflari(istek.kullanici.id);
    return Promise.all(
      siniflar.map(async (s) => ({
        ...s,
        ozet: await sinifIlerlemesi(s.kod)
      }))
    );
  });
  app.post("/api/ogretmen/siniflar", { preHandler: oturumGerekli }, async (istek, cevap) => {
    try {
      const govde = istek.body;
      const ad = zorunlu3(govde.ad, "ad");
      if (ad.length > 120) throw new DogrulamaHatasi3('"ad" en fazla 120 karakter olabilir.');
      const sinif = await sinifOlustur(istek.kullanici.id, ad);
      return cevap.code(201).send(sinif);
    } catch (hata) {
      if (hata instanceof DogrulamaHatasi3) {
        return cevap.code(400).send({ hata: hata.message });
      }
      return cevap.code(500).send({ hata: "S\u0131n\u0131f olu\u015Fturulamad\u0131" });
    }
  });
  app.get("/api/ogretmen/siniflar/:kod", { preHandler: oturumGerekli }, async (istek, cevap) => {
    const { kod } = istek.params;
    const normal = koduNormalle(kod);
    if (!normal) return cevap.code(400).send({ hata: "Ge\xE7ersiz s\u0131n\u0131f kodu bi\xE7imi." });
    const sinif = await sinifGetir(normal);
    if (!sinif) return cevap.code(404).send({ hata: "S\u0131n\u0131f bulunamad\u0131." });
    const sahibi = sinif.ogretmenId === istek.kullanici.id;
    if (!sahibi && istek.kullanici.rol !== "admin") {
      return cevap.code(403).send({ hata: "Bu s\u0131n\u0131f sana ait de\u011Fil.", kod: "YETKI_YOK" });
    }
    const detay = await sinifDetayliIlerleme(normal);
    return detay ?? cevap.code(404).send({ hata: "S\u0131n\u0131f bulunamad\u0131." });
  });
  app.patch("/api/ogretmen/siniflar/:kod", { preHandler: oturumGerekli }, async (istek, cevap) => {
    const { kod } = istek.params;
    const govde = istek.body;
    const sinif = await sinifGetir(kod);
    if (!sinif) return cevap.code(404).send({ hata: "S\u0131n\u0131f bulunamad\u0131." });
    const sahibi = sinif.ogretmenId === istek.kullanici.id;
    if (!sahibi && istek.kullanici.rol !== "admin") {
      return cevap.code(403).send({ hata: "Bu s\u0131n\u0131f sana ait de\u011Fil.", kod: "YETKI_YOK" });
    }
    if (typeof govde.aktif !== "boolean") {
      return cevap.code(400).send({ hata: '"aktif" alan\u0131 true/false olmal\u0131d\u0131r.' });
    }
    await sinifDurumDegistir(sinif.kod, govde.aktif);
    return { tamam: true };
  });
}
var DogrulamaHatasi3;
var init_sinif2 = __esm({
  "server/routes/sinif.ts"() {
    init_sinif();
    init_koruma();
    DogrulamaHatasi3 = class extends Error {
    };
  }
});

// server/index.ts
var server_exports = {};
__export(server_exports, {
  sunucuKur: () => sunucuKur
});
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { dirname as dirname2, join as join2 } from "node:path";
async function sunucuKur() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    // Güvenlik: gövde boyutu sınırı — bellek tüketimi saldırısını engeller.
    bodyLimit: 1048576
    // 1 MB
  });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // MapLibre inline worker/blob kullanır; stil de inline üretilir.
        scriptSrc: ["'self'", "'wasm-unsafe-eval'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "blob:", "data:"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
    // MapLibre tile çekebilsin
  });
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    // Testler ve yerel demo sınırlanmasın; üretimde kapatılmaz.
    allowList: process.env.KOKAVI_RATE_LIMIT_OFF === "1" ? ["127.0.0.1", "::1"] : [],
    errorResponseBuilder: () => ({
      hata: "\xC7ok fazla istek g\xF6nderildi. L\xFCtfen biraz bekle.",
      kod: "HIZ_SINIRI"
    })
  });
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_istek, govde, done) => {
      const metin = typeof govde === "string" ? govde.trim() : "";
      if (metin === "") return done(null, void 0);
      try {
        done(null, JSON.parse(metin));
      } catch {
        const hata = new Error("G\xF6vde ge\xE7erli JSON de\u011Fil.");
        hata.statusCode = 400;
        done(hata, void 0);
      }
    }
  );
  app.addContentTypeParser("*", { parseAs: "string" }, (_istek, govde, done) => {
    if (govde === "" || govde === void 0) return done(null, void 0);
    const hata = new Error("Desteklenmeyen i\xE7erik t\xFCr\xFC.");
    hata.statusCode = 415;
    done(hata, void 0);
  });
  await app.register(cookie);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await semaGarantiEt();
  await suresiGecmisOturumlariTemizle();
  await eskiDenemeleriTemizle();
  await app.register(authUclari);
  await app.register(sinifUclari);
  await app.register(genelUclar);
  await app.register(yonetimUclari);
  const distYolu = join2(__dirname2, "..", "dist");
  if (existsSync(distYolu)) {
    await app.register(fastifyStatic, { root: distYolu });
    app.setNotFoundHandler((istek, cevap) => {
      if (istek.url.startsWith("/api")) {
        return cevap.code(404).send({ hata: "U\xE7 bulunamad\u0131" });
      }
      return cevap.sendFile("index.html");
    });
  }
  return app;
}
async function basla() {
  const app = await sunucuKur();
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`K\xF6k Av\u0131 API haz\u0131r: http://${HOST}:${PORT}`);
  } catch (hata) {
    app.log.error(hata);
    process.exit(1);
  }
  for (const sinyal of ["SIGINT", "SIGTERM"]) {
    process.on(sinyal, async () => {
      await app.close();
      await baglantiKapat();
      process.exit(0);
    });
  }
}
var __dirname2, PORT, HOST, dogrudanCalisti;
var init_server = __esm({
  "server/index.ts"() {
    init_db();
    init_public();
    init_admin();
    init_auth();
    init_sinif2();
    init_oturum();
    __dirname2 = dirname2(fileURLToPath2(import.meta.url));
    PORT = Number(process.env.PORT ?? 8787);
    HOST = process.env.HOST ?? "127.0.0.1";
    dogrudanCalisti = process.argv[1] && fileURLToPath2(import.meta.url).replace(/\\/g, "/").endsWith(
      process.argv[1].replace(/\\/g, "/").split("/").slice(-2).join("/")
    );
    if (dogrudanCalisti) {
      void basla();
    }
  }
});

// deploy/vercel-giris.ts
import { existsSync as existsSync2, readFileSync } from "node:fs";
import { join as join3 } from "node:path";
import { PGlite as PGlite2 } from "@electric-sql/pglite";
var HEDEF = "/tmp/kokavi-pgdata";
var hazir = (async () => {
  if (!existsSync2(HEDEF)) {
    const dokum = new Blob([readFileSync(join3(process.cwd(), "deploy", "pgdata.tgz"))]);
    const acici = new PGlite2(HEDEF, { loadDataDir: dokum });
    await acici.waitReady;
    await acici.close();
  }
  process.env.KOKAVI_PGDATA = HEDEF;
  const { sunucuKur: sunucuKur2 } = await Promise.resolve().then(() => (init_server(), server_exports));
  const app = await sunucuKur2();
  await app.ready();
  return app;
})();
async function handler(istek, cevap) {
  const app = await hazir;
  app.server.emit("request", istek, cevap);
}
export {
  handler as default
};
