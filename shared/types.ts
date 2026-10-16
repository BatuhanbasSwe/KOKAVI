/**
 * Kök Avı — paylaşılan tip sözleşmesi.
 *
 * Bu dosya, başvuru PDF'indeki (KokAvi_Sunum.pdf) bağlayıcı spesifikasyonun
 * birebir TypeScript karşılığıdır. Hem istemci hem sunucu bu tipleri kullanır.
 *
 * PDF referansları:
 *  - "Her gün 3–5 dakikalık bir ders: bir vakıf eseri, beş adımlık akış,
 *     karışık egzersiz tipleri."
 *  - "Öğrenme Yolu — her şehir bir ünite, her eser bir ders"
 *  - "Vakıf Röntgeni — ürünün ayırt edici özelliği"
 *  - "Bina künyesi ve oranlar örnektir; gerçek üründe her değer vakfiye
 *     belgesinden alınır ve arşiv numarasıyla gösterilir."
 */

// ---------------------------------------------------------------------------
// Kaynak ve doğrulama
// ---------------------------------------------------------------------------

/** Bir bilginin kaynak künyesi. PDF: "Her eser kaynağıyla öğretilir." */
export interface Kaynak {
  kunye: string;
  url?: string | null;
}

/**
 * Gelir dağılımının belgelenip belgelenmediği.
 * PDF ilkesi: "doğrulanmamış hiçbir bilgi kesin bilgi olarak sunulmaz."
 * Belge yoksa oran UYDURULMAZ; arayüz bunu açıkça söyler.
 */
export type GelirDurumu = 'belgeli' | 'belge-bulunamadi';

export interface Koordinat {
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Çekirdek varlıklar
// ---------------------------------------------------------------------------

export interface Sehir {
  id: string;
  ad: string;
  /** Öğrenme yolundaki sıra. Küçük olan önce açılır. */
  sira: number;
  aktif: boolean;
}

/** Külliye: birbirine bağlı eser grubu. PDF: "Sınıf birlikte bir külliyeyi tamamlar." */
export interface Kulliye {
  id: string;
  ad: string;
  sehirId: string;
  bani: string | null;
  aciklama: string | null;
}

/**
 * Gelir kaleminin hangi tarafı temsil ettiği.
 *
 * Vakfiye belgeleri iki şeyi ayrı ayrı kaydeder:
 *  · `gelir` — vakfa para **nereden** geliyor (köy mahsulü, han kirası, öşür)
 *  · `gider` — vakıf geliri **nereye** harcanıyor (personel maaşı, bakım, burs)
 *
 * İkisi aynı paranın iki tarafıdır; toplamları **ayrı ayrı** %100 eder.
 * Tek dizide karıştırılırsa toplam %200 çıkar ve Röntgeni çubukları bozulur.
 */
export type GelirTipi = 'gelir' | 'gider';

/** Vakıf Röntgeni'ndeki tek bir gelir kalemi. */
export interface GelirKalemi {
  id: number;
  eserId: string;
  kalem: string;
  /** Yüzde. Belgelenmemişse null — asla tahmin edilmez. */
  yuzde: number | null;
  /** `gelir` = kaynak, `gider` = harcama yeri. Belirsizse null. */
  tip: GelirTipi | null;
  kaynak: string | null;
  sira: number;
}

/**
 * Fotoğraf galerisi kaydı.
 *
 * Vakıf Eserleri Envanter Projesi Bilgi Notu "fotoğraf galerileri"ni veri alanı
 * olarak sayıyor. Envanterde Hatay 2.600 · Konya 15.200 · Kütahya 11.871 ·
 * Bursa 34.952 fotoğraf karesi belgelenmiştir.
 *
 * `altMetin` ZORUNLUDUR — her görselin metin karşılığı olmalı (WCAG 1.1.1).
 */
export interface EserFotograf {
  id: string;
  eserId: string;
  url: string;
  altMetin: string;
  altMetinEn: string | null;
  kaynak: string | null;
  lisans: string | null;
  sira: number;
}

/**
 * Sergi kaydı.
 *
 * Bilgi Notu "sergi bilgileri"ni veri alanı olarak sayıyor. Envanter projesi
 * kapsamındaki sergiler: "5 Şubat Hatay", "Ayna" (Konya, 24 Ocak 2025),
 * Bursa'nın Fethinin 700. Yılı.
 */
export interface Sergi {
  id: string;
  ad: string;
  adEn: string | null;
  tarih: string | null;
  mekan: string | null;
  aciklama: string | null;
}

/** Taşınmaz vakıf eseri. */
export interface Eser {
  id: string;
  ad: string;
  /** İngilizce ad — envanter kitapları iki dilli basılır. */
  adEn: string | null;
  sehirId: string;
  kulliyeId: string | null;
  tur: string;
  ilce: string | null;
  koordinat: Koordinat | null;

