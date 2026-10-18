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
 * YAYIN NOTU: Odalar bir depoda durur (bkz. depo.ts). Yerelde bellek; Vercel'de
 * Upstash Redis — böylece farklı fonksiyon örneklerine düşen istekler aynı
 * odayı görür. Her işlem: oku → işle → sürüm kontrollü yaz (çakışırsa yeniden).
 */
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { varsayilanDepo, type OdaDeposu } from "./depo.ts";
import type {
  CanliAsama,
  CanliRaporSatiri,
  CanliOyuncuDurumu,
  CanliSiraSatiri,
  CanliSoruGorunumu,
  CanliSunucuDurumu,
} from "../../shared/canli.ts";
import type { CanliSoru } from "./sorular.ts";

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
  | "ODA_YOK"
  | "YETKI_YOK"
  | "KAPASITE"
  | "ODA_DOLU"
  | "OYUN_BITTI"
  | "OYUNCU_YOK"
  | "ASAMA_UYGUN_DEGIL"
  | "GECERSIZ_CEVAP"
  | "ZATEN_CEVAPLANDI"
  | "SURE_DOLDU";

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
  "Turkuaz",
  "Altın",
  "Mavi",
  "Kırmızı",
  "Yeşil",
  "Mor",
  "Gümüş",
  "Lacivert",
  "Bakır",
  "Zümrüt",
  "Mercan",
  "Kehribar",
];
const PARCALAR = [
  "Kubbe",
  "Minare",
  "Çini",
  "Kemer",
  "Şadırvan",
  "Mihrap",
  "Kervan",
  "Çeşme",
  "Avlu",
  "Revak",
  "Kitabe",
  "Mukarnas",
  "Han",
  "Hamam",
  "Kandil",
  "Pencere",
];

const yeniAnahtar = () => randomBytes(24).toString("base64url");

function anahtarEsit(beklenen: Buffer, gelen: string | undefined): boolean {
  if (!gelen) return false;
  const b = Buffer.from(gelen);
  return b.length === beklenen.length && timingSafeEqual(b, beklenen);
}

function siraHesapla(
  satirlar: { takmaAd: string; puan: number }[],
): CanliSiraSatiri[] {
  const sirali = [...satirlar].sort(
    (a, b) => b.puan - a.puan || a.takmaAd.localeCompare(b.takmaAd, "tr"),
  );
  let onceki = Number.NaN;
  let sira = 0;
  return sirali.map((s, i) => {
    if (s.puan !== onceki) sira = i + 1; // eşit puan → eşit sıra (1, 1, 3)
    onceki = s.puan;
    return { sira, takmaAd: s.takmaAd, puan: s.puan };
  });
}

type OdaJson = Omit<Oda, "sunucuAnahtari" | "oyuncular"> & {
  sunucuAnahtari: string;
  oyuncular: [string, { takmaAd: string; cevaplar: [number, Cevap][] }][];
};

function kodla(oda: Oda): string {
  const j: OdaJson = {
    ...oda,
    sunucuAnahtari: oda.sunucuAnahtari.toString(),
    oyuncular: [...oda.oyuncular].map(([k, o]) => [
      k,
      { takmaAd: o.takmaAd, cevaplar: [...o.cevaplar] },
    ]),
  };
  return JSON.stringify(j);
}

function coz(json: string): Oda {
  const j = JSON.parse(json) as OdaJson;
  return {
    ...j,
    sunucuAnahtari: Buffer.from(j.sunucuAnahtari),
    oyuncular: new Map(
      j.oyuncular.map(([k, o]) => [
        k,
        { takmaAd: o.takmaAd, cevaplar: new Map(o.cevaplar) },
      ]),
    ),
  };
}

const YENIDEN_DENEME = 100;

export class CanliOdalar {
  constructor(
    private readonly simdi: () => number = Date.now,
    private readonly depo: OdaDeposu = varsayilanDepo(simdi),
  ) {}

  async odaSayisi(): Promise<number> {
    return this.depo.sayi();
  }

  async kur(
    sorular: CanliSoru[],
    sureSn: number,
  ): Promise<{ pin: string; sunucuAnahtari: string }> {
    if ((await this.depo.sayi()) >= SINIRLAR.odaSayisi) {
      throw new CanliHata(
        "KAPASITE",
        "Şu an çok fazla oyun açık. Biraz sonra yeniden dene.",
      );
    }
    const anahtar = yeniAnahtar();
    for (;;) {
      const pin = String(randomInt(100_000, 1_000_000));
      const oda: Oda = {
        pin,
        sunucuAnahtari: Buffer.from(anahtar),
        sorular,
        sureMs: sureSn * 1000,
        asama: "lobi",
        soruNo: 0,
        soruBaslangic: 0,
        sonErisim: this.simdi(),
        bitis: null,
        oyuncular: new Map(),
      };
      if (await this.depo.yaz(pin, kodla(oda), 0, SINIRLAR.bosOdaMs)) {
        return { pin, sunucuAnahtari: anahtar };
      }
    }
  }

