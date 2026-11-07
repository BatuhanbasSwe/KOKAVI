/**
 * AI soru taslağı üretir; insan onaylamadan yayına hiçbir şey girmez.
 *
 *   npm run soru:taslak -- [eserId ...] [--adet 3]
 *     → data/taslak-sorular/<eserId>.json (her soru `durum: 'taslak'`)
 *   Öğretmen/editör dosyada soruyu okuyup `durum: 'onaylandi'` ve
 *   `onaylayan: "Ad Soyad"` yazar (ya da 'reddedildi').
 *   npm run soru:taslak -- --yayinla
 *     → data/taslak-sorular/_onayli.json (yalnızca adıyla onaylananlar)
 *
 * Model: GEMINI_API_KEY varsa Gemini, yoksa ANTHROPIC_API_KEY ile Claude.
 * Çıktılar ders içeriğine (data/content) kendiliğinden yazılmaz.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import {
  SISTEM_TASLAK,
  TaslakSoruSemasi,
  taslakMesaji,
  taslakOlustur,
  tutarliMi,
  yayinaHazir,
  type ModelTaslagi,
  type TaslakSoru,
} from './soru-taslak-lib.ts';

/** Model sağlayıcısını seçer: GEMINI_API_KEY varsa Gemini, yoksa Claude; ikisi de yoksa null. */
function saglayiciSec(ortam: Record<string, string | undefined> = process.env): 'gemini' | 'claude' | null {
  if (ortam.GEMINI_API_KEY) return 'gemini';
  if (ortam.ANTHROPIC_API_KEY) return 'claude';
  return null;
}

const ARASTIRMA = 'data/research';
const CIKTI = 'data/taslak-sorular';
const ONAYLI = join(CIKTI, '_onayli.json');

type Eser = Record<string, unknown> & { id: string; ad: string; kaynaklar?: { kunye?: string }[] };

function eserler(): Eser[] {
  return readdirSync(ARASTIRMA)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => (JSON.parse(readFileSync(join(ARASTIRMA, f), 'utf8')) as { eserler: Eser[] }).eserler);
}

async function uret(eser: Eser, adet: number): Promise<{ sorular: ModelTaslagi[]; uretici: string }> {
  const mesaj = taslakMesaji(eser, adet);
  if (saglayiciSec() === 'gemini') {
    const model = process.env.KOKAVI_GEMINI_MODEL ?? 'gemini-3.8-flash';
    const yanit = await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({
      model,
      contents: mesaj,
      config: {
        systemInstruction: SISTEM_TASLAK,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(TaslakSoruSemasi),
        thinkingConfig: /^gemini-[12]\./.test(model) ? { thinkingBudget: 512 } : { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    const sonuc = TaslakSoruSemasi.safeParse(JSON.parse(yanit.text ?? '{}'));
    return { sorular: sonuc.success ? sonuc.data.sorular : [], uretici: model };
  }
  const model = process.env.KOKAVI_SOR_MODEL ?? 'claude-haiku-5-5';
  const yanit = await new Anthropic().messages.parse({
    model,
    max_tokens: 4096,
    system: SISTEM_TASLAK,
    output_config: { effort: 'low', format: zodOutputFormat(TaslakSoruSemasi) },
    messages: [{ role: 'user', content: mesaj }],
  });
  return { sorular: yanit.parsed_output?.sorular ?? [], uretici: model };
}

function yayinla(): void {
  const hepsi = readdirSync(CIKTI)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .flatMap((f) => JSON.parse(readFileSync(join(CIKTI, f), 'utf8')) as TaslakSoru[]);
  const onayli = yayinaHazir(hepsi);
  writeFileSync(ONAYLI, JSON.stringify(onayli, null, 2) + '\n');
  console.log(`${hepsi.length} taslaktan ${onayli.length} onaylı soru → ${ONAYLI}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  mkdirSync(CIKTI, { recursive: true });
  if (args.includes('--yayinla')) return yayinla();
  if (!saglayiciSec()) throw new Error('GEMINI_API_KEY ya da ANTHROPIC_API_KEY tanımlı değil.');

  const adetIdx = args.indexOf('--adet');
  const adet = adetIdx >= 0 ? Number(args[adetIdx + 1]) || 3 : 3;
  const secili = args.filter((a, i) => !a.startsWith('--') && i !== adetIdx + 1);
  const liste = eserler().filter((e) => secili.length === 0 || secili.includes(e.id));
  const tarih = new Date().toISOString();

  for (const eser of liste) {
    const dosya = join(CIKTI, `${eser.id}.json`);
    const eski: TaslakSoru[] = existsSync(dosya) ? JSON.parse(readFileSync(dosya, 'utf8')) : [];
    const { sorular, uretici } = await uret(eser, adet);
    const gecerli = sorular.filter((s) => tutarliMi(s, eser.ad));
    const yeni = gecerli.map((s, i) =>
      taslakOlustur(s, {
        eserId: eser.id,
        kaynak: eser.kaynaklar?.[0]?.kunye ?? '',
        uretici,
        tarih,
        sira: eski.length + i + 1,
      }),
    );
    writeFileSync(dosya, JSON.stringify([...eski, ...yeni], null, 2) + '\n');
    console.log(`${eser.id}: ${yeni.length} taslak (${sorular.length - gecerli.length} tutarsız elendi)`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
