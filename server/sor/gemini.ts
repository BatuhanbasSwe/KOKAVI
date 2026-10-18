/**
 * Gemini ile kaynaklı cevap: Claude sürümüyle aynı sistem talimatı ve aynı
 * numaralı parça biçimi (model.ts); çıktı JSON şemasıyla istenir, Zod ile
 * yeniden doğrulanır. Denetim (denetle.ts) kaynaksız cümleleri ayrıca düşürür.
 *
 * Model: KOKAVI_GEMINI_MODEL (varsayılan gemini-3.8-flash — kısa cevap, düşük
 * gecikme). Anahtar: GEMINI_API_KEY (yalnızca ortam).
 */
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { CevapSemasi, SISTEM, kullaniciMesaji, type Cevaplayici } from './model.ts';
import type { ModelCevabi } from './denetle.ts';

const BILMIYORUM: ModelCevabi = { bilmiyorum: true, cumleler: [] };

/** Zod şemasından Gemini'nin kabul ettiği JSON Schema ($schema alanı atılır). */
export function geminiSemasi(): Record<string, unknown> {
  const { $schema: _atla, ...sema } = z.toJSONSchema(CevapSemasi) as Record<string, unknown>;
  return sema;
}

/**
 * Model çıktısını çözer. Güvenlik engeli, yarım kalan ya da şemaya uymayan
 * çıktı "bilmiyorum" sayılır; uydurma bir cevap asla geçmez.
 */
export function geminiCiktisiniCoz(metin: string | undefined, bitisNedeni: string | undefined): ModelCevabi {
  if (bitisNedeni && bitisNedeni !== 'STOP') return BILMIYORUM;
  if (!metin) return BILMIYORUM;
  let ham: unknown;
  try {
    ham = JSON.parse(metin);
  } catch {
    return BILMIYORUM;
  }
  const sonuc = CevapSemasi.safeParse(ham);
  return sonuc.success ? sonuc.data : BILMIYORUM;
}

let istemci: GoogleGenAI | null = null;

/** Gerçek Gemini çağrısı. */
export const geminiIleCevapla: Cevaplayici = async (soru, parcalar) => {
  istemci ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const yanit = await istemci.models.generateContent({
    model: process.env.KOKAVI_GEMINI_MODEL ?? 'gemini-3.8-flash',
    contents: kullaniciMesaji(soru, parcalar),
    config: {
      systemInstruction: SISTEM,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      responseJsonSchema: geminiSemasi(),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  return geminiCiktisiniCoz(yanit.text, yanit.candidates?.[0]?.finishReason);
};
