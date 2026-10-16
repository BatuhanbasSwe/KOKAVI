/**
 * İçerik doğrulama testleri.
 *
 * `data/content/*.json` dosyaları yapay zekâ destekli üretimden geçer; bu test
 * onların tip sözleşmesine uyduğunu ve PDF'in pedagojik taahhütlerini
 * karşıladığını SEED ÖNCESİ doğrular.
 *
 * Neden gerekli: bozuk içerik veritabanına yazılırsa hata demoda görünür olur.
 * Burada yakalanırsa `npm test` aşamasında yakalanır.
 */
import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { eserKimligi } from '../shared/slug.ts';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICERIK_DIZINI = join(KOK, 'data', 'content');
const ARASTIRMA_DIZINI = join(KOK, 'data', 'research');

interface IcerikDersi {
  eserId: string;
  merak: { soru: string; secenekler: string[]; kopru: string };
  baglam: { baslik: string; metin: string; kavramlar: { ad: string; aciklama: string }[]; kapanis: string };
  perspektif: {
    baslik: string;
    diyalog: { kim: string; metin: string }[];
    soru: string;
    secenekler: { metin: string; sonuc: string; dogruMu: boolean }[];
  };
  yansima: {
    ozet: string;
    rontgenSorusu: string;
    rontgenAciklama: string;
    kaynakKunye: string;
  };
  egzersizler: { id: string; tip: string; veri: Record<string, unknown>; kaynak?: string | null }[];
}

async function jsonDosyalari(dizin: string): Promise<string[]> {
  if (!existsSync(dizin)) return [];
  return (await readdir(dizin)).filter((f) => f.endsWith('.json'));
}

async function icerikleriOku(): Promise<{ dosya: string; dersler: IcerikDersi[] }[]> {
  const dosyalar = await jsonDosyalari(ICERIK_DIZINI);
  const sonuc: { dosya: string; dersler: IcerikDersi[] }[] = [];
  for (const dosya of dosyalar) {
    const ham = await readFile(join(ICERIK_DIZINI, dosya), 'utf8');
    const veri = JSON.parse(ham) as { dersler?: IcerikDersi[] };
    sonuc.push({ dosya, dersler: veri.dersler ?? [] });
  }
  return sonuc;
}

async function arastirmaEserIdleri(): Promise<Set<string>> {
  const idler = new Set<string>();
  for (const dosya of await jsonDosyalari(ARASTIRMA_DIZINI)) {
    const ham = await readFile(join(ARASTIRMA_DIZINI, dosya), 'utf8');
    const veri = JSON.parse(ham) as { eserler?: { id?: string; ad: string; sehir: string }[] };
    for (const eser of veri.eserler ?? []) {
      // Seed ile AYNI işlev kullanılır — mantık kopyalanmaz.
      idler.add(eserKimligi(eser));
    }
  }
  return idler;
}

const DORT_TIP = ['eslestir', 'sirala', 'bosluk-doldur', 'eser-tani'];

