-- ===========================================================================
-- Kök Avı — kimlik doğrulama şeması
--
-- NEDEN AYRI DOSYA: `schema.sql` içerik tablolarını her seed'de DROP eder
-- (içerik yeniden üretilebilir). Kullanıcı hesapları ise KALICI olmalıdır —
-- seed çalıştırmak yönetici hesabını silmemelidir. Bu yüzden auth tabloları
-- IF NOT EXISTS ile kurulur ve asla düşürülmez.
--
-- GÜVENLİK NOTLARI
--  * `parola_hash` asla düz metin değildir: scrypt (N=16384) + rastgele tuz.
--  * `session.token_hash` yalnızca SHA-256 özetini saklar; ham belirteç
--    yalnızca çerezde bulunur. Veritabanı sızsa bile oturum çalınmaz.
--  * `login_attempt` kaba kuvvet (brute force) tespiti ve denetim içindir.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- Uygulama kullanıcıları (yönetici ve öğretmen — YETİŞKİN roller)
--
-- ⚠️ ÇOCUK HESABI YOKTUR. Başvuru PDF'i: "Kişisel veri toplanmaz, sınıf kodu
-- anonim". Çocuklar cihaz-yerel anonim profille ilerler; sunucuda çocuğa ait
-- hiçbir kayıt tutulmaz. Bu, mimari bir gizlilik kararıdır (bkz. docs/KARARLAR.md).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_user (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  ad            TEXT NOT NULL,
  parola_hash   TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('admin', 'ogretmen')),
  aktif         BOOLEAN NOT NULL DEFAULT TRUE,
  son_giris     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E-posta büyük/küçük harf duyarsız tekil olmalı (Ahmet@x.com = ahmet@x.com)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_email ON app_user (LOWER(email));

-- --------------------------------------------------------------------------
-- Oturumlar
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_session_user ON session (user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires ON session (expires_at);

-- --------------------------------------------------------------------------
-- Giriş denemeleri — kaba kuvvet tespiti ve denetim izi
-- Başarısız denemelerde e-posta saklanır; bu bir güvenlik kaydıdır, profil değil.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempt (
  id          SERIAL PRIMARY KEY,
  email       TEXT,
  ip          TEXT,
  basarili    BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempt_email ON login_attempt (email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempt_ip ON login_attempt (ip, created_at);

-- --------------------------------------------------------------------------
-- Sınıflar — PDF Senaryo B: "Öğretmen sınıf kodunu açar. Sınıf birlikte bir
-- külliyeyi tamamlar."
--
-- 🔒 GİZLİLİK TASARIMI: Bu tablolarda ÇOCUĞA AİT HİÇBİR KİMLİK YOKTUR.
--   * `class_progress` yalnızca sayaç tutar: "bu kodla bu ders kaç kez bitti".
--   * Cihaz kimliği, oturum kimliği, IP veya kullanıcı adı SAKLANMAZ.
--   * Bu yüzden "kaç farklı öğrenci" bilinemez — arayüz de bunu iddia etmez,
--     yalnızca toplam tamamlama sayısını gösterir. Dürüst etiketleme.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_code (
  kod         TEXT PRIMARY KEY,
  ogretmen_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  ad          TEXT NOT NULL,
  aktif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_class_code_ogretmen ON class_code (ogretmen_id);

CREATE TABLE IF NOT EXISTS class_progress (
  kod         TEXT NOT NULL REFERENCES class_code(kod) ON DELETE CASCADE,
  ders_id     TEXT NOT NULL,
  sayi        INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kod, ders_id)
);

-- --------------------------------------------------------------------------
-- Takma adlı sınıf katılımı (07.11.2026, İSTEĞE BAĞLI)
--
-- Çocuk sınıfa katılırken isterse bir TAKMA AD yazar; yazmazsa yalnızca yukarıdaki
-- anonim sayaç işler. Takma adla katılanların ilerlemesi öğretmen ve yönetici
-- panelinde öğrenci öğrenci görünür.
--   * `ogrenci_id` sunucunun ürettiği rastgele bir kimliktir; cihaz kimliği,
--     IP, e-posta, gerçek ad, yaş SAKLANMAZ.
--   * Arayüz gerçek ad yazılmamasını açıkça ister.
--   * Çocuk sınıftan çıkınca bu kayıtlar silinir (ON DELETE CASCADE).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_student (
  kod         TEXT NOT NULL REFERENCES class_code(kod) ON DELETE CASCADE,
  ogrenci_id  TEXT NOT NULL,
  takma_ad    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kod, ogrenci_id)
);

CREATE TABLE IF NOT EXISTS class_student_progress (
  kod         TEXT NOT NULL,
  ogrenci_id  TEXT NOT NULL,
  ders_id     TEXT NOT NULL,
  sayi        INTEGER NOT NULL DEFAULT 0,
  ilk_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  son_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kod, ogrenci_id, ders_id),
  FOREIGN KEY (kod, ogrenci_id) REFERENCES class_student(kod, ogrenci_id) ON DELETE CASCADE
);
