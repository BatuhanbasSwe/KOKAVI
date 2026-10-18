/**
 * Soru-cevap modelini seçer: GEMINI_API_KEY varsa Gemini, yoksa
 * ANTHROPIC_API_KEY varsa Claude; ikisi de yoksa özellik kapalıdır (503).
 */
import { claudeIleCevapla, type Cevaplayici } from './model.ts';
import { geminiIleCevapla } from './gemini.ts';

export type Saglayici = 'gemini' | 'claude';

export function saglayiciSec(ortam: Record<string, string | undefined> = process.env): Saglayici | null {
  if (ortam.GEMINI_API_KEY) return 'gemini';
  if (ortam.ANTHROPIC_API_KEY) return 'claude';
  return null;
}

/** Her istekte ortama bakar; anahtar sonradan eklenirse yeniden başlatmadan da geçerlidir. */
export const secilenModelle: Cevaplayici = (soru, parcalar) =>
  saglayiciSec() === 'gemini' ? geminiIleCevapla(soru, parcalar) : claudeIleCevapla(soru, parcalar);
