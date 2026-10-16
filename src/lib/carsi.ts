/**
 * VAKIF ÇARŞISI — elmasın harcandığı yer.
 *
 * Başvuru PDF'i:
 *  - s. 2: "Elmas: ders bitirince kazanılır; yeni şehir paketleri ve ek
 *    seferler için kullanılır."
 *  - s. 3: "Kozmetik ve konfor için harcanır: Kâşif Defteri teması, avatar,
 *    ek ipucu, çevrimdışı paket."
 *  - s. 3 İLKE: "Ana öğrenme yolu her zaman ücretsizdir — hiçbir çocuk
 *    içerikten mahrum kalmaz. Satın almalar platform kuralı gereği veli
 *    onaylıdır."
 *  - s. 1: "Kazanç rozet değil, aidiyet." · s. 2: "Yanlış ceza değil … kalp gitmez."
 *
 * PEDAGOJİK KURALLAR (kodla korunur, testlerle doğrulanır):
 *  1. Elmas YALNIZCA ders bitirerek kazanılır. MVP'de gerçek parayla satın
 *     alma yoktur; eklenirse veli onayı zorunludur (PDF).
 *  2. Elmas hiçbir zaman kaybedilmez ya da ceza olarak düşülmez.
 *  3. Elmasla BİLGİ satın alınmaz, öğrenme yolu kilitlenmez. Her şehir
 *     sırayla ücretsiz açılır; "şehir paketi" yalnızca bir şehri ERKEN açar
 *     (özerklik: "hangi eseri keşfedeceğini çocuk seçer").
 *  4. Ek ipucu yalnızca bir deneme yapıldıktan sonra kullanılabilir (önce
 *     dene, sonra destek — Kapur 2014) ve kullanılırsa o soru aralıklı
 *     tekrarda "ipucuyla çözüldü" sayılır, yani daha erken yeniden sorulur.
 *  5. Ücretsiz ipucu her yanlışta zaten gelir; ek ipucu bunun ÜSTÜNE,
 *     dersin kavram kartlarını yeniden gösterir.
 *
 * Saklama: yalnızca cihazda (localStorage) — ilerleme ile aynı gizlilik ilkesi.
 */

export type UrunTuru = 'avatar' | 'defter-temasi' | 'ipucu' | 'cevrimdisi' | 'sehir';

export interface Urun {
  id: string;
  tur: UrunTuru;
  ad: string;
  aciklama: string;
  fiyat: number;
}

export const AVATARLAR: Urun[] = [
  { id: 'avatar-yildiz', tur: 'avatar', ad: 'Sekiz köşeli yıldız', aciklama: 'Selçuklu taç kapılarındaki yıldız.', fiyat: 0 },
  { id: 'avatar-kubbe', tur: 'avatar', ad: 'Kubbe', aciklama: 'Kurşun kaplı bir cami kubbesi.', fiyat: 20 },
  { id: 'avatar-lale', tur: 'avatar', ad: 'Lale', aciklama: 'İznik çinilerinin en sevilen çiçeği.', fiyat: 20 },
  { id: 'avatar-kandil', tur: 'avatar', ad: 'Kandil', aciklama: 'Caminin yağıyla yanan ışık.', fiyat: 20 },
  { id: 'avatar-ibrik', tur: 'avatar', ad: 'İbrik', aciklama: 'Çeşmeden su taşıyan kap.', fiyat: 20 },
  { id: 'avatar-anahtar', tur: 'avatar', ad: 'Han anahtarı', aciklama: 'Kervansarayın büyük kapısı için.', fiyat: 30 },
];

export const DEFTER_TEMALARI: Urun[] = [
  { id: 'tema-cini', tur: 'defter-temasi', ad: 'Çini', aciklama: 'Turkuaz ve kobalt — varsayılan defter.', fiyat: 0 },
  { id: 'tema-ebru', tur: 'defter-temasi', ad: 'Ebru', aciklama: 'Kobalt ve mürekkep dalgaları.', fiyat: 40 },
  { id: 'tema-kalemisi', tur: 'defter-temasi', ad: 'Kalem işi', aciklama: 'Kubbe içi süslemelerinden altın ve kırmızı.', fiyat: 40 },
];

