/**
 * Bölge bölge harita — yakınlaştıkça ayrıntı artar.
 *
 *   İller   (zoom < 7)     her il için bir balon: "Bursa · 293 eser · 33 ders"
 *   İlçeler (7 – 10.3)     ilçe sınırları yoğunluğa göre renklenir + sayı balonları
 *   Eserler (zoom ≥ 10.3)  fotoğraflı işaretler; üst üste binenler gruplanır
 *
 * Altlık çevrimdışıdır (il + ilçe GeoJSON gömülü). Yazı katmanı (glyph) olmadığı
 * için balon ve etiketler DOM işaretçisidir. Harita görsel bir özettir: işaretçiler
 * klavye sırasına girmez (tabindex=-1, aria-hidden); aynı bilgi sayfadaki listede.
 * Tüm metinler textContent ile yazılır — veriden HTML enjekte edilmez.
 */
import type maplibregl from 'maplibre-gl';
import type { FeatureCollection, Geometry, Position } from 'geojson';

type ML = typeof maplibregl;
export type Seviye = 'il' | 'ilce' | 'eser';

export interface HaritaEseri {
  id: string;
  ad: string;
  tur: string;
  ilce: string | null;
  sehirId: string;
  lng: number;
  lat: number;
  kapak: string | null;
  dersId: string | null;
  ogrenildi: boolean;
  siradaki: boolean;
  yaklasik: boolean;
}

/** Vakıf ağı çizgisi: akar → beslediği hayrat. */
export interface AgCizgisi {
  id: string;
  kaynak: [number, number];
  hedef: [number, number];
  hedefAd: string;
  yaklasik: boolean;
}

export interface BolgeHaritasi {
  temizle: () => void;
  /** Vakıf ağını göster/gizle; gösterince bütün çizgiler sığacak kadar uzaklaşır. */
  agGoster: (acik: boolean) => void;
}

export interface BolgeSayisi {
  ders: number;
  toplam: number;
}

interface Secenekler {
  iller: FeatureCollection;
  ilceler: FeatureCollection;
  eserler: HaritaEseri[];
  /** anahtar: "bursa" */
  ilSayilari: Map<string, BolgeSayisi & { ad: string }>;
  /** anahtar: "bursa|Osmangazi" */
  ilceSayilari: Map<string, BolgeSayisi>;
  renk: (ad: string, yedek: string) => string;
  onSeviye: (seviye: Seviye) => void;
  ag?: AgCizgisi[];
}

const ILCE_ESIGI = 7;
const ESER_ESIGI = 10.3;

function kutu(geometri: Geometry): [[number, number], [number, number]] {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const gez = (k: unknown): void => {
    if (Array.isArray(k) && typeof k[0] === 'number') {
      const [x, y] = k as Position;
      x0 = Math.min(x0, x!); x1 = Math.max(x1, x!); y0 = Math.min(y0, y!); y1 = Math.max(y1, y!);
    } else if (Array.isArray(k)) k.forEach(gez);
  };
  if ('coordinates' in geometri) gez(geometri.coordinates);
  return [[x0, y0], [x1, y1]];
}

function birlestir(kutular: [[number, number], [number, number]][]) {
  return kutular.reduce<[[number, number], [number, number]]>(
    (t, k) => [[Math.min(t[0][0], k[0][0]), Math.min(t[0][1], k[0][1])], [Math.max(t[1][0], k[1][0]), Math.max(t[1][1], k[1][1])]],
    [[180, 90], [-180, -90]],
  );
}

