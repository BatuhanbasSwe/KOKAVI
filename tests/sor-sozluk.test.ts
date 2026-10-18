/**
 * Kavram soruları ("Vakıf nedir?", "Akar ne demek?"): derslerin Bağlam
 * adımındaki açıklamalar korpusta "Sözlük" parçası olarak durur ve bu
 * sorularda öne alınır. Künye dürüsttür: ders metnimiz + eserin kaynağı.
 */
import { describe, expect, it } from 'vitest';
import korpusJson from '../server/sor/korpus.json';
import { bul, type Parca } from '../server/sor/bul';
import { kavramParcalari, tanimSorusuMu } from '../server/sor/sozluk';
import sozlukKaynaklari from '../data/sozluk-kaynaklari.json';

const korpus = korpusJson as Parca[];
const sozluk = korpus.filter((p) => p.alan === 'Sözlük');
const kavramlar = (soru: string) => kavramParcalari(korpus, soru).map((p) => p.kavram);

describe('sözlük korpusu', () => {
  it('derslerin kavramları; her biri künyeli ve kaynaklı', () => {
    expect(sozluk.length).toBeGreaterThan(100);
    expect(new Set(sozluk.map((p) => p.kavram)).size).toBe(sozluk.length);
    for (const p of sozluk) {
      expect(p.kunye, p.id).toMatch(/^Kök Avı ders metni \(.+, Bağlam adımı\); eser kaynağı: .+/);
      expect(p.metin, p.id).toContain(' — Sözlük: ');
    }
    for (const k of ['vakif', 'vakfiye', 'hayrat', 'akar', 'mutevelli', 'kulliye', 'imaret']) {
      expect(sozluk.some((p) => p.kavram === k), k).toBe(true);
    }
  });
});

describe('temel kavramların ansiklopedi künyesi', () => {
  it('altı temel kavram TDV İslâm Ansiklopedisi maddesiyle; her kayıt adresli ve alıntılı', () => {
    const { kavramlar: kaynaklar } = sozlukKaynaklari as {
      kavramlar: Record<string, { kunye: string; adres: string; alinti: string }>;
    };
    expect(Object.keys(kaynaklar).sort()).toEqual(['akar', 'hayrat', 'kulliye', 'mutevelli', 'vakfiye', 'vakif']);
    for (const [kavram, k] of Object.entries(kaynaklar)) {
      expect(k.adres, kavram).toMatch(/^https:\/\/islamansiklopedisi\.org\.tr\//);
      expect(k.alinti.length, kavram).toBeGreaterThan(20);
      const parca = sozluk.find((p) => p.kavram === kavram)!;
      expect(parca.kunye, kavram).toContain(`; kavram kaynağı: ${k.kunye}`);
    }
    // Diğer kavramlarda ansiklopedi künyesi uydurulmaz.
    expect(sozluk.find((p) => p.kavram === 'kubbe')!.kunye).not.toContain('kavram kaynağı');
  });
});

describe('kavram soruları', () => {
  it('tanım sorusu tanınır; sayı ya da sıralama sorusu tanım değildir', () => {
    expect(tanimSorusuMu('Vakıf nedir?')).toBe(true);
    expect(tanimSorusuMu('Akar ne demek')).toBe(true);
    expect(tanimSorusuMu('Hanlar ne işe yarardı?')).toBe(true);
    expect(tanimSorusuMu('Mütevelli ne yapardı?')).toBe(true);
    expect(tanimSorusuMu('Bursa Ulucami kaç kubbeli?')).toBe(false);
    expect(tanimSorusuMu('Hangi han en eski?')).toBe(false);
  });

  it('Türkçe ekler ve en uzun eşleşme', () => {
    expect(kavramlar('Vakıf nedir?')).toEqual(['vakif']);
    expect(kavramlar('Vakfiye nedir?')).toEqual(['vakfiye']); // "vakıf" değil
    expect(kavramlar('Vakfın mütevellisi ne yapardı?')).toEqual(['mutevelli', 'vakif']); // ünlü düşmesi
    expect(kavramlar('Akarlar ne demek?')).toEqual(['akar']);
    expect(kavramlar('Vakıf malı ne demek?')[0]).toBe('vakif mali'); // çok kelimeli
    expect(kavramlar('Hayrat ile akar arasındaki fark nedir?')).toEqual(['hayrat', 'akar']);
  });

  it('eser sorularında sözlük gerçek bilginin yerini almaz', () => {
    for (const soru of ['Bursa Ulucami kaç kubbeli?', 'Akar ne demek?', 'Koza Hanı kim yaptırdı?']) {
      expect(bul(korpus, soru, undefined, 6).some((p) => p.alan === 'Sözlük'), soru).toBe(false);
    }
  });

  it('kısa kavram ("han") yalnızca bilinen eklerle: "hangi" eşleşmez', () => {
    expect(kavramlar('Hanlar ne işe yarardı?')).toEqual(['han']);
    expect(kavramlar('Hangi eser daha eski?')).toEqual([]);
  });
});
