/**
 * İsteğe bağlı takma adlı sınıf katılımı: sunucunun verdiği öğrenci kimliği
 * yalnızca bu cihazda saklanır (`kokavi.sinif-ogrencisi.v1`).
 *
 * Gizlilik: gerçek ad, cihaz kimliği, IP gönderilmez. Kimlik rastgeledir ve
 * yalnızca o sınıf kodu için geçerlidir; sınıftan çıkınca sunucudan silinir.
 * Depolama kapalı / bozuk olabilir (gizli pencere): her erişim try/catch içinde.
 */
const ANAHTAR = 'kokavi.sinif-ogrencisi.v1';

export interface SinifOgrencisi {
  kod: string;
  ogrenciId: string;
  takmaAd: string;
}

export function sinifOgrencisiOku(kod?: string | null): SinifOgrencisi | null {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return null;
    const k = JSON.parse(ham) as Partial<SinifOgrencisi>;
    if (typeof k.kod !== 'string' || typeof k.ogrenciId !== 'string' || typeof k.takmaAd !== 'string') return null;
    if (kod && k.kod !== kod) return null;
    return { kod: k.kod, ogrenciId: k.ogrenciId, takmaAd: k.takmaAd };
  } catch {
    return null;
  }
}

export function sinifOgrencisiYaz(o: SinifOgrencisi | null): void {
  try {
    if (o) localStorage.setItem(ANAHTAR, JSON.stringify(o));
    else localStorage.removeItem(ANAHTAR);
  } catch {
    /* depolama kapalı: takma ad yalnızca bu oturumda geçerli */
  }
}

/** Sınıftan çıkış: sunucudaki takma ad ve ilerlemesi silinir, cihazdan da kalkar. */
export async function sinifOgrencisiniSil(): Promise<void> {
  const o = sinifOgrencisiOku();
  sinifOgrencisiYaz(null);
  if (!o) return;
  try {
    await fetch(`/api/sinif/${encodeURIComponent(o.kod)}/ogrenci/${encodeURIComponent(o.ogrenciId)}`, {
      method: 'DELETE',
    });
  } catch {
    /* çevrimdışı: cihazdan silindi; sunucu kaydı kimliksiz kalır */
  }
}

/** Takma ad kuralı (sunucuyla aynı): 2-20 karakter; harf, rakam, boşluk, . _ - */
export function takmaAdGecerliMi(ad: string): boolean {
  const t = ad.normalize('NFC').replace(/\s+/g, ' ').trim();
  return t.length >= 2 && t.length <= 20 && /^[\p{L}\p{N} ._-]+$/u.test(t);
}
