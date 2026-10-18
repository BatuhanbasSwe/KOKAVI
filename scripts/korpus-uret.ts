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
  /** Yalnızca sözlük parçalarında (sozluk.ts): normalleştirilmiş kavram adı ("akar", "vakif mali"). */
  kavram?: string;
  sehir?: string;
  tur?: string;
}

const ARASTIRMA = 'data/research';
const ARSIV = 'public/arsiv';
const DERSLER = 'data/content';
const SOZLUK_KAYNAKLARI = 'data/sozluk-kaynaklari.json';
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

/** "AKAR" → "Akar", "VAKIF MALI" → "Vakıf malı" (Türkçe büyük-küçük harf). */
function cumleDuzeni(ad: string): string {
  const kucuk = ad.toLocaleLowerCase('tr');
  return kucuk.charAt(0).toLocaleUpperCase('tr') + kucuk.slice(1);
}

/**
 * Sözlük: derslerin Bağlam adımındaki kavram açıklamaları (10-12 yaş dili).
 * "Vakıf nedir?", "Akar ne demek?" gibi sorular için (sozluk.ts). Künye
 * dürüsttür: açıklama bizim ders metnimizdir; yanında eserin kaynağı, temel
 * kavramlarda ayrıca doğrulanmış TDV İslâm Ansiklopedisi maddesi durur.
 * Aynı kavram birden çok derste geçerse ilk açıklama alınır.
 */
interface DersKavrami {
  ad: string;
  aciklama: string;
  ornek?: string;
}

function sozlukParcalari(): Parca[] {
  // Temel kavramlar için doğrulanmış ansiklopedi künyesi (data/sozluk-kaynaklari.json).
  const ansiklopedi = (JSON.parse(readFileSync(SOZLUK_KAYNAKLARI, 'utf8')) as { kavramlar: Record<string, { kunye: string }> })
    .kavramlar;
  const eserler = new Map<string, ArastirmaEseri>();
  for (const dosya of readdirSync(ARASTIRMA).filter((f) => f.endsWith('.json'))) {
    for (const e of (JSON.parse(readFileSync(join(ARASTIRMA, dosya), 'utf8')) as { eserler: ArastirmaEseri[] }).eserler) {
      eserler.set(eserKimligi(e), e);
    }
  }
  const parcalar: Parca[] = [];
  const gorulen = new Set<string>();
  for (const dosya of readdirSync(DERSLER).filter((f) => f.endsWith('.json')).sort()) {
    const veri = JSON.parse(readFileSync(join(DERSLER, dosya), 'utf8')) as {
      dersler: { eserId: string; baglam?: { kavramlar?: DersKavrami[] } }[];
    };
    for (const ders of veri.dersler) {
      const eser = eserler.get(ders.eserId);
      const kaynak = eser?.kaynaklar?.[0]?.kunye;
      if (!eser || !kaynak) continue;
      for (const k of ders.baglam?.kavramlar ?? []) {
        const kavram = normallestir(k.ad);
        if (!kavram || !k.aciklama || gorulen.has(kavram)) continue;
        gorulen.add(kavram);
        const ad = cumleDuzeni(k.ad);
        parcalar.push({
          id: `sozluk#${kavram.replace(/ /g, '-')}`,
          eserId: ders.eserId,
          eserAd: eser.ad,
          metin: `${ad} — Sözlük: ${k.aciklama}${k.ornek ? ` Örnek: ${k.ornek}` : ''}`,
          kunye:
            `Kök Avı ders metni (${eser.ad}, Bağlam adımı); eser kaynağı: ${kaynak}` +
            (ansiklopedi[kavram] ? `; kavram kaynağı: ${ansiklopedi[kavram]!.kunye}` : ''),
          alan: 'Sözlük',
          kavram,
        });
      }
    }
  }
  return parcalar;
}

export function korpusUret(): Parca[] {
  const arastirma = arastirmaParcalari();
  return [...arastirma, ...sozlukParcalari(), ...arsivParcalari(new Set(arastirma.map((p) => p.eserId)))];
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/korpus-uret.ts')) {
  const korpus = korpusUret();
  mkdirSync('server/sor', { recursive: true });
  writeFileSync(CIKTI, JSON.stringify(korpus));
  const eser = new Set(korpus.map((p) => p.eserId)).size;
  console.log(`${CIKTI}: ${korpus.length} parça, ${eser} eser`);
}
