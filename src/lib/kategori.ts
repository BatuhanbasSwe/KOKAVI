/**
 * Eser KATEGORİLERİ — ham `tur` metnini çocuğun anlayacağı 11 türe indirger.
 *
 * Neden: sunucudan gelen `tur` alanı serbest metindir ve envanter kitaplarının
 * dilini taşır ("Cami ve külliye (cami, medrese, şadırvan, türbeler)", "Han/
 * kervansaray (menzil külliyesi: kervansaray, cami ve hamam)"). Bir çocuğun
 * "Ne arıyorsun?" sorusuna cevap verebilmesi için bunları sabit ve kısa
 * kategorilere indirmek gerekir (Batu geri bildirimi: "kategori mantığı
 * getirilebilir camii medrese gibi").
 *
 * SINIFLANDIRMA KURALI — tür metninin İLK kavram kelimesi kazanır:
 *   "Cami ve külliye (cami, medrese, şadırvan)" → Cami
 *   "Külliye (cami, türbe, bedesten, hamam)"   → Külliye
 *   "Mescit ve türbe"                          → Mescit
 *   "Han/kervansaray (menzil külliyesi...)"    → Han / Kervansaray
 *
 * Veri katmanı DEĞİŞMEZ: kategori tamamen istemcide, `Eser.tur` üzerinden
 * hesaplanır. Sunucuya, `server/**` veya `data/**` dosyalarına dokunulmaz.
 *
 * Bilinçli karar: kategoriler listesinde karşılığı olmayan türler (Bedesten,
 * İmaret, Mektep, "Sosyal yardım yapısı") "Diğer" olur. Bunları zorla bir
 * kategoriye yazmak (ör. Mektep → Medrese) tarihî olarak yanlış olurdu.
 *
 * Not: Türkçe karakter normalizasyonu `src/app/Ikonlar.tsx` içindeki
 * `turAnahtari()` desenini örnek alır; o dosya bu iş için DEĞİŞTİRİLMEZ.
 */

/**
 * Arayüzde gösterilecek kategori sırası: en sık rastlanan yapılar önce,
 * "Diğer" her zaman en sonda. Tek kaynak burasıdır; harita süzgeci ile
 * defter gruplaması aynı listeyi kullanır.
 */
export const KATEGORILER = [
  'Cami',
  'Medrese',
  'Han / Kervansaray',
  'Hamam',
  'Türbe',
  'Çeşme',
  'Köprü',
  'Kilise',
  'Külliye',
  'Mescit',
  'Diğer',
] as const;

export type Kategori = (typeof KATEGORILER)[number];

/**
 * Kavram kelimesi → kategori eşlemesi.
 *
 * Anahtarlar sadeleştirilmiş (ASCII) metindir; ek alan biçimler de yakalanır:
 * "camisi", "medresesi", "külliyesi", "hamamı" gibi. Sıra, önek eşleşmesinde
 * önceliği belirler; bu yüzden tam kelime eşleşmesi her zaman öne alınır.
 */
const KAVRAMLAR: Record<string, Kategori> = {
  cami: 'Cami',
  medrese: 'Medrese',
  han: 'Han / Kervansaray',
  kervansaray: 'Han / Kervansaray',
  hamam: 'Hamam',
  turbe: 'Türbe',
  cesme: 'Çeşme',
  kopru: 'Köprü',
  kilise: 'Kilise',
  kulliye: 'Külliye',
  mescit: 'Mescit',
};

/** Türkçe harflerin ASCII karşılığı (İ ayrıca küçük harfe çevrilir). */
const HARF_ESLEMESI: Record<string, string> = {
  ç: 'c',
  ş: 's',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ü: 'u',
  İ: 'i',
};

/**
 * Türkçe metni karşılaştırmaya hazırlar. `â`, `î`, `û` gibi inceltme
 * işaretleri NFD ayrıştırmasıyla atılır; böylece "dârülkurrâ" da okunur.
 */
function sadele(metin: string): string {
  return metin
    .toLocaleLowerCase('tr')
    .replace(/[çşğıöüİ]/g, (harf) => HARF_ESLEMESI[harf] ?? harf)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ham `tur` metnini kategoriye indirger. Boş, tanınmayan veya tanımsız tür
 * "Diğer" olur; hiçbir durumda istisna atılmaz (arayüz çökmemeli).
 */
export function kategoriBul(tur: string | null | undefined): Kategori {
  const kelimeler = sadele(tur ?? '')
    .split(/[^a-z0-9]+/)
    .filter((kelime) => kelime !== '');
  if (kelimeler.length === 0) return 'Diğer';

  // 1) İlk kavram kelimesi: tam eşleşme.
  for (const kelime of kelimeler) {
    const kategori = KAVRAMLAR[kelime];
    if (kategori) return kategori;
  }

  // 2) Ek alan kelimeler ("camisi", "külliyesi", "medresesi").
  for (const kelime of kelimeler) {
    for (const [kavram, kategori] of Object.entries(KAVRAMLAR)) {
      if (kelime.startsWith(kavram)) return kategori;
    }
  }

  return 'Diğer';
}

export interface KategoriSayisi {
  kategori: Kategori;
  sayi: number;
}

/**
 * `{tur, sayi}` listesini kategoriye göre toplar (harita süzgeci rozetleri).
 * Sayısı 0 olan kategori listelenmez; sıra `KATEGORILER` sırasıdır.
 */
export function kategoriSayilari(turler: readonly { tur: string; sayi: number }[]): KategoriSayisi[] {
  const sayac = new Map<Kategori, number>();
  for (const { tur, sayi } of turler) {
    if (!Number.isFinite(sayi) || sayi <= 0) continue;
    const kategori = kategoriBul(tur);
    sayac.set(kategori, (sayac.get(kategori) ?? 0) + sayi);
  }

  return KATEGORILER.flatMap((kategori) => {
    const sayi = sayac.get(kategori) ?? 0;
    return sayi > 0 ? [{ kategori, sayi }] : [];
  });
}

export interface KategoriGrubu<T> {
  kategori: Kategori;
  ogeler: T[];
}

/**
 * Listeyi kategoriye göre gruplar (defter pul albümü). Boş grup üretilmez;
 * grup sırası `KATEGORILER` sırasıdır. Girdi sırası grup içinde korunur.
 */
export function kategoriyeGoreGrupla<T>(
  liste: readonly T[],
  turAl: (oge: T) => string,
): KategoriGrubu<T>[] {
  const gruplar = new Map<Kategori, T[]>();
  for (const oge of liste) {
    const kategori = kategoriBul(turAl(oge));
    const dizi = gruplar.get(kategori);
    if (dizi) dizi.push(oge);
    else gruplar.set(kategori, [oge]);
  }

  return KATEGORILER.flatMap((kategori) => {
    const ogeler = gruplar.get(kategori);
    return ogeler ? [{ kategori, ogeler }] : [];
  });
}
