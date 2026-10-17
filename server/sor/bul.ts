/**
 * Korpustan soruya en uygun parçaları bulur: BM25 (k1=1.2, b=0.75) + eser adı
 * eşleşmesine ve istenen esere ek puan. Kelime kökleri için basit önek
 * eşleşmesi: "kubbeli" sorusu "kubbe" geçen parçayı bulur (ilk 5 harf).
 */
import { kelimeler, normallestir } from './metin.ts';

export interface Parca {
  id: string;
  eserId: string;
  eserAd: string;
  metin: string;
  kunye: string;
}

interface Dizin {
  parcalar: Parca[];
  terimler: string[][];
  belgeSiklik: Map<string, number>;
  ortUzunluk: number;
  adlar: string[];
}

const KOK = 5;
const kok = (k: string) => k.slice(0, KOK);
const onbellek = new WeakMap<Parca[], Dizin>();

function dizinle(parcalar: Parca[]): Dizin {
  const hazir = onbellek.get(parcalar);
  if (hazir) return hazir;
  const terimler = parcalar.map((p) => kelimeler(p.metin).map(kok));
  const belgeSiklik = new Map<string, number>();
  for (const t of terimler) for (const k of new Set(t)) belgeSiklik.set(k, (belgeSiklik.get(k) ?? 0) + 1);
  const ortUzunluk = terimler.reduce((s, t) => s + t.length, 0) / Math.max(1, terimler.length);
  const dizin = { parcalar, terimler, belgeSiklik, ortUzunluk, adlar: parcalar.map((p) => normallestir(p.eserAd)) };
  onbellek.set(parcalar, dizin);
  return dizin;
}

export function bul(parcalar: Parca[], soru: string, eserId: string | undefined, n: number): Parca[] {
  const d = dizinle(parcalar);
  const soruKokleri = [...new Set(kelimeler(soru).map(kok))];
  if (soruKokleri.length === 0) return [];
  const soruNorm = normallestir(soru);
  const N = d.parcalar.length;

  const puanlar = d.parcalar.map((p, i) => {
    const t = d.terimler[i]!;
    let puan = 0;
    for (const q of soruKokleri) {
      const tf = t.filter((k) => k === q).length;
      if (!tf) continue;
      const df = d.belgeSiklik.get(q) ?? 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      puan += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (t.length / d.ortUzunluk))));
    }
    if (puan === 0) return 0;
    // Eser adı soruda geçiyorsa o eserin parçaları öne çıkar.
    const ad = d.adlar[i]!.split(' ')[0]!;
    if (ad.length > 2 && soruNorm.includes(ad)) puan += 2;
    if (eserId && p.eserId === eserId) puan += 3;
    return puan;
  });

  return d.parcalar
    .map((p, i) => ({ p, puan: puanlar[i]! }))
    .filter((x) => x.puan > 0)
    .sort((a, b) => b.puan - a.puan)
    .slice(0, n)
    .map((x) => x.p);
}
