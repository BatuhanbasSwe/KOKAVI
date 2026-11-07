/**
 * `cocukOzeti()` — arşiv metninden çocuk özeti ve İngilizce ayıklama.
 *
 * Kullanıcı şikâyeti: 10–12 yaş arayüzünde yetişkin envanter metni kocaman
 * paragraf olarak basılıyordu. Bu testler özetin sınırını, cümle sınırında
 * kesmeyi ve İngilizce çevirilerin arayüze hiç gelmemesini kilitler.
 */
import { describe, expect, it } from 'vitest';
import { cocukOzeti, ingilizceParagrafMi, OZET_SINIRI } from '../src/features/arsiv/ozet';

describe('ingilizceParagrafMi', () => {
  it('İngilizce çeviri paragrafını tanır', () => {
    expect(ingilizceParagrafMi('The mosque is located in Osmangazi District.')).toBe(true);
    expect(ingilizceParagrafMi('It was built in 1399 by a philanthropist.')).toBe(true);
  });

  it('Türkçe paragrafı ve tırnak içindeki İngilizce sözü ayırmaz', () => {
    expect(ingilizceParagrafMi('Ulucami, Bursa’nın kalbinde yer alır.')).toBe(false);
    expect(ingilizceParagrafMi('Caminin İngilizce adı “The Green Mosque”tir.')).toBe(false);
  });

  it('sayı/etiket artığını İngilizce saymaz', () => {
    expect(ingilizceParagrafMi('No: 28')).toBe(false);
  });
});

describe('cocukOzeti', () => {
  it('İngilizce paragrafları ayıklar; kalan Türkçe tam metni korur', () => {
    const paragraflar = [
      'Ulucami, Bursa’nın kalbinde yer alır.',
      'The mosque is located in the heart of Bursa.',
      'Yirmi kubbesi vardır.',
      'It was built in 1399.',
    ];

    expect(cocukOzeti(paragraflar)).toEqual({
      ozet: 'Ulucami, Bursa’nın kalbinde yer alır. Yirmi kubbesi vardır.',
      kalan: ['Ulucami, Bursa’nın kalbinde yer alır.', 'Yirmi kubbesi vardır.'],
    });
  });

  it('özet ilk iki cümleden oluşur', () => {
    const { ozet } = cocukOzeti(['Birinci cümle. İkinci cümle. Üçüncü cümle.']);
    expect(ozet).toBe('Birinci cümle. İkinci cümle.');
  });

  it('260 karakteri aşmaz; ilk cümle uzunsa son tam kelimede kesip "…" ekler', () => {
    const ilkCumle = `Bu ${'çok uzun bir kelime dizisi '.repeat(20)}biter.`;
    const { ozet } = cocukOzeti([ilkCumle]);

    expect(ilkCumle.length).toBeGreaterThan(OZET_SINIRI);
    expect(ozet.length).toBeLessThanOrEqual(OZET_SINIRI);
    expect(ozet.endsWith('…')).toBe(true);
    // Kelime ortasından kesilmedi: "…" öncesi metin orijinalin birebir başıdır.
    expect(ilkCumle.startsWith(ozet.slice(0, -1))).toBe(true);
    expect(/\s$/.test(ozet.slice(0, -1))).toBe(false);
  });

  it('ikinci cümle sığmıyorsa cümle sınırında keser ("…" gerekmez)', () => {
    const ilkCumle = 'Kısa ilk cümle.';
    const uzunIkinci = `İkinci ${'büyük kelime '.repeat(30)}cümle.`;
    const { ozet } = cocukOzeti([`${ilkCumle} ${uzunIkinci}`]);

    expect(ozet).toBe(ilkCumle);
    expect(ozet.length).toBeLessThanOrEqual(OZET_SINIRI);
    expect(ozet.endsWith('…')).toBe(false);
  });

  it('kısaltma noktalarında (Sultan II. Murad) cümle bölmez', () => {
    const { ozet } = cocukOzeti([
      'Acemler Camii, Sultan II. Murad döneminde yapıldı. Kubbesi vardır. Bahçesi geniştir.',
    ]);
    expect(ozet).toBe('Acemler Camii, Sultan II. Murad döneminde yapıldı. Kubbesi vardır.');
  });

  it('boş girdide ve tamamen İngilizce metinde boş özet döner', () => {
    expect(cocukOzeti([])).toEqual({ ozet: '', kalan: [] });
    expect(cocukOzeti(['', '   '])).toEqual({ ozet: '', kalan: [] });
    expect(cocukOzeti(['The mosque is located in Bursa.'])).toEqual({ ozet: '', kalan: [] });
  });

  it('aynı girdide her zaman aynı sonucu verir (deterministik)', () => {
    const paragraflar = ['Birinci cümle. İkinci cümle.', 'The tomb is located in Bursa.', 'Üçüncü cümle.'];
    expect(cocukOzeti(paragraflar)).toEqual(cocukOzeti(paragraflar));
  });

  it('baştaki eser başlığı + İngilizce ad satırını atlar (drop cap/başlık sızması)', () => {
    const { ozet } = cocukOzeti([
      'narlı (Karabaçak-Voyvoda) Camii ÇINARLI (KARABAÇAK-VOYVODA) MOSQUE',
      'Yenişehir ilçesi Gündoğan Mahallesi’nde yer almaktadır. Vakfiye kayıtlarından banisinin Sungur Paşa olduğu anlaşılmaktadır.',
    ]);

    expect(ozet.startsWith('Yenişehir ilçesi')).toBe(true);
    expect(ozet).not.toContain('narlı');
    expect(ozet).not.toContain('MOSQUE');
  });

  it('gövde yarım cümleyle başlıyorsa ilk tam cümleden başlar', () => {
    const { ozet } = cocukOzeti([
      'MUSTAFA ŞEVKİ PAŞACAMİİ VE KÜLLİYESİ MUSTAFA ŞEVKİ PASHA MOSQUE AND COMPLEX',
      'hücrelerinin güney ucunda, kübik kaide üzerinde yükselen minarenin yanında kapı bulunur.',
      'Geniş bir avluya sahip olan Külliye, iki sahınlı cami ve medreseden oluşur. Avlu duvarı sonradan eklenmiştir.',
    ]);

    expect(ozet.startsWith('Geniş bir avluya')).toBe(true);
    expect(ozet).not.toContain('hücrelerinin');
  });
});
