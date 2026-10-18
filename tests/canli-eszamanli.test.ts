/** Canlı yarışma — kalabalık sınıf ve süre sınırı senaryoları (bellek içi, sahte saat). */
import { describe, expect, it } from "vitest";
import { CanliOdalar, SINIRLAR } from "../server/canli/oda";
import { sorulariUret } from "../server/canli/sorular";
import { gercekKaynak } from "./canli-kaynak";

async function kurulum(oyuncuSayisi: number) {
  let saat = 1_000_000;
  const odalar = new CanliOdalar(() => saat);
  const sorular = sorulariUret(gercekKaynak(), 5);
  const { pin, sunucuAnahtari } = await odalar.kur(sorular, 20);
  const oyuncular: string[] = [];
  for (let i = 0; i < oyuncuSayisi; i++)
    oyuncular.push((await odalar.katil(pin)).oyuncuAnahtari);
  await odalar.basla(pin, sunucuAnahtari);
  const ilerle = (ms: number) => {
    saat += ms;
  };
  return { odalar, sorular, pin, sunucuAnahtari, oyuncular, ilerle };
}

describe("canlı yarışma, eşzamanlılık", () => {
  it("40 oyuncu katılır, takma adlar benzersiz", async () => {
    const { odalar, pin, sunucuAnahtari } = await kurulum(40);
    const d = await odalar.sunucuDurumu(pin, sunucuAnahtari);
    expect(d.oyuncular).toHaveLength(40);
    expect(new Set(d.oyuncular).size).toBe(40);
  });

  it("30 cevap aynı anda gelir, hiçbiri kaybolmaz ve herkes cevaplayınca geçilir", async () => {
    const { odalar, sorular, pin, sunucuAnahtari, oyuncular } =
      await kurulum(30);
    for (const k of oyuncular)
      await odalar.cevapla(pin, k, 0, sorular[0]!.dogruIndex);
    const d = await odalar.sunucuDurumu(pin, sunucuAnahtari);
    expect(d.asama).toBe("cevap");
    expect(d.cevaplayan).toBe(30);
    expect(d.sonuc!.dagilim[sorular[0]!.dogruIndex]).toBe(30);
  });

  it("süre + gecikme payı içindeki cevap sayılır, sonrası SURE_DOLDU", async () => {
    const { odalar, sorular, pin, oyuncular, ilerle } = await kurulum(2);
    ilerle(20_000 + SINIRLAR.gecikmePayiMs);
    await expect(
      odalar.cevapla(pin, oyuncular[0], 0, sorular[0]!.dogruIndex),
    ).resolves.not.toThrow();
    ilerle(1);
    await expect(odalar.cevapla(pin, oyuncular[1], 0, 0)).rejects.toThrow(
      /Süre doldu|süresi geçti/,
    );
  });

  it("aynı soruya ikinci cevap reddedilir", async () => {
    const { odalar, pin, oyuncular } = await kurulum(2);
    await odalar.cevapla(pin, oyuncular[0], 0, 0);
    await expect(odalar.cevapla(pin, oyuncular[0], 0, 1)).rejects.toThrow(
      /zaten/,
    );
  });

  it("eşit puanlılar aynı sırayı paylaşır", async () => {
    const { odalar, sorular, pin, sunucuAnahtari, oyuncular } =
      await kurulum(3);
    for (const k of oyuncular)
      await odalar.cevapla(pin, k, 0, sorular[0]!.dogruIndex);
    await odalar.bitir(pin, sunucuAnahtari);
    const { siralama } = await odalar.sunucuDurumu(pin, sunucuAnahtari);
    expect(siralama.map((s) => s.sira)).toEqual([1, 1, 1]);
  });
});
