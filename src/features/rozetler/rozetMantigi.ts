/**
 * Başarım rozetleri — Duolingo'daki "başarılar".
 *
 * Rozetler İLERLEMEDEN HESAPLANIR, ayrıca saklanmaz; saklanan tek şey "bu
 * rozeti gördüm" bilgisi (bildirim bir kez çıksın diye) ve ilerlemede olmayan
 * birkaç sayaç (kusursuz ders, canlı yarışma podyumu). Hepsi cihazda; sunucuya
 * hiçbir şey gitmez.
 *
 * Kötü kurgu yok: rozet kaybedilmez, süre baskısı yoktur, karşılaştırma yoktur.
 */
import { SEVIYE_ESIKLERI, type Ilerleme, type OgrenmeYolu } from '@shared/types';
import { depo as gununEseriDeposu } from '../gunun-eseri/oyun';

export type RozetKategori = 'ders' | 'sehir' | 'seri' | 'oyun';

export interface Rozet {
  id: string;
  ad: string;
  aciklama: string;
  kategori: RozetKategori;
  /** Rozetin ortasındaki kısa işaret (1-2 karakter). */
  isaret: string;
}

export interface RozetGirdisi {
  ilerleme: Pick<Ilerleme, 'tamamlananDersler' | 'seri'>;
  yol: OgrenmeYolu | null;
  sayaclar: RozetSayaclari;
  gununEseri: { kazanilan: number; ilkTahmin: number };
}

export interface RozetSayaclari {
  /** Tüm egzersizleri ipucusuz bitirilen ders sayısı. */
  kusursuzDers: number;
  /** Canlı yarışmada ilk üçe girme sayısı. */
  podyum: number;
}

const SEHIR_ROZETI = (id: string, ad: string): Rozet => ({
  id: `sehir-${id}`,
  ad: `${ad} Kâşifi`,
  aciklama: `${ad} şehrindeki bütün dersleri bitir.`,
  kategori: 'sehir',
  isaret: ad.charAt(0),
});

/** Sabit rozetler; şehir rozetleri yoldan üretilir. */
export const SABIT_ROZETLER: Rozet[] = [
  { id: 'ilk-ders', ad: 'İlk Adım', aciklama: 'İlk dersini bitir.', kategori: 'ders', isaret: '1' },
  { id: 'bes-ders', ad: 'Meraklı Kâşif', aciklama: '5 ders bitir.', kategori: 'ders', isaret: '5' },
  {
    id: 'seviye-kalfa',
    ad: 'Kalfa Oldun!',
    aciklama: `${SEVIYE_ESIKLERI[1]!.esik} ders bitirip Çıraklıktan Kalfalığa yüksel.`,
    kategori: 'ders',
    isaret: 'K',
  },
  {
    id: 'seviye-usta',
    ad: 'Usta Oldun!',
    aciklama: `${SEVIYE_ESIKLERI[2]!.esik} ders bitirip Usta ol.`,
    kategori: 'ders',
    isaret: 'U',
  },
  { id: 'yirmi-ders', ad: 'Vakıf Uzmanı', aciklama: '20 ders bitir.', kategori: 'ders', isaret: '20' },
  { id: 'tum-dersler', ad: 'Büyük Kâşif', aciklama: 'Bütün dersleri bitir.', kategori: 'ders', isaret: '★' },
  { id: 'seri-3', ad: 'Üç Gün Üst Üste', aciklama: '3 gün üst üste ders yap.', kategori: 'seri', isaret: '3' },
  { id: 'seri-7', ad: 'Bir Hafta Boyunca', aciklama: '7 gün üst üste ders yap.', kategori: 'seri', isaret: '7' },
  {
    id: 'kusursuz',
    ad: 'Kusursuz Ders',
    aciklama: 'Bir dersin bütün egzersizlerini ipucu almadan çöz.',
    kategori: 'oyun',
    isaret: '✓',
  },
  {
    id: 'dedektif',
    ad: 'Dedektif',
    aciklama: 'Günün Eseri\'ni ilk tahminde bil.',
    kategori: 'oyun',
    isaret: '?',
  },
  {
    id: 'gunluk-5',
    ad: 'Günlük Avcı',
    aciklama: 'Günün Eseri\'ni 5 kez bil.',
    kategori: 'oyun',
    isaret: '5',
  },
  {
    id: 'podyum',
    ad: 'Sınıfın Yıldızı',
    aciklama: 'Canlı sınıf yarışmasında ilk üçe gir.',
    kategori: 'oyun',
    isaret: '▲',
  },
];

