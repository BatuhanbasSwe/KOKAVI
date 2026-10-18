import { describe, expect, it } from "vitest";
import {
  TaslakSoruSemasi,
  taslakMesaji,
  taslakOlustur,
  tutarliMi,
  yayinaHazir,
  type ModelTaslagi,
  type TaslakSoru,
} from "../scripts/soru-taslak-lib";

const bosluk: ModelTaslagi = {
  tip: "bosluk-doldur",
  yonerge: "Boşluğu doldur",
  metin: "Cami ___ yılında yapıldı.",
  cevap: "1400",
  secenekler: ["1400", "1500"],
  dayanak: "1400 yılında yapıldı.",
};
const tani: ModelTaslagi = {
  tip: "eser-tani",
  yonerge: "Hangi eser?",
  betimleme: "Bursa'da yirmi kubbeli büyük bir cami.",
  secenekler: ["Ulu Cami", "Yeşil Cami"],
  dogruIndex: 0,
  dayanak: "Yirmi kubbelidir.",
};

describe("tutarliMi", () => {
  it("geçerli soruları kabul eder", () => {
    expect(tutarliMi(bosluk, "Ulu Cami")).toBe(true);
    expect(tutarliMi(tani, "Ulu Cami")).toBe(true);
  });
  it("tekrarlı seçeneği eler", () => {
    expect(tutarliMi({ ...bosluk, secenekler: ["1400", "1400"] }, "X")).toBe(false);
  });
  it("seçeneklerde olmayan cevabı eler", () => {
    expect(tutarliMi({ ...bosluk, cevap: "1600" }, "X")).toBe(false);
  });
  it("birden çok boşluğu eler", () => {
    expect(tutarliMi({ ...bosluk, metin: "___ ve ___" }, "X")).toBe(false);
  });
  it("aralık dışı dogruIndex'i eler", () => {
    expect(tutarliMi({ ...tani, dogruIndex: 2 }, "Ulu Cami")).toBe(false);
  });
  it("adı ele veren betimlemeyi eler", () => {
    expect(tutarliMi({ ...tani, betimleme: "ULU CAMİ Bursa'dadır, çok büyüktür." }, "Ulu Cami")).toBe(false);
  });
});

describe("şema", () => {
  it("boşluksuz metni ve tek seçeneği reddeder", () => {
    expect(TaslakSoruSemasi.safeParse({ sorular: [{ ...bosluk, metin: "boşluk yok" }] }).success).toBe(false);
    expect(TaslakSoruSemasi.safeParse({ sorular: [{ ...bosluk, secenekler: ["1400"] }] }).success).toBe(false);
    expect(TaslakSoruSemasi.safeParse({ sorular: [bosluk, tani] }).success).toBe(true);
  });
});

describe("taslak akışı", () => {
  const bilgi = { eserId: "ulu-cami", kaynak: "VGM", uretici: "m", tarih: "t", sira: 4 };
  it("taslak durumunda doğar, id biçimi doğru", () => {
    const t = taslakOlustur(bosluk, bilgi);
    expect(t.durum).toBe("taslak");
    expect(t.id).toBe("ulu-cami-ai4");
    expect(t.onaylayan).toBeUndefined();
  });
  it("yalnızca adıyla onaylananlar yayına girer", () => {
    const t = taslakOlustur(bosluk, bilgi);
    const liste: TaslakSoru[] = [
      t,
      { ...t, durum: "onaylandi" },
      { ...t, durum: "onaylandi", onaylayan: "  " },
      { ...t, durum: "reddedildi", onaylayan: "Ayşe" },
      { ...t, id: "ok", durum: "onaylandi", onaylayan: "Ayşe" },
    ];
    expect(yayinaHazir(liste).map((x) => x.id)).toEqual(["ok"]);
  });
  it("mesaj koordinatı içermez", () => {
    expect(taslakMesaji({ id: "a", koordinat: [1, 2] }, 3)).not.toContain("koordinat");
  });
});
