/**
 * Claude ile kaynaklı cevap (Gemini sürümü: gemini.ts, seçim: saglayici.ts): model YALNIZCA verilen numaralı parçalara dayanır,
 * cevabı Zod şemasıyla yapılandırılmış JSON olarak döner. Denetim (denetle.ts)
 * kaynaksız cümleleri ayrıca düşürür.
 *
 * Model: KOKAVI_SOR_MODEL (varsayılan claude-haiku-5-5 — kısa cevap, düşük
 * maliyet; tasarımda onaylandı). Anahtar: ANTHROPIC_API_KEY (yalnızca ortam).
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { Parca } from './bul.ts';
import type { ModelCevabi } from './denetle.ts';

export const CevapSemasi = z.object({
  bilmiyorum: z.boolean(),
  cumleler: z.array(
    z.object({
      metin: z.string(),
      kaynaklar: z.array(z.number().int()),
    }),
  ),
});

export const SISTEM = `Sen Kök Avı uygulamasının rehberi Köstik'sin. 10-12 yaşındaki çocukların vakıf eserleri hakkındaki sorularını cevaplıyorsun.

Kurallar:
- YALNIZCA kullanıcı mesajındaki numaralı parçalarda yazanlara dayan. Parçalarda olmayan hiçbir bilgiyi ekleme, tahmin etme, genel bilgiden tamamlama.
- Parçalar soruyu cevaplamıyorsa "bilmiyorum" alanını true yap ve "cumleler" listesini boş bırak.
- En fazla 3 kısa cümle yaz. Basit, sıcak, anlaşılır Türkçe kullan; zor kelimeyi kısaca açıkla.
- Her cümlenin "kaynaklar" alanına o cümleye dayanak olan parça numaralarını yaz (en az bir tane).
- Kişisel bilgi isteme, yazma ya da yorumlama. Soru vakıf eserleriyle ilgili değilse "bilmiyorum" true olsun.`;

export type Cevaplayici = (soru: string, parcalar: Parca[]) => Promise<ModelCevabi>;

export function kullaniciMesaji(soru: string, parcalar: Parca[]): string {
  const liste = parcalar.map((p, i) => `[${i + 1}] (${p.eserAd}) ${p.metin}`).join('\n\n');
  return `Parçalar:\n\n${liste}\n\nSoru: ${soru}`;
}

let istemci: Anthropic | null = null;

/** Gerçek Claude çağrısı. Reddetme ya da çözümlenemeyen çıktı "bilmiyorum" sayılır. */
export const claudeIleCevapla: Cevaplayici = async (soru, parcalar) => {
  istemci ??= new Anthropic();
  const yanit = await istemci.messages.parse({
    model: process.env.KOKAVI_SOR_MODEL ?? 'claude-haiku-5-5',
    max_tokens: 1024,
    system: SISTEM,
    output_config: { effort: 'low', format: zodOutputFormat(CevapSemasi) },
    messages: [{ role: 'user', content: kullaniciMesaji(soru, parcalar) }],
  });
  if (yanit.stop_reason === 'refusal' || !yanit.parsed_output) return { bilmiyorum: true, cumleler: [] };
  return yanit.parsed_output;
};
