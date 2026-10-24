/**
 * Harita listesindeki tek eser satırı — zengin detay görünümü.
 *
 * Bilgi Notu'nun saydığı veri alanları burada gösterilir:
 *  - eser adı + İngilizce adı (`adEn`),
 *  - tür, ilçe, bani, yapım yılı,
 *  - Türkçe ve İngilizce tarihçe (`tarihce`, `tarihceEn`),
 *  - fotoğraf galerisi (`fotograflar`) ve sergi bilgileri (`sergiler`).
 *
 * Tarihçe 10–12 yaş için kısa bir özet olarak basılır (ilk iki cümle, en fazla
 * ~260 karakter); tam Türkçe metin "Tarihçeyi oku" altında katlanır, İngilizce
 * metin ayrı `details` içinde kalır.
 *
 * Erişilebilirlik (WCAG 2.2 AA):
 *  - Her `<img>` etiketlidir; metin `altMetin` alanından gelir (SC 1.1.1).
 *    Alan boş gelirse görselin bağlamını taşıyan bir metin üretilir; hiçbir
 *    görsel etiketsiz kalmaz.
 *  - İngilizce metinler `lang="en"` ile işaretlenir (SC 3.1.2).
 *  - Anlam yalnızca renkle verilmez: her rozetin yanında metni vardır.
 */
import type { Eser, EserFotograf } from '@shared/types';
import { cocukOzeti } from '../arsiv/ozet';

/** Boş/eksik metni `null`'a indirger; boş dize arayüzde yer kaplamaz. */
function doluMetin(deger: string | null | undefined): string | null {
  if (typeof deger !== 'string') return null;
  const temiz = deger.trim();
  return temiz === '' ? null : temiz;
}

/** "Cami · Osmangazi · Banisi: … · Yapım yılı: …" */
function kunyeParcalari(eser: Eser): string[] {
  const parcalar: string[] = [];
  const tur = doluMetin(eser.tur);
  if (tur) parcalar.push(tur);

  const ilce = doluMetin(eser.ilce);
  if (ilce) parcalar.push(ilce);

  const bani = doluMetin(eser.bani);
  if (bani) parcalar.push(`Banisi: ${bani}`);

  const yapimYili = doluMetin(eser.yapimYili);
  if (yapimYili) parcalar.push(`Yapım yılı: ${yapimYili}`);

  return parcalar;
}

/** Fotoğrafın `alt` metni. Sözleşmede zorunlu; boş gelirse bağlam metni üretilir. */
export function fotografAltMetni(foto: EserFotograf, eserAdi: string): string {
  const alt = doluMetin(foto.altMetin);
  return alt ?? `${eserAdi} — arşiv fotoğrafı`;
}

function fotografKunyesi(foto: EserFotograf): string | null {
  const parcalar = [doluMetin(foto.kaynak), doluMetin(foto.lisans)].filter(
    (p): p is string => p !== null,
  );
  return parcalar.length > 0 ? parcalar.join(' · ') : null;
}

function siraliFotograflar(fotograflar: EserFotograf[]): EserFotograf[] {
  return [...fotograflar].sort((a, b) => a.sira - b.sira);
}

export interface EserSatiriProps {
  eser: Eser;
  /** Eser Kâşif Defteri'nde açıldı mı? */
  defterinde: boolean;
}

export function EserSatiri({ eser, defterinde }: EserSatiriProps) {
  const kunye = kunyeParcalari(eser);
  const adEn = doluMetin(eser.adEn);
  const tarihce = doluMetin(eser.tarihce);
  const tarihceEn = doluMetin(eser.tarihceEn);
  // Galeri/sergi alanları eksik gelirse satır yine çizilebilsin: tek bir bozuk
  // kayıt tüm sayfayı hata sınırına düşürmemeli.
  const fotograflar = siraliFotograflar(Array.isArray(eser.fotograflar) ? eser.fotograflar : []);
  const sergiler = Array.isArray(eser.sergiler) ? eser.sergiler : [];

  // Tarihçenin çocuk özeti; tam metin yalnızca özetten uzunsa katlanır.
  const tarihceOzeti = tarihce ? cocukOzeti([tarihce]).ozet : '';
  const tarihceKatlanir = tarihce !== null && tarihceOzeti.length > 0 && tarihce.length > tarihceOzeti.length;

  return (
    <li className="kart kart--duz harita-eser">
      <div className="satir harita-eser__baslik-satiri">
        <div className="harita-eser__kimlik">
          <strong className="harita-eser__ad">{eser.ad}</strong>
          {adEn ? (
            <span className="harita-eser__ad-en" lang="en">
              {adEn}
            </span>
          ) : null}
          {kunye.length > 0 ? (
            <p className="harita-eser__kunye metin-soluk">{kunye.join(' · ')}</p>
          ) : null}
        </div>
        {defterinde ? (
          <span className="rozet">
            <span aria-hidden="true">✓</span> defterinde
          </span>
        ) : null}
      </div>

      {/* --- Tarihçe: kısa çocuk özeti, tam metin katlanmış ------------------ */}
      {tarihceOzeti ? <p className="harita-eser__tarihce">{tarihceOzeti}</p> : null}
      {tarihce && tarihceKatlanir ? (
        <details className="harita-eser__katlanmis">
          <summary>Tarihçeyi oku</summary>
          <p className="harita-eser__tarihce">{tarihce}</p>
        </details>
      ) : null}

      {tarihceEn ? (
        <details className="harita-eser__katlanmis">
          <summary lang="en">English</summary>
          <p className="harita-eser__tarihce" lang="en">
            {tarihceEn}
          </p>
        </details>
      ) : null}

      {/* --- Fotoğraf galerisi --------------------------------------------- */}
      {fotograflar.length > 0 ? (
        <div className="harita-eser__bolum">
          <p className="harita-eser__alt-baslik">Fotoğraflar</p>
          <ul className="harita-eser__fotograflar" aria-label={`${eser.ad} fotoğraf galerisi`}>
            {fotograflar.map((foto) => {
              const kunyeMetni = fotografKunyesi(foto);
              return (
                <li key={foto.id} className="harita-eser__foto-kare">
                  <img
                    className="harita-eser__foto"
                    src={foto.url}
                    alt={fotografAltMetni(foto, eser.ad)}
                    loading="lazy"
                  />
                  {kunyeMetni ? (
                    <span className="harita-eser__foto-kunye">{kunyeMetni}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* --- Sergi bilgileri ----------------------------------------------- */}
      {sergiler.length > 0 ? (
        <div className="harita-eser__bolum">
          <p className="harita-eser__alt-baslik">Sergiler</p>
          <ul className="harita-eser__sergiler" aria-label={`${eser.ad} sergileri`}>
            {sergiler.map((sergi) => (
              <li key={sergi.id} className="rozet rozet--sergi">
                <span className="harita-eser__sergi-ad">{sergi.ad}</span>
                {doluMetin(sergi.tarih) ? <span>· {doluMetin(sergi.tarih)}</span> : null}
                {doluMetin(sergi.mekan) ? <span>· {doluMetin(sergi.mekan)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {eser.gelirDagilimiDurumu === 'belge-bulunamadi' ? (
        <p className="harita-eser__uyari metin-soluk">Gelir dağılımı belgelenememiştir.</p>
      ) : null}
    </li>
  );
}
