/**
 * ÇEVRİMDIŞI PAKET — internet varken içeriği sessizce ısıtır.
 *
 * Sorun (saha geri bildirimi): PWA kabuğu çevrimdışı açılıyor ama (1) Keşfet/
 * Bugün kutucuklarının kapak fotoğrafı, (2) ders verisi (`/api/ders/:id`) ve
 * (3) harita filtre seçenekleri yalnızca daha önce açılmışsa önbellekteydi.
 *
 * Çözüm: uygulama açıldıktan birkaç saniye sonra, internet varken ve daha önce
 * yapılmamışsa (12 saatte bir):
 *  - liste uçları (`yol`, `eserler`, `filtreler`, `sehirler`, `uniteler`,
 *    `kulliyeler`) bir kez çekilir,
 *  - her dersin verisi (`/api/ders/:id`) ve eser başına `k.webp` + `1.webp`
 *    kapak fotoğrafı çekilir.
 * Service worker bu istekleri kendi çalışma zamanı önbelleğine yazar
 * (`vite.config.ts` → NetworkFirst/CacheFirst); ağ kesilince buradan okunur.
 *
 * Gizlilik: yalnız yayın içeriği istenir; kullanıcı verisi gönderilmez.
 * Sessiz çalışır: hata olursa kullanıcıya gösterilmez, uygulama akışı durmaz.
 */
import { api } from './api';

const HAZIR_ANAHTAR = 'kokavi-cevrimdisi-v1';
const GECERLILIK_MS = 12 * 60 * 60 * 1000;
const ESZAMANLI = 4;

let calisiyor = false;

function sonHazirZaman(): number {
  try {
    const ham = localStorage.getItem(HAZIR_ANAHTAR);
    return ham ? Number(ham) || 0 : 0;
  } catch {
    return 0;
  }
}

function hazirYaz(): void {
  try {
    localStorage.setItem(HAZIR_ANAHTAR, String(Date.now()));
  } catch {
    /* depolama kapalı: bir sonraki açılışta yeniden denenir */
  }
}

/** Paket son 12 saat içinde hazırlandı mı? */
export function cevrimdisiHazirMi(): boolean {
  return Date.now() - sonHazirZaman() < GECERLILIK_MS;
}

/** Sınırlı eşzamanlılıkla iş listesi; tek öğenin hatası diğerlerini durdurmaz. */
async function havuz(isler: readonly (() => Promise<unknown>)[], eszamanli = ESZAMANLI): Promise<void> {
  let siradaki = 0;
  const isci = async (): Promise<void> => {
    for (;;) {
      const i = siradaki++;
      if (i >= isler.length) return;
      try {
        await isler[i]!();
      } catch {
        /* tek öğe atlanır */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(eszamanli, isler.length) }, isci));
}

/**
 * Çevrimdışı paketi hazırlar. Aynı anda tek kez çalışır; uygun değilse `false`.
 * Dönen değer yalnız test/ölçüm içindir.
 */
export async function cevrimdisiHazirla(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!navigator.onLine || calisiyor || cevrimdisiHazirMi()) return false;
  // Service worker sayfayı kontrol etmiyorsa istekler önbelleğe YAZILMAZ:
  // bayat "hazır" damgası bırakmamak için hiç başlamayız (ilk kurulum yarışı).
  const sw = (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
  if (sw && !sw.controller) return false;
  // Tasarruf modu (Save-Data): kullanıcının veri tasarrufuna saygı.
  const baglanti = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (baglanti?.saveData) return false;

  calisiyor = true;
  try {
    const [yol] = await Promise.all([
      api.yolIskeleti(),
      api.eserler(),
      api.filtreler(),
      api.sehirler(),
      api.uniteler(),
      api.kulliyeler(),
    ]);
    const dersler = (yol?.sehirler ?? []).flatMap((sehir) =>
      sehir.uniteler.flatMap((unite) => unite.dersler),
    );
    const eserIdler = [...new Set(dersler.map((ders) => ders.eserId))];

    const isler: (() => Promise<unknown>)[] = [];
    for (const ders of dersler) {
      // Uç adı `/api/dersler/:id` (bkz. src/lib/api.ts → api.ders).
      isler.push(() => fetch(`/api/dersler/${encodeURIComponent(ders.dersId)}`));
    }
    for (const eserId of eserIdler) {
      isler.push(() => fetch(`/gorseller/${encodeURIComponent(eserId)}/k.webp`));
      isler.push(() => fetch(`/gorseller/${encodeURIComponent(eserId)}/1.webp`));
    }
    await havuz(isler);
    hazirYaz();
    return true;
  } catch {
    // Ağ kesildiyse ya da uç hata verdi: sessizce vazgeç, sonraki açılış dener.
    return false;
  } finally {
    calisiyor = false;
  }
}