function ogeYap<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif: string, metin?: string) {
  const e = document.createElement(etiket);
  e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

/** Görsel özet işaretçisi: tıklanabilir ama klavye sırasında değil (liste eşdeğer). */
function isaretciDugmesi(sinif: string): HTMLButtonElement {
  const d = ogeYap('button', `hm ${sinif}`);
  d.type = 'button';
  d.tabIndex = -1;
  d.setAttribute('aria-hidden', 'true');
  // Tıklama haritaya yayılırsa MapLibre "haritaya tıklandı" der ve yeni açılan
  // popup'ı hemen kapatır.
  d.addEventListener('click', (olay) => olay.stopPropagation());
  return d;
}

/** Yakınlaştıkça beliren ayrıntı (zoom 8 → 9.6 arasında yumuşak geçiş). */
const BELIR = ['interpolate', ['linear'], ['zoom'], 8, 0, 9.6, 1] as const;

/** OpenMapTiles şemasıyla su, park, bina ve yollar — tema jetonlarıyla. */
function sokakKatmanlari(renk: Secenekler['renk']): maplibregl.LayerSpecification[] {
  const yolGenisligi = (carpan: number) =>
    ['interpolate', ['exponential', 1.6], ['zoom'], 9, 0.4 * carpan, 13, 2 * carpan, 16, 9 * carpan] as unknown as number;
  const anaYol = ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false];
  return [
    {
      id: 'sokak-alan',
      type: 'fill',
      source: 'sokak',
      'source-layer': 'landuse',
      minzoom: 8,
      filter: ['match', ['get', 'class'], ['residential', 'suburb', 'neighbourhood', 'commercial', 'retail'], true, false],
      paint: { 'fill-color': renk('--zemin-vurgu', '#1d2629'), 'fill-opacity': BELIR as unknown as number },
    },
    {
      id: 'sokak-yesil',
      type: 'fill',
      source: 'sokak',
      'source-layer': 'park',
      minzoom: 8,
      paint: { 'fill-color': renk('--vurgu-yumusak', '#2b2414'), 'fill-opacity': BELIR as unknown as number },
    },
    {
      id: 'sokak-su',
      type: 'fill',
      source: 'sokak',
      'source-layer': 'water',
      minzoom: 8,
      paint: { 'fill-color': renk('--harita-deniz', '#0b1416'), 'fill-opacity': BELIR as unknown as number },
    },
    {
      id: 'sokak-bina',
      type: 'fill',
      source: 'sokak',
      'source-layer': 'building',
      minzoom: 13,
      paint: { 'fill-color': renk('--cizgi', '#2a3539'), 'fill-opacity': 0.9 },
    },
    {
      id: 'sokak-yol-kenar',
      type: 'line',
      source: 'sokak',
      'source-layer': 'transportation',
      minzoom: 9,
      filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'], true, false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': renk('--cizgi-kalin', '#3a474c'), 'line-width': yolGenisligi(1.5) },
    },
    {
      id: 'sokak-yol',
      type: 'line',
      source: 'sokak',
      'source-layer': 'transportation',
      minzoom: 9,
      filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'], true, false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['case', anaYol, renk('--odul-yumusak', '#2b2414'), renk('--zemin-kart', '#161d20')] as unknown as string,
        'line-width': yolGenisligi(1),
      },
    },
  ];
}

