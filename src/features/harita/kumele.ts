/**
 * Ekranda üst üste binen işaretleri gruplar (vakıf ağı haritası ve keşif rotası).
 *
 * Her nokta önce kendi grubudur; merkezleri `esik` pikselden yakın iki grup
 * birleşir ve yeni merkez üyelerin ortalaması olur. Birleşecek çift kalmayana
 * dek tekrarlanır: böylece grup etiketleri de birbirinin üstüne düşmez
 * (tek geçişli gruplamada "1-16" ile "17-21" çakışıyordu).
 */
export interface EkranNoktasi {
  x: number;
  y: number;
}

/** Grupları üye sıra numaralarıyla döndürür (her grup kendi içinde artan). */
export function ekrandaKumele(noktalar: readonly EkranNoktasi[], esik: number): number[][] {
  const gruplar = noktalar.map((n, i) => ({ uyeler: [i], x: n.x, y: n.y }));
  for (;;) {
    let enIyi: [number, number] | null = null;
    let enYakin = esik;
    for (let a = 0; a < gruplar.length; a++) {
      for (let b = a + 1; b < gruplar.length; b++) {
        const d = Math.hypot(gruplar[a]!.x - gruplar[b]!.x, gruplar[a]!.y - gruplar[b]!.y);
        if (d < enYakin) {
          enYakin = d;
          enIyi = [a, b];
        }
      }
    }
    if (!enIyi) break;
    const [a, b] = enIyi;
    const ga = gruplar[a]!;
    const gb = gruplar[b]!;
    const uyeler = [...ga.uyeler, ...gb.uyeler].sort((p, q) => p - q);
    const x = uyeler.reduce((t, u) => t + noktalar[u]!.x, 0) / uyeler.length;
    const y = uyeler.reduce((t, u) => t + noktalar[u]!.y, 0) / uyeler.length;
    gruplar.splice(b, 1);
    gruplar[a] = { uyeler, x, y };
  }
  return gruplar.map((g) => g.uyeler);
}

/** Grup etiketi: ardışık duraklar "3-7", değilse "5 durak". */
export function grupEtiketi(uyeler: readonly number[]): string {
  const ardisik = uyeler.every((n, k) => k === 0 || n === uyeler[k - 1]! + 1);
  return ardisik ? `${uyeler[0]! + 1}-${uyeler[uyeler.length - 1]! + 1}` : `${uyeler.length} durak`;
}
