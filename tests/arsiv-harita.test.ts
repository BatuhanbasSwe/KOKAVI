/**
 * PDF entegrasyonu testleri: arşiv, ders fotoğrafları, ilçe sınırları, ünite temaları.
 *
 * Neden: Bu veriler script'lerle (scripts/*.py) üretilir; biri eksik ya da
 * kopuk üretilirse ekranda boş galeri, kırık bağlantı ya da yanlış ünite çıkar.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rotayiCoz } from '../src/lib/yonlendirme';
import { ilceAdi } from '../src/features/arsiv/arsivVeri';
import { eserKimligi } from '../shared/slug';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const oku = <T>(yol: string): T => JSON.parse(readFileSync(join(KOK, yol), 'utf8')) as T;

interface ArastirmaEseri {
  id?: string;
  ad: string;
  sehir: string;
  ilce?: string | null;
  koordinat?: { lat: number; lng: number } | null;
}
const arastirmaDosyalari = readdirSync(join(KOK, 'data/research')).filter((f) => f.endsWith('.json')).sort();
const eserler = arastirmaDosyalari.flatMap(
  (f) => oku<{ eserler: ArastirmaEseri[] }>(`data/research/${f}`).eserler,
);
const eserIdleri = new Set(eserler.map(eserKimligi));

describe('yönlendirme: arşiv', () => {
  it('#/arsiv liste, #/arsiv/:id eser sayfası açar; sorgu dizesi rotayı bozmaz', () => {
    expect(rotayiCoz('#/arsiv')).toEqual({ ad: 'arsiv' });
    expect(rotayiCoz('#/arsiv?il=bursa&ilce=Osmangazi')).toEqual({ ad: 'arsiv' });
    expect(rotayiCoz('#/arsiv/bursa-koza-hani')).toEqual({ ad: 'arsiv-eser', arsivId: 'bursa-koza-hani' });
  });

  it('ilçe adı parantezli eklerden temizlenir', () => {
    expect(ilceAdi('Osmangazi (Muradiye Mahallesi)')).toBe('Osmangazi');
    expect(ilceAdi('  ')).toBeNull();
    expect(ilceAdi(null)).toBeNull();
  });
});

describe('ders fotoğrafları', () => {
  const gorseller = oku<Record<string, { sayi: number; kaynak: string }>>('data/gorseller.json');

  it('her ders eserinin fotoğrafı ve kaynağı var', () => {
    for (const id of eserIdleri) {
      expect(gorseller[id], `${id}: fotoğraf listesinde yok`).toBeDefined();
      expect(gorseller[id]!.sayi, id).toBeGreaterThan(0);
      expect(gorseller[id]!.kaynak, id).toMatch(/Vakıf Katılım/);
    }
  });

  it('listedeki her fotoğraf dosyası diskte duruyor (kapak dahil)', () => {
    for (const [id, g] of Object.entries(gorseller)) {
      expect(eserIdleri.has(id), `${id}: araştırmada olmayan eser`).toBe(true);
      expect(existsSync(join(KOK, `public/gorseller/${id}/k.webp`)), `${id}/k.webp`).toBe(true);
      for (let i = 1; i <= g.sayi; i++) {
        expect(existsSync(join(KOK, `public/gorseller/${id}/${i}.webp`)), `${id}/${i}.webp`).toBe(true);
      }
    }
  });
});

describe('harita verisi', () => {
  const ilceler = oku<{ features: { properties: { ad: string; il: string } }[] }>(
    'src/features/harita/veri/ilceler.json',
  );

  it('üç ilin bütün ilçeleri var', () => {
    const sayi = (il: string) => ilceler.features.filter((f) => f.properties.il === il).length;
    expect(sayi('bursa')).toBe(17);
    expect(sayi('konya')).toBe(31);
    expect(sayi('hatay')).toBe(15);
  });

  it('ders eserlerinin ilçesi sınır verisinde bulunur (balonlar doğru ilçeye düşer)', () => {
    const adlar = new Set(ilceler.features.map((f) => `${f.properties.il}|${f.properties.ad}`));
    for (const e of eserler) {
      const ilce = ilceAdi(e.ilce);
      if (!ilce) continue;
      expect(adlar.has(`${e.sehir.toLocaleLowerCase('tr')}|${ilce}`), `${e.ad}: ${ilce}`).toBe(true);
    }
  });

  it('koordinatlar Türkiye sınırları içinde', () => {
    for (const e of eserler.filter((x) => x.koordinat)) {
      expect(e.koordinat!.lat, e.ad).toBeGreaterThan(35.5);
      expect(e.koordinat!.lat, e.ad).toBeLessThan(42.5);
      expect(e.koordinat!.lng, e.ad).toBeGreaterThan(25.5);
      expect(e.koordinat!.lng, e.ad).toBeLessThan(45);
    }
  });
});

describe('Meraklısına arşivi', () => {
  const liste = oku<{ id: string; il: string; ders?: string; foto: boolean; kaynak: string }[]>(
    'public/arsiv/liste.json',
  );

  it('üç ilin envanterindeki eserler var ve kimlikler tekil', () => {
    expect(liste.length).toBeGreaterThan(600);
    expect(new Set(liste.map((e) => e.id)).size).toBe(liste.length);
    for (const il of ['bursa', 'konya', 'hatay']) expect(liste.some((e) => e.il === il)).toBe(true);
  });

  it('"dersi var" bağlantıları gerçek bir ders eserine gider', () => {
    for (const e of liste.filter((x) => x.ders)) {
      expect(eserIdleri.has(e.ders!), `${e.id} → ${e.ders}`).toBe(true);
    }
  });

  it('her eserin metni ve kitap/sayfa kaynağı var', () => {
    for (const e of liste) {
      expect(existsSync(join(KOK, `public/arsiv/metin/${e.id}.json`)), e.id).toBe(true);
      expect(e.kaynak, e.id).toMatch(/s\. \d+-\d+$/);
      if (e.foto) expect(existsSync(join(KOK, `public/arsiv/foto/${e.id}.webp`)), e.id).toBe(true);
    }
  });
});

describe('Bursa üniteleri', () => {
  it('üç tema dosyası sırayla 11 eser içerir (seed üniteleri dosya sırasıyla böler)', () => {
    const bursa = arastirmaDosyalari.filter((f) => f.startsWith('bursa-'));
    expect(bursa).toEqual(['bursa-1.json', 'bursa-2.json', 'bursa-3.json']);
    const temalar = bursa.map((f) => oku<{ tema?: string; eserler: unknown[] }>(`data/research/${f}`));
    expect(temalar.map((t) => t.tema)).toEqual(['İbadet ve İlim', 'Ticaret ve Şehir Hayatı', 'Hayır ve Yardımlaşma']);
    for (const t of temalar) expect(t.eserler).toHaveLength(11);
  });
});
