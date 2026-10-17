/**
 * Arama kutusuna yazılan metin bir soru mu? ("Köstik'e sor" düğmesi ve
 * sunucu aynı kuralı kullanır — tek kaynak burası.)
 * Soru işareti ya da soru kelimesi (ne, kim, neden, nasıl, kaç, hangi,
 * nerede, ne zaman, niçin, mı/mi) varsa ve en az iki kelime ise soru sayılır.
 */
const SORU_KELIMESI =
  /(^|\s)(ne|neden|niçin|nicin|nasıl|nasil|kim|kimin|kime|kaç|kac|hangi|hangisi|nerede|nereye|nereden|neresi|mı|mi|mu|mü)(\s|$|[?.,!])|(^|\s)ne zaman(\s|$)/i;

export function soruMu(metin: string): boolean {
  const temiz = metin.trim();
  if (temiz.split(/\s+/).length < 2) return false;
  return temiz.endsWith('?') || SORU_KELIMESI.test(temiz.toLocaleLowerCase('tr'));
}
