/**
 * "Geçmişten bugüne" fotoğraf karşılaştırması.
 *
 * Tarihî fotoğraf (kamu malı) ile bugünkü fotoğraf üst üste bindirilir; alttaki
 * kaydırıcı eski katmanın ne kadarının görüneceğini belirler. Kaydırıcı gerçek
 * bir <input type="range"> olduğu için klavye ve ekran okuyucuyla kullanılır;
 * iki fotoğrafın metin karşılığı figcaption'da verilir.
 */
import { useId, useState } from 'react';
import {
  GECMIS_FOTOGRAFLARI,
  GECMIS_KAYNAK_METNI,
  type GecmisFotografCifti,
} from './gecmisFotograflari';

function Karsilastirma({ cift }: { cift: GecmisFotografCifti }) {
  const id = useId();
  const [eskiOran, setEskiOran] = useState(50);

  return (
    <figure className="gecmis-karsilastirma">
      <div className="gecmis-karsilastirma__cerceve">
        <img
          className="gecmis-karsilastirma__bugun"
          src={cift.bugun.src}
          alt={cift.bugun.alt}
          loading="lazy"
          decoding="async"
        />
        <div
          className="gecmis-karsilastirma__eski"
          style={{ clipPath: `inset(0 ${100 - eskiOran}% 0 0)` }}
          aria-hidden="true"
        >
          <img src={cift.eski.src} alt="" loading="lazy" decoding="async" />
        </div>
        <span className="gecmis-karsilastirma__etiket gecmis-karsilastirma__etiket--eski" aria-hidden="true">
          {cift.eski.yil}
        </span>
        <span className="gecmis-karsilastirma__etiket gecmis-karsilastirma__etiket--bugun" aria-hidden="true">
          Bugün
        </span>
        <div className="gecmis-karsilastirma__kontrol">
          <label className="sr-only" htmlFor={`${id}-kaydirici`}>
            Eski ve bugünkü fotoğrafı karşılaştır: kaydırıcı
          </label>
          <input
            id={`${id}-kaydirici`}
            className="gecmis-karsilastirma__kaydirici"
            type="range"
            min={0}
            max={100}
            value={eskiOran}
            onChange={(olay) => setEskiOran(Number(olay.target.value))}
            aria-valuetext={`Eski fotoğrafın %${eskiOran}'ı görünüyor`}
          />
        </div>
      </div>
      <figcaption className="gecmis-karsilastirma__alt">
        <span>{cift.eski.alt}</span>
        <span className="kaynak">{cift.eski.yil} · kamu malı (CC0)</span>
      </figcaption>
    </figure>
  );
}

export function GecmisKarsilastirma({ eserId }: { eserId: string | null }) {
  const ciftler = eserId ? GECMIS_FOTOGRAFLARI[eserId] : undefined;
  if (!ciftler || ciftler.length === 0) return null;

  return (
    <section className="kart ders-gecmis" aria-labelledby="gecmis-baslik">
      <p className="etiket">Geçmişten bugüne</p>
      <h4 className="ders-bolum-baslik" id="gecmis-baslik">
        Aynı yer, iki zaman
      </h4>
      <p className="ders-gecmis__giris">
        Kaydırıcıyı sürükle: eski fotoğrafın ne kadarını görmek istediğini seç.
      </p>
      {ciftler.map((cift) => (
        <Karsilastirma key={cift.eski.src} cift={cift} />
      ))}
      <p className="kaynak">{GECMIS_KAYNAK_METNI}</p>
    </section>
  );
}
