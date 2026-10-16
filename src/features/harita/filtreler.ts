/**
 * `/api/filtreler` cevabının ŞEKİL DOĞRULAMASI.
 *
 * Neden gerekli: sunucu beklenmedik bir gövde döndürürse (ör. boş dizi, eksik
 * alan, sayı yerine metin) harita sayfası çökmemeli; filtre seçenekleri boş
 * kalmalı ve liste filtresiz çalışmaya devam etmelidir. Okuma işini paylaşılan
 * istemci (`api.filtreler()`) yapar; burada yalnızca gelen veri doğrulanır.
 */
import type { FiltreSecenekleri } from '@/lib/api';

export const BOS_FILTRELER: FiltreSecenekleri = { sehirler: [], turler: [] };

function nesneMi(ham: unknown): ham is Record<string, unknown> {
  return typeof ham === 'object' && ham !== null;
}

function sayiVeyaSifir(ham: unknown): number {
  return typeof ham === 'number' && Number.isFinite(ham) ? ham : 0;
}

function sehirCoz(ham: unknown): FiltreSecenekleri['sehirler'][number] | null {
  if (!nesneMi(ham)) return null;
  const { id, ad, sayi } = ham;
  if (typeof id !== 'string' || typeof ad !== 'string') return null;
  return { id, ad, sayi: sayiVeyaSifir(sayi) };
}

function turCoz(ham: unknown): FiltreSecenekleri['turler'][number] | null {
  if (!nesneMi(ham)) return null;
  const { tur, sayi } = ham;
  if (typeof tur !== 'string') return null;
  return { tur, sayi: sayiVeyaSifir(sayi) };
}

/** Geçersiz girdiler ayıklanır; hiçbir durumda istisna atılmaz. */
export function filtreleriCoz(ham: unknown): FiltreSecenekleri {
  const kaynak = nesneMi(ham) ? ham : {};
  const sehirlerHam = Array.isArray(kaynak['sehirler']) ? kaynak['sehirler'] : [];
  const turlerHam = Array.isArray(kaynak['turler']) ? kaynak['turler'] : [];

  return {
    sehirler: sehirlerHam
      .map(sehirCoz)
      .filter((sehir): sehir is FiltreSecenekleri['sehirler'][number] => sehir !== null),
    turler: turlerHam
      .map(turCoz)
      .filter((tur): tur is FiltreSecenekleri['turler'][number] => tur !== null),
  };
}
