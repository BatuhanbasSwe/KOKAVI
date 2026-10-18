/**
 * Ayrıntılı altlık: OpenFreeMap "Liberty" stili (OpenStreetMap verisi; sokak,
 * mahalle ve yer adları, binalar, parklar). Anahtar, kota ve izleme yoktur;
 * çocuğun cihazı yalnızca harita karolarını indirir.
 *
 * Stil gelmezse (çevrimdışı, yavaş ağ) null döner ve harita gömülü il/ilçe
 * sınırlarıyla çizilir; uygulama internetsiz de çalışmaya devam eder.
 */
import type * as maplibregl from 'maplibre-gl';

export const ALTLIK_ADRESI = 'https://tiles.openfreemap.org/styles/liberty';
export const ALTLIK_ATFI = 'OpenFreeMap · © OpenMapTiles · © OpenStreetMap katkıcıları';

let onbellek: Promise<maplibregl.StyleSpecification | null> | null = null;

export function altlikYukle(sureMs = 4000): Promise<maplibregl.StyleSpecification | null> {
  onbellek ??= (async () => {
    const iptal = new AbortController();
    const zamanlayici = setTimeout(() => iptal.abort(), sureMs);
    try {
      const yanit = await fetch(ALTLIK_ADRESI, { signal: iptal.signal });
      if (!yanit.ok) return null;
      const stil = (await yanit.json()) as maplibregl.StyleSpecification;
      return stil.version === 8 && Array.isArray(stil.layers) ? stil : null;
    } catch {
      return null;
    } finally {
      clearTimeout(zamanlayici);
    }
  })();
  const sonuc = onbellek;
  // Başarısızsa bir sonraki açılışta yeniden denensin.
  void sonuc.then((s) => {
    if (!s && onbellek === sonuc) onbellek = null;
  });
  return sonuc;
}

/**
 * Uygulamanın kaynaklarını ve katmanlarını altlığa ekler. Katmanlar ilk yazı
 * katmanının ALTINA girer: sokak ve yer adları her zaman okunur kalır.
 */
export function altligaEkle(
  altlik: maplibregl.StyleSpecification,
  kaynaklar: maplibregl.StyleSpecification['sources'],
  katmanlar: maplibregl.LayerSpecification[],
): maplibregl.StyleSpecification {
  const turkce = altlik.layers.map(turkceAd);
  const ilkYazi = turkce.findIndex((l) => l.type === 'symbol');
  const kesim = ilkYazi < 0 ? turkce.length : ilkYazi;
  return {
    ...altlik,
    sources: { ...altlik.sources, ...kaynaklar },
    layers: [...turkce.slice(0, kesim), ...katmanlar, ...turkce.slice(kesim)],
  };
}

/** Yer adları Türkçe öncelikli ("Turkey" değil "Türkiye"); yoksa Latin harfli, yoksa yerel ad. */
export const TURKCE_AD = ['coalesce', ['get', 'name:tr'], ['get', 'name:latin'], ['get', 'name']];

function turkceAd(katman: maplibregl.LayerSpecification): maplibregl.LayerSpecification {
  if (katman.type !== 'symbol') return katman;
  const alan = katman.layout?.['text-field'];
  // Yol numarası kalkanları ("ref") olduğu gibi kalır.
  if (alan === undefined || !JSON.stringify(alan).includes('"name')) return katman;
  return { ...katman, layout: { ...katman.layout, 'text-field': TURKCE_AD as unknown as string } };
}
