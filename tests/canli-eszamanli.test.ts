/** Canlı yarışma — kalabalık sınıf ve süre sınırı senaryoları (bellek içi, sahte saat). */
import { describe, expect, it } from 'vitest';
import { CanliOdalar, SINIRLAR } from '../server/canli/oda';
import { sorulariUret } from '../server/canli/sorular';
import { gercekKaynak } from './canli-kaynak';

function kurulum(oyuncuSayisi: number) {
  let saat = 1_000_000;
  const odalar = new CanliOdalar(() => saat);
  const sorular = sorulariUret(gercekKaynak(), 5);
  const { pin, sunucuAnahtari } = odalar.kur(sorular, 20);
  const oyuncular = Array.from({ length: oyuncuSayisi }, () => odalar.katil(pin).oyuncuAnahtari);
  odalar.basla(pin, sunucuAnahtari);
  const ilerle = (ms: number) => { saat += ms; };
  return { odalar, sorular, pin, sunucuAnahtari, oyuncular, ilerle };
}

describe('canlı yarışma, eşzamanlılık', () => {
  it('40 oyuncu katılır, takma adlar benzersiz', () => {
    const { odalar, pin, sunucuAnahtari } = kurulum(40);
    const d = odalar.sunucuDurumu(pin, sunucuAnahtari);
    expect(d.oyuncular).toHaveLength(40);
    expect(new Set(d.oyuncular).size).toBe(40);
  });

  it('30 cevap aynı anda gelir, hiçbiri kaybolmaz ve herkes cevaplayınca geçilir', () => {
    const { odalar, sorular, pin, sunucuAnahtari, oyuncular } = kurulum(30);
    oyuncular.forEach((k) => odalar.cevapla(pin, k, 0, sorular[0]!.dogruIndex));
    const d = odalar.sunucuDurumu(pin, sunucuAnahtari);
    expect(d.asama).toBe('cevap');
    expect(d.cevaplayan).toBe(30);
    expect(d.sonuc!.dagilim[sorular[0]!.dogruIndex]).toBe(30);
  });

  it('süre + gecikme payı içindeki cevap sayılır, sonrası SURE_DOLDU', () => {
    const { odalar, sorular, pin, oyuncular, ilerle } = kurulum(2);
    ilerle(20_000 + SINIRLAR.gecikmePayiMs);
    expect(() => odalar.cevapla(pin, oyuncular[0], 0, sorular[0]!.dogruIndex)).not.toThrow();
    ilerle(1);
    expect(() => odalar.cevapla(pin, oyuncular[1], 0, 0)).toThrow(/Süre doldu|süresi geçti/);
  });

  it('aynı soruya ikinci cevap reddedilir', () => {
    const { odalar, pin, oyuncular } = kurulum(2);
    odalar.cevapla(pin, oyuncular[0], 0, 0);
    expect(() => odalar.cevapla(pin, oyuncular[0], 0, 1)).toThrow(/zaten/);
  });

  it('eşit puanlılar aynı sırayı paylaşır', () => {
    const { odalar, sorular, pin, sunucuAnahtari, oyuncular } = kurulum(3);
    oyuncular.forEach((k) => odalar.cevapla(pin, k, 0, sorular[0]!.dogruIndex));
    odalar.bitir(pin, sunucuAnahtari);
    const { siralama } = odalar.sunucuDurumu(pin, sunucuAnahtari);
    expect(siralama.map((s) => s.sira)).toEqual([1, 1, 1]);
  });
});
