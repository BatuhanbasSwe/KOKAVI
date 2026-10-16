/**
 * Fotoğraf patikası: bir ünitenin dersleri, eserin kapak fotoğrafıyla yuvarlak
 * madalyonlar hâlinde zikzak bir yol üzerinde.
 *
 * Durum renkle DEĞİL, simge + metinle de verilir: biten = safran kenar + onay,
 * sıradaki = büyük madalyon + ilerleme halkası + "Devam et", kilitli = gri +
 * kilit simgesi. Madalyonlar gerçek <a>; erişilebilir adı "Eser, tür, durum".
 */
import { useState, type CSSProperties } from 'react';
import type { YolUnitesi } from '@shared/types';
import { IkonKilit, IkonTik, IkonTur } from '../../app/Ikonlar';
import { Maskot } from '../../app/Maskot';
import { kisaAd } from './kisaAd';
import './patika.css';

/** Zikzak: duraklar sırayla sola/sağa kayar (px; telefonda CSS ile küçülür). */
const KAYMALAR = [0, -60, -84, -60, 0, 60, 84, 60];

type Durum = 'tamam' | 'aktif' | 'acik' | 'kilitli';

const DURUM_METNI: Record<Durum, string> = {
  tamam: 'tamamlandı',
  aktif: 'sıradaki ders, devam et',
  acik: 'başlayabilirsin',
  kilitli: 'kilitli, önceki üniteyi tamamla',
};

function Madalyon({ eserId, tur }: { eserId: string; tur: string }) {
  const [yok, setYok] = useState(false);
  return (
    <span className="patika__madalyon">
      {yok ? (
        <IkonTur tur={tur} boyut={30} />
      ) : (
        <img src={`/gorseller/${eserId}/k.webp`} alt="" loading="lazy" decoding="async" onError={() => setYok(true)} />
      )}
    </span>
  );
}

export function FotografPatikasi({
  unite,
  sehirAdi,
  guncelDersId,
}: {
  unite: YolUnitesi;
  sehirAdi: string;
  guncelDersId: string | null;
}) {
  const yuzde = unite.toplamSayi ? Math.round((unite.tamamlananSayi / unite.toplamSayi) * 100) : 0;

  return (
    <section
      className={`patika-unite${unite.kilitli ? ' patika-unite--kilitli' : ''}`}
      aria-labelledby={`unite-${unite.uniteId}`}
    >
      <header className="patika-unite__baslik">
        <div className="patika-unite__satir">
          <h3 id={`unite-${unite.uniteId}`}>{unite.ad}</h3>
          <span className="patika-unite__sayac">
            {unite.kilitli ? <IkonKilit boyut={16} /> : null}
            {unite.tamamlananSayi}/{unite.toplamSayi}
            <span className="sr-only">{unite.kilitli ? ' (kilitli)' : ' ders tamamlandı'}</span>
          </span>
        </div>
        <div
          className="patika-unite__cubuk"
          role="progressbar"
          aria-valuenow={yuzde}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${sehirAdi} ${unite.ad} ilerlemesi: yüzde ${yuzde}`}
        >
          <span style={{ width: `${yuzde}%` }} />
        </div>
      </header>

      <ol className="patika" aria-label={`${unite.ad} dersleri`}>
        {unite.dersler.map((ders, i) => {
          const durum: Durum = unite.kilitli
            ? 'kilitli'
            : ders.tamamlandi
              ? 'tamam'
              : ders.dersId === guncelDersId
                ? 'aktif'
                : 'acik';
          const ad = kisaAd(ders.eserAdi);
          const etiket = `${ders.eserAdi}, ${ders.tur}, ${DURUM_METNI[durum]}`;
          const kayma = KAYMALAR[i % KAYMALAR.length]!;
          const stil = { '--kayma': `${kayma}px`, '--sira': i } as CSSProperties;

          const gorunum = (
            <>
              <span className="patika__cerceve" aria-hidden="true">
                {durum === 'aktif' && (
                  <svg className="patika__halka" viewBox="0 0 120 120" focusable="false">
                    <circle className="patika__halka-iz" cx="60" cy="60" r="56" />
                    <circle className="patika__halka-cizgi" cx="60" cy="60" r="56" pathLength="100" />
                  </svg>
                )}
                <Madalyon eserId={ders.eserId} tur={ders.tur} />
                {durum === 'tamam' && (
                  <span className="patika__rozet">
                    <IkonTik boyut={16} />
                  </span>
                )}
                {durum === 'kilitli' && (
                  <span className="patika__rozet patika__rozet--kilit">
                    <IkonKilit boyut={14} />
                  </span>
                )}
              </span>
              <span className="patika__ad" aria-hidden="true">
                {ad}
              </span>
              {durum === 'aktif' && (
                <span className="patika__devam" aria-hidden="true">
                  Devam et
                </span>
              )}
            </>
          );

          return (
            <li
              key={ders.dersId}
              className={`patika__durak patika__durak--${durum}${kayma > 0 ? ' patika__durak--sag' : ''}`}
              style={stil}
            >
              {durum === 'kilitli' ? (
                <span className="patika__baglanti" role="img" aria-label={etiket}>
                  {gorunum}
                </span>
              ) : (
                <a className="patika__baglanti" href={`#/ders/${encodeURIComponent(ders.dersId)}`} aria-label={etiket}>
                  {gorunum}
                </a>
              )}
              {durum === 'aktif' && (
                <span className="patika__maskot" aria-hidden="true">
                  <Maskot boyut={48} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
