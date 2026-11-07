/**
 * Keşif rotası haritası: OpenFreeMap "Liberty" altlığı (sokak ve yer adlarıyla;
 * gelmezse uygulama renkleriyle sokak karoları), numaralı durak işaretleri ve
 * rota çizgisi. Yürüyüş bacakları kalın safran,
 * bölümler arası (araçla geçilen) bacaklar ince kesikli çizgi.
 *
 * Erişilebilirlik: işaretler süs (aria-hidden, odak almaz); aynı bilgi
 * sayfadaki numaralı listede metin olarak durur. Karolar gelmezse (çevrimdışı)
 * işaretler ve çizgi düz zeminde yine görünür.
 */
import type * as maplibregl from 'maplibre-gl';
import type { Feature, LineString } from 'geojson';
import { sokakKatmanlari } from '../harita/bolgeHaritasi';
import { ALTLIK_ATFI, altligaEkle } from '../harita/altlik';
import { BOLUM_ESIGI, mesafe, type RotaNoktasi } from './rota';
import { ekrandaKumele, grupEtiketi } from '../harita/kumele';

type ML = typeof maplibregl;

export interface HaritaDuragi extends RotaNoktasi {
  ad: string;
}

export interface RotaHaritasi {
  /** Görülen/seçili durakları işaretler; `odak` verilirse haritayı o duraklara sığdırır. */
  guncelle(s: { gorulen: Set<string>; secili: string | null; odak?: HaritaDuragi[] }): void;
  temizle(): void;
}

function kutu(noktalar: RotaNoktasi[]): [[number, number], [number, number]] {
  const xs = noktalar.map((n) => n.lng);
  const ys = noktalar.map((n) => n.lat);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ];
}