describe('ders içerikleri', async () => {
  const gruplar = await icerikleriOku();
  const gecerliEserIdler = await arastirmaEserIdleri();

  it('en az bir içerik dosyası var', () => {
    expect(gruplar.length).toBeGreaterThan(0);
  });

  for (const { dosya, dersler } of gruplar) {
    describe(dosya, () => {
      it('her ders araştırmadaki gerçek bir esere bağlı', () => {
        for (const ders of dersler) {
          expect(
            gecerliEserIdler.has(ders.eserId),
            `"${ders.eserId}" araştırma dosyalarında yok — uydurma eser olabilir`,
          ).toBe(true);
        }
      });

      it('her dersin dört farklı egzersiz tipi var (PDF: "karışık egzersiz tipleri")', () => {
        for (const ders of dersler) {
          const tipler = ders.egzersizler.map((e) => e.tip);
          expect(tipler.length, `${ders.eserId}: egzersiz sayısı`).toBeGreaterThanOrEqual(4);
          for (const tip of DORT_TIP) {
            expect(tipler, `${ders.eserId}: "${tip}" tipi eksik`).toContain(tip);
          }
        }
      });

      it('01 Merak: en az 3 seçenek ve köprü metni var', () => {
        for (const ders of dersler) {
          expect(ders.merak.secenekler.length, ders.eserId).toBeGreaterThanOrEqual(3);
          expect(ders.merak.soru.trim().length, ders.eserId).toBeGreaterThan(10);
          expect(ders.merak.kopru.trim().length, ders.eserId).toBeGreaterThan(10);
        }
      });

      it('02 Bağlam: metin ve en az 2 kavram kartı var', () => {
        for (const ders of dersler) {
          expect(ders.baglam.metin.trim().length, ders.eserId).toBeGreaterThan(80);
          expect(ders.baglam.kavramlar.length, ders.eserId).toBeGreaterThanOrEqual(2);
        }
      });

      it('03 Perspektif: tam olarak bir doğru seçenek var', () => {
        for (const ders of dersler) {
          const dogrular = ders.perspektif.secenekler.filter((s) => s.dogruMu);
          expect(dogrular.length, `${ders.eserId}: doğru seçenek sayısı`).toBe(1);
          expect(ders.perspektif.diyalog.length, ders.eserId).toBeGreaterThanOrEqual(2);
          // Yanlış seçenek de öğretici olmalı — sonuç metni boş olamaz
          for (const secenek of ders.perspektif.secenekler) {
            expect(secenek.sonuc.trim().length, `${ders.eserId}: seçenek sonucu`).toBeGreaterThan(10);
          }
        }
      });

      it('05 Yansıma: röntgen metni ve kaynak künyesi dolu', () => {
        for (const ders of dersler) {
          expect(ders.yansima.rontgenSorusu.trim().length, ders.eserId).toBeGreaterThan(5);
          expect(ders.yansima.rontgenAciklama.trim().length, ders.eserId).toBeGreaterThan(40);
          expect(ders.yansima.kaynakKunye.trim().length, ders.eserId).toBeGreaterThan(10);
        }
      });

      it('boşluk-doldur egzersizlerinde "___" işareti var', () => {
        for (const ders of dersler) {
          for (const e of ders.egzersizler.filter((x) => x.tip === 'bosluk-doldur')) {
            const veri = e.veri as { metin?: string; cevap?: string };
            expect(veri.metin, `${ders.eserId}/${e.id}`).toContain('___');
            expect((veri.cevap ?? '').trim().length, `${ders.eserId}/${e.id}`).toBeGreaterThan(0);
          }
        }
      });

      it('eser-tani egzersizlerinde dogruIndex geçerli aralıkta', () => {
        for (const ders of dersler) {
          for (const e of ders.egzersizler.filter((x) => x.tip === 'eser-tani')) {
            const veri = e.veri as { secenekler?: string[]; dogruIndex?: number };
            expect(Array.isArray(veri.secenekler), ders.eserId).toBe(true);
            expect(veri.dogruIndex, `${ders.eserId}/${e.id}`).toBeGreaterThanOrEqual(0);
            expect(veri.dogruIndex!, `${ders.eserId}/${e.id}`).toBeLessThan(veri.secenekler!.length);
          }
        }
      });

      it('sirala egzersizlerinde en az 3 öğe var', () => {
        for (const ders of dersler) {
          for (const e of ders.egzersizler.filter((x) => x.tip === 'sirala')) {
            const veri = e.veri as { dogruSira?: string[] };
            expect(veri.dogruSira?.length ?? 0, `${ders.eserId}/${e.id}`).toBeGreaterThanOrEqual(3);
          }
        }
      });

      it('eşleştir egzersizlerinde her öğe geçerli bir kategoriye bağlı', () => {
        for (const ders of dersler) {
          for (const e of ders.egzersizler.filter((x) => x.tip === 'eslestir')) {
            const veri = e.veri as {
              kategoriler?: { id: string }[];
              ogeler?: { metin: string; kategoriId: string }[];
            };
            const kategoriIdler = new Set((veri.kategoriler ?? []).map((k) => k.id));
            expect(kategoriIdler.size, ders.eserId).toBeGreaterThanOrEqual(2);
            expect(veri.ogeler?.length ?? 0, ders.eserId).toBeGreaterThanOrEqual(4);
            for (const oge of veri.ogeler ?? []) {
              expect(kategoriIdler.has(oge.kategoriId), `${ders.eserId}: "${oge.metin}"`).toBe(true);
            }
          }
        }
      });

      it('aynı eser için yinelenen ders yok', () => {
        const idler = dersler.map((d) => d.eserId);
        expect(new Set(idler).size).toBe(idler.length);
      });
    });
  }
});
