/**
 * Aralıklı tekrar (Leitner) — saf mantık testleri.
 *
 * Başvuru PDF'i: "Aralıklı tekrar kavramı sonraki derste geri getirir."
 * Bu testler o cümlenin ürünün içinde gerçekten çalıştığının kanıtıdır.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ARALIKLAR_GUN,
  bosTekrarDurumu,
  dersiTakvimeEkle,
  gunEkle,
  gunMetni,
  TEKRAR_ANAHTARI,
  tekrarEgzersizSirasi,
  tekrarKaydet,
  tekrarSonucunuIsle,
  tekrarYukle,
  vadesiGelenler,
} from '../src/lib/tekrar';

const BUGUN = '2026-10-14';

describe('aralıklı tekrar — takvim', () => {
  it('biten ders ilk tekrar için SONRAKİ derste (aynı gün) vadelidir', () => {
    const d = dersiTakvimeEkle(bosTekrarDurumu(), 'bursa-u1-d1', 'Yeşilcami', BUGUN);
    expect(d.kayitlar['bursa-u1-d1']).toMatchObject({ kutu: 0, sonrakiGun: BUGUN });
    expect(vadesiGelenler(d, BUGUN).map((k) => k.dersId)).toEqual(['bursa-u1-d1']);
  });

  it('açılan ders kendi tekrarı olarak sorulmaz', () => {
    const d = dersiTakvimeEkle(bosTekrarDurumu(), 'bursa-u1-d1', 'Yeşilcami', BUGUN);
    expect(vadesiGelenler(d, BUGUN, 'bursa-u1-d1')).toEqual([]);
  });

  it('aynı ders yeniden oynanınca takvim sıfırlanmaz', () => {
    let d = dersiTakvimeEkle(bosTekrarDurumu(), 'a', 'A', BUGUN);
    d = tekrarSonucunuIsle(d, 'a', true, BUGUN);
    const once = d.kayitlar.a;
    d = dersiTakvimeEkle(d, 'a', 'A', '2026-10-15');
    expect(d.kayitlar.a).toEqual(once);
  });

  it('ipucusuz doğru: kutu yükselir ve aralık uzar (1 → 3 → 7 → 14 gün)', () => {
    let d = dersiTakvimeEkle(bosTekrarDurumu(), 'a', 'A', BUGUN);
    const beklenen = [
      [1, '2026-10-15'],
      [2, '2026-10-17'],
      [3, '2026-10-21'],
      [4, '2026-10-28'],
    ] as const;
    for (const [kutu, gun] of beklenen) {
      d = tekrarSonucunuIsle(d, 'a', true, BUGUN);
      expect(d.kayitlar.a!.kutu).toBe(kutu);
      expect(d.kayitlar.a!.sonrakiGun).toBe(gun);
    }
  });

  it('en üst kutuda kalır, 14 günde bir sorulur', () => {
    let d = dersiTakvimeEkle(bosTekrarDurumu(), 'a', 'A', BUGUN);
    for (let i = 0; i < 8; i++) d = tekrarSonucunuIsle(d, 'a', true, BUGUN);
    expect(d.kayitlar.a!.kutu).toBe(ARALIKLAR_GUN.length - 1);
    expect(d.kayitlar.a!.sonrakiGun).toBe(gunEkle(BUGUN, 14));
  });

  it('ipucuyla çözülürse kutu 1 olur ve ertesi gün yeniden sorulur', () => {
    let d = dersiTakvimeEkle(bosTekrarDurumu(), 'a', 'A', BUGUN);
    d = tekrarSonucunuIsle(d, 'a', true, BUGUN);
    d = tekrarSonucunuIsle(d, 'a', true, BUGUN);
    d = tekrarSonucunuIsle(d, 'a', false, BUGUN);
    expect(d.kayitlar.a).toMatchObject({ kutu: 1, sonrakiGun: '2026-10-15' });
  });

  it('vadesi gelmeyen tekrar listelenmez', () => {
    let d = dersiTakvimeEkle(bosTekrarDurumu(), 'a', 'A', BUGUN);
    d = tekrarSonucunuIsle(d, 'a', true, BUGUN);
    expect(vadesiGelenler(d, BUGUN)).toEqual([]);
    expect(vadesiGelenler(d, '2026-10-15').length).toBe(1);
  });

  it('en acil tekrar önce gelir: önce erken gün, sonra düşük kutu', () => {
    let d = bosTekrarDurumu();
    d = dersiTakvimeEkle(d, 'yeni', 'Yeni', BUGUN);
    d = dersiTakvimeEkle(d, 'eski', 'Eski', '2026-10-01');
    d = tekrarSonucunuIsle(d, 'eski', false, '2026-10-01'); // sonraki: 2026-10-02
    expect(vadesiGelenler(d, BUGUN).map((k) => k.dersId)).toEqual(['eski', 'yeni']);
  });

  it('her tekrar turunda farklı bir egzersiz seçilir', () => {
    let d = dersiTakvimeEkle(bosTekrarDurumu(), 'a', 'A', BUGUN);
    const secilenler = [];
    for (let i = 0; i < 4; i++) {
      secilenler.push(tekrarEgzersizSirasi(d.kayitlar.a!, 4));
      d = tekrarSonucunuIsle(d, 'a', true, BUGUN);
    }
    expect(secilenler).toEqual([0, 1, 2, 3]);
    expect(tekrarEgzersizSirasi(d.kayitlar.a!, 0)).toBe(-1);
  });

  it('ay ve yıl sınırında gün ekleme doğru çalışır', () => {
    expect(gunEkle('2026-10-31', 1)).toBe('2026-11-01');
    expect(gunEkle('2026-12-25', 14)).toBe('2027-01-08');
    expect(gunMetni(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('aralıklı tekrar — cihazda saklama (gizlilik)', () => {
  beforeEach(() => localStorage.clear());

  it('takvim cihazda saklanır ve geri yüklenir', () => {
    const d = dersiTakvimeEkle(bosTekrarDurumu(), 'a', 'A', BUGUN);
    tekrarKaydet(d);
    expect(tekrarYukle()).toEqual(d);
  });

  it('bozuk kayıt uygulamayı düşürmez, boş takvimle başlar', () => {
    localStorage.setItem(TEKRAR_ANAHTARI, '{bozuk json');
    expect(tekrarYukle()).toEqual(bosTekrarDurumu());
    localStorage.setItem(TEKRAR_ANAHTARI, JSON.stringify({ surum: 99 }));
    expect(tekrarYukle()).toEqual(bosTekrarDurumu());
  });

  it('kayıtta kimlik bilgisi yok: yalnızca ders, eser adı, kutu ve tarih', () => {
    const d = dersiTakvimeEkle(bosTekrarDurumu(), 'a', 'A', BUGUN);
    expect(Object.keys(d.kayitlar.a!).sort()).toEqual(
      ['dersId', 'eserAdi', 'kutu', 'sonrakiGun', 'tekrarSayisi'].sort(),
    );
  });
});
