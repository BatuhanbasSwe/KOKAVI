/**
 * DENEYSEL: harita arka planı temaları.
 *
 * OpenFreeMap "Liberty" altlığının katmanları katman adı ve kaynak katmanına
 * göre sınıflanır (kara, su, park, bina, yol, etiket…) ve seçilen temanın
 * renkleriyle yeniden boyanır. Stil kopyalanır; önbellekteki asıl stil değişmez.
 *
 * Renkler burada düz değer: MapLibre CSS değişkeni okuyamaz. Beğenilen tema
 * kalıcı olursa renkleri tokens.css'e (--harita-*) taşınmalı.
 */
import type * as maplibregl from 'maplibre-gl';

export type HaritaTemasiAdi = 'liberty' | 'cini' | 'parsomen' | 'gece' | 'oyun' | 'sade';

interface Palet {
  kara: string;
  su: string;
  park: string;
  orman: string;
  yerlesim: string;
  bina: string;
  anaYol: string;
  araYol: string;
  yolKenar: string;
  demiryolu: string;
  sinir: string;
  yazi: string;
  yaziHale: string;
  /** Dükkân/durak gibi ilgi noktası etiketlerini gizle (sade görünüm). */
  poiGizle?: boolean;
  /** Bina yüksekliğini (3B) gizle. */
  binaDuz?: boolean;
}

export const HARITA_TEMALARI: Record<HaritaTemasiAdi, { ad: string; aciklama: string; palet: Palet | null }> = {
  liberty: { ad: 'Klasik', aciklama: 'Varsayılan sokak haritası', palet: null },
  cini: {
    ad: 'Çini',
    aciklama: 'Turkuaz su, krem kara, kobalt yollar',
    palet: {
      kara: '#f7f1e3', su: '#5cc8c8', park: '#c4e6cc', orman: '#a9d8b4', yerlesim: '#f1e7d2',
      bina: '#ecd9b8', anaYol: '#2563a8', araYol: '#ffffff', yolKenar: '#d6c39c', demiryolu: '#9aa8b8',
      sinir: '#2563a8', yazi: '#1d3b5c', yaziHale: '#fffaf0', binaDuz: true,
    },
  },
  parsomen: {
    ad: 'Eski harita',
    aciklama: 'Parşömen kâğıdı, kahverengi mürekkep',
    palet: {
      kara: '#efe0bb', su: '#b4c6b0', park: '#d9d0a0', orman: '#cdc290', yerlesim: '#e8d6ac',
      bina: '#dcc79a', anaYol: '#9c6a36', araYol: '#f5e9cc', yolKenar: '#b08a56', demiryolu: '#8a6a3f',
      sinir: '#8a5a2b', yazi: '#5a3a1a', yaziHale: '#f3e6c6', poiGizle: true, binaDuz: true,
    },
  },
  gece: {
    ad: 'Gece',
    aciklama: 'Lacivert kara, altın yollar',
    palet: {
      kara: '#15263d', su: '#0a1525', park: '#17382d', orman: '#143126', yerlesim: '#1a2d47',
      bina: '#1f3552', anaYol: '#f2b84b', araYol: '#2d4769', yolKenar: '#0e1b2e', demiryolu: '#4a6285',
      sinir: '#f2b84b', yazi: '#e8eefc', yaziHale: '#0a1525', binaDuz: true,
    },
  },
  oyun: {
    ad: 'Oyun',
    aciklama: 'Şeker renkleri, oyun haritası gibi',
    palet: {
      kara: '#fff5d9', su: '#7fd3f7', park: '#9fe39f', orman: '#74d18c', yerlesim: '#ffeec2',
      bina: '#ffd1de', anaYol: '#ff9f43', araYol: '#ffffff', yolKenar: '#f2c48a', demiryolu: '#b49ae0',
      sinir: '#9b6ae0', yazi: '#3b2a63', yaziHale: '#ffffff', binaDuz: true,
    },
  },
  sade: {
    ad: 'Sade',
    aciklama: 'Gri tonlar; yalnızca eserler öne çıkar',
    palet: {
      kara: '#f4f4f2', su: '#d5e3eb', park: '#e5ebe1', orman: '#dfe6da', yerlesim: '#eeeeeb',
      bina: '#e6e5e1', anaYol: '#ffffff', araYol: '#ffffff', yolKenar: '#d9d9d5', demiryolu: '#cfcfcb',
      sinir: '#b9b9b4', yazi: '#5b5b58', yaziHale: '#f4f4f2', poiGizle: true, binaDuz: true,
    },
  },
};

