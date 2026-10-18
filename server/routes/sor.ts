/**
 * POST /api/sor — kaynaklı soru-cevap ("Köstik'e sor").
 *
 * Akış: kişisel veri temizle → korpustan 6 parça bul → model (Gemini ya da
 * Claude, bkz. sor/saglayici.ts) yalnızca bu parçalardan cevaplar → denetim (kaynaksız cümle düşer) → künyeli cevap.
 * Gizlilik: soru hiçbir yere kaydedilmez ve günlüğe yazılmaz (yalnızca hata
 * türü loglanır). Anahtar yoksa 503 ve arayüz yalnızca aramayı gösterir.
 *
 * Prompt injection kalkanı (sor/kalkan.ts): girdi temizlenir, bilinen saldırı
 * kalıpları modele gitmez, model çıktısı sızıntı ve dayanak açısından ayrıca
 * denetlenir. "Sırala / en eski" soruları sor/toplu.ts, "X nedir / ne demek"
 * soruları sor/sozluk.ts (derslerin kavram açıklamaları öne) ile cevaplanır.
 */
import type { FastifyInstance } from 'fastify';
import korpusJson from '../sor/korpus.json' with { type: 'json' };
import { bul, type Parca } from '../sor/bul.ts';
import { cevapDenetle } from '../sor/denetle.ts';
import { createHash } from 'node:crypto';
import { kisiselVeriTemizle } from '../sor/temizle.ts';
import { DenemeSiniri, cevabiAyikla, girdiTemizle, saldiriMi, sayilariDogrula } from '../sor/kalkan.ts';
import { topluParcalar, topluSoru } from '../sor/toplu.ts';
import { kavramParcalari, tanimSorusuMu } from '../sor/sozluk.ts';
import type { Cevaplayici } from '../sor/model.ts';
import { saglayiciSec, secilenModelle } from '../sor/saglayici.ts';

const korpus = korpusJson as Parca[];
const PARCA_SAYISI = 6;

export interface SorSecenekleri {
  /** Test için sahte model; verilmezse anahtara göre Gemini ya da Claude. */
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

const KONU_DISI = { bilmiyorum: true, konuDisi: true, oneriler: [] };

export async function sorUclari(app: FastifyInstance, secenekler: SorSecenekleri = {}): Promise<void> {
  const deneme = new DenemeSiniri();
  const cevapla = secenekler.cevapla ?? secilenModelle;
  const anahtarVar = secenekler.anahtarVar ?? (() => saglayiciSec() !== null);

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
      // IP yalnızca özetiyle ve yalnızca bellekte tutulur (ısrarcıya fren).
      const kimlik = createHash('sha256').update(istek.ip).digest('hex').slice(0, 16);
      if (deneme.engelliMi(kimlik)) return cevap.code(429).send({ hata: 'cok-deneme' });

      const temiz = girdiTemizle(govde.soru);
      if (temiz.length < 3) return { bilmiyorum: true, oneriler: [] };
      if (saldiriMi(temiz)) {
        deneme.kaydet(kimlik);
        istek.log.info({ tur: 'kalkan-girdi' }, 'soru kalkana takıldı');
        return KONU_DISI;
      }
      const soru = kisiselVeriTemizle(temiz);

      const toplu = topluSoru(soru);
      const topluSonuc = toplu ? topluParcalar(korpus, toplu) : null;
      const kavramlar = !topluSonuc && tanimSorusuMu(soru) ? kavramParcalari(korpus, soru) : [];
      const parcalar =
        topluSonuc?.parcalar ??
        [...new Map([...kavramlar, ...bul(korpus, soru, govde.eserId, PARCA_SAYISI)].map((p) => [p.id, p])).values()].slice(
          0,
          PARCA_SAYISI,
        );
      if (parcalar.length === 0) return { bilmiyorum: true, oneriler: [] };

      let model;
      try {
        model = await cevapla(soru, parcalar, topluSonuc?.kapsam);
      } catch (hata) {
        // Sorunun kendisi loglanmaz; yalnızca hata türü.
        istek.log.warn({ tur: hata instanceof Error ? hata.name : 'bilinmeyen' }, 'soru-cevap modeli yanıt vermedi');
        return cevap.code(502).send({ hata: 'model', oneriler: oneriler(parcalar) });
      }

      const bicimli = cevapDenetle(model, parcalar.length);
      if (bicimli?.konuDisi) return KONU_DISI;
      if (!bicimli || bicimli.bilmiyorum) return { bilmiyorum: true, oneriler: oneriler(parcalar) };
      const baglam = `${soru} ${topluSonuc?.kapsam ?? ''}`;
      const sayili = sayilariDogrula(bicimli, parcalar, baglam);
      const denetlenmis = sayili && cevabiAyikla(sayili, parcalar, baglam);
      if (!denetlenmis) {
        istek.log.warn({ tur: 'kalkan-cikti' }, 'model cevabı kalkana takıldı');
        return { bilmiyorum: true, oneriler: oneriler(parcalar) };
      }

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
