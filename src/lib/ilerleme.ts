/**
 * İlerleme, kilit ve oyunlaştırma mantığı.
 *
 * TASARIM KARARI: Tüm ilerleme CİHAZDA (localStorage) tutulur.
 * PDF: "Kişisel veri toplanmaz, sınıf kodu anonim." Sunucuya hiçbir kullanıcı
 * verisi gitmez; bu yüzden gizlilik iddiası mimari olarak doğrulanabilir.
 */
import {
  ELMAS_ODULU,
  SEVIYE_ESIKLERI,
  type Ayarlar,
  type Ilerleme,
  type OgrenmeYolu,
  type Seviye,
  type SeviyeBilgisi,
  type YolSehri,
  type YolUnitesi,
} from '@shared/types';
import type { YolIskeletiSehir } from './api';

const DEPO_ANAHTARI = 'kokavi.ilerleme.v1';

export const VARSAYILAN_AYARLAR: Ayarlar = {
  tema: 'koyu',
  renkKorlugu: 'yok',
  yaziBoyutu: 1,
  hareketAzalt: false,
  sessizMod: false,
};

export function bosIlerleme(): Ilerleme {
  return {
    tamamlananDersler: [],
    defterSayfalari: [],
    elmas: 0,
    seri: { gunSayisi: 0, sonTarih: null },
    ayarlar: { ...VARSAYILAN_AYARLAR },
    sinifKodu: null,
  };
}

/** YYYY-MM-DD (yerel saat). Seri hesabı takvim gününe göre yapılır. */
export function gunAnahtari(tarih: Date = new Date()): string {
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, '0');
  const gun = String(tarih.getDate()).padStart(2, '0');
  return `${yil}-${ay}-${gun}`;
}

function gunFarki(a: string, b: string): number {
  const [ay1, ag1, g1] = a.split('-').map(Number) as [number, number, number];
  const [ay2, ag2, g2] = b.split('-').map(Number) as [number, number, number];
  const t1 = Date.UTC(ay1, ag1 - 1, g1);
  const t2 = Date.UTC(ay2, ag2 - 1, g2);
  return Math.round((t2 - t1) / 86_400_000);
}

/**
 * Ders tamamlandığında ilerlemeyi günceller.
 * Aynı ders ikinci kez tamamlanırsa elmas tekrar verilmez (kötüye kullanım yok).
 */
export function dersTamamla(
  mevcut: Ilerleme,
  dersId: string,
  eserId: string,
  bugun: string = gunAnahtari(),
): { ilerleme: Ilerleme; yeniTamamlandi: boolean } {
  const yeniTamamlandi = !mevcut.tamamlananDersler.includes(dersId);

  const tamamlananDersler = yeniTamamlandi
    ? [...mevcut.tamamlananDersler, dersId]
    : mevcut.tamamlananDersler;

  const defterSayfalari =
    !mevcut.defterSayfalari.includes(eserId) && eserId
      ? [...mevcut.defterSayfalari, eserId]
      : mevcut.defterSayfalari;

  return {
    yeniTamamlandi,
    ilerleme: {
      ...mevcut,
      tamamlananDersler,
      defterSayfalari,
      elmas: mevcut.elmas + (yeniTamamlandi ? ELMAS_ODULU : 0),
      seri: seriGuncelle(mevcut.seri, bugun),
    },
  };
}

/** Seri: aynı gün tekrar çalışmak seriyi artırmaz; gün atlanırsa sıfırlanır. */
export function seriGuncelle(
  seri: Ilerleme['seri'],
  bugun: string = gunAnahtari(),
): Ilerleme['seri'] {
  if (seri.sonTarih === bugun) return seri;
  if (seri.sonTarih === null) return { gunSayisi: 1, sonTarih: bugun };

  const fark = gunFarki(seri.sonTarih, bugun);
  if (fark === 1) return { gunSayisi: seri.gunSayisi + 1, sonTarih: bugun };
  return { gunSayisi: 1, sonTarih: bugun };
}

/** Çırak → Kalfa → Usta (PDF: "Seviye: Çırak → Kalfa → Usta"). */
export function seviyeHesapla(tamamlananSayi: number): SeviyeBilgisi {
  let gecerli = SEVIYE_ESIKLERI[0]!;
  for (const esik of SEVIYE_ESIKLERI) {
    if (tamamlananSayi >= esik.esik) gecerli = esik;
  }

  const sirasi = SEVIYE_ESIKLERI.findIndex((e) => e.anahtar === gecerli.anahtar);
  const sonraki = SEVIYE_ESIKLERI[sirasi + 1] ?? null;

  return {
    anahtar: gecerli.anahtar as Seviye,
    ad: gecerli.ad,
    sonrakiEsik: sonraki?.esik ?? null,
    kalanDers: sonraki ? Math.max(0, sonraki.esik - tamamlananSayi) : null,
  };
}