export const IPUCU_PAKETI: Urun = {
  id: 'ipucu-3',
  tur: 'ipucu',
  ad: '3 ek ipucu',
  aciklama: 'Bir soruda takılırsan dersin kavram kartlarını yeniden açar.',
  fiyat: 15,
};

export const CEVRIMDISI_FIYAT = 20;
export const SEHIR_PAKETI_FIYAT = 60;

export interface CarsiDurumu {
  surum: 1;
  /** Satın alınmış avatar ve tema kimlikleri (ücretsizler her zaman sahiptir). */
  sahipOlunan: string[];
  avatar: string;
  defterTemasi: string;
  ipucuHakki: number;
  /** Elmasla erken açılmış şehirler. */
  acikSehirler: string[];
  /** Çevrimdışı paketi indirilmiş şehirler. */
  cevrimdisiSehirler: string[];
}

export const CARSI_ANAHTARI = 'kokavi.carsi.v1';

export function bosCarsiDurumu(): CarsiDurumu {
  return {
    surum: 1,
    sahipOlunan: [],
    avatar: 'avatar-yildiz',
    defterTemasi: 'tema-cini',
    ipucuHakki: 0,
    acikSehirler: [],
    cevrimdisiSehirler: [],
  };
}

export function sahipMi(durum: CarsiDurumu, urun: Urun): boolean {
  return urun.fiyat === 0 || durum.sahipOlunan.includes(urun.id);
}

export type SatinAlmaSonucu =
  | { tamam: true; durum: CarsiDurumu; kalanElmas: number }
  | { tamam: false; neden: 'yetersiz-elmas' | 'zaten-sahip' | 'gecersiz' };

/** Saf satın alma: elmas yetmiyorsa hiçbir şey değişmez. */
export function satinAl(
  durum: CarsiDurumu,
  elmas: number,
  urun: Urun,
  hedefSehirId?: string,
): SatinAlmaSonucu {
  if (!Number.isFinite(urun.fiyat) || urun.fiyat < 0) return { tamam: false, neden: 'gecersiz' };

  if ((urun.tur === 'avatar' || urun.tur === 'defter-temasi') && sahipMi(durum, urun)) {
    return { tamam: false, neden: 'zaten-sahip' };
  }
  if (urun.tur === 'sehir' || urun.tur === 'cevrimdisi') {
    if (!hedefSehirId) return { tamam: false, neden: 'gecersiz' };
    const liste = urun.tur === 'sehir' ? durum.acikSehirler : durum.cevrimdisiSehirler;
    if (liste.includes(hedefSehirId)) return { tamam: false, neden: 'zaten-sahip' };
  }
  if (elmas < urun.fiyat) return { tamam: false, neden: 'yetersiz-elmas' };

  let yeni: CarsiDurumu = durum;
  switch (urun.tur) {
    case 'avatar':
      yeni = { ...durum, sahipOlunan: [...durum.sahipOlunan, urun.id], avatar: urun.id };
      break;
    case 'defter-temasi':
      yeni = { ...durum, sahipOlunan: [...durum.sahipOlunan, urun.id], defterTemasi: urun.id };
      break;
    case 'ipucu':
      yeni = { ...durum, ipucuHakki: durum.ipucuHakki + 3 };
      break;
    case 'sehir':
      yeni = { ...durum, acikSehirler: [...durum.acikSehirler, hedefSehirId!] };
      break;
    case 'cevrimdisi':
      yeni = { ...durum, cevrimdisiSehirler: [...durum.cevrimdisiSehirler, hedefSehirId!] };
      break;
  }
  return { tamam: true, durum: yeni, kalanElmas: elmas - urun.fiyat };
}

/** Sahip olunan avatar/tema seçilir (ücretsiz). */
export function sec(durum: CarsiDurumu, urun: Urun): CarsiDurumu {
  if (!sahipMi(durum, urun)) return durum;
  if (urun.tur === 'avatar') return { ...durum, avatar: urun.id };
  if (urun.tur === 'defter-temasi') return { ...durum, defterTemasi: urun.id };
  return durum;
}

/** Ek ipucu kullanımı: hak yoksa durum değişmez. */
export function ipucuKullan(durum: CarsiDurumu): { durum: CarsiDurumu; kullanildi: boolean } {
  if (durum.ipucuHakki <= 0) return { durum, kullanildi: false };
  return { durum: { ...durum, ipucuHakki: durum.ipucuHakki - 1 }, kullanildi: true };
}