const ANAHTAR = 'kokavi.harita-temasi.v1';

export function haritaTemasiOku(): HaritaTemasiAdi {
  try {
    const t = localStorage.getItem(ANAHTAR) as HaritaTemasiAdi | null;
    return t && t in HARITA_TEMALARI ? t : 'liberty';
  } catch {
    return 'liberty';
  }
}

export function haritaTemasiYaz(t: HaritaTemasiAdi): void {
  try {
    localStorage.setItem(ANAHTAR, t);
  } catch {
    /* özel pencere: yalnızca bu oturum */
  }
}

type Katman = maplibregl.LayerSpecification & { 'source-layer'?: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> };

function boya(k: Katman, p: Palet): void {
  const id = k.id;
  const kaynak = k['source-layer'] ?? '';
  const paint = (k.paint ??= {});
  const gizle = () => {
    k.layout = { ...(k.layout ?? {}), visibility: 'none' };
  };

  if (k.type === 'background') {
    paint['background-color'] = p.kara;
    return;
  }
  if (k.type === 'raster') return gizle(); // natural_earth gölgesi temayı bulandırır
  if (k.type === 'fill-extrusion') {
    if (p.binaDuz) return gizle();
    paint['fill-extrusion-color'] = p.bina;
    return;
  }
  if (k.type === 'symbol') {
    if (p.poiGizle && (kaynak === 'poi' || id.startsWith('highway-shield') || id === 'road_shield_us')) return gizle();
    if ('text-color' in paint || k.layout?.['text-field']) {
      paint['text-color'] = p.yazi;
      paint['text-halo-color'] = p.yaziHale;
      paint['text-halo-width'] = 1.4;
    }
    return;
  }

  const renkAlani = k.type === 'fill' ? 'fill-color' : k.type === 'line' ? 'line-color' : null;
  if (!renkAlani) return;

  let renk: string | null = null;
  if (kaynak === 'water' || kaynak === 'waterway') renk = p.su;
  else if (kaynak === 'park') renk = p.park;
  else if (kaynak === 'landcover') renk = id.includes('wood') ? p.orman : id.includes('ice') ? p.kara : p.park;
  else if (kaynak === 'landuse') renk = id.includes('residential') ? p.yerlesim : p.park;
  else if (kaynak === 'building') renk = p.bina;
  else if (kaynak === 'boundary') renk = p.sinir;
  else if (kaynak === 'aeroway') renk = p.yolKenar;
  else if (kaynak === 'transportation') {
    if (id.includes('rail')) renk = p.demiryolu;
    else if (id.includes('casing')) renk = p.yolKenar;
    else if (/motorway|trunk|primary|secondary/.test(id)) renk = p.anaYol;
    else renk = p.araYol;
  }
  if (!renk) return;
  if (k.type === 'fill' && 'fill-pattern' in paint) delete paint['fill-pattern'];
  paint[renkAlani] = renk;
  if (k.type === 'fill' && 'fill-outline-color' in paint) paint['fill-outline-color'] = renk;
}

/** Stilin temalı kopyasını döndürür ('liberty' ise aynı stil). */
export function haritaTemasiUygula(
  stil: maplibregl.StyleSpecification | null,
  tema: HaritaTemasiAdi,
): maplibregl.StyleSpecification | null {
  const palet = HARITA_TEMALARI[tema].palet;
  if (!stil || !palet) return stil;
  const kopya = structuredClone(stil);
  for (const k of kopya.layers as Katman[]) boya(k, palet);
  return kopya;
}
