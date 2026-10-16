/**
 * "Meraklısına" arşivi — envanterlerdeki tüm eserler (scripts/arsiv-hazirla.py üretir).
 *
 * Veri statik dosyalardan gelir (public/arsiv/), API'ye ve veritabanına dokunmaz.
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
}

export const IL_ADLARI: Record<string, string> = { bursa: 'Bursa', konya: 'Konya', hatay: 'Hatay' };

let listeSozu: Promise<ArsivEseri[]> | null = null;

export function arsivListesi(): Promise<ArsivEseri[]> {
  if (!listeSozu) {
    listeSozu = fetch('/arsiv/liste.json')
      .then((yanit) => {
        if (!yanit.ok) throw new Error('Arşiv listesi yüklenemedi.');
        return yanit.json() as Promise<ArsivEseri[]>;
      })
      .then((liste) => (Array.isArray(liste) ? liste : []))
      .catch((hata: unknown) => {
        listeSozu = null; // bir sonraki denemede yeniden istensin
        throw hata;
      });
  }
  return listeSozu;
}

export async function arsivMetni(id: string): Promise<string[]> {
  const yanit = await fetch(`/arsiv/metin/${encodeURIComponent(id)}.json`);
  if (!yanit.ok) throw new Error('Eser metni yüklenemedi.');
  const veri = (await yanit.json()) as { paragraflar?: unknown };
  return Array.isArray(veri.paragraflar) ? veri.paragraflar.filter((p): p is string => typeof p === 'string') : [];
}

export function arsivFotoUrl(id: string): string {
  return `/arsiv/foto/${encodeURIComponent(id)}.webp`;
}

/** "Osmangazi (Muradiye Mahallesi)" → "Osmangazi" */
export function ilceAdi(ilce: string | null | undefined): string | null {
  const temiz = ilce?.split(' (')[0]?.trim();
  return temiz ? temiz : null;
}
