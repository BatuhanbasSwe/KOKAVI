/**
 * Canlı yarışma odaları — bellekte çalışan oyun motoru.
 *
 * AKIŞ: lobi → soru → cevap → soru → … → bitti
 *  · Öğretmen odayı kurar, çocuklar PIN ile katılır.
 *  · Süre bitince ya da herkes cevaplayınca soru KENDİLİĞİNDEN "cevap"
 *    aşamasına geçer. Zamanlayıcı yok: her durum okumasında saat kontrol
 *    edilir (yoklama tabanlı istemcilerle uyumlu, test edilebilir).
 *
 * GİZLİLİK: Ad sorulmaz, takma ad üretilir. Veritabanına hiçbir şey yazılmaz;
 * oda bitince ya da 2 saat dokunulmazsa silinir.
 *
 * CEZA YOK: Yanlış cevap puan düşürmez (bkz. docs/KARARLAR.md). Doğru cevap
 * hıza göre 500–1000 puan getirir.
 *
 * YAYIN NOTU: Odalar süreç belleğindedir. Tek sunucuda (yerel ağ, laptop)
 * kusursuz çalışır; birden çok örnek açan sunucusuz ortamda oda bölünebilir.
 */
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type {
  CanliAsama,
  CanliOyuncuDurumu,
  CanliSiraSatiri,
  CanliSoruGorunumu,
  CanliSunucuDurumu,
} from '../../shared/canli.ts';
import type { CanliSoru } from './sorular.ts';

export const SINIRLAR = {
  odaSayisi: 200,
  oyuncuSayisi: 80,
  /** Dokunulmayan oda bu süreden sonra silinir. */
  bosOdaMs: 2 * 60 * 60 * 1000,
  /** Biten oda sonuç ekranı için bu kadar yaşar. */
  bitenOdaMs: 30 * 60 * 1000,
  /** Ağ gecikmesi payı: süre bittikten hemen sonra gelen cevap da sayılır. */
  gecikmePayiMs: 800,
} as const;

export type CanliHataKodu =
  | 'ODA_YOK'
  | 'YETKI_YOK'
  | 'KAPASITE'
  | 'ODA_DOLU'
  | 'OYUN_BITTI'
  | 'OYUNCU_YOK'
  | 'ASAMA_UYGUN_DEGIL'
  | 'GECERSIZ_CEVAP'
  | 'ZATEN_CEVAPLANDI'
  | 'SURE_DOLDU';

export class CanliHata extends Error {
  constructor(
    readonly kod: CanliHataKodu,
    mesaj: string,
  ) {
    super(mesaj);
  }
}

interface Cevap {
  secim: number;
  puan: number;
}

interface Oyuncu {
  takmaAd: string;
  cevaplar: Map<number, Cevap>;
}

interface Oda {
  pin: string;
  sunucuAnahtari: Buffer;
  sorular: CanliSoru[];
  sureMs: number;
  asama: CanliAsama;
  soruNo: number;
  soruBaslangic: number;
  sonErisim: number;
  bitis: number | null;
  /** Oyuncu anahtarı → oyuncu. */
  oyuncular: Map<string, Oyuncu>;
}

// Takma adlar: renk + vakıf mimarisinden bir parça. Kişisel veri değil, ünlüyü
// ya da birini çağrıştırmaz, çocuğa kelime de öğretir.
const RENKLER = [
  'Turkuaz', 'Altın', 'Mavi', 'Kırmızı', 'Yeşil', 'Mor', 'Gümüş', 'Lacivert',
  'Bakır', 'Zümrüt', 'Mercan', 'Kehribar',
];
const PARCALAR = [
  'Kubbe', 'Minare', 'Çini', 'Kemer', 'Şadırvan', 'Mihrap', 'Kervan', 'Çeşme',
  'Avlu', 'Revak', 'Kitabe', 'Mukarnas', 'Han', 'Hamam', 'Kandil', 'Pencere',
];

const yeniAnahtar = () => randomBytes(24).toString('base64url');