/* --- Şehir paketi: öğrenme yolunu ERKEN açar (hiç kilitlemez) ------------- */

interface YolBenzeri {
  sehirler: {
    sehirId: string;
    kilitli: boolean;
    uniteler: { kilitli: boolean; dersler: { tamamlandi: boolean }[] }[];
  }[];
}

/**
 * Elmasla açılan şehirlerde: ilk ünite açılır, sonraki üniteler o şehrin
 * içinde sırayla (öncekiler bitince) açılır. Normal yolla zaten açık olan
 * hiçbir şey kilitlenmez.
 */
export function sehirPaketleriniUygula<T extends YolBenzeri>(yol: T, acikSehirler: string[]): T {
  if (acikSehirler.length === 0) return yol;
  return {
    ...yol,
    sehirler: yol.sehirler.map((sehir) => {
      if (!acikSehirler.includes(sehir.sehirId)) return sehir;
      let oncekilerBitti = true;
      const uniteler = sehir.uniteler.map((unite) => {
        const kilitli = unite.kilitli && !oncekilerBitti;
        oncekilerBitti =
          oncekilerBitti && unite.dersler.length > 0 && unite.dersler.every((d) => d.tamamlandi);
        return { ...unite, kilitli };
      });
      return { ...sehir, kilitli: false, uniteler };
    }),
  };
}

/* --- Depolama -------------------------------------------------------------- */

function gecerliMi(veri: unknown): veri is CarsiDurumu {
  if (!veri || typeof veri !== 'object') return false;
  const d = veri as Partial<CarsiDurumu>;
  return (
    d.surum === 1 &&
    Array.isArray(d.sahipOlunan) &&
    Array.isArray(d.acikSehirler) &&
    Array.isArray(d.cevrimdisiSehirler) &&
    typeof d.ipucuHakki === 'number'
  );
}

export function carsiYukle(): CarsiDurumu {
  try {
    const ham = localStorage.getItem(CARSI_ANAHTARI);
    if (!ham) return bosCarsiDurumu();
    const veri: unknown = JSON.parse(ham);
    return gecerliMi(veri) ? { ...bosCarsiDurumu(), ...veri } : bosCarsiDurumu();
  } catch {
    return bosCarsiDurumu();
  }
}

export function carsiKaydet(durum: CarsiDurumu): void {
  try {
    localStorage.setItem(CARSI_ANAHTARI, JSON.stringify(durum));
  } catch {
    /* depolama kapalı */
  }
}

export function carsiSifirla(): void {
  try {
    localStorage.removeItem(CARSI_ANAHTARI);
  } catch {
    /* yok say */
  }
}

/* --- Çevrimdışı paket: bir şehrin derslerini cihaza indirir --------------- */

/** Service worker'ın çalışma zamanı önbelleğiyle aynı ad (vite.config.ts). */
export const API_ONBELLEK = 'kokavi-api';

/**
 * Şehrin tüm ders ve eser yanıtlarını önbelleğe yazar; internet yokken
 * service worker bunları sunar (PDF: "çevrimdışı ders desteği").
 * İlerleme her adımda bildirilir. Önbellek API'si yoksa (eski tarayıcı) yine
 * de ağdan çekilir ve tarayıcının HTTP önbelleğine kalır.
 */
export async function cevrimdisiIndir(
  dersIdler: string[],
  eserIdler: string[],
  ilerledi?: (bitti: number, toplam: number) => void,
): Promise<number> {
  const adresler = [
    ...dersIdler.map((id) => `/api/dersler/${encodeURIComponent(id)}`),
    ...eserIdler.map((id) => `/api/eserler/${encodeURIComponent(id)}`),
  ];
  const onbellek = typeof caches !== 'undefined' ? await caches.open(API_ONBELLEK) : null;
  let bitti = 0;
  for (const adres of adresler) {
    const cevap = await fetch(adres, { headers: { 'Content-Type': 'application/json' } });
    if (!cevap.ok) throw new Error(`İndirilemedi: ${adres}`);
    if (onbellek) await onbellek.put(adres, cevap.clone());
    bitti += 1;
    ilerledi?.(bitti, adresler.length);
  }
  return bitti;
}
