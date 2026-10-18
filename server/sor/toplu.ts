/**
 * Toplu (sıralama) soruları: "Bursa'daki en eski 3 eser hangisi?" tek tek
 * parça aramayla cevaplanamaz. Böyle bir soruda ilgili şehir (ve varsa tür)
 * için ders eserlerinin "Yapım" parçalarının HEPSİ modele verilir; model
 * tarihleri metinden okuyup sıralar ve her eseri künyesiyle gösterir.
 *
 * Yıl kodla çıkarılmaz: yapım bilgisi serbest metindir ("H. 802 (M. 1399/1400)",
 * "Kesin yıl bilinmiyor…") ve metindeki ilk yıl çoğu zaman yanıltıcıdır
 * (Osman Gazi Türbesi: 1801 yangın yılıdır). Kapsam cevapta söylenir: yalnızca
 * uygulamadaki ders eserleri, Meraklısına arşivi değil.
 */
import { normallestir } from './metin.ts';
import type { Parca } from './bul.ts';

const SIRALAMA = /\ben (eski|yeni|son|erken|gec|once|sonra)\b|\bilk (yapilan|insa|kurulan)|\b(sirala|siraya|kronolojik|tarih sirasi)/;

const SEHIRLER: Record<string, string> = { bursa: 'Bursa', konya: 'Konya', hatay: 'Hatay' };

/** Tür kelimesi → soruda nasıl geçer. "han" kısa ve "hangi" ile karışmasın diye tam biçimler. */
const TURLER: [tur: string, eslesir: RegExp][] = [
  ['cami', /^cami/],
  ['mescit', /^mesci[td]/],
  ['medrese', /^medrese/],
  ['turbe', /^turbe/],
  ['han', /^(han|hani|hanin\w*|hanlar\w*)$/],
  ['hamam', /^hamam/],
  ['cesme', /^cesme/],
  ['kopru', /^kopru/],
  ['kulliye', /^kulliye/],
  ['imaret', /^imaret/],
  ['bedesten', /^bedesten/],
  ['kervansaray', /^kervansaray/],
  ['mektep', /^mekte[pb]/],
];

export interface TopluIstek {
  sehir?: string;
  tur?: string;
}

export function topluSoru(soru: string): TopluIstek | null {
  const n = normallestir(soru);
  if (!SIRALAMA.test(n)) return null;
  const kelimeler = n.split(' ');
  const sehir = Object.keys(SEHIRLER).find((s) => kelimeler.some((k) => k.startsWith(s)));
  const tur = TURLER.find(([, r]) => kelimeler.some((k) => r.test(k)))?.[0];
  return { ...(sehir ? { sehir } : {}), ...(tur ? { tur } : {}) };
}

function turEslesir(eserTuru: string | undefined, tur: string): boolean {
  if (!eserTuru) return false;
  const r = TURLER.find(([t]) => t === tur)![1];
  return normallestir(eserTuru)
    .split(' ')
    .some((k) => r.test(k));
}

/** Toplu soru için parçalar ve modele söylenecek kapsam; uygun eser yoksa null. */
export function topluParcalar(korpus: Parca[], istek: TopluIstek): { parcalar: Parca[]; kapsam: string } | null {
  const parcalar = korpus.filter(
    (p) =>
      p.alan === 'Yapım' &&
      (!istek.sehir || p.sehir === istek.sehir) &&
      (!istek.tur || turEslesir(p.tur, istek.tur)),
  );
  if (parcalar.length === 0) return null;
  const eserSayisi = new Set(parcalar.map((p) => p.eserId)).size;
  const yer = istek.sehir ? SEHIRLER[istek.sehir] : 'Bursa, Konya ve Hatay';
  return {
    parcalar,
    kapsam: `${yer}: uygulamadaki ${eserSayisi} eserin yapım bilgisi. Meraklısına arşivindeki diğer eserler bu listede yok.`,
  };
}
