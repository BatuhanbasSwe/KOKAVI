/**
 * Keşfet: haritaya, arşive, zaman tüneline ve keşif rotasına açılan merkez.
 * Karışık boyutlu kutucuklar (eşit üçlü kart yok); fotoğraflar süs.
 */
import { IkonHarita, IkonOk, IkonYol } from '../../app/Ikonlar';
import { Foto, Kutu } from '../bugun/Mozaik';
import { ESERLER } from '../gunun-eseri/oyun';

const EN_ESKI = [...ESERLER].sort((a, b) => a.yil - b.yil)[0];
const SEHIR_SAYISI = new Set(ESERLER.map((e) => e.sehir)).size;

export function KesfetSayfasi() {
  let sira = 0;
  return (
    <div className="bugun">
      <header>
        <h1 className="bugun__baslik">Keşfet</h1>
        <p className="bugun__soz">Eserleri haritada, arşivde ve yüzyıllar boyunca gez.</p>
      </header>

      <ul className="mozaik" aria-label="Keşif alanları">
        <Kutu href="#/harita" sira={sira++} sinif="mozaik__oge--buyuk mozaik__oge--duz">
          <span className="mozaik__simge" aria-hidden="true">
            <IkonHarita boyut={24} />
          </span>
          <span className="mozaik__icerik">
            <span className="mozaik__ust">
              {SEHIR_SAYISI} şehir · {ESERLER.length} eser
            </span>
            <span className="mozaik__eser">Harita</span>
            <span className="mozaik__eylem">
              Haritayı aç
              <IkonOk boyut={18} />
            </span>
          </span>
        </Kutu>

        <Kutu href="#/arsiv" sira={sira++}>
          <Foto className="mozaik__foto" src="/gorseller/bursa-ulucami/k.webp" />
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__ad">Meraklısına arşivi</span>
            <span className="mozaik__alt">Yüzlerce vakıf eseri</span>
          </span>
        </Kutu>

        <Kutu href="#/zaman-tuneli" sira={sira++}>
          {EN_ESKI && <Foto className="mozaik__foto" src={`/gorseller/${EN_ESKI.eserId}/k.webp`} />}
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__ad">Zaman tüneli</span>
            <span className="mozaik__alt">
              {EN_ESKI ? `${EN_ESKI.yaklasik ? '~' : ''}${EN_ESKI.yil} yılından bugüne` : 'Yüzyıl yüzyıl'}
            </span>
          </span>
        </Kutu>

        <Kutu href="#/rota" sira={sira++}>
          <span className="mozaik__simge" aria-hidden="true">
            <IkonYol boyut={22} />
          </span>
          <span className="mozaik__ad">Keşif rotası</span>
          <span className="mozaik__alt">Bir ilçedeki eserleri yürüyerek gez</span>
        </Kutu>
      </ul>
    </div>
  );
}
