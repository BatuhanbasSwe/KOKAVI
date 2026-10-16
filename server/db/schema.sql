-- ===========================================================================
-- Kök Avı — veritabanı şeması (PostgreSQL)
--
-- Başvuru PDF'indeki veri modeli taahhütlerinin karşılığı:
--   * "Vakfiye veri modeli"                      -> work + income_item
--   * "Yönetim paneli — eser ekleme/düzenleme,
--      yeni şehir ünitesi tanımlama"             -> tüm tablolar yazılabilir
--   * "her değer vakfiye belgesinden alınır ve
--      arşiv numarasıyla gösterilir"             -> work.arsiv_no
--   * "doğrulanmamış hiçbir bilgi kesin bilgi
--      olarak sunulmaz"                          -> income_item.yuzde NULL olabilir,
--                                                    gelir_dagilimi_durumu ile işaretlenir
--
-- NOT: PostGIS bu MVP'de kullanılmıyor; üründe konum tabanlı sorgu yok,
-- harita yalnızca görselleştirme (MapLibre). Koordinatlar düz kolonlarda
-- tutulur ve PostGIS'e geçiş için hazırdır.
-- ===========================================================================

DROP TABLE IF EXISTS exercise CASCADE;
DROP TABLE IF EXISTS lesson CASCADE;
DROP TABLE IF EXISTS exhibition_work CASCADE;
DROP TABLE IF EXISTS exhibition CASCADE;
DROP TABLE IF EXISTS work_photo CASCADE;
DROP TABLE IF EXISTS unit CASCADE;
DROP TABLE IF EXISTS income_item CASCADE;
DROP TABLE IF EXISTS work CASCADE;
DROP TABLE IF EXISTS kulliye CASCADE;
DROP TABLE IF EXISTS city CASCADE;

