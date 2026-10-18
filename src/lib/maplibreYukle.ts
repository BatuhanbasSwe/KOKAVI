/**
 * MapLibre'yi worker adresiyle birlikte yükler.
 *
 * MapLibre 6 worker dosyasını kendi modülünün yanında arar
 * (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`). Vite geliştirmede
 * modülü `.vite/deps` altına taşır, üretimde ise adres dinamik kurulduğu için
 * worker dosyasını pakete koymaz; iki durumda da "Worker failed to load" olur
 * ve harita hiç çizilmez. `?url` worker'ı pakete ekler (çevrimdışı önbelleğe de
 * girer) ve adresini açıkça veririz.
 */
import isciAdresi from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

export async function maplibreYukle(): Promise<typeof import('maplibre-gl')> {
  const maplibre = await import('maplibre-gl');
  maplibre.setWorkerUrl(isciAdresi);
  return maplibre;
}
