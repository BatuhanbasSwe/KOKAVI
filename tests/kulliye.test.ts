/**
 * Külliye grubu testleri — PDF Senaryo B ("sınıf birlikte bir külliyeyi tamamlar").
 *
 * İki şeyi kanıtlar:
 *  1. `shared/kulliyeler.ts` içindeki her eser kimliği gerçekten üretim
 *     içeriğinde var (yazım hatası / uydurma eser yok).
 *  2. Hedef külliye hesabı yol sırasına göre ilk TAMAMLANMAMIŞ gruptur;
 *     grup bitince hedef sıradakine geçer.
 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { KULLIYE_GRUPLARI, eserinKulliyesi } from '../shared/kulliyeler.ts';
import { kulliyeleriHesapla, type YayindakiDers } from '../server/repo/sinif.ts';

const KOK = process.cwd();

async function icerikEserIdleri(): Promise<Set<string>> {
  const dizin = join(KOK, 'data', 'content');
  const dosyalar = (await readdir(dizin)).filter((f) => f.endsWith('.json'));
  const idler = new Set<string>();
  for (const dosya of dosyalar) {
    const ham = await readFile(join(dizin, dosya), 'utf8');
    const veri = JSON.parse(ham) as { dersler?: { eserId?: string }[] };
    for (const ders of veri.dersler ?? []) {
      if (ders.eserId) idler.add(ders.eserId);
    }
  }
  return idler;
}

describe('külliye grupları', () => {
  it('en az bir külliye grubu var ve her grubun adı + kaynağı dolu', () => {
    expect(KULLIYE_GRUPLARI.length).toBeGreaterThan(0);
    for (const grup of KULLIYE_GRUPLARI) {
      expect(grup.ad.trim().length).toBeGreaterThan(0);
      expect(grup.kaynak.trim().length).toBeGreaterThan(20);
      expect(grup.eserIdler.length).toBeGreaterThan(1);
    }
  });

  it('gruptaki her eser kimliği üretim içeriğinde var (uydurma bağ yok)', async () => {
    const gecerli = await icerikEserIdleri();
    expect(gecerli.size).toBeGreaterThan(0);
    for (const grup of KULLIYE_GRUPLARI) {
      for (const eserId of grup.eserIdler) {
        expect(gecerli.has(eserId), `${grup.id}: "${eserId}" içerikte yok`).toBe(true);
      }
    }
  });

  it('bir eser yalnızca bir külliyeye bağlıdır', () => {
    const gorulen = new Set<string>();
    for (const grup of KULLIYE_GRUPLARI) {
      for (const eserId of grup.eserIdler) {
        expect(gorulen.has(eserId), `"${eserId}" birden fazla grupta`).toBe(false);
        gorulen.add(eserId);
      }
    }
  });

  it('eserinKulliyesi doğru grubu döner, bağsız eserde null', () => {
    const grup = KULLIYE_GRUPLARI[0]!;
    expect(eserinKulliyesi(grup.eserIdler[0]!)).toBe(grup);
    expect(eserinKulliyesi('bursa-ulucami')).toBeNull();
  });
});

describe('hedef külliye hesabı', () => {
  const yesil = KULLIYE_GRUPLARI.find((g) => g.id === 'yesil-kulliyesi')!;
  const muradiye = KULLIYE_GRUPLARI.find((g) => g.id === 'muradiye-kulliyesi')!;

  // Yol sırası: önce Yeşil (4 ders), sonra Muradiye (3 ders), arada bağsız ders.
  const dersler: YayindakiDers[] = [
    ...yesil.eserIdler.map((eserId, i) => ({ dersId: `yesil-${i}`, eserId })),
    { dersId: 'bagimsiz', eserId: 'bursa-ulucami' },
    ...muradiye.eserIdler.map((eserId, i) => ({ dersId: `muradiye-${i}`, eserId })),
  ];
  const yesilDersleri = yesil.eserIdler.map((_, i) => `yesil-${i}`);
  const muradiyeDersleri = muradiye.eserIdler.map((_, i) => `muradiye-${i}`);

  it('hedef, yol sırasındaki ilk tamamlanmamış gruptur', () => {
    const sonuc = kulliyeleriHesapla(dersler, { 'yesil-0': 1, 'yesil-1': 1 });

    expect(sonuc.map((k) => k.id)).toEqual(['yesil-kulliyesi', 'muradiye-kulliyesi']);
    expect(sonuc[0]).toMatchObject({
      hedefMi: true,
      tamamlandiMi: false,
      toplamDers: yesil.eserIdler.length,
      tamamlananDersCesidi: 2,
    });
    expect(sonuc[1]).toMatchObject({
      hedefMi: false,
      tamamlandiMi: false,
      tamamlananDersCesidi: 0,
    });
  });

  it('grup tamamlanınca hedef sıradaki külliyeye geçer', () => {
    const sayilar = Object.fromEntries(yesilDersleri.map((id) => [id, 1]));
    const sonuc = kulliyeleriHesapla(dersler, sayilar);

    expect(sonuc[0]).toMatchObject({ tamamlandiMi: true, hedefMi: false });
    expect(sonuc[1]).toMatchObject({ hedefMi: true, tamamlandiMi: false });
  });

  it('tüm gruplar bitince hedef kalmaz', () => {
    const sayilar = Object.fromEntries(
      [...yesilDersleri, ...muradiyeDersleri].map((id) => [id, 1]),
    );
    const sonuc = kulliyeleriHesapla(dersler, sayilar);

    expect(sonuc.every((k) => k.tamamlandiMi)).toBe(true);
    expect(sonuc.some((k) => k.hedefMi)).toBe(false);
  });

  it('yayında eşleşen ders yoksa grup listeye girmez', () => {
    const sonuc = kulliyeleriHesapla(
      [{ dersId: 'bagimsiz', eserId: 'bursa-ulucami' }],
      { bagimsiz: 1 },
    );
    expect(sonuc).toEqual([]);
  });
});
