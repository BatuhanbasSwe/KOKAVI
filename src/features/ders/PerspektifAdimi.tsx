/**
 * 03 · PERSPEKTİF — "Tek karar anı".
 *
 * PDF: "Tek karar anı: seçim yapılır, sonucu gösterilir."
 *
 * DİL KURALI: Yanlış seçimde suçlayıcı ifade kullanılmaz. Ekran kırmızıya
 * dönmez; "Gerçekte şöyleydi" tonuyla bilgi verilir ve akış devam eder.
 */
import { useState } from 'react';
import { DinleDugmesi } from './DinleDugmesi';
import type { PerspektifAdimi as PerspektifVerisi } from '@shared/types';

interface Props {
  perspektif: PerspektifVerisi;
  onDevam: () => void;
}

export function PerspektifAdimi({ perspektif, onDevam }: Props) {
  // Seçim değiştirilebilir: çocuk diğer sonuçları da görebilir.
  const [secili, setSecili] = useState<number | null>(null);
  const secilen = secili !== null ? perspektif.secenekler[secili] : null;

  return (
    <div className="yigin">
      <h3>{perspektif.baslik}</h3>

      <ol className="ders-konusma" aria-label="Konuşma">
        {perspektif.diyalog.map((satir, i) => (
          <li
            key={`${satir.kim}-${i}`}
            className={`ders-konusma__satir${satir.ben ? ' ders-konusma__satir--ben' : ''}`}
          >
            <p className="ders-konusma__kim">{satir.ben ? `${satir.kim} (sen)` : satir.kim}</p>
            <p className="ders-konusma__metin">{satir.metin}</p>
          </li>
        ))}
      </ol>

      <div className="ders-soru-kutusu">
        <h3 className="ders-soru">{perspektif.soru}</h3>
        <DinleDugmesi
          metin={[...perspektif.diyalog.map((d) => `${d.kim}: ${d.metin}`), perspektif.soru].join('. ')}
        />
      </div>

      <div className="yigin ders-secenekler" role="group" aria-label="Karar seçenekleri">
        {perspektif.secenekler.map((secenek, i) => {
          const seciliMi = secili === i;
          const sinif = seciliMi
            ? `secenek ${secenek.dogruMu ? 'secenek--dogru' : 'secenek--secili'}`
            : 'secenek';

          return (
            <button
              key={secenek.metin}
              type="button"
              className={sinif}
              aria-pressed={seciliMi}
              onClick={() => setSecili(i)}
            >
              <span className="ders-secenek-isaret" aria-hidden="true">
                {seciliMi ? (secenek.dogruMu ? '✓' : '!') : ''}
              </span>
              <span>{secenek.metin}</span>
              {seciliMi ? (
                <span className="ders-secenek-rozet">
                  {secenek.dogruMu ? 'doğru karar' : 'seçimin'}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {secilen ? (
        <div className={`ders-eylem ders-eylem--${secilen.dogruMu ? 'dogru' : 'bilgi'}`}>
          {/*
            Doğru seçim: yeşil + ✓ + "Doğru karar!".
            Diğer seçim: bilgilendirici ton + ! + "Gerçekte şöyleydi:" — kırmızı
            uyarı yerine öğretici kutu kullanılır.
          */}
          <div
            className={`bildirim ders-perspektif-sonuc ${
              secilen.dogruMu ? 'bildirim--basari' : 'bildirim--bilgi'
            }`}
            role="status"
          >
            <p className="ders-perspektif-sonuc__baslik">
              <span className="ders-isaret" aria-hidden="true">
                {secilen.dogruMu ? '✓' : '!'}
              </span>{' '}
              {secilen.dogruMu ? 'Doğru karar!' : 'Gerçekte şöyleydi:'}
            </p>
            <p className="ders-perspektif-sonuc__metin">{secilen.sonuc}</p>
          </div>
          <button type="button" className="dugme dugme--genis" onClick={onDevam}>
            Devam
          </button>
        </div>
      ) : null}
    </div>
  );
}