  /** Odayı okur, `fn` ile işler, sürüm kontrollü geri yazar. CanliHata da yazımdan sonra fırlar. */
  private async islem<T>(pin: string, fn: (oda: Oda) => T): Promise<T> {
    for (let i = 0; i < YENIDEN_DENEME; i++) {
      const kayit = await this.depo.al(pin);
      if (!kayit)
        throw new CanliHata("ODA_YOK", "Bu PIN ile bir oyun bulunamadı.");
      const oda = coz(kayit.json);
      oda.sonErisim = this.simdi();
      let sonuc: T | undefined;
      let hata: unknown;
      try {
        sonuc = fn(oda);
      } catch (e) {
        if (!(e instanceof CanliHata)) throw e;
        hata = e;
      }
      const ttl =
        oda.bitis !== null
          ? Math.max(1, oda.bitis + SINIRLAR.bitenOdaMs - this.simdi())
          : SINIRLAR.bosOdaMs;
      if (await this.depo.yaz(pin, kodla(oda), kayit.surum, ttl)) {
        if (hata) throw hata;
        return sonuc as T;
      }
    }
    throw new Error("Oda güncellenemedi: çok fazla eşzamanlı istek.");
  }

  katil(pin: string): Promise<{ oyuncuAnahtari: string; takmaAd: string }> {
    return this.islem(pin, (oda) => this.katilIc(oda));
  }

  private katilIc(oda: Oda): { oyuncuAnahtari: string; takmaAd: string } {
    if (oda.asama === "bitti")
      throw new CanliHata("OYUN_BITTI", "Bu oyun bitti.");
    if (oda.oyuncular.size >= SINIRLAR.oyuncuSayisi) {
      throw new CanliHata("ODA_DOLU", "Bu oyun dolu.");
    }
    const takmaAd = this.takmaAdUret(oda);
    const anahtar = yeniAnahtar();
    oda.oyuncular.set(anahtar, { takmaAd, cevaplar: new Map() });
    return { oyuncuAnahtari: anahtar, takmaAd };
  }

  basla(pin: string, anahtar: string | undefined): Promise<void> {
    return this.islem(pin, (oda) => {
      this.sunucuOdasi(oda, anahtar);
      if (oda.asama !== "lobi")
        throw new CanliHata("ASAMA_UYGUN_DEGIL", "Oyun zaten başladı.");
      if (oda.oyuncular.size === 0) {
        throw new CanliHata(
          "OYUNCU_YOK",
          "Başlamak için en az bir oyuncu katılmalı.",
        );
      }
      this.soruyaGec(oda, 0);
    });
  }

  /** Soru açıksa erken bitirir; sonuç gösteriliyorsa sonraki soruya ya da sona geçer. */
  sonraki(pin: string, anahtar: string | undefined): Promise<void> {
    return this.islem(pin, (oda) => {
      this.sunucuOdasi(oda, anahtar);
      this.ilerlet(oda);
      if (oda.asama === "soru") oda.asama = "cevap";
      else if (oda.asama === "cevap") {
        if (oda.soruNo + 1 < oda.sorular.length)
          this.soruyaGec(oda, oda.soruNo + 1);
        else this.bitirIc(oda);
      } else
        throw new CanliHata(
          "ASAMA_UYGUN_DEGIL",
          "Şu an ilerletilecek bir soru yok.",
        );
    });
  }

  bitir(pin: string, anahtar: string | undefined): Promise<void> {
    return this.islem(pin, (oda) => {
      this.sunucuOdasi(oda, anahtar);
      this.bitirIc(oda);
    });
  }

  private bitirIc(oda: Oda): void {
    oda.asama = "bitti";
    oda.bitis = this.simdi();
  }

  cevapla(
    pin: string,
    oyuncuAnahtari: string | undefined,
    soruNo: number,
    secim: number,
  ): Promise<void> {
    return this.islem(pin, (oda) => {
      const oyuncu = oyuncuAnahtari
        ? oda.oyuncular.get(oyuncuAnahtari)
        : undefined;
      if (!oyuncu) throw new CanliHata("YETKI_YOK", "Bu oyuna katılmamışsın.");

      const gecen = this.simdi() - oda.soruBaslangic;
      if (oda.asama !== "soru" || soruNo !== oda.soruNo) {
        throw new CanliHata("ASAMA_UYGUN_DEGIL", "Bu sorunun süresi geçti.");
      }
      if (gecen > oda.sureMs + SINIRLAR.gecikmePayiMs) {
        this.ilerlet(oda);
        throw new CanliHata("SURE_DOLDU", "Süre doldu.");
      }
      const soru = oda.sorular[oda.soruNo]!;
      if (
        !Number.isInteger(secim) ||
        secim < 0 ||
        secim >= soru.secenekler.length
      ) {
        throw new CanliHata("GECERSIZ_CEVAP", "Geçersiz seçenek.");
      }
      if (oyuncu.cevaplar.has(soruNo)) {
        throw new CanliHata("ZATEN_CEVAPLANDI", "Bu soruyu zaten cevapladın.");
      }
      const oran = Math.min(1, Math.max(0, gecen / oda.sureMs));
      const puan =
        secim === soru.dogruIndex ? Math.round(1000 - 500 * oran) : 0;
      oyuncu.cevaplar.set(soruNo, { secim, puan });
      this.ilerlet(oda);
    });
  }

