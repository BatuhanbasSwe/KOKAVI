/**
 * Prompt injection kalkanı (katmanlı savunma; OWASP LLM01 ve Anthropic
 * "Mitigate jailbreaks and prompt injections" önerilerinden):
 *
 *  1. girdiTemizle: görünmez karakterler (Unicode "tag" kaçakçılığı dahil),
 *     tam genişlikli harfler, uzun tekrarlar temizlenir.
 *  2. saldiriMi: bilinen saldırı kalıpları (TR + EN), harfleri karıştırılmış
 *     yazımlar ("ignroe prevoius insturctions") ve Base64/hex gizleme modele
 *     hiç gönderilmez.
 *  3. cevapGuvenliMi: model kandırılsa bile cevap çocuğa ulaşmadan denetlenir:
 *     sistem talimatı sızıntısı (kanarya), bağlantı/HTML ve kaynak parçalarla
 *     kelime örtüşmesi olmayan cümle cevabı düşürür.
 *
 * Hiçbir katman tek başına yeterli değildir; asıl güvence modelin hiçbir
 * araca, gizli bilgiye ya da kişisel veriye erişmemesidir (en az yetki).
 */
import { kelimeler, normallestir } from './metin.ts';
import type { Parca } from './bul.ts';
import type { ModelCevabi } from './denetle.ts';

/** Sistem talimatına gömülü işaret; cevapta görünürse talimat sızmıştır. */
export const KANARYA = 'KK-7Q4M-KANARYA';

// Sıfır genişlikli ve biçim karakterleri, yumuşak tire, BOM, Unicode etiket blokları.
const GORUNMEZ = /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]|[\u{E0000}-\u{E007F}]/gu;

