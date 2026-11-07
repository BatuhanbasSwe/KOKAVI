import { describe, expect, it } from 'vitest';
import { arsivKaydiDogrula, ArsivHatasi, fotoAyikla, iceAktarmaListesi, turKisalt } from '../server/arsiv/dogrula';
import { parcala } from '../src/features/panel/arsivApi';
import { arsivleriBirlestir, type ArsivEseri } from '../src/features/arsiv/arsivVeri';

const tam = { ad: 'Koza Han', il: 'Bursa', tur: 'Han', kaynak: 'Vakıf Katılım, Bursa I, s. 10' };

describe('arşiv içe aktarma doğrulaması', () => {
  it('tam kaydı kabul eder, kimliği il + addan üretir', () => {
    const g = arsivKaydiDogrula({ ...tam, ilce: 'Osmangazi', paragraflar: ['Bir.', 'İki.'] });
    expect(g.id).toBe('bursa-koza-han');
    expect(g.il).toBe('bursa');
    expect(g.ilAd).toBe('Bursa');
    expect(g.paragraflar).toEqual(['Bir.', 'İki.']);
    expect(g.fotoVeri).toBeUndefined();
  });

  it.each(['ad', 'il', 'tur', 'kaynak'] as const)('"%s" eksikse reddeder', (alan) => {
    const k: Record<string, unknown> = { ...tam };
    delete k[alan];
    expect(() => arsivKaydiDogrula(k)).toThrow(ArsivHatasi);
  });

  it('dosya düzeyi şehir ve kaynağı varsayılan alır', () => {
    const g = arsivKaydiDogrula({ ad: 'Çeşme', tur: 'Çeşme' }, { sehir: 'Konya', kaynak: 'Konya envanteri' });
    expect(g.il).toBe('konya');
    expect(g.kaynak).toBe('Konya envanteri');
  });

  it('araştırma biçimini (sehir, kaynaklar[], tarihce, vakfiyeAmaci) metne çevirir', () => {
    const g = arsivKaydiDogrula({
      ad: 'Ulucami',
      sehir: 'Bursa',
      tur: 'Cami ve külliye (cami, medrese)',
      kaynaklar: [{ kunye: 'Kitap A' }, { kunye: 'Kitap B' }],
      tarihce: 'Birinci.\n\nİkinci.',
      vakfiyeAmaci: 'Hayır',
    });
    expect(g.tur).toBe('Cami');
    expect(g.kaynak).toBe('Kitap A · Kitap B');
    expect(g.paragraflar).toEqual(['Birinci.', 'İkinci.', 'Vakfiye amacı: Hayır']);
  });

  it('fotoğraf: https ve data URL kabul, javascript: ve SVG red', () => {
    expect(fotoAyikla('https://ornek.org/a.jpg')).toEqual({ fotoUrl: 'https://ornek.org/a.jpg' });
    expect(fotoAyikla('data:image/webp;base64,AAAA').fotoVeri).toBe('data:image/webp;base64,AAAA');
    expect(() => fotoAyikla('javascript:alert(1)')).toThrow(ArsivHatasi);
    expect(() => fotoAyikla('data:image/svg+xml;base64,AAAA')).toThrow(ArsivHatasi);
    expect(() => fotoAyikla(`data:image/png;base64,${'A'.repeat(2_000_001)}`)).toThrow(/büyük/);
  });

  it('dışarıdan gelen kimlik güvenli biçime (slug) çevrilir', () => {
    expect(() => arsivKaydiDogrula({ ...tam, id: '../../etc' })).not.toThrow(); // slug'a çevrilir
    expect(arsivKaydiDogrula({ ...tam, id: '../../etc' }).id).toBe('etc');
  });

  it('JSON gövdesi: dizi, {eserler}, tek nesne; başka şey hata', () => {
    expect(iceAktarmaListesi([tam]).kayitlar).toHaveLength(1);
    const r = iceAktarmaListesi({ sehir: 'Hatay', eserler: [tam, tam] });
    expect(r.kayitlar).toHaveLength(2);
    expect(r.varsayilan.sehir).toBe('Hatay');
    expect(iceAktarmaListesi(tam).kayitlar).toHaveLength(1);
    expect(() => iceAktarmaListesi('metin')).toThrow(ArsivHatasi);
  });

  it('turKisalt bileşik türü ilk parçaya indirir', () => {
    expect(turKisalt('Türbe ve tekke/zaviye')).toBe('Türbe');
  });
});

describe('panel tarafı', () => {
  it('büyük listeyi ~3 MB parçalara böler', () => {
    const buyuk = { ...tam, foto: `data:image/webp;base64,${'A'.repeat(1_200_000)}` };
    const parcalar = parcala([buyuk, buyuk, buyuk, tam]);
    expect(parcalar.length).toBeGreaterThan(1);
    expect(parcalar.flat()).toHaveLength(4);
  });

  it('arşiv birleştirme: ek aynı kimlikteki statik kaydı ezer, yeni il adı eklenir', () => {
    const statik: ArsivEseri[] = [
      { id: 'a', ad: 'Eski', il: 'bursa', ilce: null, tur: 'Cami', kaynak: 'k', foto: true },
      { id: 'b', ad: 'B', il: 'bursa', ilce: null, tur: 'Han', kaynak: 'k', foto: false },
    ];
    const ekler: ArsivEseri[] = [
      { id: 'a', ad: 'Yeni', il: 'bursa', ilce: null, tur: 'Cami', kaynak: 'k', foto: true, fotoUrl: '/api/arsiv/foto/a' },
      { id: 'c', ad: 'C', il: 'kutahya', ilAd: 'Kütahya', ilce: null, tur: 'Çeşme', kaynak: 'k', foto: false },
    ];
    const l = arsivleriBirlestir(statik, ekler);
    expect(l.map((e) => e.id)).toEqual(['a', 'c', 'b']);
    expect(l[0]!.ad).toBe('Yeni');
    expect(l[0]!.ek).toBe(true);
  });
});
