/**
 * "Meraklısına" arşivi — envanterlerdeki tüm eserler (scripts/arsiv-hazirla.py üretir).
 *
 * Veri statik dosyalardan gelir (public/arsiv/). Yöneticinin panelden eklediği
 * kayıtlar (/api/arsiv/ekler) bunlarla birleştirilir; aynı kimlikte ek kazanır.
 * API'ye ulaşılamazsa (çevrimdışı) yalnızca statik liste gösterilir.
 * PWA bu dosyaları baştan indirmez; açıldıkça önbelleğe alır (vite.config.ts).
 */

export interface ArsivEseri {
  id: string;
  ad: string;
  /** "bursa" | "konya" | "hatay" — şehir kimliğiyle aynı */
  il: string;
  ilce: string | null;
  tur: string;
  /** "Vakıf Katılım, 'Bursa Vakıf Eserleri', II. Cilt (2026), s. 80-83" */
  kaynak: string;
  foto: boolean;
  /** Bu eserin uygulamada bir dersi varsa eser kimliği */
  ders?: string;
  /**
   * Bu kartla ilişkili başka dersler (külliye içindeki yapılar, avlusundaki
   * çeşme gibi). Bir kart yalnızca tek derse bağlanabildiği için kardeş
   * dersler burada durur; arşiv sayfası bunları ayrı bağlantı olarak gösterir.
   */
  ilgiliDersler?: string[];
  /** Panelden eklenen kayıt: fotoğraf adresi ve il adı kayıtla gelir. */
  ek?: boolean;
  fotoUrl?: string | null;
  ilAd?: string;
}

export const IL_ADLARI: Record<string, string> = { bursa: 'Bursa', konya: 'Konya', hatay: 'Hatay' };

let listeSozu: Promise<ArsivEseri[]> | null = null;

export function arsivListesi(): Promise<ArsivEseri[]> {
  if (!listeSozu) {
    const ekler = fetch('/api/arsiv/ekler')
      .then((y) => (y.ok ? (y.json() as Promise<ArsivEseri[]>) : []))
      .then((l) => (Array.isArray(l) ? l : []))
      .catch(() => [] as ArsivEseri[]);
    listeSozu = Promise.all([
      fetch('/arsiv/liste.json').then((yanit) => {
        if (!yanit.ok) throw new Error('Arşiv listesi yüklenemedi.');
        return yanit.json() as Promise<ArsivEseri[]>;
      }),
      ekler,
    ])
      .then(([liste, ekListe]) => arsivleriBirlestir(Array.isArray(liste) ? liste : [], ekListe))
      .catch((hata: unknown) => {
        listeSozu = null; // bir sonraki denemede yeniden istensin
        throw hata;
      });
  }
  return listeSozu;
}

/** Statik liste + panel ekleri; aynı kimlikte ek kazanır, yeni ekler başa gelir. */
export function arsivleriBirlestir(statik: ArsivEseri[], ekler: ArsivEseri[]): ArsivEseri[] {
  const ekKimlikleri = new Set(ekler.map((e) => e.id));
  for (const e of ekler) if (e.ilAd && !IL_ADLARI[e.il]) IL_ADLARI[e.il] = e.ilAd;
  return [...ekler.map((e) => ({ ...e, ek: true })), ...statik.filter((e) => !ekKimlikleri.has(e.id))];
}

/** Panelde değişiklik olunca listeyi yeniden iste. */
export function arsivOnbellegiTemizle(): void {
  listeSozu = null;
}

export async function arsivMetni(id: string): Promise<string[]> {
  const ek = (await arsivListesi().catch(() => [] as ArsivEseri[])).find((e) => e.id === id && e.ek);
  const yanit = await fetch(
    ek ? `/api/arsiv/ekler/${encodeURIComponent(id)}/metin` : `/arsiv/metin/${encodeURIComponent(id)}.json`,
  );
  if (!yanit.ok) throw new Error('Eser metni yüklenemedi.');
  const veri = (await yanit.json()) as { paragraflar?: unknown };
  return Array.isArray(veri.paragraflar) ? veri.paragraflar.filter((p): p is string => typeof p === 'string') : [];
}

export function arsivFotoUrl(eser: Pick<ArsivEseri, 'id' | 'fotoUrl'>): string {
  return eser.fotoUrl || `/arsiv/foto/${encodeURIComponent(eser.id)}.webp`;
}

/** "Osmangazi (Muradiye Mahallesi)" → "Osmangazi" */
export function ilceAdi(ilce: string | null | undefined): string | null {
  const temiz = ilce?.split(' (')[0]?.trim();
  return temiz ? temiz : null;
}
