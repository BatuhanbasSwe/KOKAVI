/**
 * Hâlâ yaşayan vakıflar: yüzyıllar önce kurulan ve bugün de yapıldığı işi
 * yapan eserler (cami ibadete açık, hamam çalışıyor, çeşmenin suyu akıyor,
 * handa ticaret sürüyor). Vakıf "geçmiş" değil, süren bir hayır.
 *
 * Her kayıt eserin kaynak metninden birebir alıntıya dayanır
 * (data/yasayan.json, tests/yasayan.test.ts).
 */
import { useState } from 'react';
import { useDurum } from '../../app/DurumSaglayici';
import { IkonOk, IkonTur } from '../../app/Ikonlar';
import yasayan from '../../../data/yasayan.json';
import './merkez.css';

export interface YasayanKaydi {
  eserId: string;
  ad: string;
  aciklama: string;
  alinti: string;
  kaynak: string;
}

export const YASAYANLAR: YasayanKaydi[] = yasayan.eserler;

export function yasayanKaydi(eserId: string | null | undefined): YasayanKaydi | null {
  return (eserId && YASAYANLAR.find((k) => k.eserId === eserId)) || null;
}

function Foto({ eserId, tur }: { eserId: string; tur: string }) {
  const [yok, setYok] = useState(false);
  return (
    <span className="yasayan__foto" aria-hidden="true">
      {yok ? (
        <IkonTur tur={tur} boyut={26} />
      ) : (
        <img src={`/gorseller/${eserId}/k.webp`} alt="" loading="lazy" decoding="async" onError={() => setYok(true)} />
      )}
    </span>
  );
}

export function YasayanSayfasi() {
  const { yol } = useDurum();
  const dersler = new Map(
    (yol?.sehirler ?? []).flatMap((s) =>
      s.uniteler.flatMap((u) => u.dersler.map((d) => [d.eserId, { dersId: d.dersId, tur: d.tur, sehir: s.ad }] as const)),
    ),
  );

  return (
    <div className="yigin yasayan" style={{ gap: 'var(--b-4)' }}>
      <header>
        <h1 style={{ margin: 0 }}>Hâlâ yaşayan vakıflar</h1>
        <p className="metin-ikincil" style={{ margin: 'var(--b-2) 0 0' }}>
          Yüzlerce yıl önce kurulan bu eserler bugün de yapıldıkları işi yapıyor. Vakıf bitmedi; hayır sürüyor.
        </p>
      </header>

      <ul className="yasayan__liste">
        {YASAYANLAR.map((k) => {
          const ders = dersler.get(k.eserId);
          return (
            <li key={k.eserId} className="yasayan__oge">
              <Foto eserId={k.eserId} tur={ders?.tur ?? ''} />
              <div className="yasayan__govde">
                <h2 className="yasayan__ad">{k.ad}</h2>
                {ders ? <p className="yasayan__yer">{ders.sehir} · {ders.tur}</p> : null}
                <p className="yasayan__aciklama">{k.aciklama}</p>
                <details className="yasayan__kaynak">
                  <summary>Kaynağı</summary>
                  <p>
                    “{k.alinti}” <span className="metin-soluk">{k.kaynak}</span>
                  </p>
                </details>
                {ders ? (
                  <a className="yasayan__ders" href={`#/ders/${encodeURIComponent(ders.dersId)}`}>
                    Dersine git <IkonOk boyut={16} />
                    <span className="sr-only">: {k.ad}</span>
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
