/**
 * Sahada mühür: çocuk eserin yanındayken "Buradayım" der; konum bir kez,
 * yalnızca cihazda ölçülür ve eser 150 m içindeyse deftere "orada bulundum"
 * mührü basılır. KONUM SAKLANMAZ ve hiçbir yere gönderilmez; kayıtta yalnızca
 * eser kimliği ve gün vardır (PDF: kişisel veri toplanmaz).
 */
import { mesafe } from '../features/rota/rota';

export const MUHUR_YARICAP = 150;
const ANAHTAR = 'kokavi-muhurler';

export interface Nokta {
  lat: number;
  lng: number;
}

export function konumKontrol(eser: Nokta, konum: Nokta): { yakin: boolean; mesafe: number } {
  const m = mesafe({ id: 'e', ...eser }, { id: 'k', ...konum });
  return { yakin: m <= MUHUR_YARICAP, mesafe: m };
}

/** { eserId: "2026-10-18" } */
export function muhurleriOku(): Record<string, string> {
  try {
    const veri = JSON.parse(localStorage.getItem(ANAHTAR) ?? '{}') as unknown;
    return veri && typeof veri === 'object' && !Array.isArray(veri) ? (veri as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function muhurBas(eserId: string, gun: string): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify({ ...muhurleriOku(), [eserId]: gun }));
  } catch {
    /* depolama yoksa mühür yalnızca bu ziyarette görünür */
  }
}

export function muhurGunu(eserId: string): string | null {
  return muhurleriOku()[eserId] ?? null;
}
