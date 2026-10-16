/**
 * Parola özetleme — scrypt (Node yerleşik `node:crypto`).
 *
 * Neden scrypt: bcrypt/argon2 gibi harici bir derleme bağımlılığı gerektirmez,
 * Node'un yerleşik ve bellek-sert (memory-hard) KDF'sidir. Hackathon demo
 * makinesinde `node-gyp` derleme riski yoktur.
 *
 * Biçim: `scrypt$N$r$p$<tuz-b64>$<özet-b64>`
 * Parametreler özetin içinde saklanır; ileride artırılırsa eski kayıtlar
 * yine doğrulanabilir (parametreler kayıttan okunur).
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384; // CPU/maliyet faktörü (2^14)
const R = 8; // blok boyutu
const P = 1; // paralelleştirme
const TUZ_UZUNLUK = 16;
const OZET_UZUNLUK = 64;

export function parolaHashle(parola: string): string {
  if (parola.length < 8) {
    throw new Error('Parola en az 8 karakter olmalıdır.');
  }
  const tuz = randomBytes(TUZ_UZUNLUK);
  const ozet = scryptSync(parola.normalize('NFKC'), tuz, OZET_UZUNLUK, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${tuz.toString('base64')}$${ozet.toString('base64')}`;
}

/**
 * Parolayı özetle karşılaştırır.
 *
 * Zamanlama saldırısına dirençli: `timingSafeEqual` kullanılır, uzunluk farkı
 * erken dönüşle sızdırılmaz. Bozuk/eksik özet durumunda `false` döner —
 * asla istisna fırlatıp çağıranı çökertmez.
 */
export function parolaDogrula(parola: string, kayitliOzet: string): boolean {
  try {
    const parcalar = kayitliOzet.split('$');
    if (parcalar.length !== 6 || parcalar[0] !== 'scrypt') return false;

    const n = Number(parcalar[1]);
    const r = Number(parcalar[2]);
    const p = Number(parcalar[3]);
    const tuz = Buffer.from(parcalar[4]!, 'base64');
    const beklenen = Buffer.from(parcalar[5]!, 'base64');

    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    if (tuz.length === 0 || beklenen.length === 0) return false;

    const hesaplanan = scryptSync(parola.normalize('NFKC'), tuz, beklenen.length, { N: n, r, p });
    return timingSafeEqual(hesaplanan, beklenen);
  } catch {
    return false;
  }
}

/**
 * Parola gücü denetimi (şartname 5.1.5: "kullanıcı girdilerinin uygun
 * doğrulama ve kontrol mekanizmalarından geçirilmesi").
 * Dönen dizi boşsa parola kabul edilebilir.
 */
export function parolaZayifMi(parola: string): string[] {
  const sorunlar: string[] = [];
  if (parola.length < 8) sorunlar.push('En az 8 karakter olmalı.');
  if (!/[a-zçğıöşü]/.test(parola)) sorunlar.push('En az bir küçük harf içermeli.');
  if (!/[A-ZÇĞİÖŞÜ]/.test(parola)) sorunlar.push('En az bir büyük harf içermeli.');
  if (!/[0-9]/.test(parola)) sorunlar.push('En az bir rakam içermeli.');
  if (/^(.)\1+$/.test(parola)) sorunlar.push('Tek karakter tekrarı olamaz.');
  return sorunlar;
}

/** Sabit zamanlı, sızıntısız karşılaştırma (belirteç/özet kıyaslamaları için). */
export function sabitZamanliEsit(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