-- --------------------------------------------------------------------------
-- Şehirler — öğrenme yolundaki en üst kapsayıcı
-- --------------------------------------------------------------------------
CREATE TABLE city (
  id          TEXT PRIMARY KEY,
  ad          TEXT NOT NULL,
  sira        INTEGER NOT NULL,
  aktif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- Külliyeler — birbirine bağlı eser grupları
-- PDF: "Sınıf birlikte bir külliyeyi tamamlar."
-- --------------------------------------------------------------------------
CREATE TABLE kulliye (
  id          TEXT PRIMARY KEY,
  ad          TEXT NOT NULL,
  sehir_id    TEXT NOT NULL REFERENCES city(id) ON DELETE CASCADE,
  bani        TEXT,
  aciklama    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kulliye_sehir ON kulliye(sehir_id);

-- --------------------------------------------------------------------------
-- Eserler — ürünün çekirdek varlığı
-- --------------------------------------------------------------------------
CREATE TABLE work (
  id                      TEXT PRIMARY KEY,
  ad                      TEXT NOT NULL,
  sehir_id                TEXT NOT NULL REFERENCES city(id) ON DELETE RESTRICT,
  kulliye_id              TEXT REFERENCES kulliye(id) ON DELETE SET NULL,
  tur                     TEXT NOT NULL,
  ilce                    TEXT,

  lat                     DOUBLE PRECISION,
  lng                     DOUBLE PRECISION,

  -- K1: Kim yaptırdı?
  bani                    TEXT,
  bani_donem              TEXT,
  yapim_yili              TEXT,
  -- K2: Neden yaptırdı?
  vakfiye_amaci           TEXT,
  -- K3: Kime fayda sağladı?
  hizmet                  TEXT,
  -- K4: Bugün ne oldu?
  bugun_ne_oldu           TEXT,

  -- ------------------------------------------------------------------------
  -- Tarihçe ve İngilizce metinler
  --
  -- Vakıf Eserleri Envanter Projesi Bilgi Notu, "Veri alanları" başlığında
  -- açıkça şunları istiyor: "İl, eser adı, eser türü, konum, **tarihçe**,
  -- **Türkçe ve İngilizce metinler**, fotoğraf galerileri ve sergi bilgileri."
  --
  -- Envanter kitapları iki dilli basılıyor (Hatay, Konya, Bursa, Kütahya).
  -- Bu yüzden tarihçe iki dilde tutulur.
  -- ------------------------------------------------------------------------
  tarihce                 TEXT,
  tarihce_en              TEXT,
  ad_en                   TEXT,

  gelir_dagilimi_durumu   TEXT NOT NULL DEFAULT 'belge-bulunamadi'
                          CHECK (gelir_dagilimi_durumu IN ('belgeli', 'belge-bulunamadi')),
  arsiv_no                TEXT,
  kaynaklar               JSONB NOT NULL DEFAULT '[]'::jsonb,
  dogrulama_notu          TEXT,

  yayinda                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_sehir ON work(sehir_id);
CREATE INDEX idx_work_kulliye ON work(kulliye_id);
CREATE INDEX idx_work_yayinda ON work(yayinda);

-- --------------------------------------------------------------------------
-- Gelir kalemleri — Vakıf Röntgeni'nin verisi
--
-- ⚠️ İKİ FARKLI KAVRAM: Vakfiye belgeleri hem "para nereden geliyor" (gelir
-- kaynakları: köy mahsulleri, han kirası, öşür) hem "para nereye gidiyor"
-- (gider dağılımı: personel maaşı, bakım, burs) kaydeder. İkisi AYNI Paranın
-- iki tarafıdır ve toplamları ayrı ayrı %100 eder.
--
-- Bu yüzden `tip` alanı zorunludur. Aksi hâlde ikisi tek dizide karışır ve
-- toplam %200 çıkar — Röntgeni çubukları anlamsızlaşır.
-- (Bu hata gerçekten yaşandı: Habib-i Neccar verisi ilk turda %200 toplam verdi.)
--
-- `yuzde` NULL olabilir: belge yoksa oran uydurulmaz.
-- --------------------------------------------------------------------------
CREATE TABLE income_item (
  id        SERIAL PRIMARY KEY,
  work_id   TEXT NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  kalem     TEXT NOT NULL,
  yuzde     NUMERIC(5,2) CHECK (yuzde IS NULL OR (yuzde >= 0 AND yuzde <= 100)),
  tip       TEXT CHECK (tip IS NULL OR tip IN ('gelir', 'gider')),
  kaynak    TEXT,
  sira      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_income_work ON income_item(work_id);

-- --------------------------------------------------------------------------
-- Fotoğraf galerileri
--
-- Bilgi Notu: "fotoğraf galerileri ... değerlendirilmesi". Envanter projesinde
-- Hatay 2.600 · Konya 15.200 · Kütahya 11.871 · Bursa 34.952 fotoğraf karesi var.
--
-- ⚠️ GÖRSELLER HENÜZ ELİMİZDE DEĞİL. Organizasyon "Envanter dokümanları ve
-- yüksek çözünürlüklü fotoğrafların paylaşımı için Vakıf Katılım'dan dönüş
-- bekliyoruz" dedi. Tablo şimdi hazır; görseller geldiğinde doldurulacak.
--
-- `alt_metin` ZORUNLUDUR (erişilebilirlik): her fotoğrafın metin karşılığı olur.
-- --------------------------------------------------------------------------
CREATE TABLE work_photo (
  id         TEXT PRIMARY KEY,
  work_id    TEXT NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_metin  TEXT NOT NULL,
  alt_metin_en TEXT,
  kaynak     TEXT,
  lisans     TEXT,
  sira       INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_photo_work ON work_photo(work_id, sira);

-- --------------------------------------------------------------------------
-- Sergi bilgileri
--
-- Bilgi Notu: "sergi bilgileri ... değerlendirilmesi". Envanter projesi
-- kapsamında düzenlenen sergiler:
--   · "5 Şubat Hatay" (Mimar Sinan Sanat Galerisi) — Hatay envanteri
--   · "Ayna" (24 Ocak 2025, Üsküdar Mimar Sinan Galerisi) — Konya envanteri
--   · Bursa'nın Fethinin 700. Yılı fotoğraf sergisi
-- --------------------------------------------------------------------------
CREATE TABLE exhibition (
  id          TEXT PRIMARY KEY,
  ad          TEXT NOT NULL,
  ad_en       TEXT,
  tarih       TEXT,
  mekan       TEXT,
  aciklama    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exhibition_work (
  exhibition_id TEXT NOT NULL REFERENCES exhibition(id) ON DELETE CASCADE,
  work_id       TEXT NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  PRIMARY KEY (exhibition_id, work_id)
);
CREATE INDEX idx_exhibition_work_work ON exhibition_work(work_id);

-- --------------------------------------------------------------------------
-- Üniteler — bir şehir birden fazla ünite içerir
-- (PDF yol görseli: Bursa Ünite 1/2/3, sonra Konya/Kütahya/İzmir Ünite 1)
-- --------------------------------------------------------------------------
CREATE TABLE unit (
  id          TEXT PRIMARY KEY,
  sehir_id    TEXT NOT NULL REFERENCES city(id) ON DELETE CASCADE,
  ad          TEXT NOT NULL,
  sira        INTEGER NOT NULL,
  aciklama    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sehir_id, sira)
);
CREATE INDEX idx_unit_sehir ON unit(sehir_id);

-- --------------------------------------------------------------------------
-- Dersler — "her eser bir ders", beş adımlı akış
-- Adım içerikleri JSONB: yönetim panelinden düzenlenebilir.
-- --------------------------------------------------------------------------
CREATE TABLE lesson (
  id            TEXT PRIMARY KEY,
  unit_id       TEXT NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  work_id       TEXT NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  sira          INTEGER NOT NULL,

  merak         JSONB NOT NULL,   -- 01 Merak      (cezasız tahmin)
  baglam        JSONB NOT NULL,   -- 02 Bağlam     (öğretim)
  perspektif    JSONB NOT NULL,   -- 03 Perspektif (tek karar anı)
  yansima       JSONB NOT NULL,   -- 05 Yansıma    (Vakıf Röntgeni + defter)

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unit_id, work_id),
  UNIQUE (unit_id, sira)
);
CREATE INDEX idx_lesson_unit ON lesson(unit_id);
CREATE INDEX idx_lesson_work ON lesson(work_id);

-- --------------------------------------------------------------------------
-- Egzersizler — 04 Geri çağırma adımı ("karışık egzersiz tipleri")
-- PDF'teki dört tip: eslestir, sirala, bosluk-doldur, dinle-sec.
-- "dinle-sec"in ses gerektirmeyen eşdeğeri "eser-tani" olarak uygulanır
-- (PDF: "ses olmadan da akışın tamamı bitirilebilir").
-- --------------------------------------------------------------------------
CREATE TABLE exercise (
  id         TEXT PRIMARY KEY,
  lesson_id  TEXT NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
  tip        TEXT NOT NULL
             CHECK (tip IN ('eslestir', 'sirala', 'bosluk-doldur', 'eser-tani')),
  sira       INTEGER NOT NULL,
  veri       JSONB NOT NULL,
  kaynak     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, sira)
);
CREATE INDEX idx_exercise_lesson ON exercise(lesson_id);