function anahtarEsit(beklenen: Buffer, gelen: string | undefined): boolean {
  if (!gelen) return false;
  const b = Buffer.from(gelen);
  return b.length === beklenen.length && timingSafeEqual(b, beklenen);
}

function siraHesapla(satirlar: { takmaAd: string; puan: number }[]): CanliSiraSatiri[] {
  const sirali = [...satirlar].sort(
    (a, b) => b.puan - a.puan || a.takmaAd.localeCompare(b.takmaAd, 'tr'),
  );
  let onceki = Number.NaN;
  let sira = 0;
  return sirali.map((s, i) => {
    if (s.puan !== onceki) sira = i + 1; // eşit puan → eşit sıra (1, 1, 3)
    onceki = s.puan;
    return { sira, takmaAd: s.takmaAd, puan: s.puan };
  });
}

export class CanliOdalar {
  private readonly odalar = new Map<string, Oda>();

  constructor(private readonly simdi: () => number = Date.now) {}

  get odaSayisi(): number {
    return this.odalar.size;
  }

  kur(sorular: CanliSoru[], sureSn: number): { pin: string; sunucuAnahtari: string } {
    this.temizle();
    if (this.odalar.size >= SINIRLAR.odaSayisi) {
      throw new CanliHata('KAPASITE', 'Şu an çok fazla oyun açık. Biraz sonra yeniden dene.');
    }
    let pin: string;
    do pin = String(randomInt(100_000, 1_000_000));
    while (this.odalar.has(pin));

    const anahtar = yeniAnahtar();
    this.odalar.set(pin, {
      pin,
      sunucuAnahtari: Buffer.from(anahtar),
      sorular,
      sureMs: sureSn * 1000,
      asama: 'lobi',
      soruNo: 0,
      soruBaslangic: 0,
      sonErisim: this.simdi(),
      bitis: null,
      oyuncular: new Map(),
    });
    return { pin, sunucuAnahtari: anahtar };
  }

  katil(pin: string): { oyuncuAnahtari: string; takmaAd: string } {
    const oda = this.odaAl(pin);
    if (oda.asama === 'bitti') throw new CanliHata('OYUN_BITTI', 'Bu oyun bitti.');
    if (oda.oyuncular.size >= SINIRLAR.oyuncuSayisi) {
      throw new CanliHata('ODA_DOLU', 'Bu oyun dolu.');
    }
    const takmaAd = this.takmaAdUret(oda);
    const anahtar = yeniAnahtar();
    oda.oyuncular.set(anahtar, { takmaAd, cevaplar: new Map() });
    return { oyuncuAnahtari: anahtar, takmaAd };
  }

  basla(pin: string, anahtar: string | undefined): void {
    const oda = this.sunucuOdasi(pin, anahtar);
    if (oda.asama !== 'lobi') throw new CanliHata('ASAMA_UYGUN_DEGIL', 'Oyun zaten başladı.');
    if (oda.oyuncular.size === 0) {
      throw new CanliHata('OYUNCU_YOK', 'Başlamak için en az bir oyuncu katılmalı.');
    }
    this.soruyaGec(oda, 0);
  }

  /** Soru açıksa erken bitirir; sonuç gösteriliyorsa sonraki soruya ya da sona geçer. */
  sonraki(pin: string, anahtar: string | undefined): void {
    const oda = this.sunucuOdasi(pin, anahtar);
    this.ilerlet(oda);
    if (oda.asama === 'soru') oda.asama = 'cevap';
    else if (oda.asama === 'cevap') {
      if (oda.soruNo + 1 < oda.sorular.length) this.soruyaGec(oda, oda.soruNo + 1);
      else this.bitir(pin, anahtar);
    } else throw new CanliHata('ASAMA_UYGUN_DEGIL', 'Şu an ilerletilecek bir soru yok.');
  }

  bitir(pin: string, anahtar: string | undefined): void {
    const oda = this.sunucuOdasi(pin, anahtar);
    oda.asama = 'bitti';
    oda.bitis = this.simdi();
  }

