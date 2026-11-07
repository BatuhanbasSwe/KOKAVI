import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/global.css';
import './lab.css';
import { HikayeModu } from './v1-hikaye/HikayeModu';
import { TahminEt } from './v2-tahmin/TahminEt';
import { GizliEser } from './v3-gizli-eser/GizliEser';
import { VakifDedektifi } from './v4-dedektif/VakifDedektifi';

/**
 * Ders Laboratuvarı: ana uygulamaya (App.tsx) dokunmadan ders formatı prototipleri.
 * Adres: /lab.html#v1, #v2/1 … (sondaki sayı, ekran görüntüsü için başlangıç adımı).
 */

const PROTOTIPLER = [
  { kod: 'v1', simge: '', ad: 'Hikâye Modu', ozet: 'Diyalog balon balon akar. Arada okumadan geçilemeyen sorular.', ilke: 'Hikâye + tarihsel empati' },
  { kod: 'v2', simge: '', ad: 'Önce Tahmin, Sonra Gör', ozet: 'Çocuk tahmin eder, sonra gerçek veriyi grafikte görür.', ilke: 'Ön test etkisi' },
  { kod: 'v3', simge: '', ad: 'Gizli Eser', ozet: 'Her doğru cevap fotoğrafın bir parçasını açar. Sonunda eseri tanırsın.', ilke: 'Geri çağırma + merak' },
  { kod: 'v4', simge: '', ad: 'Vakıf Dedektifi', ozet: 'Kanıtları “para getirir / hizmet eder” diye ayır, vakfın çarkını kur.', ilke: 'Kavram ayırt etme' },
] as const;

function adresiOku() {
  const [kod = '', adim = ''] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { kod, adim: Number(adim) || 0 };
}

function Laboratuvar() {
  const [adres, setAdres] = useState(adresiOku);
  useEffect(() => {
    const dinle = () => {
      setAdres(adresiOku());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', dinle);
    return () => window.removeEventListener('hashchange', dinle);
  }, []);

  const anahtar = `${adres.kod}/${adres.adim}`;
  switch (adres.kod) {
    case 'v1':
      return <HikayeModu key={anahtar} baslangic={adres.adim || 1} />;
    case 'v2':
      return <TahminEt key={anahtar} baslangic={adres.adim} />;
    case 'v3':
      return <GizliEser key={anahtar} baslangic={adres.adim} />;
    case 'v4':
      return <VakifDedektifi key={anahtar} baslangic={adres.adim} />;
    default:
      return (
        <main className="lab sarmal yigin" aria-labelledby="lab-baslik">
          <span className="etiket">Prototip · ana uygulamaya bağlı değil</span>
          <h1 id="lab-baslik" className="lab__eser">
            Ders Laboratuvarı
          </h1>
          <p className="metin-ikincil">
            Aynı eser (Bursa Yeşilcami), aynı kaynaklı bilgi, dört farklı ders biçimi. Hiçbirinde kalp ya da ceza yok.
          </p>
          <ul className="lab__menu">
            {PROTOTIPLER.map((p) => (
              <li key={p.kod}>
                <a className="kart lab__menu-kart" href={`#${p.kod}`}>
                  <span className="lab__menu-simge" aria-hidden="true">
                    {p.simge}
                  </span>
                  <span className="yigin lab__menu-metin">
                    <strong>
                      {p.kod.toUpperCase()} · {p.ad}
                    </strong>
                    <span>{p.ozet}</span>
                    <span className="etiket">{p.ilke}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </main>
      );
  }
}

createRoot(document.getElementById('kok')!).render(
  <StrictMode>
    <Laboratuvar />
  </StrictMode>,
);
