/**
 * Kavram soruları: "Vakıf nedir?", "Akar ne demek?", "Mütevelli ne yapardı?"
 * Eser metinlerinde kavramın tanımı nadiren geçer; derslerin Bağlam adımındaki
 * çocuk diliyle yazılmış açıklamalar (korpusta alan "Sözlük") öne alınır.
 *
 * Türkçe ekler: "vakfın" (ünlü düşmesi: vakıf → vakf-), "akarlar", "hanı".
 * Bir kelimeye birden çok kavram uyarsa en uzunu seçilir ("vakfiye" ≠ "vakıf").
 */
import { normallestir } from './metin.ts';
import type { Parca } from './bul.ts';

const TANIM =
  /\b(nedir|neydi|nelerdir|ne demek\w*|ne anlama gel\w*|anlami ne\w*|ne ise yar\w*|neye denir|kime denir|ne yapar\w*|ne is yapar\w*|ne icin yapil\w*)\b/;

export function tanimSorusuMu(soru: string): boolean {
  return TANIM.test(normallestir(soru));
}

/** Kısa kavramlarda ("han") yalnızca bilinen ekler: "hangi" eşleşmesin. */
const KISA_EKLER = /^(|i|in|ina|inda|indan|a|da|de|dan|den|lar|ler|lari|leri|larin|lerin)$/;
const EN_UZUN_EK = 6;

/** "vakif" → "vakf" (vakfın, vakfa): son hecedeki dar ünlü düşer. */
function unluDusmesi(kavram: string): string | null {
  const m = /^(.+[^aeiou])[iu]([^aeiou])$/.exec(kavram);
  return m ? m[1]! + m[2]! : null;
}

function kelimeyeUyar(kelime: string, kavram: string): boolean {
  if (kelime === kavram) return true;
  if (kavram.length <= 3) return kelime.startsWith(kavram) && KISA_EKLER.test(kelime.slice(kavram.length));
  for (const kok of [kavram, unluDusmesi(kavram)]) {
    if (kok && kelime.startsWith(kok) && kelime.length - kok.length <= EN_UZUN_EK) return true;
  }
  return false;
}

/** Soruda adı geçen kavramların sözlük parçaları (en uzun eşleşme önce). */
export function kavramParcalari(korpus: Parca[], soru: string, enCok = 2): Parca[] {
  const n = normallestir(soru);
  const kelimeler = n.split(' ');
  const sozluk = korpus.filter((p) => p.alan === 'Sözlük' && p.kavram);
  const secilen = new Map<string, Parca>();
  // Çok kelimeli kavramlar ("vakif mali", "cifte hamam") metin içinde aranır.
  for (const p of sozluk) if (p.kavram!.includes(' ') && n.includes(p.kavram!)) secilen.set(p.kavram!, p);
  for (const kelime of kelimeler) {
    const uyan = sozluk.filter((p) => !p.kavram!.includes(' ') && kelimeyeUyar(kelime, p.kavram!));
    const enUzun = uyan.sort((a, b) => b.kavram!.length - a.kavram!.length)[0];
    if (enUzun) secilen.set(enUzun.kavram!, enUzun);
  }
  return [...secilen.values()].sort((a, b) => b.kavram!.length - a.kavram!.length).slice(0, enCok);
}
