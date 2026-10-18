/**
 * Model cevabının denetimi: her cümle en az bir geçerli parça numarasına
 * dayanmalı, en fazla 3 kısa cümle. Kurala uymayan cevap DÜŞÜRÜLÜR (null) ve
 * kullanıcıya "bilmiyorum" gösterilir — uydurma bilgi çocuğa ulaşmaz.
 */
export interface ModelCevabi {
  bilmiyorum: boolean;
  /** Soru konu dışı ya da bir yönlendirme girişimi (kalkan.ts). */
  konuDisi?: boolean;
  cumleler: { metin: string; kaynaklar: number[] }[];
}

const EN_COK_CUMLE = 3;
const EN_UZUN_CUMLE = 300;

export function cevapDenetle(cevap: ModelCevabi, parcaSayisi: number): ModelCevabi | null {
  if (cevap.bilmiyorum || cevap.konuDisi) return { bilmiyorum: true, konuDisi: Boolean(cevap.konuDisi), cumleler: [] };
  const { cumleler } = cevap;
  if (cumleler.length === 0 || cumleler.length > EN_COK_CUMLE) return null;
  for (const c of cumleler) {
    const metin = c.metin.trim();
    if (!metin || metin.length > EN_UZUN_CUMLE) return null;
    if (c.kaynaklar.length === 0) return null;
    if (c.kaynaklar.some((n) => !Number.isInteger(n) || n < 1 || n > parcaSayisi)) return null;
  }
  return cevap;
}
