import { useState } from 'react';
import { LabKabuk, SecimSorusu, Geribildirim } from '../ortak/LabKabuk';

/**
 * V2 · Önce Tahmin, Sonra Gör (ön test etkisi, Richland vd. 2009)
 * Çocuk önce tahmin eder, sonra gerçek veriyi çubuk grafikte görür. Tahmin cezasız.
 * İçerik: bursa-1.json → bursa-yesilcami-yesil-cami-e2 (19. yy. ortası muhasebe defteri).
 */

const GELIRLER = [
  { id: 'bugday', simge: '', ad: 'Köylerden gelen buğday', kurus: 70615 },
  { id: 'meyve', simge: '', ad: 'Kite’deki meyvelerden alınan vergi', kurus: 10125 },
  { id: 'han', simge: '', ad: 'İpek Hanı’ndan gelen para', kurus: 2500 },
] as const;
type GelirId = (typeof GELIRLER)[number]['id'];

const EN_BUYUK = Math.max(...GELIRLER.map((g) => g.kurus));
const sayi = (n: number) => n.toLocaleString('tr-TR');

export function TahminEt({ baslangic = 0 }: { baslangic?: number }) {
  const [adim, setAdim] = useState(baslangic);
  const [tahmin, setTahmin] = useState<GelirId | null>(baslangic > 0 ? 'han' : null);
  const [denenen, setDenenen] = useState<number[]>(baslangic > 2 ? [1] : []);
  const cozuldu = denenen.includes(1);

  return (
    <LabKabuk
      kod="V2"
      ad="Önce Tahmin, Sonra Gör"
      eser="Yeşilcami’nin kasası"
      adim={adim + (cozuldu ? 1 : 0)}
      toplamAdim={3}
      kaynak="Zeynep Akan Yetişir, 'Yeşil Külliye'nin On Dokuzuncu Yüzyıl Ortalarındaki Vaziyeti', Sultan Çelebi Mehmed ve Devri Sempozyumu, Bursa 2022, s. 209 vd."
    >
      {adim === 0 && (
        <section className="yigin" aria-labelledby="tahmin-soru">
          <p className="tahmin__ust">Tahmin zamanı. Yanlış tahmin yok!</p>
          <h2 id="tahmin-soru" className="lab__soru-metni">
            1800’lerde Yeşilcami vakfına en çok para nereden geliyordu?
          </h2>
          <div className="tahmin__kartlar" role="group" aria-label="Tahmin seçenekleri">
            {GELIRLER.map((g) => (
              <button
                key={g.id}
                type="button"
                className="tahmin__kart"
                aria-pressed={tahmin === g.id}
                onClick={() => setTahmin(g.id)}
              >
                <span className="tahmin__simge" aria-hidden="true">
                  {g.simge}
                </span>
                <span>{g.ad}</span>
                {tahmin === g.id && <span className="tahmin__isaret">✓ Tahminim</span>}
              </button>
            ))}
          </div>
          <button type="button" className="dugme dugme--genis" disabled={!tahmin} onClick={() => setAdim(1)}>
            {tahmin ? 'Gerçeği göster' : 'Önce bir tahmin seç'}
          </button>
        </section>
      )}

      {adim >= 1 && (
        <section className="yigin" aria-labelledby="gercek-baslik">
          <h2 id="gercek-baslik" className="lab__soru-metni">
            Hesap defteri ne diyor?
          </h2>
          <ul className="grafik" aria-label="Bir yıllık gelirler, kuruş">
            {GELIRLER.map((g) => (
              <li key={g.id} className="grafik__satir">
                <span className="grafik__ad">
                  <span aria-hidden="true">{g.simge}</span> {g.ad}
                  {tahmin === g.id && <span className="etiket grafik__senin">Senin tahminin</span>}
                </span>
                <span className="grafik__cubuk">
                  <span
                    className={`grafik__dolgu ${g.kurus === EN_BUYUK ? 'grafik__dolgu--buyuk' : ''}`}
                    style={{ width: `${Math.max(4, (g.kurus / EN_BUYUK) * 100)}%` }}
                  />
                </span>
                <span className="grafik__sayi">{sayi(g.kurus)} kuruş</span>
              </li>
            ))}
          </ul>
          {tahmin === 'bugday' ? (
            <Geribildirim tur="dogru">Tahminin tuttu. Buğday, handan yaklaşık 28 kat fazlaydı!</Geribildirim>
          ) : (
            <div className="bildirim bildirim--bilgi" role="status">
              <strong>Şaşırtıcı, değil mi? </strong>
              Han şehrin ortasındaydı ama en büyük gelir köylerin buğdayından geliyordu. Buğday, handan yaklaşık 28 kat fazlaydı.
            </div>
          )}
          <p className="metin-soluk tahmin__not">
            Not: Bu sayılar 1419’daki vakfiyeden değil, 1800’lerin ortasında tutulan bir hesap defterinden.
          </p>
          {adim === 1 && (
            <button type="button" className="dugme dugme--genis" onClick={() => setAdim(2)}>
              Devam
            </button>
          )}
        </section>
      )}

      {adim >= 2 && (
        <SecimSorusu
          soru="Grafiğe bak. Vakfın en küçük geliri hangisiydi?"
          secenekler={[
            { metin: 'Köylerden gelen buğday', dogru: false, geri: 'Buğdayın çubuğu en uzun olan. Sen en kısayı ara.' },
            { metin: 'İpek Hanı’ndan gelen para', dogru: true, geri: '2.500 kuruş ile en küçük gelir handan geliyordu.' },
            { metin: 'Meyvelerden alınan vergi', dogru: false, geri: 'Meyvenin çubuğu ortada. Daha kısa bir çubuk var.' },
          ]}
          cozuldu={cozuldu}
          denenen={denenen}
          onDene={(i) => setDenenen((d) => [...d, i])}
          onDogru={() => undefined}
        />
      )}
    </LabKabuk>
  );
}
