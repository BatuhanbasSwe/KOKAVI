/**
 * Kaynaklı soru-cevap için arama korpusu üretir: `server/sor/korpus.json`.
 *
 * Kaynaklar (yalnızca projedeki doğrulanmış veri; dış kaynak eklenmez):
 *  - data/research/*.json: 57 ders eseri, alan alan parça; künye `kaynaklar[0].kunye`.
 *  - public/arsiv/metin/*.json: 633 arşiv eseri, yalnızca Türkçe paragraflar;
 *    künye public/arsiv/liste.json → `kaynak`.
 *
 * Çalıştır: npm run korpus (içerik değişince yeniden). Esbuild çıktıyı Vercel
 * paketine katar.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { eserKimligi } from '../shared/slug.ts';
import { normallestir } from '../server/sor/metin.ts';

export interface Parca {
  id: string;
  eserId: string;
  eserAd: string;
  metin: string;
  kunye: string;
  /** Yalnızca ders eserlerinde (toplu sorular için, toplu.ts): alan başlığı, şehir, tür. */
  alan?: string;
  sehir?: string;
  tur?: string;
}

const ARASTIRMA = 'data/research';
const ARSIV = 'public/arsiv';
const CIKTI = 'server/sor/korpus.json';
const EN_UZUN = 600;

const INGILIZCE = /\b(the|is|was|of|and|with|located|built|which|its|in the|by)\b/gi;

/** Paragraf İngilizce mi? (arşiv metinlerinde her Türkçe paragrafın çevirisi var) */
export function ingilizceMi(p: string): boolean {
  const kelime = p.split(/\s+/).length;
  const eslesme = p.match(INGILIZCE)?.length ?? 0;
  return kelime > 0 && eslesme / kelime > 0.07;
}

/** Uzun metni cümle sınırından ~600 karakterlik parçalara böler. */
export function bol(metin: string, enUzun = EN_UZUN): string[] {
  const temiz = metin.replace(/\s+/g, ' ').trim();
  if (temiz.length <= enUzun) return temiz ? [temiz] : [];
  const cumleler = temiz.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [temiz];
  const sonuc: string[] = [];
  let tampon = '';
  for (const c of cumleler) {
    if ((tampon + c).length > enUzun && tampon) {
      sonuc.push(tampon.trim());
      tampon = '';
    }
    tampon += c;
  }
  if (tampon.trim()) sonuc.push(tampon.trim());
  // Tek cümlesi bile çok uzun olan parça kelime sınırından bölünür.
  return sonuc.flatMap((p) => {
    if (p.length <= enUzun) return [p];
    const kesik: string[] = [];
    let satir = '';
    for (const k of p.split(' ')) {
      if ((satir + ' ' + k).length > enUzun && satir) {
        kesik.push(satir);
        satir = k;
      } else satir = satir ? `${satir} ${k}` : k;
    }
    if (satir) kesik.push(satir);
    return kesik;
  });
}

interface ArastirmaEseri {
  id?: string;
  ad: string;
  sehir: string;
  ilce?: string;
  tur?: string;
  bani?: string | null;
  yapimYili?: string | null;
  vakfiyeAmaci?: string | null;
  hizmet?: string | null;
  bugunNeOldu?: string | null;
  kulliye?: string | null;
  kaynaklar?: { kunye: string }[];
}

function arastirmaParcalari(): Parca[] {
  const parcalar: Parca[] = [];
  for (const dosya of readdirSync(ARASTIRMA).filter((f) => f.endsWith('.json')).sort()) {
    const veri = JSON.parse(readFileSync(join(ARASTIRMA, dosya), 'utf8')) as { eserler: ArastirmaEseri[] };
    for (const e of veri.eserler) {
      const kunye = e.kaynaklar?.[0]?.kunye;
      if (!kunye) continue;
      // Kimlik veritabanıyla aynı kuraldan (seed de eserKimligi kullanır).
      const eserId = eserKimligi(e);
      const alanlar: [string, string | null | undefined][] = [
        ['Genel', [e.ad, e.tur, e.ilce, e.sehir].filter(Boolean).join(', ')],
        ['Yaptıran', e.bani],
        ['Yapım', e.yapimYili],
        ['Neden yaptırıldı', e.vakfiyeAmaci],
        ['Ne hizmet verdi', e.hizmet],
        ['Bugün', e.bugunNeOldu],
        ['Külliye', e.kulliye],
      ];
      for (const [baslik, deger] of alanlar) {
        if (!deger) continue;
        bol(`${e.ad} — ${baslik}: ${deger}`).forEach((metin, i) =>
          parcalar.push({
            id: `${eserId}#${baslik}#${i}`,
            eserId,
            eserAd: e.ad,
            metin,
            kunye,
            alan: baslik,
            ...(e.sehir ? { sehir: normallestir(e.sehir) } : {}),
            ...(e.tur ? { tur: e.tur } : {}),
          }),
        );
      }
    }
  }
  return parcalar;
}

function arsivParcalari(arastirmaEserleri: Set<string>): Parca[] {
  const liste = JSON.parse(readFileSync(join(ARSIV, 'liste.json'), 'utf8')) as { id: string; ad: string; kaynak: string }[];
  const parcalar: Parca[] = [];
  for (const e of liste) {
    // Ders eserlerinin araştırma kaydı daha ayrıntılı; arşiv metni de eklenir ama aynı kimlikle.
    let paragraflar: string[] = [];
    try {
      paragraflar = (JSON.parse(readFileSync(join(ARSIV, 'metin', `${e.id}.json`), 'utf8')) as { paragraflar: string[] })
        .paragraflar;
    } catch {
      continue;
    }
    const turkce = paragraflar.filter((p) => p.trim() && !ingilizceMi(p));
    let sira = 0;
    for (const p of turkce) {
      for (const metin of bol(p)) {
        parcalar.push({ id: `${e.id}#arsiv#${sira++}`, eserId: e.id, eserAd: e.ad, metin, kunye: e.kaynak });
      }
    }
    void arastirmaEserleri;
  }
  return parcalar;
}

export function korpusUret(): Parca[] {
  const arastirma = arastirmaParcalari();
  return [...arastirma, ...arsivParcalari(new Set(arastirma.map((p) => p.eserId)))];
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/korpus-uret.ts')) {
  const korpus = korpusUret();
  mkdirSync('server/sor', { recursive: true });
  writeFileSync(CIKTI, JSON.stringify(korpus));
  const eser = new Set(korpus.map((p) => p.eserId)).size;
  console.log(`${CIKTI}: ${korpus.length} parça, ${eser} eser`);
}
