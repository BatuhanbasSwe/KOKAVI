/**
 * Canlı yarışma API istemcisi.
 *
 * Anahtarlar sekmenin oturum deposunda (sessionStorage) durur: sayfa yenilenince
 * oyuncu oyundan düşmez, sekme kapanınca iz kalmaz. Ad, e-posta, cihaz kimliği
 * GÖNDERİLMEZ; sunucunun bildiği tek şey rastgele bir anahtar ve takma addır.
 */
import type {
  CanliKatilimCevabi,
  CanliOdaCevabi,
  CanliOdaIstegi,
  CanliOyuncuDurumu,
  CanliSunucuDurumu,
} from '@shared/canli';

export class CanliApiHatasi extends Error {
  constructor(
    mesaj: string,
    readonly durum: number,
    readonly kod: string | null,
  ) {
    super(mesaj);
  }
}

async function iste<T>(yol: string, secenekler: RequestInit = {}): Promise<T> {
  let cevap: Response;
  try {
    cevap = await fetch(`/api/canli${yol}`, {
      ...secenekler,
      headers: { 'Content-Type': 'application/json', ...secenekler.headers },
    });
  } catch {
    throw new CanliApiHatasi('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.', 0, null);
  }
  const govde = (await cevap.json().catch(() => ({}))) as { hata?: string; kod?: string };
  if (!cevap.ok) {
    throw new CanliApiHatasi(
      govde.hata ?? `İstek başarısız (HTTP ${cevap.status})`,
      cevap.status,
      govde.kod ?? null,
    );
  }
  return govde as T;
}

const yonetim = (anahtar: string) => ({ 'x-canli-anahtar': anahtar });
const oyuncu = (anahtar: string) => ({ 'x-canli-oyuncu': anahtar });

export const canliApi = {
  odaKur: (istek: CanliOdaIstegi) =>
    iste<CanliOdaCevabi>('/odalar', { method: 'POST', body: JSON.stringify(istek) }),
  yonetimDurumu: (pin: string, anahtar: string) =>
    iste<CanliSunucuDurumu>(`/odalar/${pin}/yonetim`, { headers: yonetim(anahtar) }),
  eylem: (pin: string, anahtar: string, eylem: 'basla' | 'sonraki' | 'bitir') =>
    iste<CanliSunucuDurumu>(`/odalar/${pin}/${eylem}`, { method: 'POST', headers: yonetim(anahtar) }),
  katil: (pin: string) => iste<CanliKatilimCevabi>(`/odalar/${pin}/katil`, { method: 'POST' }),
  oyuncuDurumu: (pin: string, anahtar: string) =>
    iste<CanliOyuncuDurumu>(`/odalar/${pin}/oyuncu`, { headers: oyuncu(anahtar) }),
  cevapla: (pin: string, anahtar: string, soruNo: number, secim: number) =>
    iste<{ alindi: true }>(`/odalar/${pin}/cevap`, {
      method: 'POST',
      headers: oyuncu(anahtar),
      body: JSON.stringify({ soruNo, secim }),
    }),
};

// --- Sekme deposu ---------------------------------------------------------------

function oku<T>(ad: string): T | null {
  try {
    const ham = sessionStorage.getItem(ad);
    return ham ? (JSON.parse(ham) as T) : null;
  } catch {
    return null;
  }
}

function yaz(ad: string, deger: unknown): void {
  try {
    sessionStorage.setItem(ad, JSON.stringify(deger));
  } catch {
    /* gizli sekme vb. — oyun yine oynanır, yalnızca yenilemede düşer */
  }
}

export const canliDepo = {
  yonetimAnahtari: (pin: string) => oku<string>(`kokavi-canli-yonet-${pin}`),
  yonetimAnahtariYaz: (pin: string, anahtar: string) => yaz(`kokavi-canli-yonet-${pin}`, anahtar),
  oyuncu: (pin: string) => oku<CanliKatilimCevabi>(`kokavi-canli-oyna-${pin}`),
  oyuncuYaz: (pin: string, k: CanliKatilimCevabi) => yaz(`kokavi-canli-oyna-${pin}`, k),
};

export const PIN_BICIMI = /^\d{6}$/;
