/**
 * Öğrenme Yolu arka planı: sade "tarihi eserler" dünyası.
 *
 * Krem zemin, kenarlarda soluk cami, han, taş köprü, türbe ve çeşme silüetleri
 * (public/yol-zemin/tarihi.svg). Duraklar taş renkli yolun üstünde durur.
 * Süstür: tıklanamaz, ekran okuyucudan gizli. Koyu ve yüksek kontrast temada gizlenir.
 *
 * body'ye taşınır: animasyonlu ata kutular sabit katmanı kendine bağlamasın.
 */
import { createPortal } from 'react-dom';

export function YolZemini() {
  return createPortal(<div className="yol-zemin yol-zemin--tarihi" aria-hidden="true" />, document.body);
}