/**
 * Öğrenme yolunu ilerlemeye göre hesaplar: kilitler, tamamlanma, güncel ders.
 *
 * Kural (PDF yol görselinden):
 *  - Birimler şehir sırası → ünite sırası olarak DÜZLEŞTİRİLİR.
 *  - Bir ünite, kendinden önceki TÜM üniteler bittiğinde açılır.
 *  - Bir şehir, ilk ünitesi açıldığında açılmış sayılır.
 *  - "aktif" ünite = açık ama tamamlanmamış ilk ünitedir.
 *
 * PDF'teki "her şehir bir ünite" ifadesi yol görseliyle çelişir; geçerli kabul
 * edilen model budur (bkz. docs/KARARLAR.md).
 */
export function yolHesapla(
  iskelet: YolIskeletiSehir[],
  tamamlananDersler: string[],
): OgrenmeYolu {
  const tamamlanan = new Set(tamamlananDersler);

  // 1) Düzleştirilmiş ünite listesi (kilit hesabı için)
  const duz: { sehirIdx: number; uniteIdx: number; dersIdler: string[] }[] = [];
  iskelet.forEach((sehir, sehirIdx) => {
    sehir.uniteler.forEach((unite, uniteIdx) => {
      duz.push({
        sehirIdx,
        uniteIdx,
        dersIdler: unite.dersler.map((d) => d.dersId),
      });
    });
  });

  const uniteKilitli = new Map<string, boolean>();
  let oncekilerBitti = true; // ilk ünite her zaman açık
  iskelet.forEach((sehir) => {
    sehir.uniteler.forEach((unite) => {
      const anahtar = `${sehir.sehirId}/${unite.uniteId}`;
      uniteKilitli.set(anahtar, !oncekilerBitti);
      const hepsiBitti =
        unite.dersler.length > 0 && unite.dersler.every((d) => tamamlanan.has(d.dersId));
      oncekilerBitti = oncekilerBitti && hepsiBitti;
    });
  });

  // 2) Aktif ünite: açık olan ilk tamamlanmamış ünite
  let aktifAnahtar: string | null = null;
  outer: for (const sehir of iskelet) {
    for (const unite of sehir.uniteler) {
      const anahtar = `${sehir.sehirId}/${unite.uniteId}`;
      if (uniteKilitli.get(anahtar)) continue;
      const tamMi =
        unite.dersler.length > 0 && unite.dersler.every((d) => tamamlanan.has(d.dersId));
      if (!tamMi) {
        aktifAnahtar = anahtar;
        break outer;
      }
    }
  }

  // 3) Şehirleri modele dök
  let guncelDersId: string | null = null;

  const sehirler: YolSehri[] = iskelet.map((sehir) => {
    const uniteler: YolUnitesi[] = sehir.uniteler.map((unite) => {
      const anahtar = `${sehir.sehirId}/${unite.uniteId}`;
      const tamamlananSayi = unite.dersler.filter((d) => tamamlanan.has(d.dersId)).length;

      if (anahtar === aktifAnahtar) {
        const ilkEksik = unite.dersler.find((d) => !tamamlanan.has(d.dersId));
        if (ilkEksik && guncelDersId === null) guncelDersId = ilkEksik.dersId;
      }

      return {
        uniteId: unite.uniteId,
        ad: unite.ad,
        sira: unite.sira,
        dersler: unite.dersler.map((d) => ({
          ...d,
          tamamlandi: tamamlanan.has(d.dersId),
        })),
        tamamlananSayi,
        toplamSayi: unite.dersler.length,
        kilitli: uniteKilitli.get(anahtar) ?? false,
        aktif: anahtar === aktifAnahtar,
      };
    });

    const toplamSayi = uniteler.reduce((t, u) => t + u.toplamSayi, 0);
    const tamamlananSayi = uniteler.reduce((t, u) => t + u.tamamlananSayi, 0);
    const ilkUniteKilitli = uniteler[0]?.kilitli ?? false;

    return {
      sehirId: sehir.sehirId,
      ad: sehir.ad,
      sira: sehir.sira,
      uniteler,
      tamamlananSayi,
      toplamSayi,
      kilitli: ilkUniteKilitli,
      // Kuzey Yıldızı metriği: bir şehri uçtan uca tamamlama
      tamamlandi: toplamSayi > 0 && tamamlananSayi === toplamSayi,
    };
  });

  return { sehirler, guncelDersId };
}

// --- Kalıcılık --------------------------------------------------------------

export function ilerlemeYukle(): Ilerleme {
  try {
    const ham = localStorage.getItem(DEPO_ANAHTARI);
    if (!ham) return bosIlerleme();
    const ayristirilmis = JSON.parse(ham) as Partial<Ilerleme>;
    // Şema değişirse eski kayıt eksik alan taşıyabilir — varsayılanlarla birleştir.
    return {
      ...bosIlerleme(),
      ...ayristirilmis,
      seri: { ...bosIlerleme().seri, ...(ayristirilmis.seri ?? {}) },
      ayarlar: { ...VARSAYILAN_AYARLAR, ...(ayristirilmis.ayarlar ?? {}) },
    };
  } catch {
    return bosIlerleme();
  }
}

export function ilerlemeKaydet(ilerleme: Ilerleme): void {
  try {
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(ilerleme));
  } catch {
    /* kota dolu veya gizli mod — sessizce yut, oyun çalışmaya devam etsin */
  }
}

export function ilerlemeSifirla(): Ilerleme {
  const temiz = bosIlerleme();
  ilerlemeKaydet(temiz);
  return temiz;
}
