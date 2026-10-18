/**
 * Kaynaklı soru-cevap çekirdeği: korpus, Türkçe normalleştirme, soru tespiti,
 * bulma (BM25), kişisel veri temizleme, cevap denetimi (kaynaksız cümle düşer).
 */
import { describe, expect, it } from 'vitest';
import korpusJson from '../server/sor/korpus.json';
import { kelimeler, normallestir } from '../server/sor/metin';
import { bul, type Parca } from '../server/sor/bul';
import { kisiselVeriTemizle } from '../server/sor/temizle';
import { cevapDenetle } from '../server/sor/denetle';
import { soruMu } from '../src/lib/soruMu';
import { ingilizceMi, bol } from '../scripts/korpus-uret';

const korpus = korpusJson as Parca[];

describe('korpus', () => {
  it('her parçada künye ve eser var; İngilizce paragraf yok; ders eserleri dahil', () => {
    expect(korpus.length).toBeGreaterThan(1000);
    for (const p of korpus) {
      expect(p.kunye, p.id).toBeTruthy();
      expect(p.eserId, p.id).toBeTruthy();
      expect(p.metin.length, p.id).toBeLessThanOrEqual(700);
    }
    expect(korpus.some((p) => p.eserId === 'bursa-ulucami')).toBe(true);
    expect(korpus.some((p) => /\bis located in\b/i.test(p.metin))).toBe(false);
  });

  it('İngilizce tespiti ve bölme', () => {
    expect(ingilizceMi('The mosque is located in Osmangazi and was built in 1450.')).toBe(true);
    expect(ingilizceMi('Cami Osmangazi ilçesinde, 1450 yılında inşa edilmiştir.')).toBe(false);
    const parcalar = bol('Bir. '.repeat(300));
    expect(parcalar.length).toBeGreaterThan(1);
    for (const p of parcalar) expect(p.length).toBeLessThanOrEqual(600);
  });
});

describe('metin', () => {
  it('Türkçe normalleştirme: büyük İ, şapka, kesme, noktalama', () => {
    expect(normallestir("İPEK Hanı'nın KÂHYASI?")).toBe('ipek haninin kahyasi');
    expect(normallestir('Çeşme, şadırvan; ÖĞÜT!')).toBe('cesme sadirvan ogut');
  });

  it('kelimeler: kısa ve durak kelimeleri atılır', () => {
    expect(kelimeler('Ulucami de kaç kubbe var mı?')).toEqual(['ulucami', 'kac', 'kubbe']);
  });

  it('soru tespiti', () => {
    expect(soruMu("Ulucami'de kaç kubbe var?")).toBe(true);
    expect(soruMu('en eski hamam hangisi')).toBe(true);
    expect(soruMu('Koza Hanını kim yaptırdı')).toBe(true);
    expect(soruMu('hamam')).toBe(false);
    expect(soruMu('Ulu')).toBe(false);
  });
});

describe('bulma', () => {
  it('soru ilgili eserin parçalarını öne çıkarır', () => {
    const sonuc = bul(korpus, 'Ulucami kaç kubbeli?', undefined, 6);
    expect(sonuc).toHaveLength(6);
    expect(sonuc[0]!.eserId).toBe('bursa-ulucami');
  });

  it('soru bir eseri anıyorsa yalnızca o eserin parçaları, sorulan konuya göre', () => {
    const sonuc = bul(korpus, 'Bursa Ulucami kaç kubbeli?', undefined, 6);
    expect(new Set(sonuc.map((p) => p.eserId))).toEqual(new Set(['bursa-ulucami']));
    expect(sonuc.some((p) => /yirmi kubbe|on dokuz kubbe/i.test(p.metin))).toBe(true);
    // Türkçe ek: "Ulucami'de" de aynı eseri bulur.
    expect(bul(korpus, "Ulucami'de kaç kubbe var?", undefined, 6)[0]!.eserId).toBe('bursa-ulucami');
  });

  it('aynı kelimeyle başlayan eserlerden adı en iyi eşleşen seçilir', () => {
    const sonuc = bul(korpus, 'Yeşil Türbe neden yeşil?', undefined, 6);
    expect(sonuc[0]!.eserId).toBe('bursa-yesil-turbe-celebi-sultan-mehmed-turbesi');
  });

  it('genel kelimeyle başlayan eser adı ("Vakıf Kültür Konakları") soruyu ele geçirmez', () => {
    const sonuc = bul(korpus, 'Vakıf nedir?', undefined, 6);
    expect(sonuc.filter((p) => p.eserAd.startsWith('Vakıf')).length).toBeLessThan(6);
  });

  it('eserId verilirse o eser öne alınır', () => {
    const sonuc = bul(korpus, 'kim yaptırdı', 'bursa-koza-hani', 3);
    expect(sonuc[0]!.eserId).toBe('bursa-koza-hani');
  });

  it('ilgisiz soruda boş döner', () => {
    expect(bul(korpus, 'qwxz zzqv', undefined, 6)).toEqual([]);
  });
});

describe('kişisel veri temizleme', () => {
  it('e-posta, telefon ve uzun sayı gizlenir; 200 karaktere kırpılır', () => {
    expect(kisiselVeriTemizle('benim mailim ali@ornek.com, telefon 0532 123 45 67')).toBe(
      'benim mailim [gizlendi], telefon [gizlendi]',
    );
    expect(kisiselVeriTemizle('TC 12345678901 nedir')).toBe('TC [gizlendi] nedir');
    expect(kisiselVeriTemizle('1399 yılında ne oldu')).toBe('1399 yılında ne oldu');
    expect(kisiselVeriTemizle('a'.repeat(300))).toHaveLength(200);
  });
});

describe('cevap denetimi', () => {
  const iyi = { bilmiyorum: false, cumleler: [{ metin: 'Çatısında yirmi kubbe var.', kaynaklar: [1] }] };

  it('kaynaklı kısa cevap geçer', () => {
    expect(cevapDenetle(iyi, 6)).toEqual(iyi);
  });

  it('kaynaksız, aralık dışı, çok uzun ya da 3ten fazla cümle düşer', () => {
    expect(cevapDenetle({ bilmiyorum: false, cumleler: [{ metin: 'Uydurma.', kaynaklar: [] }] }, 6)).toBeNull();
    expect(cevapDenetle({ bilmiyorum: false, cumleler: [{ metin: 'Bir şey.', kaynaklar: [7] }] }, 6)).toBeNull();
    expect(cevapDenetle({ bilmiyorum: false, cumleler: [{ metin: 'x'.repeat(301), kaynaklar: [1] }] }, 6)).toBeNull();
    const dort = Array.from({ length: 4 }, () => ({ metin: 'Bir.', kaynaklar: [1] }));
    expect(cevapDenetle({ bilmiyorum: false, cumleler: dort }, 6)).toBeNull();
    expect(cevapDenetle({ bilmiyorum: false, cumleler: [] }, 6)).toBeNull();
  });

  it('bilmiyorum açıkça bildirilir', () => {
    expect(cevapDenetle({ bilmiyorum: true, cumleler: [] }, 6)).toEqual({ bilmiyorum: true, cumleler: [] });
  });
});