  cevapla(pin: string, oyuncuAnahtari: string | undefined, soruNo: number, secim: number): void {
    const oda = this.odaAl(pin);
    const oyuncu = oyuncuAnahtari ? oda.oyuncular.get(oyuncuAnahtari) : undefined;
    if (!oyuncu) throw new CanliHata('YETKI_YOK', 'Bu oyuna katılmamışsın.');

    const gecen = this.simdi() - oda.soruBaslangic;
    if (oda.asama !== 'soru' || soruNo !== oda.soruNo) {
      throw new CanliHata('ASAMA_UYGUN_DEGIL', 'Bu sorunun süresi geçti.');
    }
    if (gecen > oda.sureMs + SINIRLAR.gecikmePayiMs) {
      this.ilerlet(oda);
      throw new CanliHata('SURE_DOLDU', 'Süre doldu.');
    }
    const soru = oda.sorular[oda.soruNo]!;
    if (!Number.isInteger(secim) || secim < 0 || secim >= soru.secenekler.length) {
      throw new CanliHata('GECERSIZ_CEVAP', 'Geçersiz seçenek.');
    }
    if (oyuncu.cevaplar.has(soruNo)) {
      throw new CanliHata('ZATEN_CEVAPLANDI', 'Bu soruyu zaten cevapladın.');
    }
    const oran = Math.min(1, Math.max(0, gecen / oda.sureMs));
    const puan = secim === soru.dogruIndex ? Math.round(1000 - 500 * oran) : 0;
    oyuncu.cevaplar.set(soruNo, { secim, puan });
    this.ilerlet(oda);
  }

  sunucuDurumu(pin: string, anahtar: string | undefined): CanliSunucuDurumu {
    const oda = this.sunucuOdasi(pin, anahtar);
    this.ilerlet(oda);
    const soru = oda.sorular[oda.soruNo];
    const dagilim = soru ? soru.secenekler.map(() => 0) : [];
    let cevaplayan = 0;
    for (const o of oda.oyuncular.values()) {
      const c = o.cevaplar.get(oda.soruNo);
      if (c) {
        cevaplayan++;
        dagilim[c.secim]!++;
      }
    }
    const siralama = this.siralama(oda);
    return {
      pin: oda.pin,
      asama: oda.asama,
      oyuncular: [...oda.oyuncular.values()].map((o) => o.takmaAd),
      soru: oda.asama === 'soru' || oda.asama === 'cevap' ? this.gorunum(oda) : null,
      cevaplayan,
      sonuc:
        oda.asama === 'cevap' && soru
          ? { dogruIndex: soru.dogruIndex, aciklama: soru.aciklama, kaynak: soru.kaynak, dagilim }
          : null,
      siralama: oda.asama === 'bitti' ? siralama : siralama.slice(0, 5),
    };
  }

  oyuncuDurumu(pin: string, oyuncuAnahtari: string | undefined): CanliOyuncuDurumu {
    const oda = this.odaAl(pin);
    const oyuncu = oyuncuAnahtari ? oda.oyuncular.get(oyuncuAnahtari) : undefined;
    if (!oyuncu) throw new CanliHata('YETKI_YOK', 'Bu oyuna katılmamışsın.');
    this.ilerlet(oda);

    const siralama = this.siralama(oda);
    const benim = siralama.find((s) => s.takmaAd === oyuncu.takmaAd)!;
    const soru = oda.sorular[oda.soruNo];
    const cevap = oyuncu.cevaplar.get(oda.soruNo) ?? null;
    return {
      pin: oda.pin,
      asama: oda.asama,
      takmaAd: oyuncu.takmaAd,
      puan: benim.puan,
      sira: oda.asama === 'lobi' ? null : benim.sira,
      oyuncuSayisi: oda.oyuncular.size,
      soru: oda.asama === 'soru' || oda.asama === 'cevap' ? this.gorunum(oda) : null,
      cevabim: oda.asama === 'soru' || oda.asama === 'cevap' ? (cevap?.secim ?? null) : null,
      sonuc:
        oda.asama === 'cevap' && soru
          ? {
              dogruIndex: soru.dogruIndex,
              aciklama: soru.aciklama,
              kaynak: soru.kaynak,
              dogruMu: cevap?.secim === soru.dogruIndex,
              kazanilan: cevap?.puan ?? 0,
            }
          : null,
      podyum: oda.asama === 'bitti' ? siralama.filter((s) => s.sira <= 3).slice(0, 3) : [],
    };
  }

