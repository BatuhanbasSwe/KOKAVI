/**
 * Başlangıç soruları (onboarding) cevapları.
 *
 * Gizlilik: yalnızca cihazda (localStorage) tutulur, sunucuya gitmez.
 * Ad, yaş, okul gibi kişisel veri sorulmaz; sınıf düzeyi bir aralıktır.
 * Depolama kapalı / bozuk olabilir (gizli pencere): her erişim try/catch içinde.
 */

export const TERCIH_ANAHTARI = 'kokavi.tercihler.v1';

export type Sinif = '4' | '5' | '6' | '7+' | 'yetiskin';
export type Ilgi = 'cami' | 'han' | 'hamam' | 'medrese' | 'cesme-kopru' | 'kulliye';
export type GunlukHedef = 5 | 10 | 15;
export type OnBilgi = 'yeni' | 'biraz' | 'cok';

export interface Tercihler {
  sinif: Sinif | null;
  ilgiler: Ilgi[];
  gunlukHedef: GunlukHedef | null;
  onBilgi: OnBilgi | null;
}

export const BOS_TERCIHLER: Tercihler = {
  sinif: null,
  ilgiler: [],
  gunlukHedef: null,
  onBilgi: null,
};

const SINIFLAR: readonly Sinif[] = ['4', '5', '6', '7+', 'yetiskin'];
const ILGILER: readonly Ilgi[] = ['cami', 'han', 'hamam', 'medrese', 'cesme-kopru', 'kulliye'];
const HEDEFLER: readonly GunlukHedef[] = [5, 10, 15];
const ON_BILGILER: readonly OnBilgi[] = ['yeni', 'biraz', 'cok'];

function birMi<T>(liste: readonly T[], deger: unknown): deger is T {
  return liste.includes(deger as T);
}

/** Bozuk ya da eski kaydı güvenli değerlere indirger. */
export function tercihleriTemizle(ham: unknown): Tercihler {
  if (!ham || typeof ham !== 'object') return { ...BOS_TERCIHLER };
  const k = ham as Record<string, unknown>;
  const ilgiler = Array.isArray(k.ilgiler)
    ? [...new Set(k.ilgiler.filter((i): i is Ilgi => birMi(ILGILER, i)))]
    : [];
  return {
    sinif: birMi(SINIFLAR, k.sinif) ? k.sinif : null,
    ilgiler,
    gunlukHedef: birMi(HEDEFLER, k.gunlukHedef) ? k.gunlukHedef : null,
    onBilgi: birMi(ON_BILGILER, k.onBilgi) ? k.onBilgi : null,
  };
}

/** Kayıt var mı? (Hepsi atlanmış olsa bile "yanıtlandı" sayılır.) */
export function tercihVarMi(): boolean {
  try {
    return localStorage.getItem(TERCIH_ANAHTARI) !== null;
  } catch {
    return false;
  }
}

export function tercihleriOku(): Tercihler {
  try {
    const ham = localStorage.getItem(TERCIH_ANAHTARI);
    return ham ? tercihleriTemizle(JSON.parse(ham)) : { ...BOS_TERCIHLER };
  } catch {
    return { ...BOS_TERCIHLER };
  }
}

export function tercihleriYaz(t: Tercihler): void {
  try {
    localStorage.setItem(TERCIH_ANAHTARI, JSON.stringify(tercihleriTemizle(t)));
  } catch {
    /* depolama kapalı: cevaplar yalnızca bu oturumda geçerli */
  }
}

/** Bir ders ~5 dakika: günlük hedefi ders sayısına çevirir. */
export function hedefDersSayisi(hedef: GunlukHedef): number {
  return Math.max(1, Math.round(hedef / 5));
}
