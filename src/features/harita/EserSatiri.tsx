/**
 * Harita listesindeki tek eser satırı — SADECE konum bilgisi.
 *
 * Ürün kararı (26 Ekim): harita "bu eser Türkiye'nin neresinde?" sorusunu
 * yanıtlar; eserin ne işe yaradığını ders anlatır. Bu yüzden satırda tarihçe,
 * İngilizce metin, fotoğraf galerisi, sergi listesi YOKTUR; yalnızca ad,
 * tür/ilçe/yıl ve defter durumu gösterilir. Uzun metinler Meraklısına
 * arşivinde (yetişkin görünümü) kalır.
 *
 * Erişilebilirlik: liste haritanın metin eşdeğeridir (SC 1.1.1); durum renkle
 * değil metinle söylenir.
 */
import type { Eser } from '@shared/types';

/** Boş/eksik metni `null`'a indirger; boş dize arayüzde yer kaplamaz. */
function doluMetin(deger: string | null | undefined): string | null {
  if (typeof deger !== 'string') return null;
  const temiz = deger.trim();
  return temiz === '' ? null : temiz;
}

/** "Cami · Osmangazi · Yapım yılı: 1399" */
function kunyeParcalari(eser: Eser): string[] {
  const parcalar: string[] = [];
  for (const metin of [eser.tur, eser.ilce]) {
    const deger = doluMetin(metin);
    if (deger) parcalar.push(deger);
  }
  const yapimYili = doluMetin(eser.yapimYili);
  if (yapimYili) parcalar.push(`Yapım yılı: ${yapimYili}`);
  return parcalar;
}

export interface EserSatiriProps {
  eser: Eser;
  /** Eser Kâşif Defteri'nde açıldı mı? */
  defterinde: boolean;
}

export function EserSatiri({ eser, defterinde }: EserSatiriProps) {
  const kunye = kunyeParcalari(eser);

  return (
    <li className="kart kart--duz harita-eser">
      <div className="satir harita-eser__baslik-satiri">
        <div className="harita-eser__kimlik">
          <strong className="harita-eser__ad">{eser.ad}</strong>
          {kunye.length > 0 ? (
            <p className="harita-eser__kunye metin-soluk">{kunye.join(' · ')}</p>
          ) : null}
          {(eser.kaynaklar ?? []).length > 0 ? (
            <p className="harita-eser__kunye metin-soluk">
              <strong>Kaynak:</strong> {eser.kaynaklar.map((k) => k.kunye).join(' · ')}
            </p>
          ) : null}
        </div>
        {defterinde ? (
          <span className="rozet">
            <span aria-hidden="true">✓</span> defterinde
          </span>
        ) : null}
      </div>
    </li>
  );
}
