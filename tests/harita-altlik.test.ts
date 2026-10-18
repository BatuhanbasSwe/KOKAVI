/**
 * Ayrıntılı harita altlığı (OpenFreeMap Liberty): uygulama katmanları yazı
 * katmanlarının altına girer, yer adları Türkçe öncelikli olur, yol numarası
 * kalkanları değişmez; stil gelmezse null döner (gömülü altlığa düşülür).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as maplibregl from 'maplibre-gl';
import { TURKCE_AD, altligaEkle, altlikYukle } from '../src/features/harita/altlik';

const altlik = {
  version: 8,
  sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'arka', type: 'background' },
    { id: 'yol', type: 'line', source: 'openmaptiles' },
    { id: 'kalkan', type: 'symbol', source: 'openmaptiles', layout: { 'text-field': ['to-string', ['get', 'ref']] } },
    { id: 'yer', type: 'symbol', source: 'openmaptiles', layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']] } },
  ],
} as unknown as maplibregl.StyleSpecification;

afterEach(() => vi.unstubAllGlobals());

describe('harita altlığı', () => {
  it('katmanlar ilk yazı katmanının altına, kaynaklar eklenir', () => {
    const stil = altligaEkle(altlik, { iller: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } }, [
      { id: 'ilce-dolgu', type: 'fill', source: 'iller' },
    ]);
    expect(stil.layers.map((l) => l.id)).toEqual(['arka', 'yol', 'ilce-dolgu', 'kalkan', 'yer']);
    expect(Object.keys(stil.sources)).toEqual(['openmaptiles', 'iller']);
  });

  it('yer adları Türkçe öncelikli; yol numarası kalkanı aynen kalır', () => {
    const stil = altligaEkle(altlik, {}, []);
    const alan = (id: string) => (stil.layers.find((l) => l.id === id) as maplibregl.SymbolLayerSpecification).layout!['text-field'];
    expect(alan('yer')).toEqual(TURKCE_AD);
    expect(alan('kalkan')).toEqual(['to-string', ['get', 'ref']]);
  });

  it('stil gelmezse (çevrimdışı ya da hata) null döner', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('ağ yok'); }));
    expect(await altlikYukle()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    expect(await altlikYukle()).toBeNull();
  });
});