  sunucuDurumu(
    pin: string,
    anahtar: string | undefined,
  ): Promise<CanliSunucuDurumu> {
    return this.islem(pin, (oda) => {
      this.sunucuOdasi(oda, anahtar);
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
        soru:
          oda.asama === "soru" || oda.asama === "cevap"
            ? this.gorunum(oda)
            : null,
        cevaplayan,
        sonuc:
          oda.asama === "cevap" && soru
            ? {
                dogruIndex: soru.dogruIndex,
                aciklama: soru.aciklama,
                kaynak: soru.kaynak,
                dagilim,
              }
            : null,
        siralama: oda.asama === "bitti" ? siralama : siralama.slice(0, 5),
        ...(oda.asama === "bitti" ? { rapor: this.rapor(oda) } : {}),
      };
    });
  }

  /** Soru soru anonim özet: yalnızca sayılar, hiçbir oyuncu adı yok. */
  private rapor(oda: Oda): CanliRaporSatiri[] {
    const oyuncular = [...oda.oyuncular.values()];
    // Hiç başlamadıysa rapor boş; erken bitirildiyse sorulmayan sorular girmez.
    if (oda.soruBaslangic === 0) return [];
    const sorulan = oda.sorular.slice(0, oda.soruNo + 1);
    return sorulan.map((s, no) => {
      const cevaplar = oyuncular
        .map((o) => o.cevaplar.get(no))
        .filter((c): c is Cevap => !!c);
      return {
        no,
        soru: s.soru,
        dogruCevap: s.secenekler[s.dogruIndex]!,
        eserId: s.eserId,
        dogruSayisi: cevaplar.filter((c) => c.secim === s.dogruIndex).length,
        cevaplayan: cevaplar.length,
      };
    });
  }

  oyuncuDurumu(
    pin: string,
    oyuncuAnahtari: string | undefined,
  ): Promise<CanliOyuncuDurumu> {
    return this.islem(pin, (oda) => {
      const oyuncu = oyuncuAnahtari
        ? oda.oyuncular.get(oyuncuAnahtari)
        : undefined;
      if (!oyuncu) throw new CanliHata("YETKI_YOK", "Bu oyuna katılmamışsın.");
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
        sira: oda.asama === "lobi" ? null : benim.sira,
        oyuncuSayisi: oda.oyuncular.size,
        soru:
          oda.asama === "soru" || oda.asama === "cevap"
            ? this.gorunum(oda)
            : null,
        cevabim:
          oda.asama === "soru" || oda.asama === "cevap"
            ? (cevap?.secim ?? null)
            : null,
        sonuc:
          oda.asama === "cevap" && soru
            ? {
                dogruIndex: soru.dogruIndex,
                aciklama: soru.aciklama,
                kaynak: soru.kaynak,
                dogruMu: cevap?.secim === soru.dogruIndex,
                kazanilan: cevap?.puan ?? 0,
              }
            : null,
        podyum:
          oda.asama === "bitti"
            ? siralama.filter((s) => s.sira <= 3).slice(0, 3)
            : [],
      };
    });
  }

  /** Süresi geçmiş odaları siler. Depo TTL ile kendisi siler; burada yalnızca sayımı tazeler. */
  async temizle(): Promise<void> {
    await this.depo.sayi();
  }

  // --- iç yardımcılar ------------------------------------------------------

  private sunucuOdasi(oda: Oda, anahtar: string | undefined): void {
    if (!anahtarEsit(oda.sunucuAnahtari, anahtar)) {
      throw new CanliHata(
        "YETKI_YOK",
        "Bu oyunu yalnızca kuran kişi yönetebilir.",
      );
    }
  }

  private soruyaGec(oda: Oda, no: number): void {
    oda.asama = "soru";
    oda.soruNo = no;
    oda.soruBaslangic = this.simdi();
  }

  /** Süre dolduysa ya da herkes cevapladıysa sonucu açar. */
  private ilerlet(oda: Oda): void {
    if (oda.asama !== "soru") return;
    const sureBitti =
      this.simdi() - oda.soruBaslangic > oda.sureMs + SINIRLAR.gecikmePayiMs;
    const herkesCevapladi =
      oda.oyuncular.size > 0 &&
      [...oda.oyuncular.values()].every((o) => o.cevaplar.has(oda.soruNo));
    if (sureBitti || herkesCevapladi) oda.asama = "cevap";
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
        oda.asama === "soru"
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
          if (no < oda.soruNo || oda.asama !== "soru") puan += c.puan;
        }
        return { takmaAd: o.takmaAd, puan };
      }),
    );
  }

  private takmaAdUret(oda: Oda): string {
    const kullanilan = new Set(
      [...oda.oyuncular.values()].map((o) => o.takmaAd),
    );
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
