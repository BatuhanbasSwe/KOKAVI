/**
 * Ders sonu — kutlama ekranı.
 *
 * PDF: "Ödül puan değil, bilgi" ve "Kâşif Defteri dolar". Bu yüzden ekran
 * elmas/seri yanında asıl kazanımı söyler: deftere eklenen eser ve ilk
 * tekrarın ne zaman geleceği (aralıklı tekrar görünür olsun).
 *
 * Erişilebilirlik: başlık açılışta odak alır; kutlama hareketi
 * "hareketi azalt" ayarında kapanır (tokens.css).
 */
import { useEffect, useRef } from 'react';
import type { EserFotograf } from '@shared/types';
import { IkonDefter, IkonElmas, IkonAlev, IkonTekrar, IkonTur } from '../../app/Ikonlar';
import { kucukKapak } from './EserGalerisi';
import { Konfeti } from '../../app/Konfeti';

const YILDIZ_UST =
  '60,6 75.8,21.8 98.2,21.8 98.2,44.2 114,60 98.2,75.8 98.2,98.2 75.8,98.2 60,114 44.2,98.2 21.8,98.2 21.8,75.8 6,60 21.8,44.2 21.8,21.8 44.2,21.8';
const YILDIZ_ALT =
  '60,12 75.8,27.8 98.2,27.8 98.2,50.2 114,66 98.2,81.8 98.2,104.2 75.8,104.2 60,120 44.2,104.2 21.8,104.2 21.8,81.8 6,66 21.8,50.2 21.8,27.8 44.2,27.8';
const YILDIZ_IC =
  '60,26 70,36 84,36 84,50 94,60 84,70 84,84 70,84 60,94 50,84 36,84 36,70 26,60 36,50 36,36 50,36';

interface Props {
  eserAdi: string;
  eserTur: string | null;
  eserSehir: string | null;
  kazanilanElmas: number;
  seriGun: number;
  tekrarSonucMetni: string | null;
  onDevam: () => void;
  /** Eserin kapak fotoğrafı; varsa defter kartında "pul" gibi görünür. */
  kapak?: EserFotograf | null;
}

export function DersSonu({
  eserAdi,
  eserTur,
  eserSehir,
  kapak = null,
  kazanilanElmas,
  seriGun,
  tekrarSonucMetni,
  onDevam,
}: Props) {
  const baslik = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    baslik.current?.focus();
  }, []);

  const kisaAd = eserAdi.split(' (')[0];

  return (
    <div className="ders-sonu">
      <Konfeti />
      <svg
        className="ders-sonu__yildiz"
        width="160"
        height="164"
        viewBox="0 0 120 124"
        aria-hidden="true"
        focusable="false"
      >
        <polygon points={YILDIZ_ALT} fill="var(--odul-golge)" />
        <polygon points={YILDIZ_UST} fill="var(--odul)" />
        <polygon points={YILDIZ_IC} fill="var(--vurgu)" />
        <path
          d="M48 60l8 8 16-16"
          fill="none"
          stroke="var(--vurgu-metin)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="ders-sonu__baslik">
        <h1 ref={baslik} tabIndex={-1}>
          Ders tamam!
        </h1>
        <p className="metin-ikincil">
          {kisaAd} artık senin defterinde. Vakfın parasını nereden kazandığını biliyorsun.
        </p>
      </div>

      <ul className="ders-sonu__kazanclar" aria-label="Kazandıkların">
        <li className="ders-sonu__kazanc ders-sonu__kazanc--elmas">
          <span className="ders-sonu__kazanc-ust">Elmas</span>
          <span className="ders-sonu__kazanc-deger">
            <IkonElmas boyut={22} />
            {kazanilanElmas > 0 ? `+${kazanilanElmas}` : '0'}
          </span>
        </li>
        <li className="ders-sonu__kazanc ders-sonu__kazanc--seri">
          <span className="ders-sonu__kazanc-ust">Seri</span>
          <span className="ders-sonu__kazanc-deger">
            <IkonAlev boyut={22} />
            {seriGun} gün
          </span>
        </li>
        <li className="ders-sonu__kazanc ders-sonu__kazanc--defter">
          <span className="ders-sonu__kazanc-ust">Defter</span>
          <span className="ders-sonu__kazanc-deger">
            <IkonDefter boyut={22} />
            +1
          </span>
        </li>
      </ul>

      <div className="ders-sonu__defter">
        {kapak ? (
          <img
            className="ders-sonu__pul"
            src={kucukKapak(kapak.url)}
            alt={kapak.altMetin}
            width={96}
            height={72}
          />
        ) : (
          <span className="ders-sonu__defter-ikon" aria-hidden="true">
            <IkonTur tur={eserTur} boyut={30} kalinlik={1.8} />
          </span>
        )}
        <div>
          <p className="ders-sonu__defter-ust">Defterine eklendi</p>
          <p className="ders-sonu__defter-ad">{kisaAd}</p>
          {eserSehir ? <p className="metin-soluk">{eserSehir}</p> : null}
        </div>
      </div>

      <div className="ders-sonu__tekrar" role="status">
        <span className="ders-tekrar-bandi__ikon" aria-hidden="true">
          <IkonTekrar boyut={20} />
        </span>
        <div>
          {tekrarSonucMetni ? <p>{tekrarSonucMetni}</p> : null}
          <p>
            <strong>Unutmamak için:</strong> {kisaAd} bir sonraki dersinde yeniden karşına
            çıkacak. İpucusuz bildikçe ara uzar: 1, 3, 7, 14 gün.
          </p>
        </div>
      </div>

      <div className="ders-eylem">
        <button type="button" className="dugme dugme--genis" onClick={onDevam}>
          Devam et
        </button>
      </div>
    </div>
  );
}
