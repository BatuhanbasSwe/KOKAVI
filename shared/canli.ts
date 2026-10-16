/**
 * Canlı sınıf yarışması (Kahoot tarzı) — istemci ve sunucu ortak sözleşmesi.
 *
 * GİZLİLİK: Oyuncunun adı sorulmaz; sunucu "Turkuaz Kubbe" gibi bir takma ad
 * üretir. Odalar yalnızca bellekte yaşar, veritabanına hiçbir şey yazılmaz.
 * Doğru cevap, soru süresi bitene kadar oyuncuya gönderilmez.
 */

export type CanliAsama = 'lobi' | 'soru' | 'cevap' | 'bitti';

/** Sorunun nereden üretildiği: eser fotoğrafı ya da dersteki egzersiz. */
export type CanliSoruTipi = 'foto' | 'bosluk' | 'eser-tani';

/** Oyunun hangi derslerden soracağı: "hepsi", "sehir:bursa" ya da "unite:bursa-u1". */
export type CanliKapsam = 'hepsi' | `sehir:${string}` | `unite:${string}`;

export const CANLI_SURELER = [20, 30, 60] as const;
export const CANLI_SORU_SAYISI = { en_az: 3, en_cok: 15, varsayilan: 8 } as const;

export interface CanliOdaIstegi {
  kapsam: CanliKapsam;
  soruSayisi: number;
  /** Soru başına süre (sn). 60 sn "rahat mod": okuma güçlüğü olan çocuklar için. */
  sureSn: number;
}

export interface CanliOdaCevabi {
  pin: string;
  /** Oyunu yöneten tarayıcıda kalır; başlat/sonraki/bitir için gerekir. */
  sunucuAnahtari: string;
  soruSayisi: number;
}

export interface CanliKatilimCevabi {
  oyuncuAnahtari: string;
  takmaAd: string;
}

/** Ekranda gösterilen soru — doğru cevap BURADA YOK. */
export interface CanliSoruGorunumu {
  /** 0'dan başlar. */
  no: number;
  toplam: number;
  tip: CanliSoruTipi;
  soru: string;
  foto: { url: string; alt: string } | null;
  secenekler: string[];
  sureSn: number;
  /** Sunucu saatine göre kalan süre; istemci kendi saatine çevirir. */
  kalanMs: number;
}

/** Süre bitince açılan sonuç. */
export interface CanliSoruSonucu {
  dogruIndex: number;
  /** Doğru cevabı tam cümleyle anlatır ("Bu, Bursa'daki Ulucami."). */
  aciklama: string;
  kaynak: string | null;
}

export interface CanliSiraSatiri {
  sira: number;
  takmaAd: string;
  puan: number;
}

/**
 * Oyun bitince öğretmene giden anonim soru özeti: kim ne cevapladı DEĞİL,
 * yalnızca "kaç kişi doğru bildi". Kaydedilmez; yalnızca o ekranda.
 */
export interface CanliRaporSatiri {
  no: number;
  soru: string;
  dogruCevap: string;
  eserId: string;
  dogruSayisi: number;
  cevaplayan: number;
}

export interface CanliSunucuDurumu {
  pin: string;
  asama: CanliAsama;
  oyuncular: string[];
  soru: CanliSoruGorunumu | null;
  /** Bu soruyu cevaplayan oyuncu sayısı. */
  cevaplayan: number;
  sonuc: (CanliSoruSonucu & { dagilim: number[] }) | null;
  /** cevap aşamasında ilk 5, bitti aşamasında herkes. */
  siralama: CanliSiraSatiri[];
  /** Yalnızca bitti aşamasında: soru soru anonim sınıf özeti. */
  rapor?: CanliRaporSatiri[];
}

export interface CanliOyuncuDurumu {
  pin: string;
  asama: CanliAsama;
  takmaAd: string;
  puan: number;
  /** Lobide null. */
  sira: number | null;
  oyuncuSayisi: number;
  soru: CanliSoruGorunumu | null;
  /** Bu soruya verdiği cevabın indeksi; cevaplamadıysa null. */
  cevabim: number | null;
  sonuc: (CanliSoruSonucu & { dogruMu: boolean; kazanilan: number }) | null;
  /** Oyun bitince ilk üç. */
  podyum: CanliSiraSatiri[];
}