export function bolgeHaritasiKur(ml: ML, kap: HTMLElement, s: Secenekler): BolgeHaritasi {
  const { renk } = s;
  const eserliIller = [...s.ilSayilari.keys()];

  // İlçe yoğunluğu: dolgu opaklığı eser sayısına göre
  const ilceler: FeatureCollection = {
    ...s.ilceler,
    features: s.ilceler.features.map((f) => {
      const p = f.properties as { il: string; ad: string };
      return { ...f, properties: { ...p, sayi: s.ilceSayilari.get(`${p.il}|${p.ad}`)?.toplam ?? 0 } };
    }),
  };

  const harita = new ml.Map({
    container: kap,
    style: {
      version: 8,
      sources: {
        iller: { type: 'geojson', data: s.iller },
        ilceler: { type: 'geojson', data: ilceler },
        // Vakıf ağı: akar → hayrat hatları (başta gizli; düğmeyle açılır).
        ag: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: (s.ag ?? []).map((c) => ({
              type: 'Feature',
              properties: { id: c.id },
              geometry: { type: 'LineString', coordinates: [c.kaynak, c.hedef] },
            })),
          },
        },
        // Sokak ayrıntısı: OpenFreeMap vektör karoları (anahtarsız, OpenStreetMap
        // verisi). Uygulamanın kendi renkleriyle çizilir; yazı katmanı yoktur.
        // Karolar gelmezse (çevrimdışı) gömülü il/ilçe sınırları yine görünür.
        sokak: {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet',
          attribution: 'OpenFreeMap · © OpenMapTiles · © OpenStreetMap katkıcıları',
        },
      },
      layers: [
        { id: 'deniz', type: 'background', paint: { 'background-color': renk('--harita-deniz', '#0b1416') } },
        {
          id: 'il-dolgu',
          type: 'fill',
          source: 'iller',
          paint: {
            // Türkiye ölçeğinde eserli iller vurgulu; yakınlaşınca sokakların
            // altında nötr kara rengine döner (zemin turkuaza boyanmasın).
            'fill-color': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8,
              [
                'case',
                ['in', ['get', 'anahtar'], ['literal', eserliIller]],
                renk('--harita-vurgulu', '#2b2414'),
                renk('--harita-kara', '#1d2629'),
              ],
              10,
              renk('--harita-kara', '#1d2629'),
            ],
          },
        },
        ...sokakKatmanlari(renk),
        {
          id: 'ilce-dolgu',
          type: 'fill',
          source: 'ilceler',
          minzoom: ILCE_ESIGI - 0.6,
          paint: {
            'fill-color': renk('--vurgu', '#ffbf3c'),
            // İlçe görünümünde yoğunluk; eser görünümünde sokaklar okunsun diye silikleşir.
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              9,
              ['interpolate', ['linear'], ['get', 'sayi'], 0, 0.03, 1, 0.12, 10, 0.26, 60, 0.42],
              11,
              0.04,
            ],
          },
        },
        {
          id: 'ilce-sinir',
          type: 'line',
          source: 'ilceler',
          minzoom: ILCE_ESIGI - 0.6,
          paint: { 'line-color': renk('--vurgu-golge', '#b8862a'), 'line-width': 0.9, 'line-opacity': 0.6 },
        },
        {
          id: 'il-sinir',
          type: 'line',
          source: 'iller',
          paint: { 'line-color': renk('--harita-sinir', '#3a474c'), 'line-width': 0.8 },
        },
        {
          id: 'eserli-il-sinir',
          type: 'line',
          source: 'iller',
          filter: ['in', ['get', 'anahtar'], ['literal', eserliIller]],
          paint: { 'line-color': renk('--vurgu', '#ffbf3c'), 'line-width': 1.8 },
        },
        {
          id: 'ag-golge',
          type: 'line',
          source: 'ag',
          layout: { visibility: 'none', 'line-cap': 'round' },
          paint: { 'line-color': renk('--odul-golge', '#b8862a'), 'line-width': 7, 'line-opacity': 0.35 },
        },
        {
          id: 'ag-cizgi',
          type: 'line',
          source: 'ag',
          layout: { visibility: 'none', 'line-cap': 'butt' },
          paint: {
            'line-color': renk('--sicak', '#ffbf3c'),
            'line-width': 3.5,
            'line-dasharray': [0, 2, 2],
          },
        },
      ],
    },
    center: [33.5, 39],
    zoom: 5,
    minZoom: 4.4,
    maxZoom: 16,
    attributionControl: false,
    maxBounds: [
      [22.5, 33.5],
      [47.5, 44.5],
    ],
    locale: {
      'NavigationControl.ZoomIn': 'Yakınlaştır',
      'NavigationControl.ZoomOut': 'Uzaklaştır',
      'NavigationControl.ResetBearing': 'Kuzeye çevir',
      'Popup.Close': 'Kapat',
    },
  });
  harita.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
  harita.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');

  // --- İl kutuları (ilçelerden) ------------------------------------------
  const ilKutulari = new Map<string, [[number, number], [number, number]]>();
  for (const il of eserliIller) {
    ilKutulari.set(il, birlestir(s.ilceler.features.filter((f) => (f.properties as { il: string }).il === il).map((f) => kutu(f.geometry))));
  }
  const tumKutu = birlestir([...ilKutulari.values()]);
  harita.fitBounds(tumKutu, { padding: 36, maxZoom: 6.4, duration: 0 });

  const isaretciler: maplibregl.Marker[] = [];
  let acikPopup: maplibregl.Popup | null = null;
  const popupAc = (lngLat: [number, number], icerik: HTMLElement) => {
    acikPopup?.remove();
    acikPopup = new ml.Popup({ offset: 22, maxWidth: '260px', className: 'hm-popup-kap' })
      .setLngLat(lngLat)
      .setDOMContent(icerik)
      .addTo(harita);
  };

  // --- 1) İl balonları -----------------------------------------------------
  let gecikme = 0;
  for (const [il, sayi] of s.ilSayilari) {
    const k = ilKutulari.get(il);
    if (!k) continue;
    const d = isaretciDugmesi('hm-il');
    d.style.setProperty('--gecikme', `${(gecikme += 120)}ms`);
    d.append(ogeYap('span', 'hm-il__ad', sayi.ad), ogeYap('span', 'hm-il__sayi', `${sayi.toplam} eser`));
    if (sayi.ders > 0) d.append(ogeYap('span', 'hm-il__ders', `${sayi.ders} ders`));
    d.addEventListener('click', () => harita.fitBounds(k, { padding: 32, maxZoom: 9.2 }));
    isaretciler.push(
      new ml.Marker({ element: d }).setLngLat([(k[0][0] + k[1][0]) / 2, (k[0][1] + k[1][1]) / 2]).addTo(harita),
    );
  }

  // --- 2) İlçe balonları ---------------------------------------------------
  const enBuyuk = Math.max(1, ...[...s.ilceSayilari.values()].map((v) => v.toplam));
  for (const f of s.ilceler.features) {
    const p = f.properties as { il: string; ad: string; etiketLng: number; etiketLat: number };
    const sayi = s.ilceSayilari.get(`${p.il}|${p.ad}`);
    if (!sayi || sayi.toplam === 0) continue;
    const d = isaretciDugmesi('hm-ilce');
    d.style.setProperty('--boyut', `${Math.round(30 + 26 * Math.sqrt(sayi.toplam / enBuyuk))}px`);
    d.append(ogeYap('span', 'hm-ilce__sayi', String(sayi.toplam)), ogeYap('span', 'hm-ilce__ad', p.ad));
    if (sayi.ders > 0) d.classList.add('hm-ilce--dersli');
    const k = kutu(f.geometry);
    // Küçük balon büyüğün altında kalmasın: sayısı az olan öne çıkar.
    const zIndex = String(1000 - sayi.toplam);
    // Tıklayınca eser seviyesine in: ilçedeki ders eserlerinin ortasına (yoksa ilçe
    // etiketine) en az eser eşiği kadar yaklaş. Geniş ilçede fitBounds yetmiyordu.
    const ilceEserleri = s.eserler.filter((e) => e.sehirId === p.il && e.ilce === p.ad);
    const odak: [number, number] = ilceEserleri.length
      ? [
          ilceEserleri.reduce((t, e) => t + e.lng, 0) / ilceEserleri.length,
          ilceEserleri.reduce((t, e) => t + e.lat, 0) / ilceEserleri.length,
        ]
      : [p.etiketLng, p.etiketLat];
    d.addEventListener('click', () => {
      const kamera = harita.cameraForBounds(k, { padding: 40 });
      harita.easeTo({ center: odak, zoom: Math.max(kamera?.zoom ?? 0, ESER_ESIGI + 0.5), duration: 900 });
      const ic = ogeYap('div', 'hm-popup');
      ic.append(ogeYap('strong', 'hm-popup__ad', `${p.ad}`));
      ic.append(ogeYap('span', 'hm-popup__alt', `${sayi.toplam} vakıf eseri · ${sayi.ders} ders`));
      const a = ogeYap('a', 'hm-popup__bag', 'Meraklısına: arşivde gör →');
      a.href = `#/arsiv?il=${encodeURIComponent(p.il)}&ilce=${encodeURIComponent(p.ad)}`;
      ic.append(a);
      popupAc([p.etiketLng, p.etiketLat], ic);
    });
    const m = new ml.Marker({ element: d }).setLngLat([p.etiketLng, p.etiketLat]).addTo(harita);
    m.getElement().style.zIndex = zIndex;
    isaretciler.push(m);
  }

  // --- 3) Eser işaretleri --------------------------------------------------
  const eserIsaretleri = s.eserler.map((e, i) => {
    const d = isaretciDugmesi('hm-eser');
    d.style.setProperty('--gecikme', `${(i % 12) * 40}ms`);
    if (e.ogrenildi) d.classList.add('hm-eser--ogrenildi');
    if (e.siradaki) d.classList.add('hm-eser--siradaki');
    if (e.yaklasik) d.classList.add('hm-eser--yaklasik');
    if (e.kapak) {
      const img = ogeYap('img', 'hm-eser__resim');
      img.src = e.kapak;
      img.alt = '';
      img.loading = 'lazy';
      d.append(img);
    } else {
      d.append(ogeYap('span', 'hm-eser__harf', e.ad.slice(0, 1)));
    }
    if (e.ogrenildi) d.append(ogeYap('span', 'hm-eser__rozet', '✓'));
    d.addEventListener('click', () => {
      const ic = ogeYap('div', 'hm-popup');
      if (e.kapak) {
        const img = ogeYap('img', 'hm-popup__resim');
        img.src = e.kapak;
        img.alt = `${e.ad} fotoğrafı`;
        ic.append(img);
      }
      ic.append(ogeYap('strong', 'hm-popup__ad', e.ad.split(' (')[0] ?? e.ad));
      ic.append(ogeYap('span', 'hm-popup__alt', [e.tur, e.ilce].filter(Boolean).join(' · ')));
      if (e.ogrenildi) ic.append(ogeYap('span', 'hm-popup__durum hm-popup__durum--ogrenildi', '✓ Kâşif Defterinde'));
      else if (e.siradaki) ic.append(ogeYap('span', 'hm-popup__durum', '★ Sıradaki dersin'));
      if (e.yaklasik) ic.append(ogeYap('span', 'hm-popup__not', 'Konum yaklaşık'));
      if (e.dersId) {
        const a = ogeYap('a', 'dugme hm-popup__dugme', e.ogrenildi ? 'Dersi tekrarla' : 'Derse git');
        a.href = `#/ders/${encodeURIComponent(e.dersId)}`;
        ic.append(a);
      }
      // İşaret alta kayar ki üstünde açılan fotoğraflı kart haritadan taşmasın.
      harita.easeTo({ center: [e.lng, e.lat], offset: [0, Math.round(kap.clientHeight * 0.28)], duration: 450 });
      popupAc([e.lng, e.lat], ic);
    });
    const m = new ml.Marker({ element: d }).setLngLat([e.lng, e.lat]).addTo(harita);
    isaretciler.push(m);
    return { e, m, d };
  });

  // --- Gruplama: üst üste binen eser işaretleri tek balonda --------------------
  let kumeler: maplibregl.Marker[] = [];
  const kumele = () => {
    kumeler.forEach((m) => m.remove());
    kumeler = [];
    eserIsaretleri.forEach(({ d }) => d.classList.remove('hm-gizli'));
    if (harita.getZoom() < ESER_ESIGI) return;
    const noktalar = eserIsaretleri.map((x) => ({ x, p: harita.project([x.e.lng, x.e.lat]) }));
    const kullanildi = new Set<number>();
    noktalar.forEach((a, i) => {
      if (kullanildi.has(i)) return;
      const grup = [i];
      noktalar.forEach((b, j) => {
        if (j !== i && !kullanildi.has(j) && Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) < 48) grup.push(j);
      });
      if (grup.length < 2) return;
      grup.forEach((j) => {
        kullanildi.add(j);
        noktalar[j]!.x.d.classList.add('hm-gizli');
      });
      const lng = grup.reduce((t, j) => t + noktalar[j]!.x.e.lng, 0) / grup.length;
      const lat = grup.reduce((t, j) => t + noktalar[j]!.x.e.lat, 0) / grup.length;
      const d = isaretciDugmesi('hm-kume');
      d.textContent = String(grup.length);
      d.addEventListener('click', () => harita.easeTo({ center: [lng, lat], zoom: Math.min(harita.getZoom() + 2, 16) }));
      kumeler.push(new ml.Marker({ element: d }).setLngLat([lng, lat]).addTo(harita));
    });
  };

  // --- Seviye: kap üzerindeki data-seviye ile CSS gösterir/gizler -------------
  let sonSeviye: Seviye | null = null;
  const seviyeGuncelle = () => {
    const z = harita.getZoom();
    const seviye: Seviye = z < ILCE_ESIGI ? 'il' : z < ESER_ESIGI ? 'ilce' : 'eser';
    if (seviye !== sonSeviye) {
      sonSeviye = seviye;
      kap.dataset.seviye = seviye;
      s.onSeviye(seviye);
    }
  };
  harita.on('zoom', seviyeGuncelle);
  harita.on('moveend', kumele);
  harita.on('load', () => {
    seviyeGuncelle();
    kumele();
  });
  seviyeGuncelle();

  // --- Vakıf ağı ------------------------------------------------------------
  // Hedef etiketleri (DOM; yazı katmanı yok) başta gizli. Çizgi kesikleri
  // kaydırılarak "para akıyor" hissi verilir; hareketi azalt'ta durağandır.
  // Birbirine çok yakın hedefler (ör. İstanbul'daki iki külliye) tek etikette.
  const hedefGruplari = new Map<string, { nokta: [number, number]; adlar: string[] }>();
  for (const c of s.ag ?? []) {
    const anahtar = `${c.hedef[0].toFixed(2)}|${c.hedef[1].toFixed(2)}`;
    const g = hedefGruplari.get(anahtar) ?? { nokta: c.hedef, adlar: [] };
    const ad = `${c.hedefAd}${c.yaklasik ? ' (yaklaşık)' : ''}`;
    if (!g.adlar.includes(ad)) g.adlar.push(ad);
    hedefGruplari.set(anahtar, g);
  }
  const hedefIsaretleri = [...hedefGruplari.values()].map((g) => {
    const d = ogeYap('div', 'hm-hedef', g.adlar.join(' · '));
    d.setAttribute('aria-hidden', 'true');
    return new ml.Marker({ element: d, anchor: 'bottom' }).setLngLat(g.nokta);
  });
  const DASH = [
    [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
    [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
  ];
  let animasyon = 0;
  let adim = 0;
  const hareketYok = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.hareketAzalt === 'true';
  const akit = (zaman: number) => {
    const yeni = Math.floor(zaman / 80) % DASH.length;
    if (yeni !== adim && harita.getLayer('ag-cizgi')) {
      adim = yeni;
      harita.setPaintProperty('ag-cizgi', 'line-dasharray', DASH[adim]);
    }
    animasyon = requestAnimationFrame(akit);
  };

  const agGoster = (acik: boolean) => {
    const uygula = () => {
      for (const id of ['ag-golge', 'ag-cizgi']) harita.setLayoutProperty(id, 'visibility', acik ? 'visible' : 'none');
      hedefIsaretleri.forEach((m) => (acik ? m.addTo(harita) : m.remove()));
      cancelAnimationFrame(animasyon);
      if (acik && !hareketYok()) animasyon = requestAnimationFrame(akit);
      kap.dataset.ag = acik ? 'acik' : 'kapali';
      if (acik && (s.ag ?? []).length > 0) {
        const noktalar = (s.ag ?? []).flatMap((c) => [c.kaynak, c.hedef]);
        const xs = noktalar.map((p) => p[0]);
        const ys = noktalar.map((p) => p[1]);
        harita.fitBounds(
          [
            [Math.min(...xs), Math.min(...ys)],
            [Math.max(...xs), Math.max(...ys)],
          ],
          { padding: { top: 70, bottom: 50, left: 140, right: 140 }, maxZoom: 8 },
        );
      }
    };
    if (harita.isStyleLoaded()) uygula();
    else harita.once('load', uygula);
  };

  return {
    agGoster,
    temizle: () => {
      cancelAnimationFrame(animasyon);
      acikPopup?.remove();
      kumeler.forEach((m) => m.remove());
      isaretciler.forEach((m) => m.remove());
      hedefIsaretleri.forEach((m) => m.remove());
      harita.remove();
    },
  };
}