  /** Süresi geçmiş odaları siler. Oda kurulurken çağrılır; testler de çağırabilir. */
  temizle(): void {
    const simdi = this.simdi();
    for (const [pin, oda] of this.odalar) {
      const bitti = oda.bitis !== null && simdi - oda.bitis > SINIRLAR.bitenOdaMs;
      if (bitti || simdi - oda.sonErisim > SINIRLAR.bosOdaMs) this.odalar.delete(pin);
    }
  }

  // --- iç yardımcılar ------------------------------------------------------

  private odaAl(pin: string): Oda {
    const oda = this.odalar.get(pin);
    if (!oda) throw new CanliHata('ODA_YOK', 'Bu PIN ile bir oyun bulunamadı.');
    oda.sonErisim = this.simdi();
    return oda;
  }

  private sunucuOdasi(pin: string, anahtar: string | undefined): Oda {
    const oda = this.odaAl(pin);
    if (!anahtarEsit(oda.sunucuAnahtari, anahtar)) {
      throw new CanliHata('YETKI_YOK', 'Bu oyunu yalnızca kuran kişi yönetebilir.');
    }
    return oda;
  }

  private soruyaGec(oda: Oda, no: number): void {
    oda.asama = 'soru';
    oda.soruNo = no;
    oda.soruBaslangic = this.simdi();
  }

  /** Süre dolduysa ya da herkes cevapladıysa sonucu açar. */
  private ilerlet(oda: Oda): void {
    if (oda.asama !== 'soru') return;
    const sureBitti = this.simdi() - oda.soruBaslangic > oda.sureMs + SINIRLAR.gecikmePayiMs;
    const herkesCevapladi =
      oda.oyuncular.size > 0 &&
      [...oda.oyuncular.values()].every((o) => o.cevaplar.has(oda.soruNo));
    if (sureBitti || herkesCevapladi) oda.asama = 'cevap';
  }

  private gorunum(oda: Oda): CanliSoruGorunumu {
    const soru = oda.sorular[oda.soruNo]!;
    return {
      no: oda.soruNo,
      toplam: oda.sorular.length,
      tip: soru.tip,
      soru: soru.soru,
      foto: soru.foto,
      secenekler: soru.secenekler,
      sureSn: oda.sureMs / 1000,
      kalanMs:
        oda.asama === 'soru'
          ? Math.max(0, oda.sureMs - (this.simdi() - oda.soruBaslangic))
          : 0,
    };
  }

  /** Toplam puan: sonucu açıklanmış sorular sayılır (soru açıkken sıralama sızmaz). */
  private siralama(oda: Oda): CanliSiraSatiri[] {
    return siraHesapla(
      [...oda.oyuncular.values()].map((o) => {
        let puan = 0;
        for (const [no, c] of o.cevaplar) {
          if (no < oda.soruNo || oda.asama !== 'soru') puan += c.puan;
        }
        return { takmaAd: o.takmaAd, puan };
      }),
    );
  }

  private takmaAdUret(oda: Oda): string {
    const kullanilan = new Set([...oda.oyuncular.values()].map((o) => o.takmaAd));
    for (let deneme = 0; deneme < 40; deneme++) {
      const ad = `${RENKLER[randomInt(RENKLER.length)]} ${PARCALAR[randomInt(PARCALAR.length)]}`;
      if (!kullanilan.has(ad)) return ad;
    }
    // 192 birleşim neredeyse doluysa numara ekle.
    let n = 2;
    const taban = `${RENKLER[randomInt(RENKLER.length)]} ${PARCALAR[randomInt(PARCALAR.length)]}`;
    while (kullanilan.has(`${taban} ${n}`)) n++;
    return `${taban} ${n}`;
  }
}