export function girdiTemizle(metin: string): string {
  return metin
    .normalize('NFKC')
    .replace(GORUNMEZ, '')
    .replace(/(.)\1{4,}/gu, '$1$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Harfleri karıştırılmış yazımları tanımak için anahtar kelimeler (normalleştirilmiş).
 * Kelime tek başına zararsız olabilir ("kuralları"); yalnızca kalıp içinde sayılır.
 */
const ANAHTARLAR = [
  'ignore', 'previous', 'instructions', 'instruction', 'disregard', 'forget', 'system', 'prompt', 'pretend',
  'jailbreak', 'override', 'developer', 'talimat', 'talimatlari', 'talimatlarini', 'onceki', 'kurallari',
  'kurallarini', 'yukaridaki', 'unut', 'sistem', 'gelistirici',
];

function karisikEslesme(kelime: string): string | null {
  if (kelime.length < 5) return null;
  const sirala = (s: string) => [...s.slice(1, -1)].sort().join('');
  for (const a of ANAHTARLAR) {
    if (a.length !== kelime.length || a === kelime) continue;
    if (a[0] === kelime[0] && a.at(-1) === kelime.at(-1) && sirala(a) === sirala(kelime)) return a;
  }
  return null;
}

/** Karıştırılmış kelimeleri asıllarına çevirir: "insturctions" → "instructions". */
function kanonik(metin: string): string {
  return normallestir(metin)
    .split(' ')
    .map((k) => karisikEslesme(k) ?? k)
    .join(' ');
}

/** Kalıplar kanonik (küçük harf, Türkçe harfler katlanmış) metinde aranır. */
const KALIPLAR: RegExp[] = [
  // İngilizce
  /\b(ignore|disregard|forget|override|bypass)\b.{0,40}\b(instructions?|rules|prompt|guidelines|above|previous|everything)\b/,
  /\b(system|initial|hidden|original)\s+(prompt|message|instructions?)\b/,
  /\b(you are now|act as|pretend (to be|you)|roleplay|role play|from now on you)\b/,
  /\b(jailbreak|developer mode|dan mode|do anything now)\b/,
  /\b(reveal|show|print|repeat|output)\b.{0,30}\b(prompt|instructions?|system)\b/,
  // Türkçe
  // "Vakfın tüm kuralları neydi?" ya da "vakfiye şartını çiğnemek" meşru sorulardır;
  // bu yüzden "kural" yalnızca unut/yok say fiiliyle birlikte saldırı sayılır.
  /\b(onceki|yukaridaki|verilen)\b.{0,25}\b(talimat|komut|yonerge)\w*/,
  /\b(talimat|kural|komut|yonerge)\w*\b.{0,30}\b(unut|yok say|gormezden gel)\w*/,
  /\bsistem\s+(mesaj|komut|talimat|istem|prompt)\w*/,
  /\bprompt\w*\b.{0,20}\b(goster|yaz|soyle|paylas|ver|ac)\w*/,
  /\b(sen artik|artik sen|bundan sonra sen)\b/,
  /\b\w*\s+gibi davran\w*|\bgibi rol yap\w*|\brol yap\w*|\bmis gibi yap\w*/,
  /\b(gelistirici|yonetici|admin) mod\w*/,
];

/** Kodlanmış (gizlenmiş) içerik: uzun Base64 ya da hex dizileri. */
const KODLANMIS = /[A-Za-z0-9+/]{32,}={0,2}|\b(?:[0-9a-fA-F]{2}\s?){24,}\b/;

export function saldiriMi(soru: string): boolean {
  if (KODLANMIS.test(soru)) return true;
  const k = kanonik(soru);
  return KALIPLAR.some((r) => r.test(k));
}

const KOK = 5;
const kokler = (metin: string) => new Set(kelimeler(metin).map((k) => k.slice(0, KOK)));

/**
 * Dayanak: cümlenin kökleri atıf yaptığı parçalarla örtüşmeli (en az 2), ve
 * bilgi taşıyan köklerin en az %30'u kaynakta geçmeli. Çocuk dili için
 * sadeleştirmeye ("yani yenileme") yer bırakır; konu dışı ya da uydurma bir
 * cümleyi geçirmez.
 *
 * Nötr kökler eşleşmiş sayılır: sorunun ve kapsam notunun kendi kelimeleri
 * ("en eski han", "uygulamadaki eserler") ile çerçeve kelimeleri. Bunlar bilgi
 * değil, cevabın çerçevesidir; asıl bilgi (yıl, ad) yine kaynakta olmalı.
 */
export const DAYANAK_ORANI = 0.3;

const CERCEVE = kokler(
  'göre arasında arasındaki ayrıca verilen bilgilere bilgiye yılında yıllarında yapılan yapıldı yapılmış inşa ' +
    'edilen edildi eserler eserdir uygulamadaki uygulamada şöyle yani olarak olan oldu olmuştur bulunan ' +
    'yer alır alan bugün günümüzde ilk ikinci üçüncü sonra önce',
);

export function dayanakli(metin: string, parcalar: Parca[], baglam = ''): boolean {
  const notr = new Set([...CERCEVE, ...kokler(baglam)]);
  const tum = [...kokler(metin)];
  if (tum.length === 0) return false;
  const kaynak = new Set(parcalar.flatMap((p) => [...kokler(`${p.eserAd} ${p.metin}`)]));
  const bilgi = tum.filter((k) => !notr.has(k));
  const bilgiOrtak = bilgi.filter((k) => kaynak.has(k)).length;
  const ortak = tum.length - bilgi.length + bilgiOrtak;
  return ortak >= Math.min(2, tum.length) && (bilgi.length === 0 || bilgiOrtak / bilgi.length >= DAYANAK_ORANI);
}

const SAYI = /(?<!\d)\d{3,}(?!\d)/g;
/** Kaynaklarda yıl aralıkları kısaltılır ("1365-66", "1339/40"); model açık yazar ("1365-1366"). */
function acikMetin(metin: string): string {
  return metin.replace(/(?<!\d)(\d{2})(\d{2})\s*[-–/]\s*(\d{2})(?!\d)/g, (tum, yuzyil: string, _y, son: string) => `${tum} ${yuzyil}${son}`);
}
const sayiGecer = (sayi: string, metin: string) => new RegExp(`(?<!\\d)${sayi}(?!\\d)`).test(acikMetin(metin));

/**
 * Sayılar (yıl, ölçü) kaynakta geçmeli: cümledeki her 3+ basamaklı sayı atıf
 * yapılan parçalarda aranır. Başka bir verilen parçada geçiyorsa atıf o
 * parçayla düzeltilir (model doğru bilgiyi yanlış numarayla göstermiştir);
 * hiçbir parçada ve soruda yoksa uydurmadır ve cevap düşer (null).
 */
export function sayilariDogrula(cevap: ModelCevabi, parcalar: Parca[], baglam = ''): ModelCevabi | null {
  const cumleler = [];
  for (const c of cevap.cumleler) {
    const kaynaklar = [...c.kaynaklar];
    for (const sayi of c.metin.match(SAYI) ?? []) {
      if (kaynaklar.some((n) => parcalar[n - 1] && sayiGecer(sayi, parcalar[n - 1]!.metin))) continue;
      const bulunan = parcalar.findIndex((p) => sayiGecer(sayi, p.metin));
      if (bulunan >= 0) kaynaklar.push(bulunan + 1);
      else if (!sayiGecer(sayi, baglam)) return null;
    }
    cumleler.push({ ...c, kaynaklar });
  }
  return { ...cevap, cumleler };
}

const SIZINTI = [/https?:\/\//i, /www\./i, /<[a-z/!]/i, /\]\(/, /\bsystem prompt\b/i, /sistem (talimat|mesaj)/i];

/**
 * Model çıktısı çocuğa gösterilebilir mi? (denetle.ts biçim denetiminden sonra)
 * `baglam`: soru ve varsa kapsam notu (dayanak hesabında nötr sayılır).
 */
export function cevapGuvenliMi(cevap: ModelCevabi, parcalar: Parca[], baglam = ''): boolean {
  for (const c of cevap.cumleler) {
    if (c.metin.includes(KANARYA) || SIZINTI.some((r) => r.test(c.metin))) return false;
    const atif = c.kaynaklar.map((n) => parcalar[n - 1]).filter((p): p is Parca => Boolean(p));
    if (!dayanakli(c.metin, atif, baglam)) return false;
  }
  return true;
}

/**
 * Israrcıya fren: aynı bağlantıdan 15 dakikada 5 engellenen deneme olursa
 * 15 dakika boyunca soru alınmaz. Yalnızca bellekte, IP'nin özeti tutulur.
 */
export class DenemeSiniri {
  private kayit = new Map<string, { sayi: number; bitis: number }>();
  constructor(
    private esik = 5,
    private sureMs = 15 * 60_000,
  ) {}

  engelliMi(anahtar: string, simdi = Date.now()): boolean {
    const k = this.kayit.get(anahtar);
    if (!k || k.bitis <= simdi) return false;
    return k.sayi >= this.esik;
  }

  kaydet(anahtar: string, simdi = Date.now()): void {
    const k = this.kayit.get(anahtar);
    if (!k || k.bitis <= simdi) this.kayit.set(anahtar, { sayi: 1, bitis: simdi + this.sureMs });
    else k.sayi++;
    if (this.kayit.size > 10_000) for (const [a, v] of this.kayit) if (v.bitis <= simdi) this.kayit.delete(a);
  }
}
