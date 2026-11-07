/**
 * Erişilebilirlik ayarlarını belgeye uygular.
 *
 * PDF: "Yüksek kontrast teması, renk körlüğü uyumlu palet, ölçeklenebilir yazı
 * boyutu." Şartname 5.1.4: "...yalnızca tasarım üzerinde gösterilmesi yerine
 * mümkün olduğu ölçüde ÇALIŞAN ÜRÜNE entegre edilmesi beklenmektedir."
 *
 * Bu modül ayarları <html> elemanına veri öznitelikleri olarak yazar; tüm
 * tema/palet değişimi CSS jetonları üzerinden gerçekleşir.
 */
import type { Ayarlar } from '@shared/types';

export function ayarlariUygula(ayarlar: Ayarlar): void {
  const kok = document.documentElement;

  kok.dataset.tema = ayarlar.tema;
  kok.dataset.renkKorlugu = ayarlar.renkKorlugu;
  kok.dataset.hareketAzalt = String(ayarlar.hareketAzalt);
  kok.dataset.sessizMod = String(ayarlar.sessizMod);

  // Ölçeklenebilir yazı boyutu (%75 – %200 arası sınırlanır)
  const olcek = Math.min(YAZI_EN_BUYUK, Math.max(YAZI_EN_KUCUK, ayarlar.yaziBoyutu));
  kok.style.setProperty('--yazi-olcek', String(olcek));

  // Tarayıcı arayüz rengi (adres çubuğu) temaya uysun
  const renkler: Record<Ayarlar['tema'], string> = {
    acik: '#f6f4ef',
    koyu: '#000000',
    'yuksek-kontrast': '#050607',
  };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', renkler[ayarlar.tema]);
}

/** Yazı boyutunu adım adım değiştirir (ayarlar ekranındaki A- / A+ düğmeleri). */
export const YAZI_ADIMLARI = [0.75, 0.85, 1, 1.15, 1.3, 1.5, 1.75, 2];
export const YAZI_EN_KUCUK = YAZI_ADIMLARI[0]!;
export const YAZI_EN_BUYUK = YAZI_ADIMLARI[YAZI_ADIMLARI.length - 1]!;

/** Ayarlar ekranındaki hazır seçenekler. */
export const YAZI_HAZIR = [
  { ad: 'Küçük', deger: 0.85 },
  { ad: 'Normal', deger: 1 },
  { ad: 'Büyük', deger: 1.3 },
  { ad: 'Çok büyük', deger: 1.75 },
] as const;

export function yaziBoyutuArtir(mevcut: number): number {
  return YAZI_ADIMLARI.find((a) => a > mevcut + 0.001) ?? YAZI_ADIMLARI[YAZI_ADIMLARI.length - 1]!;
}

export function yaziBoyutuAzalt(mevcut: number): number {
  return [...YAZI_ADIMLARI].reverse().find((a) => a < mevcut - 0.001) ?? YAZI_ADIMLARI[0]!;
}

export const TEMA_ETIKETLERI: Record<Ayarlar['tema'], string> = {
  acik: 'Açık',
  koyu: 'Koyu',
  'yuksek-kontrast': 'Yüksek kontrast',
};

export const RENK_KORLUGU_ETIKETLERI: Record<Ayarlar['renkKorlugu'], string> = {
  yok: 'Yok',
  protanopi: 'Protanopi (kırmızı zayıflığı)',
  döteranopi: 'Döteranopi (yeşil zayıflığı)',
  tritanopi: 'Tritanopi (mavi-sarı zayıflığı)',
};
