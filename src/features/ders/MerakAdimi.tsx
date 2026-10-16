/**
 * 01 · MERAK — "Cezasız tahmin".
 *
 * PDF: "Hiçbir tahmin yanlış sayılmaz." Çocuk önce tahmin eder, sonra köprü
 * metniyle asıl bilgiye geçilir. Bu adımda doğru/yanlış geri bildirimi YOKTUR.
 */
import { useState } from 'react';
import type { MerakAdimi as MerakVerisi } from '@shared/types';
import { DinleDugmesi } from './DinleDugmesi';

interface Props {
  merak: MerakVerisi;
  onDevam: () => void;
}

export function MerakAdimi({ merak, onDevam }: Props) {
  // null = henüz tahmin yok. Seçim değiştirilebilir; hiçbiri "yanlış" değildir.
  const [secili, setSecili] = useState<number | null>(null);

  return (
    <div className="yigin">
      <div className="ders-soru-kutusu">
        <h3 className="ders-soru">{merak.soru}</h3>
        <DinleDugmesi metin={merak.soru} />
      </div>
      <p className="metin-soluk">
        Aklına ilk geleni seç. Burada yanlış cevap yok — sadece tahmin.
      </p>

      <div className="yigin ders-secenekler" role="group" aria-label="Tahmin seçenekleri">
        {merak.secenekler.map((secenek, i) => {
          const seciliMi = secili === i;
          return (
            <button
              key={secenek}
              type="button"
              className="secenek"
              aria-pressed={seciliMi}
              onClick={() => setSecili(i)}
            >
              <span className="ders-secenek-isaret" aria-hidden="true">
                {seciliMi ? '✓' : ''}
              </span>
              <span>{secenek}</span>
              {seciliMi ? <span className="ders-secenek-rozet">tahminin</span> : null}
            </button>
          );
        })}
      </div>

      {secili !== null ? (
        <div className="ders-eylem ders-eylem--bilgi">
          {/* role="status": tahmin kaydı ve köprü metni ekran okuyucuya duyurulur. */}
          <div className="ders-kopru" role="status">
            <p className="ders-kopru__baslangic">
              <span className="ders-isaret" aria-hidden="true">
                ✓
              </span>{' '}
              Güzel tahmin!
            </p>
            <p className="ders-kopru__metin">{merak.kopru}</p>
          </div>
          <button type="button" className="dugme dugme--genis" onClick={onDevam}>
            Devam
          </button>
        </div>
      ) : null}
    </div>
  );
}
