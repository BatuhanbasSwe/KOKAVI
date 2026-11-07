/**
 * API istemcisi.
 *
 * Tüm içerik çağrıları buradan geçer. Sunucuya HİÇBİR kullanıcı verisi
 * gönderilmez — ilerleme cihazda tutulur (bkz. lib/ilerleme.ts).
 */
import type { Ders, Eser, Sehir, Unite, Kulliye } from '@shared/types';

const TABAN = '/api';

/**
 * API hatası — HTTP durumu ve sunucunun hata kodu korunur.
 *
 * NEDEN: Panel, 401 (oturum bitti) ile 400 (doğrulama) veya 500'ü ayırt
 * edemiyordu; kullanıcı ham "Bu işlem için giriş yapmalısın." metniyle kalıyordu.
 * Durum kodu taşınınca panel oturumun bittiğini anlayıp giriş katmanı açabilir.
 */
export class ApiHatasi extends Error {
  readonly durum: number;
  readonly kod: string | null;
  /** Bazı uçlar (örn. zayıf parola) madde madde neden döner. */
  readonly detay: string[];

  constructor(mesaj: string, durum: number, kod: string | null = null, detay: string[] = []) {
    super(mesaj);
    this.name = 'ApiHatasi';
    this.durum = durum;
    this.kod = kod;
    this.detay = detay;
  }
}

/** Oturumun düştüğünü panele duyurur (KorumaliPanel dinler, giriş katmanı açar). */
export function oturumBittiBildir(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('kokavi-oturum-bitti'));
}

async function iste<T>(yol: string, secenekler?: RequestInit): Promise<T> {
  const cevap = await fetch(`${TABAN}${yol}`, {
    headers: { 'Content-Type': 'application/json' },
    ...secenekler,
  });

  if (!cevap.ok) {
    let mesaj = `İstek başarısız (HTTP ${cevap.status})`;
    let kod: string | null = null;
    let detay: string[] = [];
    try {
      const govde = (await cevap.json()) as { hata?: string; kod?: string; detay?: unknown };
      if (govde.hata) mesaj = govde.hata;
      if (govde.kod) kod = govde.kod;
      if (Array.isArray(govde.detay)) {
        detay = govde.detay.filter((madde): madde is string => typeof madde === 'string');
      }
    } catch {
      /* gövde JSON değilse varsayılan mesaj kalır */
    }

    // Oturum gerektiren uçlarda 401: panel yeniden giriş katmanı açsın.
    // (/auth/ben zaten oturum yokken 401 döner; onu dışarıda bırak.)
    if (cevap.status === 401 && !yol.startsWith('/auth')) oturumBittiBildir();

    throw new ApiHatasi(mesaj, cevap.status, kod, detay);
  }

  return (await cevap.json()) as T;
}

// --- Genel okuma ------------------------------------------------------------

export interface YolIskeletiSehir {
  sehirId: string;
  ad: string;
  sira: number;
  uniteler: {
    uniteId: string;
    ad: string;
    sira: number;
    dersler: { dersId: string; eserId: string; eserAdi: string; tur: string; sira: number }[];
  }[];
}

/**
 * Filtre seçenekleri — Bilgi Notu: "kullanıcıların şehir ya da eser türüne göre
 * filtreleme yapabilmesi". Yalnızca eseri olan seçenekler döner.
 */
export interface FiltreSecenekleri {
  sehirler: { id: string; ad: string; sayi: number }[];
  turler: { tur: string; sayi: number }[];
}

export const api = {
  saglik: () => iste<{ durum: string; zaman: string }>('/saglik'),

  yolIskeleti: () => iste<{ sehirler: YolIskeletiSehir[] }>('/yol'),

  sehirler: () => iste<Sehir[]>('/sehirler'),

  uniteler: (sehir?: string) =>
    iste<Unite[]>(`/uniteler${sehir ? `?sehir=${encodeURIComponent(sehir)}` : ''}`),

  kulliyeler: () => iste<Kulliye[]>('/kulliyeler'),

  filtreler: () => iste<FiltreSecenekleri>('/filtreler'),

  /** Eser listesi. `sehir` ve `tur` birlikte kullanılabilir. */
  eserler: (secenekler: { hepsi?: boolean; sehir?: string; tur?: string } = {}) => {
    const p = new URLSearchParams();
    if (secenekler.hepsi) p.set('hepsi', '1');
    if (secenekler.sehir) p.set('sehir', secenekler.sehir);
    if (secenekler.tur) p.set('tur', secenekler.tur);
    const qs = p.toString();
    return iste<Eser[]>(`/eserler${qs ? `?${qs}` : ''}`);
  },

  eser: (id: string) => iste<Eser>(`/eserler/${encodeURIComponent(id)}`),

  dersler: () => iste<Ders[]>('/dersler'),

  ders: (id: string) => iste<Ders>(`/dersler/${encodeURIComponent(id)}`),
};

// --- Yönetim (içerik CRUD) --------------------------------------------------

export const yonetimApi = {
  istatistik: () =>
    iste<{ sehir: number; unite: number; eser: number; ders: number; yayinda: number; belgeli: number }>(
      '/yonetim/istatistik',
    ),

  eserKaydet: (eser: Partial<Eser> & { id: string; ad: string; sehirId: string; tur: string }) =>
    iste<Eser>('/yonetim/eserler', { method: 'POST', body: JSON.stringify(eser) }),

  eserGuncelle: (id: string, eser: Partial<Eser>) =>
    iste<Eser>(`/yonetim/eserler/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ ...eser, id }),
    }),

  eserSil: (id: string) =>
    iste<{ tamam: boolean }>(`/yonetim/eserler/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  uniteKaydet: (unite: { id: string; sehirId: string; ad: string; sira: number; aciklama?: string }) =>
    iste<Unite>('/yonetim/uniteler', { method: 'POST', body: JSON.stringify(unite) }),

  uniteSil: (id: string) =>
    iste<{ tamam: boolean }>(`/yonetim/uniteler/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  sehirKaydet: (sehir: { id: string; ad: string; sira: number; aktif?: boolean }) =>
    iste<Sehir>('/yonetim/sehirler', { method: 'POST', body: JSON.stringify(sehir) }),

  dersKaydet: (ders: Partial<Ders> & { id: string; uniteId: string; eserId: string }) =>
    iste<Ders>('/yonetim/dersler', { method: 'POST', body: JSON.stringify(ders) }),

  dersSil: (id: string) =>
    iste<{ tamam: boolean }>(`/yonetim/dersler/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
