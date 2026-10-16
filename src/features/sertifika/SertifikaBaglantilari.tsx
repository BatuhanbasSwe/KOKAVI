/** Kâşif Defteri'nde şehir sertifikalarına giden bağlantılar. */
import { useDurum } from '@/app/DurumSaglayici';
import './sertifika.css';

export function SertifikaBaglantilari() {
  const { yol } = useDurum();
  const sehirler = yol?.sehirler ?? [];
  if (sehirler.length === 0) return null;
  return (
    <section aria-labelledby="sertifika-baslik" className="yigin" style={{ gap: 'var(--b-3)' }}>
      <h2 id="sertifika-baslik" className="bolum-basligi" style={{ marginBottom: 0 }}>
        Sertifikalarım
      </h2>
      <ul className="sertifika-baglantilar" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {sehirler.map((s) => {
          const tamam = s.toplamSayi > 0 && s.tamamlananSayi >= s.toplamSayi;
          return (
            <li key={s.sehirId}>
              <a className={`dugme${tamam ? '' : ' dugme--ikincil'}`} href={`#/sertifika/${s.sehirId}`}>
                {tamam ? `${s.ad}: sertifikanı al` : `${s.ad}: ${s.tamamlananSayi}/${s.toplamSayi}`}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
