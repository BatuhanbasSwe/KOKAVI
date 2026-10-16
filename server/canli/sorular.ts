/**
 * Canlı yarışma soruları — derslerdeki hazır içerikten üretilir.
 *
 * Yeni bilgi UYDURULMAZ: her soru ya dersin kendi egzersizinden (kaynak
 * künyesiyle) ya da eserin envanter fotoğrafından gelir. Üç tip:
 *   · foto       "Bu fotoğraftaki eser hangisi?" (yanlış seçenekler başka derslerin eserleri)
 *   · bosluk     dersin boşluk doldurma egzersizi (seçenekli olanlar)
 *   · eser-tani  dersin betimleme egzersizi
 *
 * Saf fonksiyon: veritabanına dokunmaz, rastgelelik dışarıdan verilir (test edilebilir).
 */
import type { BoslukVerisi, Ders, EserTaniVerisi } from '../../shared/types.ts';
import type { CanliSoruTipi } from '../../shared/canli.ts';

export interface CanliSoru {
  tip: CanliSoruTipi;
  eserId: string;
  soru: string;
  foto: { url: string; alt: string } | null;
  secenekler: string[];
  dogruIndex: number;
  aciklama: string;
  kaynak: string | null;
}

export interface SoruKaynagi {
  dersler: Ders[];
  /** Eser kimliği → kapak fotoğrafı. */
  fotograflar: Map<string, { url: string; kaynak: string | null }>;
  /** Şehir kimliği → ad ("bursa" → "Bursa"). */
  sehirAdlari: Map<string, string>;
}

const EN_COK_SECENEK = 4;

function karistir<T>(dizi: readonly T[], rastgele: () => number): T[] {
  const kopya = [...dizi];
  for (let i = kopya.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele() * (i + 1));
    [kopya[i], kopya[j]] = [kopya[j]!, kopya[i]!];
  }
  return kopya;
}

/** Doğru cevabı koruyarak en fazla 4 seçenek bırakır ve karıştırır. */
function secenekleriHazirla(
  dogru: string,
  digerleri: string[],
  rastgele: () => number,
): { secenekler: string[]; dogruIndex: number } | null {
  const tekil = [...new Set(digerleri.filter((s) => s.trim() && s !== dogru))];
  if (tekil.length < 1) return null;
  const secilen = karistir(tekil, rastgele).slice(0, EN_COK_SECENEK - 1);
  const secenekler = karistir([dogru, ...secilen], rastgele);
  return { secenekler, dogruIndex: secenekler.indexOf(dogru) };
}

/** "-'deki" ekini ünlü uyumuna göre seçer: Bursa'daki, Konya'daki, Hatay'daki. */
function bulunmaEki(ad: string): string {
  const son = [...ad.toLocaleLowerCase('tr')].reverse().find((h) => 'aeıioöuü'.includes(h));
  const sert = /[çfhkpsşt]$/i.test(ad);
  const kalin = son !== undefined && 'aıou'.includes(son);
  return `'${sert ? 't' : 'd'}${kalin ? 'a' : 'e'}ki`;
}

function dersinSorulari(ders: Ders, kaynak: SoruKaynagi, rastgele: () => number): CanliSoru[] {
  const eser = ders.eser;
  if (!eser) return [];
  const sorular: CanliSoru[] = [];
  const sehir = kaynak.sehirAdlari.get(eser.sehirId) ?? eser.sehirId;

  const foto = kaynak.fotograflar.get(eser.id);
  if (foto) {
    // Önce aynı şehrin eserleri: "Bursa'da hangisi?" daha öğretici bir ayırt etme.
    const ayniSehir = kaynak.dersler
      .filter((d) => d.eser && d.eser.id !== eser.id && d.eser.sehirId === eser.sehirId)
      .map((d) => d.eser!.ad);
    const baska = kaynak.dersler
      .filter((d) => d.eser && d.eser.sehirId !== eser.sehirId)
      .map((d) => d.eser!.ad);
    const havuz = ayniSehir.length >= 3 ? ayniSehir : [...ayniSehir, ...karistir(baska, rastgele)];
    const hazir = secenekleriHazirla(eser.ad, karistir(havuz, rastgele).slice(0, 12), rastgele);
    if (hazir && hazir.secenekler.length >= 3) {
      sorular.push({
        tip: 'foto',
        eserId: eser.id,
        soru: 'Bu fotoğraftaki eser hangisi?',
        // Alt metin cevabı söylememeli; ekran okuyucu kullanan çocuk da tahmin eder.
        foto: { url: foto.url, alt: `Tahmin edilecek eserin fotoğrafı (${eser.tur})` },
        ...hazir,
        aciklama: `Bu, ${sehir}${bulunmaEki(sehir)} ${eser.ad}.`,
        kaynak: foto.kaynak,
      });
    }
  }

  for (const egz of ders.egzersizler) {
    if (egz.tip === 'bosluk-doldur') {
      const v = egz.veri as BoslukVerisi;
      if (!v.secenekler || !v.metin.includes('___')) continue;
      const hazir = secenekleriHazirla(v.cevap, v.secenekler, rastgele);
      if (!hazir) continue;
      sorular.push({
        tip: 'bosluk',
        eserId: eser.id,
        soru: v.metin.replace(/_{3,}/, '_____'),
        foto: null,
        ...hazir,
        aciklama: v.metin.replace(/_{3,}/, v.cevap),
        kaynak: egz.kaynak,
      });
    } else if (egz.tip === 'eser-tani') {
      const v = egz.veri as EserTaniVerisi;
      const dogru = v.secenekler[v.dogruIndex];
      if (!dogru) continue;
      const hazir = secenekleriHazirla(dogru, v.secenekler, rastgele);
      if (!hazir) continue;
      sorular.push({
        tip: 'eser-tani',
        eserId: eser.id,
        soru: `${v.betimleme} Hangi eser?`,
        foto: null,
        ...hazir,
        aciklama: `Doğru cevap: ${dogru} (${sehir}).`,
        kaynak: egz.kaynak,
      });
    }
  }
  return sorular;
}

/**
 * İstenen sayıda soru seçer. Tipler sırayla dönüşür (foto → betimleme → boşluk)
 * ve aynı eser, havuz yetmedikçe iki kez sorulmaz.
 */
export function sorulariUret(
  kaynak: SoruKaynagi,
  sayi: number,
  rastgele: () => number = Math.random,
): CanliSoru[] {
  const havuz = karistir(
    kaynak.dersler.flatMap((d) => dersinSorulari(d, kaynak, rastgele)),
    rastgele,
  );
  const secilen: CanliSoru[] = [];
  const kullanilanEser = new Set<string>();
  const sira: CanliSoruTipi[] = ['foto', 'eser-tani', 'bosluk'];

  for (let tur = 0; secilen.length < sayi && havuz.length > 0; tur++) {
    const istenen = sira[tur % sira.length]!;
    let i = havuz.findIndex((s) => s.tip === istenen && !kullanilanEser.has(s.eserId));
    if (i < 0) i = havuz.findIndex((s) => !kullanilanEser.has(s.eserId));
    if (i < 0) i = 0; // her eser kullanıldı — tekrar serbest
    const [soru] = havuz.splice(i, 1);
    secilen.push(soru!);
    kullanilanEser.add(soru!.eserId);
  }
  return secilen;
}
