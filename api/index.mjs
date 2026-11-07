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
  await db2.transaction(async (tx) => {
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
        girdi.yayinda ?? false
      ]
    );
    await tx.query(`DELETE FROM income_item WHERE work_id = $1`, [girdi.id]);
    for (const [i, k] of kalemler.entries()) {
      await tx.query(
        `INSERT INTO income_item (work_id, kalem, yuzde, tip, kaynak, sira)
       VALUES ($1,$2,$3,$4,$5,$6)`,
        [girdi.id, k.kalem, k.yuzde, k.tip ?? null, k.kaynak ?? null, i]
      );
    }
  });
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
async function sehirGetir(id) {
  const s = await tekSorgu(`SELECT * FROM city WHERE id = $1`, [id]);
  return s ? sehirDonustur(s) : null;
}
async function uniteGetir(id) {
  const s = await tekSorgu(`SELECT * FROM unit WHERE id = $1`, [id]);
  return s ? uniteDonustur(s) : null;
}
async function kulliyeGetir(id) {
  const s = await tekSorgu(`SELECT * FROM kulliye WHERE id = $1`, [id]);
  if (!s) return null;
  return { id: s.id, ad: s.ad, sehirId: s.sehir_id, bani: s.bani, aciklama: s.aciklama };
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
  await db2.transaction(async (tx) => {
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
        JSON.stringify(girdi.yansima)
      ]
    );
    await tx.query(`DELETE FROM exercise WHERE lesson_id = $1`, [girdi.id]);
    for (const [i, e] of girdi.egzersizler.entries()) {
      await tx.query(
        `INSERT INTO exercise (id, lesson_id, tip, sira, veri, kaynak)
       VALUES ($1,$2,$3,$4,$5,$6)`,
        [e.id, girdi.id, e.tip, i, JSON.stringify(e.veri), e.kaynak ?? null]
      );
    }
  });
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

// server/canli/depo.ts
function depoDurumu() {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) return { tur: "redis", kaynak: "upstash" };
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) return { tur: "redis", kaynak: "vercel-kv" };
  return { tur: "bellek", kaynak: null };
}
function varsayilanDepo(simdi = Date.now) {
  const durum = depoDurumu();
  if (durum.tur === "redis") {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    return new RedisDeposu(url, token);
  }
  return new BellekDeposu(simdi);
}
var BellekDeposu, ONEK, CAS_BETIGI, RedisDeposu;
var init_depo = __esm({
  "server/canli/depo.ts"() {
    BellekDeposu = class {
      constructor(simdi = Date.now) {
        this.simdi = simdi;
      }
      simdi;
      kayitlar = /* @__PURE__ */ new Map();
      gecerli(pin) {
        const k = this.kayitlar.get(pin);
        if (k && k.sonaErme <= this.simdi()) {
          this.kayitlar.delete(pin);
          return void 0;
        }
        return k;
      }
      async al(pin) {
        const k = this.gecerli(pin);
        return k ? { json: k.json, surum: k.surum } : null;
      }
      async yaz(pin, json, beklenenSurum, ttlMs) {
        const k = this.gecerli(pin);
        if ((k?.surum ?? 0) !== beklenenSurum) return false;
        this.kayitlar.set(pin, { json, surum: beklenenSurum + 1, sonaErme: this.simdi() + ttlMs });
        return true;
      }
      async sil(pin) {
        this.kayitlar.delete(pin);
      }
      async sayi() {
        for (const pin of [...this.kayitlar.keys()]) this.gecerli(pin);
        return this.kayitlar.size;
      }
    };
    ONEK = "kokavi:oda:";
    CAS_BETIGI = `
local eski = redis.call('GET', KEYS[1])
local surum = 0
if eski then surum = cjson.decode(eski).s end
if surum ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], cjson.encode({s = surum + 1, d = ARGV[2]}), 'PX', ARGV[3])
return 1
`;
    RedisDeposu = class {
      constructor(url, token) {
        this.url = url;
        this.token = token;
      }
      url;
      token;
      async komut(...args) {
        const yanit = await fetch(this.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(args.map(String))
        });
        const govde = await yanit.json();
        if (!yanit.ok || govde.error) throw new Error(`Redis hatas\u0131: ${govde.error ?? yanit.status}`);
        return govde.result;
      }
      async al(pin) {
        const ham = await this.komut("GET", ONEK + pin);
        if (typeof ham !== "string") return null;
        const { s, d } = JSON.parse(ham);
        return { json: d, surum: s };
      }
      async yaz(pin, json, beklenenSurum, ttlMs) {
        const sonuc = await this.komut("EVAL", CAS_BETIGI, 1, ONEK + pin, beklenenSurum, json, Math.max(1, Math.round(ttlMs)));
        return Number(sonuc) === 1;
      }
      async sil(pin) {
        await this.komut("DEL", ONEK + pin);
      }
      async sayi() {
        const anahtarlar = await this.komut("KEYS", `${ONEK}*`);
        return Array.isArray(anahtarlar) ? anahtarlar.length : 0;
      }
    };
  }
});

// server/redis.ts
function redisAyari() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}
async function redisKomut(...komut) {
  const ayar = redisAyari();
  if (!ayar) return null;
  const yanit = await fetch(ayar.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ayar.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(komut.map(String)),
    signal: AbortSignal.timeout(IStek_ZAMAN_ASIMI_MS)
  });
  const govde = await yanit.json();
  if (!yanit.ok || govde.error) {
    throw new Error(`Redis hatas\u0131: ${govde.error ?? yanit.status}`);
  }
  return govde.result ?? null;
}
var IStek_ZAMAN_ASIMI_MS;
var init_redis = __esm({
  "server/redis.ts"() {
    IStek_ZAMAN_ASIMI_MS = 4e3;
  }
});

