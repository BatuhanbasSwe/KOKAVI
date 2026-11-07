/**
 * Öğretmen paneli + sınıf katılımı için API istemcisi.
 *
 * 🔒 GİZLİLİK SÖZLEŞMESİ (ürünün dürüstlük ilkesi)
 * Sunucu yalnızca SAYAÇ tutar: "bu sınıfta bu ders kaç kez tamamlandı".
 * Kimin tamamladığı BİLİNMEZ ve bilinemez. Bu yüzden buradaki hiçbir alan bir
 * kişiyi temsil etmez:
 *   ✓ toplamTamamlama      → tüm derslerin toplam tamamlama sayısı
 *   ✓ tamamlananDersCesidi → en az bir kez tamamlanmış FARKLI ders sayısı
 *   ✗ öğrenci sayısı, isim, e-posta, cihaz kimliği → sunucuda yoktur, burada da yoktur.
 *
 * Oturum httpOnly çerezde tutulur (bkz. `src/lib/oturum.ts`); JavaScript onu
 * okuyamaz. Bu yüzden her istek `credentials: 'include'` taşır.
 */

// ---------------------------------------------------------------------------
// Sunucu sözleşmesi
// ---------------------------------------------------------------------------

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
  /** Ders kimliği → toplam tamamlama sayısı. */
  dersSayilari: Record<string, number>;
  /** Tüm derslerin toplam tamamlama sayısı — öğrenci sayısı DEĞİL. */
  toplamTamamlama: number;
  /** En az bir kez tamamlanmış farklı ders sayısı. */
  tamamlananDersCesidi: number;
}

export interface UniteIlerlemesi {
  uniteId: string;
  uniteAdi: string;
  sehirAdi: string;
  dersler: { dersId: string; eserId: string; eserAdi: string; sira: number; sayi: number }[];
  /** Bu ünitede en az bir kez tamamlanmış farklı ders sayısı. */
  tamamlananDersCesidi: number;
  toplamDers: number;
}

/**
 * Sınıfın bir külliyedeki ilerlemesi.
 *
 * PDF Senaryo B: "Sınıf birlikte bir külliyeyi tamamlar." Külliyeler yalnızca
 * kaynakta belgelenmiş bağlarla tanımlıdır; `hedefMi` yol sırasındaki ilk
 * tamamlanmamış külliyedir, öğretmen seçim yapmaz.
 */
export interface KulliyeIlerlemesi {
  id: string;
  ad: string;
  sehirId: string;
  toplamDers: number;
  tamamlananDersCesidi: number;
  hedefMi: boolean;
  tamamlandiMi: boolean;
}

/** `GET /api/sinif/:kod/rontgen` içindeki tek eser. */
export interface SinifRontgenEseri {
  dersId: string;
  eserId: string;
  eserAdi: string;
  tur: string;
  sehirAdi: string;
  uniteAdi: string;
  gelirDagilimiDurumu: 'belgeli' | 'belge-bulunamadi';
  gelirKalemleri: {
    id: number;
    eserId: string;
    kalem: string;
    yuzde: number | null;
    tip: 'gelir' | 'gider' | null;
    kaynak: string | null;
    sira: number;
  }[];
  /** Dersin Yansıma adımındaki resmî kaynak künyesi. */
  kaynakKunye: string | null;
}

/** Sınıfın birlikte açtığı Vakıf Röntgeni — yalnız toplu sayaç + yayın içeriği. */
export interface SinifRontgenCevabi {
  kod: string;
  ad: string;
  toplamTamamlama: number;
  tamamlananDersCesidi: number;
  kulliyeler: KulliyeIlerlemesi[];
  eserler: SinifRontgenEseri[];
}

/** `GET /api/ogretmen/siniflar` satırı: sınıf bilgisi + özet sayaçlar. */
export interface SinifOzeti extends Sinif {
  ozet: SinifIlerlemesi | null;
}

/** Takma adla katılan öğrencinin özeti (öğretmen ve yönetici görür). */
export interface OgrenciOzeti {
  takmaAd: string;
  katildi: string;
  tamamlananDers: number;
  sonEtkinlik: string | null;
  sonEser: string | null;
}

/** `GET /api/ogretmen/siniflar/:kod` gövdesi. */
export interface SinifDetayCevabi {
  ilerleme: SinifIlerlemesi;
  uniteler: UniteIlerlemesi[];
  kulliyeler: KulliyeIlerlemesi[];
  /** Takma adla katılanlar; katılmayanlar yalnızca anonim sayaçta. */
  ogrenciler?: OgrenciOzeti[];
}

/** `GET /api/yonetim/siniflar` satırı (yalnızca yönetici). */
export interface YonetimSinifRaporu {
  kod: string;
  ad: string;
  aktif: boolean;
  createdAt: string;
  ogretmen: string;
  toplamTamamlama: number;
  tamamlananDersCesidi: number;
  enCok: { eserAdi: string; sayi: number }[];
  ogrenciler: OgrenciOzeti[];
}

/** `GET /api/sinif/:kod` gövdesi — çocuğun gördüğü anonim özet. */
export interface KatilimBilgisi {
  kod: string;
  ad: string;
  toplamTamamlama: number;
  tamamlananDersCesidi: number;
}

