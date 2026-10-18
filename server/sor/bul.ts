/**
 * Korpustan soruya en uygun parçaları bulur: BM25 (k1=1.2, b=0.75). Soru bir
 * eseri anıyorsa (ya da eserId verildiyse) önce o eserin parçaları gelir.
 * Kelime kökleri için basit önek eşleşmesi: "kubbeli" sorusu "kubbe" geçen parçayı bulur (ilk 5 harf).
 */
import { kelimeler, normallestir } from './metin.ts';

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

interface Dizin {
  parcalar: Parca[];
  terimler: string[][];
  belgeSiklik: Map<string, number>;
  ortUzunluk: number;
  adlar: string[];
  /** Ad kelimesi → geçtiği parçaların ne kadarı o adı taşıyan esere ait (önbellek). */
  ozgulluk: Map<string, number>;
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
  const adlar = parcalar.map((p) => normallestir(p.eserAd));
  const dizin = { parcalar, terimler, belgeSiklik, ortUzunluk, adlar, ozgulluk: new Map<string, number>() };
  onbellek.set(parcalar, dizin);
  return dizin;
}

/** Puanı bu kadar artırılan parçalar (sorulan eser) her zaman öne geçer. */
const HEDEF_PUANI = 100;
/**
 * Bir ad kelimesinin "eser adı" sayılması için geçtiği parçaların en az bu
 * kadarı o esere ait olmalı. Ölçüm (korpus): Ulucami .38, Koza .59, Yeşil .35;
 * genel kelimeler vakıf .01, eski .01, cami .00, ali .08.
 */
const OZGULLUK_ESIGI = 0.1;

function ozgulMu(d: Dizin, ad: string): boolean {
  let oran = d.ozgulluk.get(ad);
  if (oran === undefined) {
    const k = kok(ad);
    let toplam = 0;
    let kendi = 0;
    d.terimler.forEach((t, i) => {
      if (!t.includes(k)) return;
      toplam++;
      if (d.adlar[i]!.split(' ')[0] === ad) kendi++;
    });
    oran = toplam ? kendi / toplam : 0;
    d.ozgulluk.set(ad, oran);
  }
  return oran >= OZGULLUK_ESIGI;
}

function bm25(d: Dizin, i: number, kokler: string[]): number {
  const t = d.terimler[i]!;
  const N = d.parcalar.length;
  let puan = 0;
  for (const q of kokler) {
    const tf = t.filter((k) => k === q).length;
    if (!tf) continue;
    const df = d.belgeSiklik.get(q) ?? 0;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    puan += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (t.length / d.ortUzunluk))));
  }
  return puan;
}

/**
 * Sorulan eserleri bulur: eserId verildiyse o; yoksa adının ilk kelimesi soruda
 * bir kelimenin başında geçen eserler ("Ulucami'de" → ulucami). Üç harfli adlar
 * tam eşleşmeli ("ulu", "ulucami"de eşleşmez). Genel kelimeyle başlayan adlar
 * ("Vakıf Kültür Konakları") hedef sayılmaz (ozgulMu). Soruda şehir adı da
 * varsa ("Bursa Ulucami") o şehrin eseriyle sınırlanır.
 */
function adSorudaMi(ad: string, soruKelimeleri: Set<string>): boolean {
  if (ad.length <= 2) return false;
  if (ad.length === 3) return soruKelimeleri.has(ad);
  for (const k of soruKelimeleri) if (k.startsWith(ad)) return true;
  return false;
}

function hedefleriBul(d: Dizin, soruKelimeleri: Set<string>, eserId: string | undefined) {
  // eserId → adının kökleri
  const adaylar = new Map<string, string[]>();
  d.parcalar.forEach((p, i) => {
    if (adaylar.has(p.eserId)) return;
    const ad = d.adlar[i]!.split(' ')[0]!;
    if (p.eserId === eserId || (adSorudaMi(ad, soruKelimeleri) && ozgulMu(d, ad))) {
      adaylar.set(p.eserId, kelimeler(d.adlar[i]!).map(kok));
    }
  });
  const adKokleri = new Set<string>();
  const sehirler = [...adaylar.keys()].map((id) => id.split('-')[0]!).filter((s) => soruKelimeleri.has(s));
  if (sehirler.length) {
    for (const id of adaylar.keys()) if (!sehirler.includes(id.split('-')[0]!)) adaylar.delete(id);
    for (const s of sehirler) adKokleri.add(kok(s));
  }
  // Aynı kelimeyle başlayan birden çok eser varsa ("Yeşil Cami", "Yeşil Türbe"),
  // adının en çok kelimesi soruda geçen kalır. eserId ile istenen her zaman kalır.
  const soruKokleri = new Set([...soruKelimeleri].map(kok));
  const eslesen = (id: string) => adaylar.get(id)!.filter((k) => soruKokleri.has(k)).length;
  const enIyi = Math.max(0, ...[...adaylar.keys()].map(eslesen));
  const hedefler = new Set([...adaylar.keys()].filter((id) => id === eserId || eslesen(id) === enIyi));
  for (const id of hedefler) for (const k of adaylar.get(id)!) adKokleri.add(k);
  return { hedefler, adKokleri };
}

export function bul(parcalar: Parca[], soru: string, eserId: string | undefined, n: number): Parca[] {
  const d = dizinle(parcalar);
  const soruKelimeleri = kelimeler(soru);
  const soruKokleri = [...new Set(soruKelimeleri.map(kok))];
  if (soruKokleri.length === 0) return [];
  const { hedefler, adKokleri } = hedefleriBul(d, new Set(soruKelimeleri), eserId);
  // Sorulan eserin parçalarında ad ve şehir zaten her yerde geçer; sıralamayı
  // sorunun geri kalanı ("kubbe", "yaptırdı") belirler.
  const icerikKokleri = soruKokleri.filter((k) => !adKokleri.has(k));

  const puanlar = d.parcalar.map((p, i) =>
    hedefler.has(p.eserId) ? HEDEF_PUANI + bm25(d, i, icerikKokleri) : bm25(d, i, soruKokleri),
  );

  return d.parcalar
    .map((p, i) => ({ p, puan: puanlar[i]! }))
    .filter((x) => x.puan > 0)
    .sort((a, b) => b.puan - a.puan)
    .slice(0, n)
    .map((x) => x.p);
}