// shared/kulliyeler.ts
var KULLIYE_GRUPLARI;
var init_kulliyeler = __esm({
  "shared/kulliyeler.ts"() {
    KULLIYE_GRUPLARI = [
      {
        id: "yesil-kulliyesi",
        ad: "Ye\u015Filcami (Ye\u015Fil) K\xFClliyesi",
        sehirId: "bursa",
        eserIdler: [
          "bursa-yesilcami-yesil-cami",
          "bursa-yesil-medrese-sultaniye-medresesi-bugun-bursa-tu",
          "bursa-yesil-turbe-celebi-sultan-mehmed-turbesi",
          // Harir/İpek Hanı, Yeşil Külliye'nin vakıf gelirleri arasında sayılır.
          "bursa-ipek-hani-sultan-hani-han-i-harir"
        ],
        kaynak: "Vak\u0131f Kat\u0131l\u0131m, 'Bursa Vak\u0131f Eserleri', I. Cilt (Nisan 2026) \u2014 Ye\u015Filcami, Ye\u015Fil Medrese, Ye\u015Fil T\xFCrbe; II. Cilt (Nisan 2026) \u2014 \u0130pek (Harir) Han\u0131. K\xFClliye ba\u011F\u0131 bu kay\u0131tlar\u0131n 'k\xFClliye' alan\u0131nda ve TDV \u0130A 'Ye\u015Filcami K\xFClliyesi' (C. 43) maddesinde belgelenmi\u015Ftir."
      },
      {
        id: "muradiye-kulliyesi",
        ad: "Muradiye (II. Murad) K\xFClliyesi",
        sehirId: "bursa",
        eserIdler: [
          "bursa-ii-murad-kulliyesi",
          "bursa-muradiye-hamami-ii-murad-hamami-bekciyan-hamami",
          "bursa-muradiye-medresesi-cesmesi"
        ],
        kaynak: "Vak\u0131f Kat\u0131l\u0131m, 'Bursa Vak\u0131f Eserleri', II. Cilt (Nisan 2026) \u2014 II. Murad (Muradiye) K\xFClliyesi ve Muradiye Hamam\u0131; III. Cilt (Nisan 2026) \u2014 Muradiye Medresesi \xC7e\u015Fmesi. K\xFClliye ba\u011F\u0131 kay\u0131tlar\u0131n 'k\xFClliye' alan\u0131nda ve TDV \u0130A 'Muradiye K\xFClliyesi' maddesinde belgelenmi\u015Ftir."
      }
    ];
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
async function sinifEkle(kod, ogretmenId, ad) {
  const db2 = await veritabaniAl();
  await db2.query(
    `INSERT INTO class_code (kod, ogretmen_id, ad) VALUES ($1, $2, $3)
     ON CONFLICT (kod) DO NOTHING`,
    [kod, ogretmenId, ad.trim().slice(0, 120)]
  );
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
async function sinifDurumDegistir(kod, aktif2) {
  const normal = koduNormalle(kod);
  if (!normal) return false;
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(`UPDATE class_code SET aktif = $2 WHERE kod = $1`, [normal, aktif2]);
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
function kulliyeleriHesapla(dersler, dersSayilari) {
  const hesaplanan = [];
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
      ilkSira
    });
  }
  hesaplanan.sort((a, b) => a.ilkSira - b.ilkSira);
  const hedef = hesaplanan.find((grup) => grup.tamamlananDersCesidi < grup.toplamDers);
  return hesaplanan.map(({ ilkSira: _ilkSira, ...grup }) => ({
    ...grup,
    hedefMi: hedef?.id === grup.id,
    tamamlandiMi: grup.tamamlananDersCesidi >= grup.toplamDers
  }));
}
async function yayindakiDersleriGetir() {
  return sorgu(
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
      ORDER BY c.sira, u.sira, l.sira`
  );
}
async function sinifDetayliIlerleme(kod) {
  const ilerleme = await sinifIlerlemesi(kod);
  if (!ilerleme) return null;
  const satirlar = await yayindakiDersleriGetir();
  const gruplu = /* @__PURE__ */ new Map();
  const uniteler = [];
  const yayindakiDersler = [];
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
      eserId: s.eser_id,
      eserAdi: s.eser_adi,
      sira: Number(s.sira),
      sayi: sayi2
    });
    unite.toplamDers += 1;
    if (sayi2 > 0) unite.tamamlananDersCesidi += 1;
    yayindakiDersler.push({ dersId: s.ders_id, eserId: s.eser_id });
  }
  return {
    ilerleme,
    uniteler,
    kulliyeler: kulliyeleriHesapla(yayindakiDersler, ilerleme.dersSayilari)
  };
}
async function sinifGelirleriGetir(eserIdler) {
  const gruplu = /* @__PURE__ */ new Map();
  if (eserIdler.length === 0) return gruplu;
  const yerTutucu = eserIdler.map((_, i) => `$${i + 1}`).join(", ");
  const satirlar = await sorgu(
    `SELECT id, work_id, kalem, yuzde, tip, kaynak, sira
       FROM income_item
      WHERE work_id IN (${yerTutucu})
      ORDER BY work_id, sira`,
    [...eserIdler]
  );
  for (const s of satirlar) {
    const kalem = {
      id: s.id,
      eserId: s.work_id,
      kalem: s.kalem,
      // NUMERIC -> number | null; belge yoksa oran uydurulmaz.
      yuzde: s.yuzde === null || s.yuzde === void 0 ? null : Number(s.yuzde),
      tip: s.tip ?? null,
      kaynak: s.kaynak,
      sira: s.sira
    };
    const liste = gruplu.get(s.work_id) ?? [];
    liste.push(kalem);
    gruplu.set(s.work_id, liste);
  }
  return gruplu;
}
async function sinifRontgeni(kod) {
  const sinif = await sinifGetir(kod);
  if (!sinif) return null;
  const ilerleme = await sinifIlerlemesi(sinif.kod);
  if (!ilerleme) return null;
  const satirlar = await yayindakiDersleriGetir();
  const tamamlanan = satirlar.filter((s) => (ilerleme.dersSayilari[s.ders_id] ?? 0) > 0);
  const eserIdler = [...new Set(tamamlanan.map((s) => s.eser_id))];
  const gelirler = await sinifGelirleriGetir(eserIdler);
  const eserler = tamamlanan.map((s) => ({
    dersId: s.ders_id,
    eserId: s.eser_id,
    eserAdi: s.eser_adi,
    tur: s.tur,
    sehirAdi: s.sehir_ad,
    uniteAdi: s.unite_ad,
    gelirDagilimiDurumu: s.gelir_dagilimi_durumu,
    gelirKalemleri: gelirler.get(s.eser_id) ?? [],
    kaynakKunye: s.kaynak_kunye
  }));
  return {
    kod: sinif.kod,
    ad: sinif.ad,
    toplamTamamlama: ilerleme.toplamTamamlama,
    tamamlananDersCesidi: ilerleme.tamamlananDersCesidi,
    kulliyeler: kulliyeleriHesapla(
      satirlar.map((s) => ({ dersId: s.ders_id, eserId: s.eser_id })),
      ilerleme.dersSayilari
    ),
    eserler
  };
}
var ALFABE;
var init_sinif = __esm({
  "server/repo/sinif.ts"() {
    init_db();
    init_kulliyeler();
    ALFABE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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
  kullaniciEkleHashli: () => kullaniciEkleHashli,
  kullaniciGetir: () => kullaniciGetir,
  kullaniciOlustur: () => kullaniciOlustur,
  kullaniciOturumlariniBitir: () => kullaniciOturumlariniBitir,
  kullaniciParolaDegistir: () => kullaniciParolaDegistir,
  kullaniciParolaHashGuncelle: () => kullaniciParolaHashGuncelle,
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
async function redisOturumYaz(tokenHash, kullaniciId, gecerlilikSonu) {
  try {
    const kalanMs = Math.max(1e3, gecerlilikSonu.getTime() - Date.now());
    await redisKomut(
      "SET",
      OTURUM_ONEK + tokenHash,
      JSON.stringify({ kullaniciId, bitis: gecerlilikSonu.toISOString() }),
      "PX",
      kalanMs
    );
    await redisKomut("SADD", KULLANICI_OTURUM_ONEK + kullaniciId, tokenHash);
    await redisKomut("PEXPIRE", KULLANICI_OTURUM_ONEK + kullaniciId, OTURUM_SURESI_MS);
  } catch (hata) {
    console.warn("[oturum] Redis oturumu yaz\u0131lamad\u0131:", hata);
  }
}
async function redisOturumSil(tokenHash) {
  if (!redisAyari()) return;
  try {
    await redisKomut("DEL", OTURUM_ONEK + tokenHash);
  } catch {
  }
}
async function redisKullaniciOturumlariniSil(userId) {
  if (!redisAyari()) return;
  try {
    const anahtarlar = await redisKomut("SMEMBERS", KULLANICI_OTURUM_ONEK + userId);
    if (Array.isArray(anahtarlar)) {
      for (const anahtar of anahtarlar) await redisKomut("DEL", OTURUM_ONEK + anahtar);
    }
    await redisKomut("DEL", KULLANICI_OTURUM_ONEK + userId);
  } catch {
  }
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
async function kullaniciEkleHashli(girdi) {
  const db2 = await veritabaniAl();
  await db2.query(
    `INSERT INTO app_user (id, email, ad, parola_hash, rol, aktif)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [girdi.id, girdi.email.trim(), girdi.ad.trim(), girdi.parolaHash, girdi.rol]
  );
  const olusan = await kullaniciGetir(girdi.id);
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
async function kullaniciDurumDegistir(id, aktif2) {
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(
    `UPDATE app_user SET aktif = $2, updated_at = NOW() WHERE id = $1`,
    [id, aktif2]
  );
  return (sonuc.affectedRows ?? 0) > 0;
}
async function kullaniciParolaDegistir(id, yeniParola) {
  return kullaniciParolaHashGuncelle(id, parolaHashle(yeniParola));
}
async function kullaniciParolaHashGuncelle(id, parolaHash) {
  const db2 = await veritabaniAl();
  const sonuc = await db2.query(
    `UPDATE app_user SET parola_hash = $2, updated_at = NOW() WHERE id = $1`,
    [id, parolaHash]
  );
  await oturumlariTemizle(id);
  return (sonuc.affectedRows ?? 0) > 0;
}
async function oturumlariTemizle(userId) {
  const db2 = await veritabaniAl();
  await db2.query(`DELETE FROM session WHERE user_id = $1`, [userId]);
  await redisKullaniciOturumlariniSil(userId);
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
  await redisOturumYaz(tokenOzeti(token), satir.id, gecerlilikSonu);
  return { token, gecerlilikSonu, kullanici: kullaniciyaCevir(satir) };
}
async function oturumDogrula(token) {
  if (!token || token.length < 20) return null;
  const ozet = tokenOzeti(token);
  if (redisAyari()) {
    let kayit = null;
    try {
      kayit = await redisKomut("GET", OTURUM_ONEK + ozet);
    } catch {
      return yerelOturumDogrula(ozet);
    }
    if (!kayit) return null;
    let bilgi;
    try {
      bilgi = JSON.parse(kayit);
    } catch {
      await redisOturumSil(ozet);
      return null;
    }
    if (new Date(bilgi.bitis).getTime() < Date.now()) {
      await oturumBitir(token);
      return null;
    }
    const kullanici = await kullaniciGetir(bilgi.kullaniciId);
    if (!kullanici || !kullanici.aktif) {
      await oturumBitir(token);
      return null;
    }
    return kullanici;
  }
  return yerelOturumDogrula(ozet);
}
async function yerelOturumDogrula(tokenHash) {
  const satir = await tekSorgu(
    `SELECT user_id, expires_at FROM session WHERE token_hash = $1`,
    [tokenHash]
  );
  if (!satir) return null;
  if (new Date(satir.expires_at).getTime() < Date.now()) {
    await yerelOturumBitir(tokenHash);
    return null;
  }
  const kullanici = await kullaniciGetir(satir.user_id);
  if (!kullanici || !kullanici.aktif) {
    await yerelOturumBitir(tokenHash);
    return null;
  }
  return kullanici;
}
async function yerelOturumBitir(tokenHash) {
  const db2 = await veritabaniAl();
  await db2.query(`DELETE FROM session WHERE token_hash = $1`, [tokenHash]);
}
async function oturumBitir(token) {
  const ozet = tokenOzeti(token);
  await yerelOturumBitir(ozet);
  await redisOturumSil(ozet);
}
async function kullaniciOturumlariniBitir(userId) {
  await oturumlariTemizle(userId);
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
var OTURUM_SURESI_MS, OTURUM_ONEK, KULLANICI_OTURUM_ONEK;
var init_oturum = __esm({
  "server/auth/oturum.ts"() {
    init_db();
    init_redis();
    init_parola();
    OTURUM_SURESI_MS = 8 * 60 * 60 * 1e3;
    OTURUM_ONEK = "kokavi:oturum:";
    KULLANICI_OTURUM_ONEK = "kokavi:oturum:kullanici:";
  }
});

// server/yonetim/gunluk.ts
import { randomUUID as randomUUID2 } from "node:crypto";
async function islemUygula(islem) {
  switch (islem.t) {
    case "eser-kaydet":
      await eserKaydet(islem.d);
      return;
    case "eser-sil":
      await eserSil(islem.d.id);
      return;
    case "unite-kaydet":
      await uniteKaydet(islem.d);
      return;
    case "unite-sil":
      await uniteSil(islem.d.id);
      return;
    case "sehir-kaydet":
      await sehirKaydet(islem.d);
      return;
    case "kulliye-kaydet":
      await kulliyeKaydet(islem.d);
      return;
    case "ders-kaydet":
      await dersKaydet(islem.d);
      return;
    case "ders-sil":
      await dersSil(islem.d.id);
      return;
    case "kullanici-ekle":
      await kullaniciEkleHashli(islem.d);
      return;
    case "kullanici-durum":
      await kullaniciDurumDegistir(islem.d.id, islem.d.aktif);
      return;
    case "kullanici-parola":
      await kullaniciParolaHashGuncelle(islem.d.id, islem.d.parolaHash);
      return;
    case "sinif-ekle":
      await sinifEkle(islem.d.kod, islem.d.ogretmenId, islem.d.ad);
      return;
    case "sinif-durum":
      await sinifDurumDegistir(islem.d.kod, islem.d.aktif);
      return;
    case "sinif-tamamla":
      await tamamlamaKaydet(islem.d.kod, islem.d.dersId);
      return;
  }
}
function gunlukAl() {
  if (!redisAyari()) return null;
  aktif ??= new Gunluk(new RedisGunlukDeposu());
  return aktif;
}
function gunlukEtkinMi() {
  return redisAyari() !== null;
}
async function gunlukYaz(islem) {
  const gunluk = gunlukAl();
  if (!gunluk) return;
  await gunluk.yaz(islem);
}
async function gunlukSenkronize() {
  const gunluk = gunlukAl();
  if (!gunluk) return;
  try {
    await gunluk.senkronize();
  } catch (hata) {
    console.warn("[yonetim-gunlugu] senkronizasyon hatas\u0131:", hata);
  }
}
var ANAHTAR, RedisGunlukDeposu, Gunluk, aktif;
var init_gunluk = __esm({
  "server/yonetim/gunluk.ts"() {
    init_redis();
    init_eser();
    init_yol();
    init_ders();
    init_sinif();
    init_oturum();
    ANAHTAR = "kokavi:yonetim:gunluk";
    RedisGunlukDeposu = class {
      async ekle(kayit) {
        await redisKomut("RPUSH", ANAHTAR, kayit);
      }
      async oku(sira) {
        const kayitlar = await redisKomut("LRANGE", ANAHTAR, sira, -1);
        return Array.isArray(kayitlar) ? kayitlar : [];
      }
    };
    Gunluk = class {
      constructor(depo) {
        this.depo = depo;
      }
      depo;
      sonSira = 0;
      uygulanan = /* @__PURE__ */ new Set();
      kendi = /* @__PURE__ */ new Set();
      /** Uygulanmış işlem sayısı (test ve sağlık kontrolü için). */
      get sira() {
        return this.sonSira;
      }
      /** Yeni işlemi günlüğe ekler. Depo yoksa/başarısızsa `false`. */
      async yaz(islem) {
        const kayit = { ...islem, id: randomUUID2() };
        this.kendi.add(kayit.id);
        try {
          await this.depo.ekle(JSON.stringify(kayit));
          return true;
        } catch (hata) {
          this.kendi.delete(kayit.id);
          console.warn("[yonetim-gunlugu] i\u015Flem yaz\u0131lamad\u0131:", hata);
          return false;
        }
      }
      /**
       * Günlükteki yeni işlemleri yerel veritabanına uygular.
       * Döndürülen sayı: bu çağrıda uygulanan işlem adedi.
       */
      async senkronize() {
        let uygulananSayi = 0;
        const kayitlar = await this.depo.oku(this.sonSira);
        for (const ham of kayitlar) {
          this.sonSira += 1;
          let islem;
          try {
            islem = JSON.parse(ham);
          } catch {
            continue;
          }
          if (this.uygulanan.has(islem.id) || this.kendi.has(islem.id)) continue;
          try {
            await islemUygula(islem);
          } catch (hata) {
            console.warn(`[yonetim-gunlugu] i\u015Flem uygulanamad\u0131 (${islem.t}):`, hata);
          }
          this.uygulanan.add(islem.id);
          uygulananSayi += 1;
        }
        return uygulananSayi;
      }
    };
    aktif = null;
  }
});

// server/routes/public.ts
async function genelUclar(app) {
  app.get("/api/saglik", async () => ({
    durum: "calisiyor",
    depo: depoDurumu().tur,
    gunluk: gunlukEtkinMi() ? "redis" : "kapali",
    oturumDeposu: redisAyari() ? "redis" : "yerel",
    zaman: (/* @__PURE__ */ new Date()).toISOString()
  }));
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
    init_depo();
    init_gunluk();
    init_redis();
  }
});

// server/auth/koruma.ts
function belirtecAl(istek) {
  const cerez = istek.cookies?.[OTURUM_CEREZ_ADI];
  if (cerez) return cerez;
  const baslik2 = istek.headers.authorization;
  if (baslik2?.startsWith("Bearer ")) return baslik2.slice(7).trim();
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
function siraSayisi(deger, alan) {
  const n = sayi(deger, alan);
  if (!Number.isInteger(n) || n < 0) {
    throw new DogrulamaHatasi(`"${alan}" s\u0131f\u0131r veya pozitif tam say\u0131 olmal\u0131d\u0131r.`);
  }
  return n;
}
function mantiksal(deger, alan, varsayilan) {
  if (deger === void 0) return varsayilan;
  if (typeof deger !== "boolean") {
    throw new DogrulamaHatasi(`"${alan}" true/false olmal\u0131d\u0131r.`);
  }
  return deger;
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
  console.error("[yonetim] i\u015Flenmeyen hata:", hata);
  return cevap.code(500).send({ hata: "Sunucu hatas\u0131", kod: "SUNUCU_HATASI" });
}
async function yonetimUclari(app) {
  app.addHook("preHandler", yoneticiGerekli);
  app.get("/api/yonetim/istatistik", async () => istatistikler());
  app.post("/api/yonetim/sehirler", async (istek, cevap) => {
    try {
      const g = istek.body ?? {};
      const id = zorunlu(g.id, "id");
      if (await sehirGetir(id)) {
        return cevap.code(409).send({ hata: "Bu kimlikle bir \u015Fehir zaten var." });
      }
      const sonuc = await sehirKaydet({
        id,
        ad: zorunlu(g.ad, "ad"),
        sira: siraSayisi(g.sira, "sira"),
        aktif: mantiksal(g.aktif, "aktif", true)
      });
      if (sonuc) await gunlukYaz({ t: "sehir-kaydet", d: sonuc });
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.post("/api/yonetim/kulliyeler", async (istek, cevap) => {
    try {
      const g = istek.body ?? {};
      const girdi = {
        id: zorunlu(g.id, "id"),
        ad: zorunlu(g.ad, "ad"),
        sehirId: zorunlu(g.sehirId, "sehirId"),
        bani: g.bani ?? null,
        aciklama: g.aciklama ?? null
      };
      if (await kulliyeGetir(girdi.id)) {
        return cevap.code(409).send({ hata: "Bu kimlikle bir k\xFClliye zaten var." });
      }
      await kulliyeKaydet(girdi);
      await gunlukYaz({ t: "kulliye-kaydet", d: girdi });
      return cevap.code(201).send({ tamam: true });
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.post("/api/yonetim/uniteler", async (istek, cevap) => {
    try {
      const g = istek.body ?? {};
      const id = zorunlu(g.id, "id");
      if (await uniteGetir(id)) {
        return cevap.code(409).send({ hata: "Bu kimlikle bir \xFCnite zaten var." });
      }
      const sonuc = await uniteKaydet({
        id,
        sehirId: zorunlu(g.sehirId, "sehirId"),
        ad: zorunlu(g.ad, "ad"),
        sira: siraSayisi(g.sira, "sira"),
        aciklama: g.aciklama ?? null
      });
      if (sonuc) await gunlukYaz({ t: "unite-kaydet", d: sonuc });
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
      await gunlukYaz({ t: "unite-sil", d: { id } });
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.post("/api/yonetim/eserler", async (istek, cevap) => {
    try {
      const girdi = eserGirdisiDogrula(istek.body ?? {});
      if (await eserGetir(girdi.id)) {
        return cevap.code(409).send({ hata: "Bu kimlikle bir eser zaten var. D\xFCzenlemek i\xE7in listeden a\xE7\u0131n." });
      }
      const sonuc = await eserKaydet(girdi);
      await gunlukYaz({ t: "eser-kaydet", d: girdi });
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.put("/api/yonetim/eserler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      if (!await eserGetir(id)) return cevap.code(404).send({ hata: "Eser bulunamad\u0131" });
      const girdi = eserGirdisiDogrula({ ...istek.body ?? {}, id });
      const sonuc = await eserKaydet(girdi);
      await gunlukYaz({ t: "eser-kaydet", d: girdi });
      return sonuc;
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.delete("/api/yonetim/eserler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      const silindi = await eserSil(id);
      if (!silindi) return cevap.code(404).send({ hata: "Eser bulunamad\u0131" });
      await gunlukYaz({ t: "eser-sil", d: { id } });
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.post("/api/yonetim/dersler", async (istek, cevap) => {
    try {
      const girdi = dersGirdisiDogrula(istek.body ?? {});
      if (await dersGetir(girdi.id)) {
        return cevap.code(409).send({ hata: "Bu kimlikle bir ders zaten var." });
      }
      const sonuc = await dersKaydet(girdi);
      await gunlukYaz({ t: "ders-kaydet", d: girdi });
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.put("/api/yonetim/dersler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      if (!await dersGetir(id)) return cevap.code(404).send({ hata: "Ders bulunamad\u0131" });
      const girdi = dersGirdisiDogrula({ ...istek.body ?? {}, id });
      const sonuc = await dersKaydet(girdi);
      await gunlukYaz({ t: "ders-kaydet", d: girdi });
      return sonuc;
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
  app.delete("/api/yonetim/dersler/:id", async (istek, cevap) => {
    try {
      const { id } = istek.params;
      const silindi = await dersSil(id);
      if (!silindi) return cevap.code(404).send({ hata: "Ders bulunamad\u0131" });
      await gunlukYaz({ t: "ders-sil", d: { id } });
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
    yayinda: mantiksal(g.yayinda, "yayinda", false),
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
    init_gunluk();
    GECERLI_TIPLER = ["eslestir", "sirala", "bosluk-doldur", "eser-tani"];
    GECERLI_GELIR_DURUMLARI = ["belgeli", "belge-bulunamadi"];
    GECERLI_GELIR_TIPLERI = ["gelir", "gider"];
    DogrulamaHatasi = class extends Error {
    };
  }
});

// server/routes/auth.ts
import { randomUUID as randomUUID3 } from "node:crypto";
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
        const govde = istek.body ?? {};
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
      const govde = istek.body ?? {};
      const yeni = zorunlu2(govde.yeniParola, "yeniParola");
      const sorunlar = parolaZayifMi(yeni);
      if (sorunlar.length) {
        return cevap.code(400).send({ hata: "Parola zay\u0131f.", detay: sorunlar });
      }
      const parolaHash = parolaHashle(yeni);
      await kullaniciParolaHashGuncelle(istek.kullanici.id, parolaHash);
      await gunlukYaz({
        t: "kullanici-parola",
        d: { id: istek.kullanici.id, parolaHash }
      });
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
      const govde = istek.body ?? {};
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
      const parolaHash = parolaHashle(parola);
      const kullanici = await kullaniciEkleHashli({
        id: randomUUID3(),
        email,
        ad,
        parolaHash,
        rol
      });
      await gunlukYaz({
        t: "kullanici-ekle",
        d: { id: kullanici.id, email: kullanici.email, ad: kullanici.ad, parolaHash, rol }
      });
      return cevap.code(201).send(kullanici);
    } catch (hata) {
      return hataYanit2(cevap, hata);
    }
  });
  app.patch("/api/yonetim/kullanicilar/:id", { preHandler: yoneticiGerekli }, async (istek, cevap) => {
    try {
      const { id } = istek.params;
      const govde = istek.body ?? {};
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
      await gunlukYaz({ t: "kullanici-durum", d: { id, aktif: govde.aktif } });
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
    init_gunluk();
    BASARISIZ_ESIK = 10;
    PENCERE_DAKIKA = 15;
    GECERLI_ROLLER = ["admin", "ogretmen"];
    DogrulamaHatasi2 = class extends Error {
    };
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
  app.get("/api/sinif/:kod/rontgen", async (istek, cevap) => {
    const { kod } = istek.params;
    const rontgen = await sinifRontgeni(kod);
    if (!rontgen) {
      return cevap.code(404).send({ hata: "B\xF6yle bir s\u0131n\u0131f kodu yok.", kod: "SINIF_YOK" });
    }
    return rontgen;
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
        const govde = istek.body ?? {};
        const kod = zorunlu3(govde.kod, "kod");
        const dersId = zorunlu3(govde.dersId, "dersId");
        const tamam = await tamamlamaKaydet(kod, dersId);
        if (!tamam) {
          return cevap.code(404).send({ hata: "S\u0131n\u0131f kodu veya ders bulunamad\u0131." });
        }
        await gunlukYaz({ t: "sinif-tamamla", d: { kod, dersId } });
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
      const govde = istek.body ?? {};
      const ad = zorunlu3(govde.ad, "ad");
      if (ad.length > 120) throw new DogrulamaHatasi3('"ad" en fazla 120 karakter olabilir.');
      const sinif = await sinifOlustur(istek.kullanici.id, ad);
      await gunlukYaz({
        t: "sinif-ekle",
        d: { kod: sinif.kod, ogretmenId: sinif.ogretmenId, ad: sinif.ad }
      });
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
    await gunlukYaz({ t: "sinif-durum", d: { kod: sinif.kod, aktif: govde.aktif } });
    return { tamam: true };
  });
}
var DogrulamaHatasi3;
var init_sinif2 = __esm({
  "server/routes/sinif.ts"() {
    init_sinif();
    init_koruma();
    init_gunluk();
    DogrulamaHatasi3 = class extends Error {
    };
  }
});

// server/canli/oda.ts
import { randomBytes as randomBytes3, randomInt as randomInt2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
function anahtarEsit(beklenen, gelen) {
  if (!gelen) return false;
  const b = Buffer.from(gelen);
  return b.length === beklenen.length && timingSafeEqual2(b, beklenen);
}
function siraHesapla(satirlar) {
  const sirali = [...satirlar].sort(
    (a, b) => b.puan - a.puan || a.takmaAd.localeCompare(b.takmaAd, "tr")
  );
  let onceki = Number.NaN;
  let sira = 0;
  return sirali.map((s, i) => {
    if (s.puan !== onceki) sira = i + 1;
    onceki = s.puan;
    return { sira, takmaAd: s.takmaAd, puan: s.puan };
  });
}
function kodla(oda) {
  const j = {
    ...oda,
    sunucuAnahtari: oda.sunucuAnahtari.toString(),
    oyuncular: [...oda.oyuncular].map(([k, o]) => [
      k,
      { takmaAd: o.takmaAd, cevaplar: [...o.cevaplar] }
    ])
  };
  return JSON.stringify(j);
}
function coz(json) {
  const j = JSON.parse(json);
  return {
    ...j,
    sunucuAnahtari: Buffer.from(j.sunucuAnahtari),
    oyuncular: new Map(
      j.oyuncular.map(([k, o]) => [
        k,
        { takmaAd: o.takmaAd, cevaplar: new Map(o.cevaplar) }
      ])
    )
  };
}
var SINIRLAR, CanliHata, RENKLER, PARCALAR, yeniAnahtar, YENIDEN_DENEME, CanliOdalar;
var init_oda = __esm({
  "server/canli/oda.ts"() {
    init_depo();
    SINIRLAR = {
      odaSayisi: 200,
      oyuncuSayisi: 80,
      /** Dokunulmayan oda bu süreden sonra silinir. */
      bosOdaMs: 2 * 60 * 60 * 1e3,
      /** Biten oda sonuç ekranı için bu kadar yaşar. */
      bitenOdaMs: 30 * 60 * 1e3,
      /** Ağ gecikmesi payı: süre bittikten hemen sonra gelen cevap da sayılır. */
      gecikmePayiMs: 800
    };
    CanliHata = class extends Error {
      constructor(kod, mesaj) {
        super(mesaj);
        this.kod = kod;
      }
      kod;
    };
    RENKLER = [
      "Turkuaz",
      "Alt\u0131n",
      "Mavi",
      "K\u0131rm\u0131z\u0131",
      "Ye\u015Fil",
      "Mor",
      "G\xFCm\xFC\u015F",
      "Lacivert",
      "Bak\u0131r",
      "Z\xFCmr\xFCt",
      "Mercan",
      "Kehribar"
    ];
    PARCALAR = [
      "Kubbe",
      "Minare",
      "\xC7ini",
      "Kemer",
      "\u015Ead\u0131rvan",
      "Mihrap",
      "Kervan",
      "\xC7e\u015Fme",
      "Avlu",
      "Revak",
      "Kitabe",
      "Mukarnas",
      "Han",
      "Hamam",
      "Kandil",
      "Pencere"
    ];
    yeniAnahtar = () => randomBytes3(24).toString("base64url");
    YENIDEN_DENEME = 100;
    CanliOdalar = class {
      constructor(simdi = Date.now, depo = varsayilanDepo(simdi)) {
        this.simdi = simdi;
        this.depo = depo;
      }
      simdi;
      depo;
      async odaSayisi() {
        return this.depo.sayi();
      }
      async kur(sorular, sureSn) {
        if (await this.depo.sayi() >= SINIRLAR.odaSayisi) {
          throw new CanliHata(
            "KAPASITE",
            "\u015Eu an \xE7ok fazla oyun a\xE7\u0131k. Biraz sonra yeniden dene."
          );
        }
        const anahtar = yeniAnahtar();
        for (; ; ) {
          const pin = String(randomInt2(1e5, 1e6));
          const oda = {
            pin,
            sunucuAnahtari: Buffer.from(anahtar),
            sorular,
            sureMs: sureSn * 1e3,
            asama: "lobi",
            soruNo: 0,
            soruBaslangic: 0,
            sonErisim: this.simdi(),
            bitis: null,
            oyuncular: /* @__PURE__ */ new Map()
          };
          if (await this.depo.yaz(pin, kodla(oda), 0, SINIRLAR.bosOdaMs)) {
            return { pin, sunucuAnahtari: anahtar };
          }
        }
      }
      /** Odayı okur, `fn` ile işler, sürüm kontrollü geri yazar. CanliHata da yazımdan sonra fırlar. */
      async islem(pin, fn) {
        for (let i = 0; i < YENIDEN_DENEME; i++) {
          const kayit = await this.depo.al(pin);
          if (!kayit)
            throw new CanliHata("ODA_YOK", "Bu PIN ile bir oyun bulunamad\u0131.");
          const oda = coz(kayit.json);
          oda.sonErisim = this.simdi();
          let sonuc;
          let hata;
          try {
            sonuc = fn(oda);
          } catch (e) {
            if (!(e instanceof CanliHata)) throw e;
            hata = e;
          }
          const ttl = oda.bitis !== null ? Math.max(1, oda.bitis + SINIRLAR.bitenOdaMs - this.simdi()) : SINIRLAR.bosOdaMs;
          if (await this.depo.yaz(pin, kodla(oda), kayit.surum, ttl)) {
            if (hata) throw hata;
            return sonuc;
          }
        }
        throw new Error("Oda g\xFCncellenemedi: \xE7ok fazla e\u015Fzamanl\u0131 istek.");
      }
      katil(pin) {
        return this.islem(pin, (oda) => this.katilIc(oda));
      }
      katilIc(oda) {
        if (oda.asama === "bitti")
          throw new CanliHata("OYUN_BITTI", "Bu oyun bitti.");
        if (oda.oyuncular.size >= SINIRLAR.oyuncuSayisi) {
          throw new CanliHata("ODA_DOLU", "Bu oyun dolu.");
        }
        const takmaAd = this.takmaAdUret(oda);
        const anahtar = yeniAnahtar();
        oda.oyuncular.set(anahtar, { takmaAd, cevaplar: /* @__PURE__ */ new Map() });
        return { oyuncuAnahtari: anahtar, takmaAd };
      }
      basla(pin, anahtar) {
        return this.islem(pin, (oda) => {
          this.sunucuOdasi(oda, anahtar);
          if (oda.asama !== "lobi")
            throw new CanliHata("ASAMA_UYGUN_DEGIL", "Oyun zaten ba\u015Flad\u0131.");
          if (oda.oyuncular.size === 0) {
            throw new CanliHata(
              "OYUNCU_YOK",
              "Ba\u015Flamak i\xE7in en az bir oyuncu kat\u0131lmal\u0131."
            );
          }
          this.soruyaGec(oda, 0);
        });
      }
      /** Soru açıksa erken bitirir; sonuç gösteriliyorsa sonraki soruya ya da sona geçer. */
      sonraki(pin, anahtar) {
        return this.islem(pin, (oda) => {
          this.sunucuOdasi(oda, anahtar);
          this.ilerlet(oda);
          if (oda.asama === "soru") oda.asama = "cevap";
          else if (oda.asama === "cevap") {
            if (oda.soruNo + 1 < oda.sorular.length)
              this.soruyaGec(oda, oda.soruNo + 1);
            else this.bitirIc(oda);
          } else
            throw new CanliHata(
              "ASAMA_UYGUN_DEGIL",
              "\u015Eu an ilerletilecek bir soru yok."
            );
        });
      }
      bitir(pin, anahtar) {
        return this.islem(pin, (oda) => {
          this.sunucuOdasi(oda, anahtar);
          this.bitirIc(oda);
        });
      }
      bitirIc(oda) {
        oda.asama = "bitti";
        oda.bitis = this.simdi();
      }
      cevapla(pin, oyuncuAnahtari, soruNo, secim) {
        return this.islem(pin, (oda) => {
          const oyuncu = oyuncuAnahtari ? oda.oyuncular.get(oyuncuAnahtari) : void 0;
          if (!oyuncu) throw new CanliHata("YETKI_YOK", "Bu oyuna kat\u0131lmam\u0131\u015Fs\u0131n.");
          const gecen = this.simdi() - oda.soruBaslangic;
          if (oda.asama !== "soru" || soruNo !== oda.soruNo) {
            throw new CanliHata("ASAMA_UYGUN_DEGIL", "Bu sorunun s\xFCresi ge\xE7ti.");
          }
          if (gecen > oda.sureMs + SINIRLAR.gecikmePayiMs) {
            this.ilerlet(oda);
            throw new CanliHata("SURE_DOLDU", "S\xFCre doldu.");
          }
          const soru = oda.sorular[oda.soruNo];
          if (!Number.isInteger(secim) || secim < 0 || secim >= soru.secenekler.length) {
            throw new CanliHata("GECERSIZ_CEVAP", "Ge\xE7ersiz se\xE7enek.");
          }
          if (oyuncu.cevaplar.has(soruNo)) {
            throw new CanliHata("ZATEN_CEVAPLANDI", "Bu soruyu zaten cevaplad\u0131n.");
          }
          const oran = Math.min(1, Math.max(0, gecen / oda.sureMs));
          const puan = secim === soru.dogruIndex ? Math.round(1e3 - 500 * oran) : 0;
          oyuncu.cevaplar.set(soruNo, { secim, puan });
          this.ilerlet(oda);
        });
      }
      sunucuDurumu(pin, anahtar) {
        return this.islem(pin, (oda) => {
          this.sunucuOdasi(oda, anahtar);
          this.ilerlet(oda);
          const soru = oda.sorular[oda.soruNo];
          const dagilim = soru ? soru.secenekler.map(() => 0) : [];
          let cevaplayan = 0;
          for (const o of oda.oyuncular.values()) {
            const c = o.cevaplar.get(oda.soruNo);
            if (c) {
              cevaplayan++;
              dagilim[c.secim]++;
            }
          }
          const siralama = this.siralama(oda);
          return {
            pin: oda.pin,
            asama: oda.asama,
            oyuncular: [...oda.oyuncular.values()].map((o) => o.takmaAd),
            soru: oda.asama === "soru" || oda.asama === "cevap" ? this.gorunum(oda) : null,
            cevaplayan,
            sonuc: oda.asama === "cevap" && soru ? {
              dogruIndex: soru.dogruIndex,
              aciklama: soru.aciklama,
              kaynak: soru.kaynak,
              dagilim
            } : null,
            siralama: oda.asama === "bitti" ? siralama : siralama.slice(0, 5),
            ...oda.asama === "bitti" ? { rapor: this.rapor(oda) } : {}
          };
        });
      }
      /** Soru soru anonim özet: yalnızca sayılar, hiçbir oyuncu adı yok. */
      rapor(oda) {
        const oyuncular = [...oda.oyuncular.values()];
        if (oda.soruBaslangic === 0) return [];
        const sorulan = oda.sorular.slice(0, oda.soruNo + 1);
        return sorulan.map((s, no) => {
          const cevaplar = oyuncular.map((o) => o.cevaplar.get(no)).filter((c) => !!c);
          return {
            no,
            soru: s.soru,
            dogruCevap: s.secenekler[s.dogruIndex],
            eserId: s.eserId,
            dogruSayisi: cevaplar.filter((c) => c.secim === s.dogruIndex).length,
            cevaplayan: cevaplar.length
          };
        });
      }
      oyuncuDurumu(pin, oyuncuAnahtari) {
        return this.islem(pin, (oda) => {
          const oyuncu = oyuncuAnahtari ? oda.oyuncular.get(oyuncuAnahtari) : void 0;
          if (!oyuncu) throw new CanliHata("YETKI_YOK", "Bu oyuna kat\u0131lmam\u0131\u015Fs\u0131n.");
          this.ilerlet(oda);
          const siralama = this.siralama(oda);
          const benim = siralama.find((s) => s.takmaAd === oyuncu.takmaAd);
          const soru = oda.sorular[oda.soruNo];
          const cevap = oyuncu.cevaplar.get(oda.soruNo) ?? null;
          return {
            pin: oda.pin,
            asama: oda.asama,
            takmaAd: oyuncu.takmaAd,
            puan: benim.puan,
            sira: oda.asama === "lobi" ? null : benim.sira,
            oyuncuSayisi: oda.oyuncular.size,
            soru: oda.asama === "soru" || oda.asama === "cevap" ? this.gorunum(oda) : null,
            cevabim: oda.asama === "soru" || oda.asama === "cevap" ? cevap?.secim ?? null : null,
            sonuc: oda.asama === "cevap" && soru ? {
              dogruIndex: soru.dogruIndex,
              aciklama: soru.aciklama,
              kaynak: soru.kaynak,
              dogruMu: cevap?.secim === soru.dogruIndex,
              kazanilan: cevap?.puan ?? 0
            } : null,
            podyum: oda.asama === "bitti" ? siralama.filter((s) => s.sira <= 3).slice(0, 3) : []
          };
        });
      }
      /** Süresi geçmiş odaları siler. Depo TTL ile kendisi siler; burada yalnızca sayımı tazeler. */
      async temizle() {
        await this.depo.sayi();
      }
      // --- iç yardımcılar ------------------------------------------------------
      sunucuOdasi(oda, anahtar) {
        if (!anahtarEsit(oda.sunucuAnahtari, anahtar)) {
          throw new CanliHata(
            "YETKI_YOK",
            "Bu oyunu yaln\u0131zca kuran ki\u015Fi y\xF6netebilir."
          );
        }
      }
      soruyaGec(oda, no) {
        oda.asama = "soru";
        oda.soruNo = no;
        oda.soruBaslangic = this.simdi();
      }
      /** Süre dolduysa ya da herkes cevapladıysa sonucu açar. */
      ilerlet(oda) {
        if (oda.asama !== "soru") return;
        const sureBitti = this.simdi() - oda.soruBaslangic > oda.sureMs + SINIRLAR.gecikmePayiMs;
        const herkesCevapladi = oda.oyuncular.size > 0 && [...oda.oyuncular.values()].every((o) => o.cevaplar.has(oda.soruNo));
        if (sureBitti || herkesCevapladi) oda.asama = "cevap";
      }
      gorunum(oda) {
        const soru = oda.sorular[oda.soruNo];
        return {
          no: oda.soruNo,
          toplam: oda.sorular.length,
          tip: soru.tip,
          soru: soru.soru,
          foto: soru.foto,
          secenekler: soru.secenekler,
          sureSn: oda.sureMs / 1e3,
          kalanMs: oda.asama === "soru" ? Math.max(0, oda.sureMs - (this.simdi() - oda.soruBaslangic)) : 0
        };
      }
      /** Toplam puan: sonucu açıklanmış sorular sayılır (soru açıkken sıralama sızmaz). */
      siralama(oda) {
        return siraHesapla(
          [...oda.oyuncular.values()].map((o) => {
            let puan = 0;
            for (const [no, c] of o.cevaplar) {
              if (no < oda.soruNo || oda.asama !== "soru") puan += c.puan;
            }
            return { takmaAd: o.takmaAd, puan };
          })
        );
      }
      takmaAdUret(oda) {
        const kullanilan = new Set(
          [...oda.oyuncular.values()].map((o) => o.takmaAd)
        );
        for (let deneme = 0; deneme < 40; deneme++) {
          const ad = `${RENKLER[randomInt2(RENKLER.length)]} ${PARCALAR[randomInt2(PARCALAR.length)]}`;
          if (!kullanilan.has(ad)) return ad;
        }
        let n = 2;
        const taban = `${RENKLER[randomInt2(RENKLER.length)]} ${PARCALAR[randomInt2(PARCALAR.length)]}`;
        while (kullanilan.has(`${taban} ${n}`)) n++;
        return `${taban} ${n}`;
      }
    };
  }
});

// server/canli/sorular.ts
function karistir(dizi, rastgele) {
  const kopya = [...dizi];
  for (let i = kopya.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele() * (i + 1));
    [kopya[i], kopya[j]] = [kopya[j], kopya[i]];
  }
  return kopya;
}
function secenekleriHazirla(dogru, digerleri, rastgele) {
  const tekil = [...new Set(digerleri.filter((s) => s.trim() && s !== dogru))];
  if (tekil.length < 1) return null;
  const secilen = karistir(tekil, rastgele).slice(0, EN_COK_SECENEK - 1);
  const secenekler = karistir([dogru, ...secilen], rastgele);
  return { secenekler, dogruIndex: secenekler.indexOf(dogru) };
}
function bulunmaEki(ad) {
  const son = [...ad.toLocaleLowerCase("tr")].reverse().find((h) => "ae\u0131io\xF6u\xFC".includes(h));
  const sert = /[çfhkpsşt]$/i.test(ad);
  const kalin = son !== void 0 && "a\u0131ou".includes(son);
  return `'${sert ? "t" : "d"}${kalin ? "a" : "e"}ki`;
}
function dersinSorulari(ders, kaynak, rastgele) {
  const eser = ders.eser;
  if (!eser) return [];
  const sorular = [];
  const sehir = kaynak.sehirAdlari.get(eser.sehirId) ?? eser.sehirId;
  const foto = kaynak.fotograflar.get(eser.id);
  if (foto) {
    const ayniSehir = kaynak.dersler.filter((d) => d.eser && d.eser.id !== eser.id && d.eser.sehirId === eser.sehirId).map((d) => d.eser.ad);
    const baska = kaynak.dersler.filter((d) => d.eser && d.eser.sehirId !== eser.sehirId).map((d) => d.eser.ad);
    const havuz = ayniSehir.length >= 3 ? ayniSehir : [...ayniSehir, ...karistir(baska, rastgele)];
    const hazir2 = secenekleriHazirla(eser.ad, karistir(havuz, rastgele).slice(0, 12), rastgele);
    if (hazir2 && hazir2.secenekler.length >= 3) {
      sorular.push({
        tip: "foto",
        eserId: eser.id,
        soru: "Bu foto\u011Fraftaki eser hangisi?",
        // Alt metin cevabı söylememeli; ekran okuyucu kullanan çocuk da tahmin eder.
        foto: { url: foto.url, alt: `Tahmin edilecek eserin foto\u011Fraf\u0131 (${eser.tur})` },
        ...hazir2,
        aciklama: `Bu, ${sehir}${bulunmaEki(sehir)} ${eser.ad}.`,
        kaynak: foto.kaynak
      });
    }
  }
  for (const egz of ders.egzersizler) {
    if (egz.tip === "bosluk-doldur") {
      const v = egz.veri;
      if (!v.secenekler || !v.metin.includes("___")) continue;
      const hazir2 = secenekleriHazirla(v.cevap, v.secenekler, rastgele);
      if (!hazir2) continue;
      sorular.push({
        tip: "bosluk",
        eserId: eser.id,
        soru: v.metin.replace(/_{3,}/, "_____"),
        foto: null,
        ...hazir2,
        aciklama: v.metin.replace(/_{3,}/, v.cevap),
        kaynak: egz.kaynak
      });
    } else if (egz.tip === "eser-tani") {
      const v = egz.veri;
      const dogru = v.secenekler[v.dogruIndex];
      if (!dogru) continue;
      const hazir2 = secenekleriHazirla(dogru, v.secenekler, rastgele);
      if (!hazir2) continue;
      sorular.push({
        tip: "eser-tani",
        eserId: eser.id,
        soru: `${v.betimleme} Hangi eser?`,
        foto: null,
        ...hazir2,
        aciklama: `Do\u011Fru cevap: ${dogru} (${sehir}).`,
        kaynak: egz.kaynak
      });
    }
  }
  return sorular;
}
function sorulariUret(kaynak, sayi2, rastgele = Math.random) {
  const havuz = karistir(
    kaynak.dersler.flatMap((d) => dersinSorulari(d, kaynak, rastgele)),
    rastgele
  );
  const secilen = [];
  const kullanilanEser = /* @__PURE__ */ new Set();
  const sira = ["foto", "eser-tani", "bosluk"];
  for (let tur = 0; secilen.length < sayi2 && havuz.length > 0; tur++) {
    const istenen = sira[tur % sira.length];
    let i = havuz.findIndex((s) => s.tip === istenen && !kullanilanEser.has(s.eserId));
    if (i < 0) i = havuz.findIndex((s) => !kullanilanEser.has(s.eserId));
    if (i < 0) i = 0;
    const [soru] = havuz.splice(i, 1);
    secilen.push(soru);
    kullanilanEser.add(soru.eserId);
  }
  return secilen;
}
var EN_COK_SECENEK;
var init_sorular = __esm({
  "server/canli/sorular.ts"() {
    EN_COK_SECENEK = 4;
  }
});

// shared/canli.ts
var CANLI_SURELER, CANLI_SORU_SAYISI;
var init_canli = __esm({
  "shared/canli.ts"() {
    CANLI_SURELER = [20, 30, 60];
    CANLI_SORU_SAYISI = { en_az: 3, en_cok: 15, varsayilan: 8 };
  }
});

// server/routes/canli.ts
async function veritabanindanSoruKaynagi(kapsam) {
  const [tur, id] = kapsam.split(":");
  const dersler = (await dersleriListele()).filter(
    (d) => tur === "sehir" ? d.eser?.sehirId === id : tur === "unite" ? d.uniteId === id : true
  );
  const fotolar = await sorgu(
    `SELECT DISTINCT ON (work_id) work_id, url, kaynak FROM work_photo ORDER BY work_id, sira`
  );
  const sehirler = await sorgu(
    `SELECT id, ad FROM city`
  );
  return {
    dersler,
    fotograflar: new Map(
      fotolar.map((f) => [f.work_id, { url: f.url, kaynak: f.kaynak }])
    ),
    sehirAdlari: new Map(sehirler.map((s) => [s.id, s.ad]))
  };
}
function baslik(istek, ad) {
  const deger = istek.headers[ad];
  return typeof deger === "string" && deger.length <= 64 ? deger : void 0;
}
async function canliUclari(app, secenekler = {}) {
  const odalar = secenekler.odalar ?? new CanliOdalar();
  const soruKaynagi = secenekler.soruKaynagi ?? veritabanindanSoruKaynagi;
  app.setErrorHandler((hata, _istek, cevap) => {
    if (hata instanceof CanliHata) {
      return cevap.code(DURUM_KODU[hata.kod]).send({ hata: hata.message, kod: hata.kod });
    }
    throw hata;
  });
  const pinAl = (istek) => {
    const { pin } = istek.params;
    if (!PIN.test(pin))
      throw new CanliHata("ODA_YOK", "PIN 6 rakamdan olu\u015Fur.");
    return pin;
  };
  app.post(
    "/api/canli/odalar",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (istek, cevap) => {
      const govde = istek.body ?? {};
      const kapsam = typeof govde.kapsam === "string" ? govde.kapsam : "hepsi";
      const soruSayisi = Number(
        govde.soruSayisi ?? CANLI_SORU_SAYISI.varsayilan
      );
      const sureSn = Number(govde.sureSn ?? CANLI_SURELER[0]);
      if (!KAPSAM.test(kapsam))
        return cevap.code(400).send({ hata: "Ge\xE7ersiz kapsam." });
      if (!Number.isInteger(soruSayisi) || soruSayisi < CANLI_SORU_SAYISI.en_az || soruSayisi > CANLI_SORU_SAYISI.en_cok) {
        return cevap.code(400).send({
          hata: `Soru say\u0131s\u0131 ${CANLI_SORU_SAYISI.en_az}\u2013${CANLI_SORU_SAYISI.en_cok} aras\u0131nda olmal\u0131.`
        });
      }
      if (!CANLI_SURELER.includes(sureSn)) {
        return cevap.code(400).send({ hata: `S\xFCre ${CANLI_SURELER.join(", ")} sn olabilir.` });
      }
      const sorular = sorulariUret(
        await soruKaynagi(kapsam),
        soruSayisi
      );
      if (sorular.length < CANLI_SORU_SAYISI.en_az) {
        return cevap.code(422).send({
          hata: "Bu se\xE7imde yar\u0131\u015Fma i\xE7in yeterli soru yok.",
          kod: "SORU_YOK"
        });
      }
      const oda = await odalar.kur(sorular, sureSn);
      const govdeCevap = { ...oda, soruSayisi: sorular.length };
      return cevap.code(201).send(govdeCevap);
    }
  );
  const yonetimSiniri = {
    config: {
      rateLimit: {
        max: 240,
        timeWindow: "1 minute",
        keyGenerator: anahtarBasina("x-canli-anahtar")
      }
    }
  };
  app.get(
    "/api/canli/odalar/:pin/yonetim",
    yonetimSiniri,
    async (istek) => odalar.sunucuDurumu(pinAl(istek), baslik(istek, "x-canli-anahtar"))
  );
  for (const eylem of ["basla", "sonraki", "bitir"]) {
    app.post(
      `/api/canli/odalar/:pin/${eylem}`,
      yonetimSiniri,
      async (istek) => {
        const pin = pinAl(istek);
        const anahtar = baslik(istek, "x-canli-anahtar");
        await odalar[eylem](pin, anahtar);
        return odalar.sunucuDurumu(pin, anahtar);
      }
    );
  }
  app.post(
    "/api/canli/odalar/:pin/katil",
    // Bir sınıf aynı IP'den katılır: 30–40 katılım rahat geçmeli, PIN taraması geçmemeli.
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (istek, cevap) => cevap.code(201).send(await odalar.katil(pinAl(istek)))
  );
  app.get(
    "/api/canli/odalar/:pin/oyuncu",
    {
      config: {
        rateLimit: {
          max: 240,
          timeWindow: "1 minute",
          keyGenerator: anahtarBasina("x-canli-oyuncu")
        }
      }
    },
    async (istek) => odalar.oyuncuDurumu(pinAl(istek), baslik(istek, "x-canli-oyuncu"))
  );
  app.post(
    "/api/canli/odalar/:pin/cevap",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
          keyGenerator: anahtarBasina("x-canli-oyuncu")
        }
      }
    },
    async (istek) => {
      const pin = pinAl(istek);
      const govde = istek.body ?? {};
      const soruNo = typeof govde.soruNo === "number" ? govde.soruNo : NaN;
      const secim = typeof govde.secim === "number" ? govde.secim : NaN;
      if (!Number.isInteger(soruNo) || !Number.isInteger(secim)) {
        throw new CanliHata(
          "GECERSIZ_CEVAP",
          '"soruNo" ve "secim" tam say\u0131 olmal\u0131.'
        );
      }
      await odalar.cevapla(pin, baslik(istek, "x-canli-oyuncu"), soruNo, secim);
      return { alindi: true };
    }
  );
}
var PIN, KAPSAM, DURUM_KODU, anahtarBasina;
var init_canli2 = __esm({
  "server/routes/canli.ts"() {
    init_db();
    init_ders();
    init_oda();
    init_sorular();
    init_canli();
    PIN = /^\d{6}$/;
    KAPSAM = /^(hepsi|sehir:[a-z0-9-]{1,60}|unite:[a-z0-9-]{1,80})$/;
    DURUM_KODU = {
      ODA_YOK: 404,
      YETKI_YOK: 403,
      KAPASITE: 503,
      ODA_DOLU: 409,
      OYUN_BITTI: 409,
      OYUNCU_YOK: 409,
      ASAMA_UYGUN_DEGIL: 409,
      GECERSIZ_CEVAP: 400,
      ZATEN_CEVAPLANDI: 409,
      SURE_DOLDU: 409
    };
    anahtarBasina = (ad) => (istek) => `${istek.ip}|${baslik(istek, ad) ?? "-"}`;
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
import { existsSync } from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { dirname as dirname2, join as join2 } from "node:path";
async function sunucuKur() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    // Güvenlik: gövde boyutu sınırı — bellek tüketimi saldırısını engeller.
    bodyLimit: 1048576,
    // 1 MB
    // Vercel önünde vekil var; gerçek istemci IP'si X-Forwarded-For'da.
    // Yerelde kapalı: başlık taklidiyle hız sınırı atlatılamasın.
    trustProxy: process.env.VERCEL === "1"
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
    errorResponseBuilder: (_istek, baglam) => ({
      statusCode: baglam.statusCode,
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
    origin: false,
    credentials: true
  });
  app.addHook("onSend", async (istek, yanit) => {
    if (istek.url.startsWith("/api/")) yanit.header("cache-control", "no-store");
  });
  await semaGarantiEt();
  await suresiGecmisOturumlariTemizle();
  await eskiDenemeleriTemizle();
  await gunlukSenkronize();
  app.addHook("onRequest", async (istek) => {
    if (!istek.url.startsWith("/api/")) return;
    await gunlukSenkronize();
  });
  await app.register(authUclari);
  await app.register(sinifUclari);
  await app.register(canliUclari);
  await app.register(genelUclar);
  await app.register(yonetimUclari);
  const distYolu = join2(__dirname2, "..", "dist");
  if (existsSync(distYolu)) {
    const { default: fastifyStatic } = await import("@fastify/static");
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
  if (existsSync(".env")) process.loadEnvFile(".env");
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
    init_canli2();
    init_oturum();
    init_gunluk();
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
