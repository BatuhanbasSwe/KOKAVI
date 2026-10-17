/**
 * "Köstik'e sor" istemcisi: POST /api/sor. Sunucu yalnızca kendi kaynaklı
 * verimizden, künyesiyle cevap verir; kaynaksız cevap "bilmiyorum"a düşer.
 * Soru cihazda da saklanmaz.
 */
export interface SorKaynagi {
  no: number;
  eserId: string;
  eserAd: string;
  kunye: string;
}

export type SorSonucu =
  | { durum: 'cevap'; cumleler: { metin: string; kaynaklar: number[] }[]; kaynaklar: SorKaynagi[] }
  | { durum: 'bilmiyorum'; oneriler: { eserId: string; eserAd: string }[] }
  | { durum: 'kapali' }
  | { durum: 'hata' };

export async function sor(soru: string, eserId?: string): Promise<SorSonucu> {
  try {
    const yanit = await fetch('/api/sor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eserId ? { soru, eserId } : { soru }),
    });
    if (yanit.status === 503) return { durum: 'kapali' };
    const govde = (await yanit.json()) as Record<string, unknown>;
    if (yanit.ok && Array.isArray(govde.cumleler)) {
      return { durum: 'cevap', cumleler: govde.cumleler as never, kaynaklar: (govde.kaynaklar ?? []) as never };
    }
    if (govde.bilmiyorum || Array.isArray(govde.oneriler)) {
      return { durum: 'bilmiyorum', oneriler: (govde.oneriler ?? []) as never };
    }
    return { durum: 'hata' };
  } catch {
    return { durum: 'hata' };
  }
}
