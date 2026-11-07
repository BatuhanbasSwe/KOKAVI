/**
 * Dosyadan seçilen fotoğrafı yüklemeye hazırlar: tarayıcıda küçültür ve
 * WebP (desteklenmezse JPEG) data URL'ine çevirir.
 *
 * Neden tarayıcıda: telefon fotoğrafları 4–8 MB; sunucuya ve işlem günlüğüne
 * bu boyutta gitmemeli. Uzun kenar en fazla 1600 px, hedef ~450 KB.
 * Yan etki: EXIF (konum dahil) bilgisi tuvalden geçince silinir.
 */
export const KABUL_EDILEN_GORSEL = 'image/jpeg,image/png,image/webp';
const UZUN_KENAR = 1600;
const HEDEF_KARAKTER = 600_000; // ≈ 450 KB ikili veri

function resimYukle(dosya: File): Promise<HTMLImageElement> {
  return new Promise((coz, reddet) => {
    const url = URL.createObjectURL(dosya);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      coz(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reddet(new Error('Görsel açılamadı. JPEG, PNG veya WebP bir dosya seçin.'));
    };
    img.src = url;
  });
}

export async function gorselHazirla(dosya: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(dosya.type)) {
    throw new Error('Yalnızca JPEG, PNG veya WebP fotoğraf yüklenebilir.');
  }
  if (dosya.size > 25 * 1024 * 1024) throw new Error('Dosya çok büyük (en fazla 25 MB).');
  const img = await resimYukle(dosya);
  let olcek = Math.min(1, UZUN_KENAR / Math.max(img.naturalWidth, img.naturalHeight));
  for (let deneme = 0; deneme < 6; deneme++) {
    const tuval = document.createElement('canvas');
    tuval.width = Math.max(1, Math.round(img.naturalWidth * olcek));
    tuval.height = Math.max(1, Math.round(img.naturalHeight * olcek));
    const ctx = tuval.getContext('2d');
    if (!ctx) throw new Error('Tarayıcı görseli işleyemedi.');
    ctx.drawImage(img, 0, 0, tuval.width, tuval.height);
    for (const kalite of [0.82, 0.7, 0.58]) {
      let veri = tuval.toDataURL('image/webp', kalite);
      if (!veri.startsWith('data:image/webp')) veri = tuval.toDataURL('image/jpeg', kalite);
      if (veri.length <= HEDEF_KARAKTER) return veri;
    }
    olcek *= 0.75;
  }
  throw new Error('Fotoğraf küçültülemedi; daha küçük bir dosya deneyin.');
}
