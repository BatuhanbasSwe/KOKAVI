/**
 * "Hatalarımı çalış" — derste ipucu alınan egzersizlerden karma bir tekrar turu.
 *
 * Ceza yok: listede kalmak bir "başarısızlık" değil, sadece yeniden bakılacak
 * yer. İpucusuz çözülen egzersiz listeden düşer ("Öğrendin!").
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Konfeti } from '@/app/Konfeti';
import { Maskot } from '@/app/Maskot';
import { EgzersizCalistirici } from '../ders/GeriCagirmaAdimi';
import { IpucuBildirimi } from '../ders/EgzersizKabugu';
import { HATA_OLAYI, hataCikar, hatalariOku, type HataKaydi } from './hataDeposu';
import '../ders/ders.css';

const TUR = 5;

export function useHataSayisi(): number {
  const [n, setN] = useState(() => hatalariOku().length);
  useEffect(() => {
    const f = () => setN(hatalariOku().length);
    window.addEventListener(HATA_OLAYI, f);
    window.addEventListener('storage', f);
    return () => {
      window.removeEventListener(HATA_OLAYI, f);
      window.removeEventListener('storage', f);
    };
  }, []);
  return n;
}

export function HatalarSayfasi() {
  const [tur, setTur] = useState<HataKaydi[] | null>(null);
  const [sira, setSira] = useState(0);
  const [ogrenilen, setOgrenilen] = useState<string[]>([]);
  const bekleyen = useHataSayisi();
  const ipucuAlindi = useRef(false);
  const ipucuGoruldu = useCallback(() => {
    ipucuAlindi.current = true;
  }, []);

  const baslat = () => {
    // En eskiler önce: unutulmaya en yakın olanlar.
    setTur(hatalariOku().slice(0, TUR));
    setSira(0);
    setOgrenilen([]);
  };

  const simdiki = tur?.[sira];
  const bitti = tur !== null && sira >= tur.length;

  const bittiHandler = () => {
    if (!simdiki) return;
    if (!ipucuAlindi.current) {
      hataCikar(simdiki.egzersiz.id);
      setOgrenilen((o) => [...o, simdiki.egzersiz.id]);
    }
    ipucuAlindi.current = false;
    setSira((s) => s + 1);
  };

  const ozet = useMemo(() => tur ?? [], [tur]);

  if (tur === null) {
    return (
      <div className="yigin">
        <section className="kart yigin hatalar-giris" aria-labelledby="hatalar-baslik">
          <Maskot boyut={84} dusunceli={bekleyen > 0} mutlu={bekleyen === 0} />
          <h1 id="hatalar-baslik">Hatalarımı çalış</h1>
          {bekleyen === 0 ? (
            <p>Şu an tekrar edilecek bir şey yok. Derslerde ipucu aldığın sorular burada birikir.</p>
          ) : (
            <p>
              Derslerde ipucu aldığın <strong>{bekleyen} soru</strong> seni bekliyor. İpucusuz
              çözdüğün soru listeden çıkar. Yanlış yapmaktan korkma, ceza yok!
            </p>
          )}
          <div className="satir">
            {bekleyen > 0 && (
              <button type="button" className="dugme" onClick={baslat}>
                Pratiğe başla ({Math.min(TUR, bekleyen)} soru)
              </button>
            )}
            <a className="dugme dugme--ikincil" href="#/yol">
              Yola dön
            </a>
          </div>
        </section>
      </div>
    );
  }

  if (bitti) {
    const hepsi = ogrenilen.length === ozet.length;
    return (
      <div className="yigin">
        {ogrenilen.length > 0 && <Konfeti />}
        <section className="kart yigin hatalar-giris" aria-labelledby="hatalar-son">
          <Maskot boyut={84} mutlu />
          <h1 id="hatalar-son">
            {hepsi ? 'Hepsini öğrendin!' : `${ogrenilen.length} soruyu öğrendin!`}
          </h1>
          <ul className="hatalar-ozet">
            {ozet.map((h) => {
              const tamam = ogrenilen.includes(h.egzersiz.id);
              return (
                <li key={h.egzersiz.id}>
                  <span aria-hidden="true">{tamam ? '✓' : '↻'}</span> {h.eserAdi || 'Ders'} —{' '}
                  {tamam ? 'listeden çıktı' : 'bir dahaki pratikte yine gelecek'}
                </li>
              );
            })}
          </ul>
          <div className="satir">
            {bekleyen > 0 && (
              <button type="button" className="dugme" onClick={baslat}>
                Devam et ({Math.min(TUR, bekleyen)} soru)
              </button>
            )}
            <a className="dugme dugme--ikincil" href="#/yol">
              Yola dön
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="yigin">
      <header className="hatalar-ust">
        <p className="etiket">
          Hatalarımı çalış · {sira + 1}/{tur.length}
        </p>
        {simdiki?.eserAdi && <p className="metin-soluk hatalar-ust__eser">{simdiki.eserAdi} dersinden</p>}
      </header>
      <IpucuBildirimi.Provider value={ipucuGoruldu}>
        <EgzersizCalistirici key={simdiki!.egzersiz.id} egzersiz={simdiki!.egzersiz} onBitti={bittiHandler} />
      </IpucuBildirimi.Provider>
    </div>
  );
}
