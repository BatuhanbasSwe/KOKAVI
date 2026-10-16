/**
 * Ses efektleri ve titreşim — Duolingo'daki "ding" hissi.
 *
 * Sesler DOSYA DEĞİL: Web Audio ile kodda sentezlenir (indirme yok, lisans
 * yok, çevrimdışı çalışır). Yalnızca bir kullanıcı eyleminin hemen ardından
 * çalar (tarayıcıların otomatik oynatma kuralı).
 *
 * SAYGI KURALLARI
 *  · "Sessiz mod" açıksa hiç ses çıkmaz (başvuru PDF'i: sessiz mod taahhüdü).
 *  · "Hareketi azalt" açıksa titreşim de olmaz.
 *  · Yanlış cevap sesi ASLA "hata" sesi değildir: alçak, yumuşak, kısa bir
 *    "hmm" tonu (ceza yok ilkesi).
 */

export type EfektTuru = 'dogru' | 'ipucu' | 'kutlama' | 'kombo' | 'tik' | 'rozet';

export interface EfektAyari {
  sessizMod: boolean;
  hareketAzalt: boolean;
}

let baglam: AudioContext | null = null;

function sesBaglami(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Kurucu =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Kurucu) return null;
  try {
    baglam ??= new Kurucu();
    if (baglam.state === 'suspended') void baglam.resume();
    return baglam;
  } catch {
    return null;
  }
}

interface Nota {
  /** Hz */
  f: number;
  /** başlangıç (sn, şimdiden itibaren) */
  t: number;
  /** süre (sn) */
  d: number;
  dalga?: OscillatorType;
  ses?: number;
}

function cal(notalar: Nota[]): void {
  const ctx = sesBaglami();
  if (!ctx) return;
  const simdi = ctx.currentTime + 0.01;
  for (const n of notalar) {
    const osc = ctx.createOscillator();
    const kazanc = ctx.createGain();
    osc.type = n.dalga ?? 'triangle';
    osc.frequency.setValueAtTime(n.f, simdi + n.t);
    const tepe = n.ses ?? 0.18;
    // Tıkırtısız zarf: hızlı yüksel, yumuşak sön.
    kazanc.gain.setValueAtTime(0.0001, simdi + n.t);
    kazanc.gain.exponentialRampToValueAtTime(tepe, simdi + n.t + 0.015);
    kazanc.gain.exponentialRampToValueAtTime(0.0001, simdi + n.t + n.d);
    osc.connect(kazanc).connect(ctx.destination);
    osc.start(simdi + n.t);
    osc.stop(simdi + n.t + n.d + 0.02);
  }
}

// Notalar: C5=523, E5=659, G5=784, A5=880, C6=1047, E6=1319
const SESLER: Record<EfektTuru, Nota[]> = {
  dogru: [
    { f: 659, t: 0, d: 0.12 },
    { f: 880, t: 0.09, d: 0.22 },
  ],
  ipucu: [
    { f: 330, t: 0, d: 0.16, dalga: 'sine', ses: 0.12 },
    { f: 294, t: 0.12, d: 0.22, dalga: 'sine', ses: 0.1 },
  ],
  kutlama: [
    { f: 523, t: 0, d: 0.14 },
    { f: 659, t: 0.11, d: 0.14 },
    { f: 784, t: 0.22, d: 0.14 },
    { f: 1047, t: 0.33, d: 0.4 },
  ],
  kombo: [
    { f: 784, t: 0, d: 0.1 },
    { f: 1047, t: 0.07, d: 0.1 },
    { f: 1319, t: 0.14, d: 0.26 },
  ],
  tik: [{ f: 1200, t: 0, d: 0.04, dalga: 'square', ses: 0.04 }],
  rozet: [
    { f: 1047, t: 0, d: 0.12, dalga: 'sine' },
    { f: 1319, t: 0.1, d: 0.12, dalga: 'sine' },
    { f: 1568, t: 0.2, d: 0.35, dalga: 'sine' },
  ],
};

const TITRESIM: Partial<Record<EfektTuru, number | number[]>> = {
  dogru: 30,
  kombo: [20, 40, 20],
  kutlama: [30, 60, 30, 60, 60],
  rozet: [20, 30, 20],
};

/** Efekti ayarlara uyarak çalar; desteklenmeyen ortamda sessizce hiçbir şey yapmaz. */
export function efekt(tur: EfektTuru, ayar: EfektAyari): void {
  if (!ayar.sessizMod) {
    try {
      cal(SESLER[tur]);
    } catch {
      /* ses yoksa akış etkilenmez */
    }
  }
  const desen = TITRESIM[tur];
  if (desen && !ayar.sessizMod && !ayar.hareketAzalt && typeof navigator !== 'undefined') {
    try {
      navigator.vibrate?.(desen);
    } catch {
      /* titreşim yok */
    }
  }
}