export function rotaHaritasiKur(
  ml: ML,
  kap: HTMLElement,
  duraklar: HaritaDuragi[],
  renk: (ad: string, yedek: string) => string,
  onSec: (id: string) => void,
  altlik: maplibregl.StyleSpecification | null = null,
): RotaHaritasi {
  const bacaklar: Feature<LineString, { arac: boolean }>[] = duraklar.slice(1).map((d, i) => {
    const onceki = duraklar[i]!;
    return {
      type: 'Feature',
      properties: { arac: mesafe(onceki, d) > BOLUM_ESIGI },
      geometry: { type: 'LineString', coordinates: [[onceki.lng, onceki.lat], [d.lng, d.lat]] },
    };
  });

  const rotaKaynagi: maplibregl.StyleSpecification['sources'] = {
    rota: { type: 'geojson', data: { type: 'FeatureCollection', features: bacaklar } },
  };
  const rotaKatmanlari: maplibregl.LayerSpecification[] = [
    {
      id: 'rota-arac',
      type: 'line',
      source: 'rota',
      filter: ['==', ['get', 'arac'], true],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': renk('--metin-soluk', '#8a9a97'), 'line-width': 2, 'line-dasharray': [1, 2.5] },
    },
    {
      id: 'rota-yuruyus-kenar',
      type: 'line',
      source: 'rota',
      filter: ['==', ['get', 'arac'], false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': renk('--zemin', '#000000'), 'line-width': 7 },
    },
    {
      id: 'rota-yuruyus',
      type: 'line',
      source: 'rota',
      filter: ['==', ['get', 'arac'], false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': renk('--vurgu', '#ffbf3c'), 'line-width': 4 },
    },
  ];

  const harita = new ml.Map({
    container: kap,
    style: altlik
      ? altligaEkle(altlik, rotaKaynagi, rotaKatmanlari)
      : {
          version: 8,
          sources: {
            sokak: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: ALTLIK_ATFI },
            ...rotaKaynagi,
          },
          layers: [
            { id: 'zemin', type: 'background', paint: { 'background-color': renk('--harita-kara', '#f5f2ee') } },
            ...sokakKatmanlari(renk),
            ...rotaKatmanlari,
          ],
        },
    bounds: kutu(duraklar),
    fitBoundsOptions: { padding: 48, maxZoom: 16 },
    maxZoom: 18,
    attributionControl: false,
    locale: {
      'NavigationControl.ZoomIn': 'Yakınlaştır',
      'NavigationControl.ZoomOut': 'Uzaklaştır',
      'NavigationControl.ResetBearing': 'Kuzeye çevir',
    },
  });
  harita.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
  harita.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');

  // Atıf metni (i) düğmesinin arkasında kapalı başlar; harita alanını kaplamasın.
  harita.on('load', () => kap.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));

  const isaretler = new Map<string, HTMLElement>();
  const markerlar = duraklar.map((d, i) => {
    const el = document.createElement('div');
    el.className = 'rota-isaret';
    // Görsel daire iç öğede: dokunma hedefi kabın tamamı (44x44) olur.
    const daire = document.createElement('span');
    daire.className = 'rota-isaret__daire';
    daire.textContent = String(i + 1);
    el.append(daire);
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--sira', String(i));
    // Dokunulan durak listede seçilir (liste aynı işin erişilebilir yoludur).
    el.addEventListener('click', (olay) => {
      olay.stopPropagation();
      onSec(d.id);
    });
    isaretler.set(d.id, el);
    return new ml.Marker({ element: el }).setLngLat([d.lng, d.lat]).addTo(harita);
  });

  // Ekranda üst üste binen duraklar tek bir grup etiketinde birleşir ("10-15");
  // gruba dokununca harita yakınlaşır ve duraklar ayrılır. Gruplar etiketleri de
  // çakışmayacak şekilde birleşir (kumele.ts). Her yakınlaşmada yeniden hesaplanır.
  const YAKIN = 56;
  let gruplar: maplibregl.Marker[] = [];
  function yerlestir() {
    gruplar.forEach((m) => m.remove());
    gruplar = [];
    const ekran = duraklar.map((d) => harita.project([d.lng, d.lat]));
    for (const uyeler of ekrandaKumele(ekran, YAKIN)) {
      uyeler.forEach((u) => (isaretler.get(duraklar[u]!.id)!.style.display = uyeler.length > 1 ? 'none' : ''));
      if (uyeler.length < 2) continue;
      const el = document.createElement('div');
      el.className = 'rota-isaret rota-isaret--grup';
      const daire = document.createElement('span');
      daire.className = 'rota-isaret__daire';
      daire.textContent = grupEtiketi(uyeler);
      el.append(daire);
      el.setAttribute('aria-hidden', 'true');
      const uyeDuraklar = uyeler.map((u) => duraklar[u]!);
      el.addEventListener('click', (olay) => {
        olay.stopPropagation();
        harita.fitBounds(kutu(uyeDuraklar), { padding: 80, maxZoom: 19 });
      });
      const lng = uyeDuraklar.reduce((t, d) => t + d.lng, 0) / uyeDuraklar.length;
      const lat = uyeDuraklar.reduce((t, d) => t + d.lat, 0) / uyeDuraklar.length;
      gruplar.push(new ml.Marker({ element: el }).setLngLat([lng, lat]).addTo(harita));
    }
  }
  harita.on('load', yerlestir);
  harita.on('zoomend', yerlestir);

  // Rotadan kopmasın: uzaklaştırma rotanın çevresiyle sınırlı (bütün şehre
  // açılıp rota kaybolmasın); kaydırma da rotanın etrafında kalır.
  const rotaKutusu = kutu(duraklar);
  harita.once('load', () => {
    const kamera = harita.cameraForBounds(rotaKutusu, { padding: 48 });
    if (kamera?.zoom != null) harita.setMinZoom(Math.max(3, Math.min(kamera.zoom - 2, 15)));
    const pay = Math.max(0.03, (rotaKutusu[1][0] - rotaKutusu[0][0]) * 1.5, (rotaKutusu[1][1] - rotaKutusu[0][1]) * 1.5);
    harita.setMaxBounds([
      [rotaKutusu[0][0] - pay, rotaKutusu[0][1] - pay],
      [rotaKutusu[1][0] + pay, rotaKutusu[1][1] + pay],
    ]);
  });

  // "Rotayı göster": nereye kaydırılırsa kaydırılsın tek dokunuşla bütün rota.
  const geriDon = document.createElement('button');
  geriDon.type = 'button';
  geriDon.className = 'harita-geri-don';
  geriDon.textContent = 'Rotayı göster';
  geriDon.addEventListener('click', () => harita.fitBounds(rotaKutusu, { padding: 48, maxZoom: 16 }));
  kap.append(geriDon);

  return {
    guncelle({ gorulen, secili, odak }) {
      for (const [id, el] of isaretler) {
        el.classList.toggle('rota-isaret--goruldu', gorulen.has(id));
        el.classList.toggle('rota-isaret--secili', id === secili);
        // Seçili durak öne gelsin (yakın duraklar üst üste binince okunur).
        el.style.zIndex = id === secili ? '3' : gorulen.has(id) ? '1' : '2';
      }
      if (odak && odak.length > 0) {
        if (odak.length === 1) harita.easeTo({ center: [odak[0]!.lng, odak[0]!.lat], zoom: Math.max(harita.getZoom(), 18) });
        else harita.fitBounds(kutu(odak), { padding: 56, maxZoom: 16.5 });
      }
    },
    temizle() {
      geriDon.remove();
      gruplar.forEach((m) => m.remove());
      markerlar.forEach((m) => m.remove());
      harita.remove();
    },
  };
}
