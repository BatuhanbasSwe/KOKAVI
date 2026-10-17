/**
 * POST /api/sor — kaynaklı soru-cevap ("Köstik'e sor").
 *
 * Akış: kişisel veri temizle → korpustan 6 parça bul → Claude yalnızca bu
 * parçalardan cevaplar → denetim (kaynaksız cümle düşer) → künyeli cevap.
 * Gizlilik: soru hiçbir yere kaydedilmez ve günlüğe yazılmaz (yalnızca hata
 * türü loglanır). Anahtar yoksa 503 ve arayüz yalnızca aramayı gösterir.
 */
import type { FastifyInstance } from 'fastify';
import korpusJson from '../sor/korpus.json' with { type: 'json' };
import { bul, type Parca } from '../sor/bul.ts';
import { cevapDenetle } from '../sor/denetle.ts';
import { kisiselVeriTemizle } from '../sor/temizle.ts';
import { claudeIleCevapla, type Cevaplayici } from '../sor/model.ts';

const korpus = korpusJson as Parca[];
const PARCA_SAYISI = 6;

export interface SorSecenekleri {
  /** Test için sahte model; verilmezse Claude. */
  cevapla?: Cevaplayici;
  /** Test için: anahtar kontrolünü atla. */
  anahtarVar?: () => boolean;
}

function oneriler(parcalar: Parca[]) {
  const gorulen = new Set<string>();
  const sonuc: { eserId: string; eserAd: string }[] = [];
  for (const p of parcalar) {
    if (gorulen.has(p.eserId)) continue;
    gorulen.add(p.eserId);
    sonuc.push({ eserId: p.eserId, eserAd: p.eserAd });
    if (sonuc.length === 3) break;
  }
  return sonuc;
}

export async function sorUclari(app: FastifyInstance, secenekler: SorSecenekleri = {}): Promise<void> {
  const cevapla = secenekler.cevapla ?? claudeIleCevapla;
  const anahtarVar = secenekler.anahtarVar ?? (() => Boolean(process.env.ANTHROPIC_API_KEY));

  app.post(
    '/api/sor',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['soru'],
          additionalProperties: false,
          properties: {
            soru: { type: 'string', minLength: 3, maxLength: 400 },
            eserId: { type: 'string', maxLength: 120, pattern: '^[a-z0-9-]+$' },
          },
        },
      },
    },
    async (istek, cevap) => {
      if (!anahtarVar()) return cevap.code(503).send({ hata: 'kapali' });
      const govde = istek.body as { soru: string; eserId?: string };
      const soru = kisiselVeriTemizle(govde.soru);
      const parcalar = bul(korpus, soru, govde.eserId, PARCA_SAYISI);
      if (parcalar.length === 0) return { bilmiyorum: true, oneriler: [] };

      let model;
      try {
        model = await cevapla(soru, parcalar);
      } catch (hata) {
        // Sorunun kendisi loglanmaz; yalnızca hata türü.
        istek.log.warn({ tur: hata instanceof Error ? hata.name : 'bilinmeyen' }, 'soru-cevap modeli yanıt vermedi');
        return cevap.code(502).send({ hata: 'model', oneriler: oneriler(parcalar) });
      }

      const denetlenmis = cevapDenetle(model, parcalar.length);
      if (!denetlenmis || denetlenmis.bilmiyorum) return { bilmiyorum: true, oneriler: oneriler(parcalar) };

      // Yalnızca atıf yapılan parçalar, 1'den başlayarak yeniden numaralanır.
      const kullanilan = [...new Set(denetlenmis.cumleler.flatMap((c) => c.kaynaklar))].sort((a, b) => a - b);
      const yeniNo = new Map(kullanilan.map((eski, i) => [eski, i + 1]));
      return {
        cumleler: denetlenmis.cumleler.map((c) => ({
          metin: c.metin.trim(),
          kaynaklar: c.kaynaklar.map((n) => yeniNo.get(n)!),
        })),
        kaynaklar: kullanilan.map((eski) => {
          const p = parcalar[eski - 1]!;
          return { no: yeniNo.get(eski)!, eserId: p.eserId, eserAd: p.eserAd, kunye: p.kunye };
        }),
      };
    },
  );
}
