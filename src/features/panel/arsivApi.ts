/**
 * Panel → arşiv uçları (yalnızca yönetici). Sunucu: server/routes/admin.ts.
 */
import { ApiHatasi, oturumBittiBildir } from '../../lib/api';
import { arsivOnbellegiTemizle, type ArsivEseri } from '../arsiv/arsivVeri';

export interface ArsivEkiSatiri extends ArsivEseri {
  ilAd: string;
  paragrafSayisi: number;
  guncellendi: string;
}

export interface IceAktarmaSonucu {
  eklenen: number;
  guncellenen: number;
  hatali: number;
  sonuclar: { sira: number; id: string | null; ad: string | null; durum: 'eklendi' | 'guncellendi' | 'hata'; hata?: string }[];
}

async function iste<T>(yol: string, secenek?: RequestInit): Promise<T> {
  const cevap = await fetch(`/api${yol}`, {
    credentials: 'same-origin',
    // Gövdesiz istekte (DELETE) JSON başlığı gönderilmez: Fastify boş JSON gövdesini reddeder.
    headers: secenek?.body ? { 'Content-Type': 'application/json' } : {},
    ...secenek,
  });
  if (!cevap.ok) {
    let mesaj = `İstek başarısız (HTTP ${cevap.status})`;
    if (cevap.status === 413) mesaj = 'Gönderilen veri çok büyük. Dosyayı bölün ya da fotoğrafları küçültün.';
    try {
      const g = (await cevap.json()) as { hata?: string };
      if (g.hata) mesaj = g.hata;
    } catch {
      /* gövde JSON değil */
    }
    if (cevap.status === 401) oturumBittiBildir();
    throw new ApiHatasi(mesaj, cevap.status);
  }
  return (await cevap.json()) as T;
}

/** Vercel istek sınırı 4,5 MB: kayıtlar ~3 MB'lık parçalara bölünür. */
const PARCA_KARAKTER = 3_000_000;

export function parcala(kayitlar: unknown[]): unknown[][] {
  const parcalar: unknown[][] = [];
  let simdiki: unknown[] = [];
  let boyut = 0;
  for (const k of kayitlar) {
    const b = JSON.stringify(k)?.length ?? 0;
    if (simdiki.length > 0 && (boyut + b > PARCA_KARAKTER || simdiki.length >= 200)) {
      parcalar.push(simdiki);
      simdiki = [];
      boyut = 0;
    }
    simdiki.push(k);
    boyut += b;
  }
  if (simdiki.length) parcalar.push(simdiki);
  return parcalar;
}

export const arsivApi = {
  listele: () => iste<ArsivEkiSatiri[]>('/yonetim/arsiv'),

  /** Kayıtları parça parça gönderir; sonuçları tek rapor olarak birleştirir. */
  async iceAktar(
    kayitlar: unknown[],
    varsayilan: { sehir?: string | null; kaynak?: string | null },
    ilerleme?: (gonderilen: number) => void,
  ): Promise<IceAktarmaSonucu> {
    const toplam: IceAktarmaSonucu = { eklenen: 0, guncellenen: 0, hatali: 0, sonuclar: [] };
    let kayma = 0;
    try {
      for (const parca of parcala(kayitlar)) {
        const r = await iste<IceAktarmaSonucu>('/yonetim/arsiv/ice-aktar', {
          method: 'POST',
          body: JSON.stringify({ eserler: parca, ...varsayilan }),
        });
        toplam.eklenen += r.eklenen;
        toplam.guncellenen += r.guncellenen;
        toplam.hatali += r.hatali;
        toplam.sonuclar.push(...r.sonuclar.map((s) => ({ ...s, sira: s.sira + kayma })));
        kayma += parca.length;
        ilerleme?.(kayma);
      }
    } finally {
      arsivOnbellegiTemizle();
    }
    return toplam;
  },

  fotoDegistir: async (id: string, veri: string | null) => {
    const r = await iste<{ tamam: true }>(`/yonetim/arsiv/${encodeURIComponent(id)}/foto`, {
      method: 'PUT',
      body: JSON.stringify({ veri }),
    });
    arsivOnbellegiTemizle();
    return r;
  },

  sil: async (id: string) => {
    const r = await iste<{ tamam: true }>(`/yonetim/arsiv/${encodeURIComponent(id)}`, { method: 'DELETE' });
    arsivOnbellegiTemizle();
    return r;
  },
};
