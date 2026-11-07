/**
 * Canlı yol: saf yardımcılar (DOM'a bağlı değil, testli).
 *
 *  - egriYolu / egriNoktalari: iki madalyon arasındaki kıvrımlı yol.
 *  - ziplayanNoktalar: yol boyunca zıplayan ilerleme noktaları.
 *  - sahneHesapla: Yol'a dönüldüğünde hangi sahne oynayacak (ders bitti →
 *    yol altınla dolar, ünite açıldı → kilit kırılır, ünite bitti → mühür).
 *
 * "Son görülen yol" cihazda tutulur (localStorage); kişisel veri değildir.
 */
import type { OgrenmeYolu } from '@shared/types';

export interface Nokta {
  x: number;
  y: number;
}

/** a'dan b'ye dikey S eğrisi (kübik Bézier): yol aşağı inerken yana kıvrılır. */
export function egriYolu(a: Nokta, b: Nokta): string {
  const orta = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${orta} ${b.x} ${orta} ${b.x} ${b.y}`;
}

/** egriYolu ile aynı eğri üzerinde eşit aralıklı `adet` nokta (uçlar dahil). */
export function egriNoktalari(a: Nokta, b: Nokta, adet: number): Nokta[] {
  const orta = (a.y + b.y) / 2;
  const p1 = { x: a.x, y: orta };
  const p2 = { x: b.x, y: orta };
  return Array.from({ length: adet }, (_, i) => {
    const t = adet === 1 ? 1 : i / (adet - 1);
    const u = 1 - t;
    return {
      x: u ** 3 * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * b.x,
      y: u ** 3 * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * b.y,
    };
  });
}

/**
 * Zıplayarak yürüyüş: eğri üzerindeki noktalara her adımda yukarı bir sıçrama
 * eklenir (adım başına yarım sinüs). Uçlarda sıçrama sıfırdır.
 */
export function ziplayanNoktalar(a: Nokta, b: Nokta, adim: number, yukseklik: number, cozunurluk = 6): Nokta[] {
  const toplam = adim * cozunurluk + 1;
  return egriNoktalari(a, b, toplam).map((n, i) => ({
    x: n.x,
    y: n.y - Math.abs(Math.sin((Math.PI * i) / cozunurluk)) * yukseklik,
  }));
}

/** Yolun sahne için hatırlanan özeti. */
export interface YolAnisi {
  aktif: string | null;
  kilitliUniteler: string[];
  bitenUniteler: string[];
}

export interface YolSahnesi {
  /** Bitirilen ders (yol buradan ilerler); yoksa null. */
  kimden: string | null;
  /** Yeni sıradaki ders (yol buraya kadar dolar). */
  kime: string | null;
  /** Bu ziyarette kilidi açılan üniteler. */
  yeniAcilan: string[];
  /** Bu ziyarette bütün dersleri biten üniteler (mühür). */
  yeniBiten: string[];
}

export const BOS_SAHNE: YolSahnesi = { kimden: null, kime: null, yeniAcilan: [], yeniBiten: [] };

export function yolAnisi(yol: OgrenmeYolu): YolAnisi {
  const uniteler = yol.sehirler.flatMap((s) => s.uniteler);
  return {
    aktif: yol.guncelDersId,
    kilitliUniteler: uniteler.filter((u) => u.kilitli).map((u) => u.uniteId),
    bitenUniteler: uniteler.filter((u) => u.toplamSayi > 0 && u.tamamlananSayi === u.toplamSayi).map((u) => u.uniteId),
  };
}

/**
 * Önceki anıyla bugünkü yolu karşılaştırır. İlk ziyarette (anı yok) sahne
 * oynamaz: çocuğu açılışta yapay bir kutlama karşılamasın.
 */
export function sahneHesapla(onceki: YolAnisi | null, yol: OgrenmeYolu): YolSahnesi {
  if (!onceki) return BOS_SAHNE;
  const simdi = yolAnisi(yol);
  const tamamlanan = new Set(
    yol.sehirler.flatMap((s) => s.uniteler.flatMap((u) => u.dersler.filter((d) => d.tamamlandi).map((d) => d.dersId))),
  );
  const ilerledi = !!onceki.aktif && onceki.aktif !== simdi.aktif && tamamlanan.has(onceki.aktif);
  return {
    kimden: ilerledi ? onceki.aktif : null,
    kime: ilerledi ? simdi.aktif : null,
    yeniAcilan: onceki.kilitliUniteler.filter((id) => !simdi.kilitliUniteler.includes(id)),
    yeniBiten: simdi.bitenUniteler.filter((id) => !onceki.bitenUniteler.includes(id)),
  };
}

const ANAHTAR = 'kokavi.yol.ani.v1';

export function aniOku(): YolAnisi | null {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    return ham ? (JSON.parse(ham) as YolAnisi) : null;
  } catch {
    return null;
  }
}

export function aniYaz(ani: YolAnisi): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(ani));
  } catch {
    // Depolama kapalıysa sahne bir dahaki ziyarette yine oynar; zararsız.
  }
}
