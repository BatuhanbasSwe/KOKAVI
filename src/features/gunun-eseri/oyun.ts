/**
 * Günün Eseri — Wordle tarzı günlük tahmin oyununun saf mantığı.
 *
 * Her gün HERKESE aynı eser gelir (sınıfta "bugünkünü bildin mi?" sohbeti
 * için). Eser sırası sabit tohumlu bir karıştırmayla belirlenir: 57 gün boyunca
 * hiçbir eser tekrar etmez. Sunucu gerekmez; çevrimdışı da oynanır.
 *
 * Tahmin yanlışsa bir ipucu daha açılır ve tahmin üç açıdan karşılaştırılır:
 * şehir, tür ve dönem ("aradığın eser daha eski/yeni"). Ceza yok: 6 hak bitse
 * de eser tanıtılır ve derse bağlantı verilir.
 */
import eserlerJson from './eserler.json';

export interface GununEseri {
  eserId: string;
  ad: string;
  kisaAd: string;
  sehir: string;
  kategori: string;
  yil: number;
  yaklasik: boolean;
  kullanim: string;
  zaman: string;
  yaptiran: string;
  kaynak: string;
}

export const ESERLER = eserlerJson as GununEseri[];
export const HAK = 6;
/** Bu kadar yıl yakınsa dönem "yakın" sayılır (aynı yüzyıl hissi). */
export const YAKIN_YIL = 50;

/** "2026-10-16" → 2026-01-01'den bu yana gün sayısı (oyun numarası). */
export function gunNumarasi(gunAnahtari: string): number {
  const [y, a, g] = gunAnahtari.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, a - 1, g) - Date.UTC(2026, 0, 1)) / 86_400_000);
}

