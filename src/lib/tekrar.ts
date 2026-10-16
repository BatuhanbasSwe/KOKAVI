/**
 * ARALIKLI TEKRAR — "öğrenilen nasıl kalıcı oluyor?" sorusunun cevabı.
 *
 * Başvuru PDF'i (s. 2): "Geri çağırma ölçme değil, öğrenme olayının kendisidir.
 * Aralıklı tekrar kavramı sonraki derste geri getirir."
 *
 * Model: Leitner kutuları.
 *  - Bir ders bitince kutu 0'a girer: İLK tekrar, bir SONRAKİ derste gelir
 *    (PDF'teki "sonraki derste geri getirir" cümlesinin birebir karşılığı).
 *  - Tekrar sorusu ipucu almadan çözülürse kutu bir üste çıkar ve aralık
 *    uzar: 1 → 3 → 7 → 14 gün.
 *  - İpucuyla çözülürse kutu 1'e döner; ertesi gün yeniden sorulur.
 *  - Her derste en fazla 1 tekrar sorusu gelir (ders 3–5 dakikada kalsın).
 *
 * GİZLİLİK: Tekrar takvimi yalnızca cihazda (localStorage) tutulur, sunucuya
 * hiçbir şey gitmez — ilerleme ile aynı ilke. Bu modül saf fonksiyonlardan
 * oluşur; depolama erişimi yalnızca yukle/kaydet içindedir.
 */

/** Kutu → bir sonraki tekrara kadar gün. Kutu 0 = sonraki derste (0 gün). */
export const ARALIKLAR_GUN = [0, 1, 3, 7, 14] as const;
export const EN_UST_KUTU = ARALIKLAR_GUN.length - 1;

export interface TekrarKaydi {
  dersId: string;
  /** Eser adı — "Yeşilcami dersinden hatırla" yazmak için. */
  eserAdi: string;
  kutu: number;
  /** Bir sonraki tekrarın en erken günü (YYYY-AA-GG, yerel saat). */
  sonrakiGun: string;
  /** Kaç kez tekrar edildi (istatistik ve egzersiz çeşitliliği için). */
  tekrarSayisi: number;
}

export interface TekrarDurumu {
  surum: 1;
  kayitlar: Record<string, TekrarKaydi>;
}

export const TEKRAR_ANAHTARI = 'kokavi.tekrar.v1';

export function bosTekrarDurumu(): TekrarDurumu {
  return { surum: 1, kayitlar: {} };
}

/** Yerel tarihi YYYY-AA-GG olarak verir (saat dilimi kayması olmadan). */
export function gunMetni(tarih: Date): string {
  const y = tarih.getFullYear();
  const a = String(tarih.getMonth() + 1).padStart(2, '0');
  const g = String(tarih.getDate()).padStart(2, '0');
  return `${y}-${a}-${g}`;
}

export function gunEkle(gun: string, kac: number): string {
  const [y, a, g] = gun.split('-').map(Number);
  const tarih = new Date(y!, (a ?? 1) - 1, g ?? 1);
  tarih.setDate(tarih.getDate() + kac);
  return gunMetni(tarih);
}

/**
 * Ders tamamlandı: kayıt yoksa kutu 0'a eklenir (ilk tekrar sonraki derste).
 * Ders yeniden oynanırsa mevcut takvim bozulmaz.
 */
export function dersiTakvimeEkle(
  durum: TekrarDurumu,
  dersId: string,
  eserAdi: string,
  bugun: string,
): TekrarDurumu {
  if (durum.kayitlar[dersId]) return durum;
  return {
    ...durum,
    kayitlar: {
      ...durum.kayitlar,
      [dersId]: { dersId, eserAdi, kutu: 0, sonrakiGun: bugun, tekrarSayisi: 0 },
    },
  };
}

/**
 * Tekrar sorusu bitti. `ipucusuz` = ilk denemede, ipucu görmeden çözdü.
 * Başarılıysa kutu yükselir ve aralık uzar; değilse kutu 1 (yarın tekrar).
 */
export function tekrarSonucunuIsle(
  durum: TekrarDurumu,
  dersId: string,
  ipucusuz: boolean,
  bugun: string,
): TekrarDurumu {
  const kayit = durum.kayitlar[dersId];
  if (!kayit) return durum;
  const yeniKutu = ipucusuz ? Math.min(EN_UST_KUTU, kayit.kutu + 1) : 1;
  const aralik = ARALIKLAR_GUN[yeniKutu] ?? ARALIKLAR_GUN[EN_UST_KUTU];
  return {
    ...durum,
    kayitlar: {
      ...durum.kayitlar,
      [dersId]: {
        ...kayit,
        kutu: yeniKutu,
        sonrakiGun: gunEkle(bugun, Math.max(1, aralik)),
        tekrarSayisi: kayit.tekrarSayisi + 1,
      },
    },
  };
}

/**
 * Vadesi gelmiş tekrarlar, en acil olan önce (önce erken gün, sonra düşük kutu).
 * `haricDersId`: şu an açılan ders kendi tekrarı olarak sorulmaz.
 */
export function vadesiGelenler(
  durum: TekrarDurumu,
  bugun: string,
  haricDersId?: string,
): TekrarKaydi[] {
  return Object.values(durum.kayitlar)
    .filter((k) => k.dersId !== haricDersId && k.sonrakiGun <= bugun)
    .sort((a, b) =>
      a.sonrakiGun === b.sonrakiGun ? a.kutu - b.kutu : a.sonrakiGun < b.sonrakiGun ? -1 : 1,
    );
}

/**
 * Tekrarda hangi egzersiz sorulsun? Her tekrar turunda farklı bir egzersiz
 * gelsin diye tekrar sayısına göre döner (aynı soruyu ezberlemek yerine
 * kavramı farklı biçimde hatırlamak).
 */
export function tekrarEgzersizSirasi(kayit: TekrarKaydi, egzersizSayisi: number): number {
  if (egzersizSayisi <= 0) return -1;
  return kayit.tekrarSayisi % egzersizSayisi;
}

/* --- Depolama (cihazda) --------------------------------------------------- */

function gecerliMi(veri: unknown): veri is TekrarDurumu {
  if (!veri || typeof veri !== 'object') return false;
  const d = veri as Partial<TekrarDurumu>;
  return d.surum === 1 && !!d.kayitlar && typeof d.kayitlar === 'object';
}

export function tekrarYukle(): TekrarDurumu {
  try {
    const ham = localStorage.getItem(TEKRAR_ANAHTARI);
    if (!ham) return bosTekrarDurumu();
    const veri: unknown = JSON.parse(ham);
    return gecerliMi(veri) ? veri : bosTekrarDurumu();
  } catch {
    return bosTekrarDurumu();
  }
}

export function tekrarKaydet(durum: TekrarDurumu): void {
  try {
    localStorage.setItem(TEKRAR_ANAHTARI, JSON.stringify(durum));
  } catch {
    /* depolama kapalı: tekrar bu oturumla sınırlı kalır */
  }
}

export function tekrarSifirla(): void {
  try {
    localStorage.removeItem(TEKRAR_ANAHTARI);
  } catch {
    /* yok say */
  }
}