export function tumRozetler(yol: OgrenmeYolu | null): Rozet[] {
  const sehirler = (yol?.sehirler ?? []).map((s) => SEHIR_ROZETI(s.sehirId, s.ad));
  const [ilk, ...geri] = SABIT_ROZETLER;
  // Sıra: ders rozetleri, şehirler, sonra diğerleri.
  return [ilk!, ...geri.filter((r) => r.kategori === 'ders'), ...sehirler, ...geri.filter((r) => r.kategori !== 'ders')];
}

/** Kazanılmış rozet kimlikleri. Saf fonksiyon: aynı girdi → aynı çıktı. */
export function kazanilanlar(g: RozetGirdisi): Set<string> {
  const k = new Set<string>();
  const n = g.ilerleme.tamamlananDersler.length;
  const toplam = (g.yol?.sehirler ?? []).reduce((t, s) => t + s.toplamSayi, 0);
  if (n >= 1) k.add('ilk-ders');
  if (n >= 5) k.add('bes-ders');
  if (n >= SEVIYE_ESIKLERI[1]!.esik) k.add('seviye-kalfa');
  if (n >= SEVIYE_ESIKLERI[2]!.esik) k.add('seviye-usta');
  if (n >= 20) k.add('yirmi-ders');
  if (toplam > 0 && n >= toplam) k.add('tum-dersler');
  for (const s of g.yol?.sehirler ?? []) if (s.toplamSayi > 0 && s.tamamlananSayi >= s.toplamSayi) k.add(`sehir-${s.sehirId}`);
  if (g.ilerleme.seri.gunSayisi >= 3) k.add('seri-3');
  if (g.ilerleme.seri.gunSayisi >= 7) k.add('seri-7');
  if (g.sayaclar.kusursuzDers >= 1) k.add('kusursuz');
  if (g.gununEseri.ilkTahmin >= 1) k.add('dedektif');
  if (g.gununEseri.kazanilan >= 5) k.add('gunluk-5');
  if (g.sayaclar.podyum >= 1) k.add('podyum');
  return k;
}

// --- Cihaz deposu -------------------------------------------------------------

const SAYAC = 'kokavi-rozet-sayaclari-v1';
const GORULEN = 'kokavi-rozet-gorulen-v1';
/** Sayaç değişince açık ekranlar (bildirim izleyicisi) yeniden hesaplasın. */
export const ROZET_OLAYI = 'kokavi-rozet';

function oku<T>(a: string, varsayilan: T): T {
  try {
    const h = localStorage.getItem(a);
    return h ? { ...varsayilan, ...(JSON.parse(h) as T) } : varsayilan;
  } catch {
    return varsayilan;
  }
}
function yaz(a: string, d: unknown) {
  try {
    localStorage.setItem(a, JSON.stringify(d));
  } catch {
    /* depolama kapalı */
  }
}

export function sayaclariOku(): RozetSayaclari {
  return oku<RozetSayaclari>(SAYAC, { kusursuzDers: 0, podyum: 0 });
}

export function sayacArtir(ad: keyof RozetSayaclari): void {
  const s = sayaclariOku();
  s[ad] += 1;
  yaz(SAYAC, s);
  try {
    window.dispatchEvent(new Event(ROZET_OLAYI));
  } catch {
    /* sunucu tarafı */
  }
}

export function gorulenleriOku(): Set<string> {
  return new Set(oku<{ liste: string[] }>(GORULEN, { liste: [] }).liste);
}
export function gorulenleriYaz(s: Set<string>): void {
  yaz(GORULEN, { liste: [...s] });
}

/** Günün Eseri istatistiğinden rozet girdisi (dağılımın ilk hücresi = ilk tahmin). */
export function gununEseriOzeti(): RozetGirdisi['gununEseri'] {
  const i = gununEseriDeposu.istatistik();
  return { kazanilan: i.kazanilan, ilkTahmin: i.dagilim[0] ?? 0 };
}
