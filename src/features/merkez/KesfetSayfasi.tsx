/**
 * Keşfet: üç kapı — harita (nerede?), keşif rotası (aile gezisi) ve
 * Meraklısına arşivi (büyükler için kaynak).
 *
 * Ürün kararı (26 Ekim): çocuk için Keşfet "ne işe yarar?" sorusunu yanıtlamaz;
 * onu ders anlatır. Bu yüzden zaman tüneli ve "hâlâ yaşıyor" kartları ana
 * merkezden kaldırıldı (bilgi ders içi rozetlerde duruyor).
 * Karışık boyutlu kutucuklar (eşit üçlü kart yok); fotoğraflar süs.
 */
import { IkonHarita, IkonOk, IkonYol } from '../../app/Ikonlar';
import { Foto, Kutu } from '../bugun/Mozaik';
import { ESERLER } from '../gunun-eseri/oyun';

const SEHIR_SAYISI = new Set(ESERLER.map((e) => e.sehir)).size;

export function KesfetSayfasi() {
  let sira = 0;
  return (
    <div className="bugun">
      <header>
        <h1 className="bugun__baslik">Keşfet</h1>
        <p className="bugun__soz">
          Eserlerin Türkiye'nin neresinde olduğunu haritada gör; bir ilçeyi yürüyerek gez.
        </p>
      </header>

      <ul className="mozaik" aria-label="Keşif alanları">
        <Kutu href="#/harita" sira={sira++} sinif="mozaik__oge--buyuk mozaik__oge--foto">
          <Foto className="mozaik__foto" src="/gorseller/bursa-irgandi-koprusu-kapali-kopru/k.webp" />
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__simge" aria-hidden="true">
              <IkonHarita boyut={24} />
            </span>
            <span className="mozaik__ust">
              {SEHIR_SAYISI} şehir · {ESERLER.length} eser
            </span>
            <span className="mozaik__eser">Harita</span>
            <span className="mozaik__eylem">
              Nerede olduğunu gör
              <IkonOk boyut={18} />
            </span>
          </span>
        </Kutu>

        <Kutu href="#/rota" sira={sira++} sinif="mozaik__oge--foto">
          <Foto className="mozaik__foto" src="/gorseller/bursa-yesilcami-yesil-cami/k.webp" />
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__simge" aria-hidden="true">
              <IkonYol boyut={22} />
            </span>
            <span className="mozaik__ad">Keşif rotası</span>
            <span className="mozaik__alt">Ailenle bir ilçeyi yürüyerek gez</span>
          </span>
        </Kutu>

        <Kutu href="#/arsiv" sira={sira++}>
          <Foto className="mozaik__foto" src="/gorseller/bursa-ulucami/k.webp" />
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__ad">Meraklısına arşivi</span>
            <span className="mozaik__alt">Büyükler için · yüzlerce eser</span>
          </span>
        </Kutu>
      </ul>
    </div>
  );
}
