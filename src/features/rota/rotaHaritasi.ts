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
    el.textContent = String(i + 1);
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
  // gruba dokununca harita yakınlaşır ve duraklar ayrılır. Her yakınlaşmada yeniden hesaplanır.
  const YAKIN = 50;
  let gruplar: maplibregl.Marker[] = [];
  function yerlestir() {
    gruplar.forEach((m) => m.remove());
    gruplar = [];
    const ekran = duraklar.map((d) => harita.project([d.lng, d.lat]));
    const atandi = new Array<boolean>(duraklar.length).fill(false);
    for (let i = 0; i < duraklar.length; i++) {
      if (atandi[i]) continue;
      const uyeler = [i];
      atandi[i] = true;
      for (let j = i + 1; j < duraklar.length; j++) {
        if (atandi[j]) continue;
        // Yalnızca grubun ilk durağına uzaklık: zincirleme (bütün rotanın tek gruba düşmesi) olmaz.
        if (Math.hypot(ekran[i]!.x - ekran[j]!.x, ekran[i]!.y - ekran[j]!.y) < YAKIN) {
          uyeler.push(j);
          atandi[j] = true;
        }
      }
      uyeler.forEach((u) => (isaretler.get(duraklar[u]!.id)!.style.display = uyeler.length > 1 ? 'none' : ''));
      if (uyeler.length < 2) continue;
      const sirali = [...uyeler].sort((a, b) => a - b);
      const ardisik = sirali.every((n, k) => k === 0 || n === sirali[k - 1]! + 1);
      const el = document.createElement('div');
      el.className = 'rota-isaret rota-isaret--grup';
      el.textContent = ardisik
        ? `${sirali[0]! + 1}-${sirali[sirali.length - 1]! + 1}`
        : `${sirali.length} durak`;
      el.setAttribute('aria-hidden', 'true');
      const uyeDuraklar = sirali.map((u) => duraklar[u]!);
      el.addEventListener('click', (olay) => {
        olay.stopPropagation();
        harita.fitBounds(kutu(uyeDuraklar), { padding: 80, maxZoom: 19 });
      });
      const merkez = kutu(uyeDuraklar);
      gruplar.push(
        new ml.Marker({ element: el })
          .setLngLat([(merkez[0][0] + merkez[1][0]) / 2, (merkez[0][1] + merkez[1][1]) / 2])
          .addTo(harita),
      );
    }
  }
  harita.on('load', yerlestir);
  harita.on('zoomend', yerlestir);

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
      gruplar.forEach((m) => m.remove());
      markerlar.forEach((m) => m.remove());
      harita.remove();
    },
  };
}