// ---------------------------------------------------------------------------
// İstek katmanı
// ---------------------------------------------------------------------------

const TABAN = '/api';

/** Sunucudan gelen hata; `durum` HTTP kodudur (403 = başkasının sınıfı). */
export class ApiHatasi extends Error {
  readonly durum: number;

  constructor(mesaj: string, durum: number) {
    super(mesaj);
    this.name = 'ApiHatasi';
    this.durum = durum;
  }
}

async function iste<T>(yol: string, secenekler?: RequestInit): Promise<T> {
  let cevap: Response;
  try {
    cevap = await fetch(`${TABAN}${yol}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...secenekler,
    });
  } catch {
    throw new ApiHatasi('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.', 0);
  }

  if (!cevap.ok) {
    let mesaj = `İstek başarısız (HTTP ${cevap.status}).`;
    try {
      const govde = (await cevap.json()) as { hata?: unknown };
      if (typeof govde.hata === 'string' && govde.hata !== '') mesaj = govde.hata;
    } catch {
      /* Gövde JSON değilse varsayılan mesaj kalır. */
    }
    throw new ApiHatasi(mesaj, cevap.status);
  }

  return (await cevap.json()) as T;
}

/** Her hata türünü kullanıcıya gösterilebilir tek satıra indirir. */
export function hataMetni(hata: unknown): string {
  if (hata instanceof Error) return hata.message;
  return 'Beklenmeyen bir hata oluştu.';
}

// --- Öğretmen (giriş zorunlu) ----------------------------------------------

export const ogretmenApi = {
  /** Öğretmenin KENDİ sınıfları; her satırda özet sayaçlar gelir. */
  siniflariGetir: () => iste<SinifOzeti[]>('/ogretmen/siniflar'),

  sinifOlustur: (ad: string) =>
    iste<Sinif>('/ogretmen/siniflar', { method: 'POST', body: JSON.stringify({ ad }) }),

  /** Ünite/ders kırılımlı ilerleme. Başkasının sınıfı istenirse 403 döner. */
  sinifDetayiGetir: (kod: string) =>
    iste<SinifDetayCevabi>(`/ogretmen/siniflar/${encodeURIComponent(kod)}`),

  /** Sınıfı kapatır/açar. Geçmiş sayaçlar silinmez. */
  sinifDurumuDegistir: (kod: string, aktif: boolean) =>
    iste<{ tamam: boolean }>(`/ogretmen/siniflar/${encodeURIComponent(kod)}`, {
      method: 'PATCH',
      body: JSON.stringify({ aktif }),
    }),
};

// --- Çocuk tarafı (kimlik yok) ---------------------------------------------

export const katilimApi = {
  /** Kodu doğrular ve yalnızca toplu sayaçları döner. */
  sinifiSorgula: (kod: string) => iste<KatilimBilgisi>(`/sinif/${encodeURIComponent(kod)}`),

  /**
   * Sınıfın birlikte gördüğü eserlerin Vakıf Röntgeni — tahtada birlikte açılır.
   * Dönen veri yayın içeriği + toplu sayaçtır; çocuk kimliği yoktur.
   */
  sinifRontgeni: (kod: string) =>
    iste<SinifRontgenCevabi>(`/sinif/${encodeURIComponent(kod)}/rontgen`),

  /** İsteğe bağlı takma adla katılım; sunucu rastgele bir öğrenci kimliği döner. */
  takmaAdlaKatil: (kod: string, takmaAd: string) =>
    iste<{ ogrenciId: string; takmaAd: string }>(`/sinif/${encodeURIComponent(kod)}/ogrenci`, {
      method: 'POST',
      body: JSON.stringify({ takmaAd }),
    }),
};

// --- Yönetici -----------------------------------------------------------------

export const yonetimSinifApi = {
  /** Bütün sınıflar: anonim sayaçlar + takma adlı öğrenciler. */
  raporGetir: () => iste<YonetimSinifRaporu[]>('/yonetim/siniflar'),
};

// ---------------------------------------------------------------------------
// Biçimleme yardımcıları
// ---------------------------------------------------------------------------

/** Kodun yazılış örneği; etiketlerde ve ipuçlarında kullanılır. */
export const SINIF_KODU_ORNEK = 'XYZ-2345';

/** Kodu biçimlendirir: büyük harf + otomatik tire (XYZ-2345). */
export function sinifKoduBicimle(ham: string): string {
  const temiz = ham
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
  if (temiz.length <= 3) return temiz;
  return `${temiz.slice(0, 3)}-${temiz.slice(3)}`;
}

/** Biçim denetimi: 3 karakter, tire, 4 karakter. Sunucu ayrıca normalleştirir. */
export function sinifKoduGecerliMi(kod: string): boolean {
  return /^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(kod);
}

/** ISO tarihi okunur Türkçe tarihe çevirir; geçersizse boş metin döner. */
export function tarihBicimle(iso: string): string {
  const tarih = new Date(iso);
  if (Number.isNaN(tarih.getTime())) return '';
  return tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