  /** Kim yaptırdı? */
  bani: string | null;
  baniDonem: string | null;
  yapimYili: string | null;
  /** Neden yaptırdı? (vakfiyedeki amaç) */
  vakfiyeAmaci: string | null;
  /** Kime fayda sağladı? */
  hizmet: string | null;
  /** Bugün ne oldu? */
  bugunNeOldu: string | null;

  /**
   * Tarihçe — Bilgi Notu: "eserlerin tarihçeleri Türkçe ve İngilizce olarak
   * hazırlanmakta". Envanter kitapları iki dilli basılır.
   */
  tarihce: string | null;
  tarihceEn: string | null;

  gelirDagilimiDurumu: GelirDurumu;
  /** Vakfiye arşiv numarası (VGM Vakıf Kayıtlar Arşivi vb.) */
  arsivNo: string | null;
  kaynaklar: Kaynak[];
  dogrulamaNotu: string | null;

  yayinda: boolean;
  gelirKalemleri: GelirKalemi[];
  /** Bilgi Notu veri alanı: "fotoğraf galerileri" */
  fotograflar: EserFotograf[];
  /** Bilgi Notu veri alanı: "sergi bilgileri" */
  sergiler: Sergi[];

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Ünite. PDF'te yol görselinde "Bursa Ünite 1/2/3" olarak geçer,
 * yol haritasında "80 eser, 3 ünite" denir.
 * NOT: PDF'teki "her şehir bir ünite" ifadesi bu görselle çelişir; geçerli
 * kabul edilen model: bir şehir birden fazla ünite içerir.
 */
export interface Unite {
  id: string;
  sehirId: string;
  ad: string;
  sira: number;
  aciklama: string | null;
}

// ---------------------------------------------------------------------------
// Ders — beş adım
// ---------------------------------------------------------------------------

/** 01 · MERAK — cezasız tahmin. "Hiçbir tahmin yanlış sayılmaz." */
export interface MerakAdimi {
  soru: string;
  secenekler: string[];
  /** Tahmin kaydedildikten sonra gösterilen köprü metni. */
  kopru: string;
}

/** 02 · BAĞLAM — öğretim. "Bilgi burada verilir." */
export interface KavramKarti {
  ad: string;
  aciklama: string;
  ornek?: string | null;
}

export interface BaglamAdimi {
  baslik: string;
  metin: string;
  kavramlar: KavramKarti[];
  kapanis: string;
}

/** 03 · PERSPEKTİF — tek karar anı. "Sonucu gösterilir." */
export interface DiyalogSatiri {
  kim: string;
  metin: string;
  /** true ise sağdan (kullanıcı) gösterilir. */
  ben?: boolean;
}

export interface PerspektifSecenek {
  metin: string;
  /** Seçim yapıldıktan sonra gösterilen sonuç. */
  sonuc: string;
  dogruMu: boolean;
}

export interface PerspektifAdimi {
  baslik: string;
  diyalog: DiyalogSatiri[];
  soru: string;
  secenekler: PerspektifSecenek[];
}

// --- 04 · GERİ ÇAĞIRMA — egzersizler ---------------------------------------

/**
 * Dört egzersiz tipi (PDF: "Eşleştir", "Dinle ve seç", "Sırala", "Boşluğu doldur").
 *
 * SES NOTU: PDF ayrıca "Altyazı ve sessiz mod: ses olmadan da akışın tamamı
 * bitirilebilir" diyor. Bu yüzden "dinle-sec" egzersizinin ses gerektirmeyen
 * eşdeğeri zorunludur ve MVP'de "eser-tani" tipi olarak uygulanır. TTS
 * eklendiğinde aynı egzersiz sesli ipucuyla da sunulabilir.
 */
export type EgzersizTipi = 'eslestir' | 'sirala' | 'bosluk-doldur' | 'eser-tani';

/** Eşleştir: öğeleri doğru kategoriye yerleştir. Örn. "Hayrat mı, akar mı?" */
export interface EslestirVerisi {
  yonerge: string;
  kategoriler: { id: string; ad: string; aciklama?: string }[];
  ogeler: { metin: string; kategoriId: string }[];
}

/** Sırala: öğeleri doğru sıraya koy. Örn. vakfiyedeki gelir dağılımı. */
export interface SiralaVerisi {
  yonerge: string;
  /** Dizi sırası DOĞRU sıradır; arayüz karıştırarak sunar. */
  dogruSira: string[];
}

/** Boşluğu doldur: cümledeki eksik kavramı tamamla. */
export interface BoslukVerisi {
  yonerge: string;
  /** Boşluk `___` ile işaretlenir. */
  metin: string;
  cevap: string;
  /** Varsa seçenekli sunulur (klavye dostu); yoksa serbest metin. */
  secenekler?: string[];
}

/** Eseri tanı: betimlemeyi oku, doğru eseri işaretle (dinle-seç'in sessiz eşdeğeri). */
export interface EserTaniVerisi {
  yonerge: string;
  betimleme: string;
  secenekler: string[];
  dogruIndex: number;
}

export interface EgzersizVeriHaritasi {
  eslestir: EslestirVerisi;
  sirala: SiralaVerisi;
  'bosluk-doldur': BoslukVerisi;
  'eser-tani': EserTaniVerisi;
}

export interface Egzersiz<T extends EgzersizTipi = EgzersizTipi> {
  id: string;
  tip: T;
  sira: number;
  veri: EgzersizVeriHaritasi[T];
  /** Kaynak künyesi — PDF: kaynak bilgisi gösterilmeli. */
  kaynak: string | null;
}

/** 05 · YANSIMA — ders özeti + Vakıf Röntgeni + Kâşif Defteri kaydı. */
export interface YansimaAdimi {
  ozet: string;
  /** Vakıf Röntgeni'nde gösterilen soru. Örn. "Bu hanın kirası nereye gidiyordu?" */
  rontgenSorusu: string;
  rontgenAciklama: string;
  /** Kaynak künyesi ekranda görünür. */
  kaynakKunye: string;
}

export interface Ders {
  id: string;
  uniteId: string;
  eserId: string;
  sira: number;
  merak: MerakAdimi;
  baglam: BaglamAdimi;
  perspektif: PerspektifAdimi;
  yansima: YansimaAdimi;
  egzersizler: Egzersiz[];
  /** İlişkili eser özeti (liste görünümleri için). */
  eser?: Pick<Eser, 'id' | 'ad' | 'tur' | 'sehirId' | 'gelirDagilimiDurumu'>;
}

// ---------------------------------------------------------------------------
// Öğrenme yolu
// ---------------------------------------------------------------------------

export interface YolDersi {
  dersId: string;
  eserId: string;
  eserAdi: string;
  tur: string;
  sira: number;
  tamamlandi: boolean;
}

export interface YolUnitesi {
  uniteId: string;
  ad: string;
  sira: number;
  dersler: YolDersi[];
  tamamlananSayi: number;
  toplamSayi: number;
  kilitli: boolean;
  aktif: boolean;
}

export interface YolSehri {
  sehirId: string;
  ad: string;
  sira: number;
  uniteler: YolUnitesi[];
  tamamlananSayi: number;
  toplamSayi: number;
  kilitli: boolean;
  /** PDF: "Bir öğrencinin bir şehri uçtan uca tamamlaması" — Kuzey Yıldızı metriği. */
  tamamlandi: boolean;
}

export interface OgrenmeYolu {
  sehirler: YolSehri[];
  guncelDersId: string | null;
}

// ---------------------------------------------------------------------------
// İlerleme (cihaz-yerel, anonim — PDF: "kişisel veri toplanmaz")
// ---------------------------------------------------------------------------

export type Seviye = 'cirak' | 'kalfa' | 'usta';

export interface SeviyeBilgisi {
  anahtar: Seviye;
  ad: string;
  sonrakiEsik: number | null;
  kalanDers: number | null;
}

export interface Ilerleme {
  /** Tamamlanan ders id'leri. */
  tamamlananDersler: string[];
  /** Vakıf Röntgeni açılan eser id'leri (Kâşif Defteri sayfaları). */
  defterSayfalari: string[];
  elmas: number;
  seri: {
    gunSayisi: number;
    /** YYYY-MM-DD */
    sonTarih: string | null;
  };
  /** Erişilebilirlik ayarları da cihazda tutulur. */
  ayarlar: Ayarlar;
  sinifKodu: string | null;
}

export interface Ayarlar {
  tema: 'acik' | 'koyu' | 'yuksek-kontrast';
  renkKorlugu: 'yok' | 'protanopi' | 'döteranopi' | 'tritanopi';
  yaziBoyutu: number;
  hareketAzalt: boolean;
  /** Ses olmadan kullanım — PDF: "sessiz mod". */
  sessizMod: boolean;
}

// ---------------------------------------------------------------------------
// Yardımcı sonuç tipleri
// ---------------------------------------------------------------------------

export interface ApiHatasi {
  hata: string;
  detay?: string;
}

/**
 * Uygulama kullanıcısı rolleri.
 *
 * ⚠️ YALNIZCA YETİŞKİN rolleri vardır. Çocuk hesabı YOKTUR — PDF: "Kişisel
 * veri toplanmaz, sınıf kodu anonim". Çocuklar cihaz-yerel anonim profille
 * ilerler; sunucuda çocuğa ait hiçbir kayıt tutulmaz.
 */
export type Rol = 'admin' | 'ogretmen';

/** Seviye eşikleri — tek kaynak, hem istemci hem testler kullanır. */
export const SEVIYE_ESIKLERI: { anahtar: Seviye; ad: string; esik: number }[] = [
  { anahtar: 'cirak', ad: 'Çırak', esik: 0 },
  { anahtar: 'kalfa', ad: 'Kalfa', esik: 6 },
  { anahtar: 'usta', ad: 'Usta', esik: 12 },
];

/** Ders bitirince kazanılan elmas. */
export const ELMAS_ODULU = 10;