function tohumlu(tohum: number): () => number {
  return () => {
    tohum = (tohum + 0x6d2b79f5) | 0;
    let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let sira: GununEseri[] | null = null;
/** Sabit karıştırma: herkes aynı sırayı görür; her 57 günlük turda her eser bir kez. */
function eserSirasi(): GununEseri[] {
  if (sira) return sira;
  const r = tohumlu(20261107); // final tarihi
  const kopya = [...ESERLER];
  for (let i = kopya.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kopya[i], kopya[j]] = [kopya[j]!, kopya[i]!];
  }
  return (sira = kopya);
}

export function gununEseri(no: number): GununEseri {
  const s = eserSirasi();
  return s[((no % s.length) + s.length) % s.length]!;
}

export function eserBul(eserId: string): GununEseri | undefined {
  return ESERLER.find((e) => e.eserId === eserId);
}

// --- İpuçları ------------------------------------------------------------------

export type Ipucu =
  | { tur: 'metin'; baslik: string; metin: string }
  | { tur: 'foto'; baslik: string; url: string };

/** Sırası: şehir → ne için kullanıldı → fotoğraf → zaman → ilk harf → kim yaptırdı. */
export function ipuclari(e: GununEseri): Ipucu[] {
  const harf = e.kisaAd.charAt(0).toLocaleUpperCase('tr');
  const kelime = e.kisaAd.split(/\s+/).length;
  return [
    { tur: 'metin', baslik: 'Şehir', metin: `Bu eser ${e.sehir} ilinde.` },
    { tur: 'metin', baslik: 'Ne için kullanıldı?', metin: e.kullanim },
    { tur: 'foto', baslik: 'Fotoğraf', url: `/gorseller/${e.eserId}/1.webp` },
    { tur: 'metin', baslik: 'Ne zaman?', metin: e.zaman },
    {
      tur: 'metin',
      baslik: 'Adı',
      metin: `Adı “${harf}” harfiyle başlıyor${kelime > 1 ? ` ve ${kelime} kelime` : ''}.`,
    },
    { tur: 'metin', baslik: 'Kim yaptırdı?', metin: e.yaptiran },
  ];
}

// --- Tahmin değerlendirme -----------------------------------------------------------

export type Donem = 'ayni' | 'yakin-eski' | 'yakin-yeni' | 'eski' | 'yeni';

export interface TahminSonucu {
  eserId: string;
  dogru: boolean;
  sehirAyni: boolean;
  turAyni: boolean;
  /** Aradığın eser, tahmininden daha ESKİ mi YENİ mi? */
  donem: Donem;
}

export function degerlendir(tahminId: string, hedef: GununEseri): TahminSonucu {
  const t = eserBul(tahminId);
  if (!t) throw new Error(`Bilinmeyen eser: ${tahminId}`);
  const fark = hedef.yil - t.yil;
  const donem: Donem =
    t.eserId === hedef.eserId || fark === 0
      ? 'ayni'
      : Math.abs(fark) <= YAKIN_YIL
        ? fark < 0
          ? 'yakin-eski'
          : 'yakin-yeni'
        : fark < 0
          ? 'eski'
          : 'yeni';
  return {
    eserId: t.eserId,
    dogru: t.eserId === hedef.eserId,
    sehirAyni: t.sehir === hedef.sehir,
    turAyni: t.kategori === hedef.kategori,
    donem,
  };
}

/** Türkçe büyük/küçük harf ve şapka duyarsız arama. */
export function normalle(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .trim();
}

export function oner(girdi: string, haric: Set<string>, sinir = 6): GununEseri[] {
  const n = normalle(girdi);
  if (n.length < 1) return [];
  const baslayan: GununEseri[] = [];
  const iceren: GununEseri[] = [];
  for (const e of ESERLER) {
    if (haric.has(e.eserId)) continue;
    const ad = normalle(e.ad);
    if (ad.startsWith(n) || normalle(e.kisaAd).startsWith(n)) baslayan.push(e);
    else if (ad.includes(n)) iceren.push(e);
  }
  return [...baslayan, ...iceren].slice(0, sinir);
}

// --- Paylaşım --------------------------------------------------------------------

const kare = (b: boolean) => (b ? '🟩' : '⬜');
const donemKaresi = (d: Donem) => (d === 'ayni' ? '🟩' : d.startsWith('yakin') ? '🟨' : '⬜');

/**
 * Wordle gibi yalnızca kareler: cevabı ele vermez, arkadaşına gönderilebilir.
 * Sütunlar: şehir · tür · dönem.
 */
export function paylasimMetni(no: number, sonuclar: TahminSonucu[], kazandi: boolean): string {
  const satirlar = sonuclar.map((s) =>
    s.dogru ? '🟩🟩🟩' : `${kare(s.sehirAyni)}${kare(s.turAyni)}${donemKaresi(s.donem)}`,
  );
  return [
    `Kök Avı · Günün Eseri #${no + 1} ${kazandi ? sonuclar.length : 'X'}/${HAK}`,
    ...satirlar,
  ].join('\n');
}

// --- Kayıt (yalnızca cihazda) ----------------------------------------------------------

export interface GunKaydi {
  gun: number;
  tahminler: string[];
}

export interface Istatistik {
  oynanan: number;
  kazanilan: number;
  seri: number;
  enIyiSeri: number;
  /** dagilim[i] = i+1 tahminde bilinen gün sayısı. */
  dagilim: number[];
  sonBitenGun: number | null;
}

export const bosIstatistik = (): Istatistik => ({
  oynanan: 0,
  kazanilan: 0,
  seri: 0,
  enIyiSeri: 0,
  dagilim: Array.from({ length: HAK }, () => 0),
  sonBitenGun: null,
});

/** Oyun bitince bir kez çağrılır; aynı gün iki kez sayılmaz. */
export function istatistikGuncelle(i: Istatistik, gun: number, kazandi: boolean, tahminSayisi: number): Istatistik {
  if (i.sonBitenGun === gun) return i;
  const ardisik = i.sonBitenGun === gun - 1;
  const seri = kazandi ? (ardisik ? i.seri + 1 : 1) : 0;
  const dagilim = [...i.dagilim];
  if (kazandi) dagilim[tahminSayisi - 1] = (dagilim[tahminSayisi - 1] ?? 0) + 1;
  return {
    oynanan: i.oynanan + 1,
    kazanilan: i.kazanilan + (kazandi ? 1 : 0),
    seri,
    enIyiSeri: Math.max(i.enIyiSeri, seri),
    dagilim,
    sonBitenGun: gun,
  };
}

const KAYIT = 'kokavi-gunun-eseri-v1';
const ISTATISTIK = 'kokavi-gunun-eseri-istatistik-v1';

function oku<T>(anahtar: string): T | null {
  try {
    const ham = localStorage.getItem(anahtar);
    return ham ? (JSON.parse(ham) as T) : null;
  } catch {
    return null;
  }
}
function yaz(anahtar: string, deger: unknown): void {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger));
  } catch {
    /* depolama kapalı: oyun yine oynanır, yalnızca hatırlanmaz */
  }
}

export const depo = {
  gunKaydi: (gun: number): GunKaydi => {
    const k = oku<GunKaydi>(KAYIT);
    return k && k.gun === gun && Array.isArray(k.tahminler) ? k : { gun, tahminler: [] };
  },
  gunKaydiYaz: (k: GunKaydi) => yaz(KAYIT, k),
  istatistik: (): Istatistik => ({ ...bosIstatistik(), ...(oku<Istatistik>(ISTATISTIK) ?? {}) }),
  istatistikYaz: (i: Istatistik) => yaz(ISTATISTIK, i),
};
