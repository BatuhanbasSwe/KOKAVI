/**
 * Rozet görseli, Kâşif Defteri'ndeki rozet panosu ve kabuktaki bildirim izleyicisi.
 *
 * Erişilebilirlik: rozetin durumu renkle değil METİNLE de söylenir ("kazanıldı" /
 * "kilitli: …nasıl kazanılır"). Bildirim `role="status"`, kapatma düğmesi var,
 * kendiliğinden 5 sn sonra kapanır; "Hareketi azalt"ta animasyonsuz.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDurum } from '@/app/DurumSaglayici';
import { useEfekt } from '@/app/useEfekt';
import {
  ROZET_OLAYI,
  gorulenleriOku,
  gorulenleriYaz,
  gununEseriOzeti,
  kazanilanlar,
  sayaclariOku,
  tumRozetler,
  type Rozet,
} from './rozetMantigi';
import './rozetler.css';

/** Sekiz köşeli çini yıldızı; ortasında kısa işaret. */
export function RozetGorseli({ rozet, acik, boyut = 64 }: { rozet: Rozet; acik: boolean; boyut?: number }) {
  return (
    <svg
      className={`rozet-gorsel rozet-gorsel--${rozet.kategori}${acik ? '' : ' rozet-gorsel--kilitli'}`}
      width={boyut}
      height={boyut}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="rozet-gorsel__yildiz"
        d="M32 2 40.6 11.2 53.2 10.8 52.8 23.4 62 32 52.8 40.6 53.2 53.2 40.6 52.8 32 62 23.4 52.8 10.8 53.2 11.2 40.6 2 32 11.2 23.4 10.8 10.8 23.4 11.2Z"
      />
      <circle className="rozet-gorsel__ic" cx="32" cy="32" r="17" />
      {acik ? (
        <text className="rozet-gorsel__isaret" x="32" y="33" textAnchor="middle" dominantBaseline="middle">
          {rozet.isaret}
        </text>
      ) : (
        <g className="rozet-gorsel__kilit">
          <rect x="25" y="31" width="14" height="11" rx="2.5" />
          <path d="M28 31v-3a4 4 0 0 1 8 0v3" fill="none" />
        </g>
      )}
    </svg>
  );
}

/** Rozet girdisini canlı tutar: ilerleme değişince ve sayaç olayında yeniden hesaplar. */
function useKazanilanRozetler() {
  const { yol: yuklenenYol } = useDurum();
  const { ilerleme, yol } = useDurum();
  const [surum, setSurum] = useState(0);
  useEffect(() => {
    const yenile = () => setSurum((s) => s + 1);
    window.addEventListener(ROZET_OLAYI, yenile);
    window.addEventListener('storage', yenile);
    return () => {
      window.removeEventListener(ROZET_OLAYI, yenile);
      window.removeEventListener('storage', yenile);
    };
  }, []);
  return useMemo(
    () => ({
      hazir: yuklenenYol !== null,
      liste: tumRozetler(yol),
      kazanilan: kazanilanlar({
        ilerleme,
        yol,
        sayaclar: sayaclariOku(),
        gununEseri: gununEseriOzeti(),
      }),
    }),
    // surum: sayaç olayı geldiğinde depodan yeniden okumak için.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ilerleme, yol, surum],
  );
}

export function RozetPanosu() {
  const { liste, kazanilan } = useKazanilanRozetler();
  return (
    <section aria-labelledby="rozet-baslik" className="yigin rozet-panosu" style={{ gap: 'var(--b-3)' }}>
      <h2 id="rozet-baslik" className="bolum-basligi" style={{ marginBottom: 0 }}>
        Rozetlerim{' '}
        <span className="metin-soluk">
          ({liste.filter((r) => kazanilan.has(r.id)).length}/{liste.length})
        </span>
      </h2>
      <ul className="rozet-izgara">
        {liste.map((r) => {
          const acik = kazanilan.has(r.id);
          return (
            <li key={r.id} className={`rozet-karti${acik ? ' rozet-karti--acik' : ''}`}>
              <RozetGorseli rozet={r} acik={acik} />
              <span className="rozet-karti__ad">{r.ad}</span>
              <span className="rozet-karti__aciklama">
                <span className="sr-only">{acik ? 'Kazanıldı: ' : 'Kilitli: '}</span>
                {r.aciklama}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Yeni kazanılan rozeti Duolingo gibi bir bildirimle kutlar. Kabukta bir kez
 * çizilir. İlk açılışta (hiç kayıt yoksa) eldeki rozetler sessizce "görüldü"
 * sayılır — eski kullanıcıya bildirim yağmuru olmasın.
 */
export function RozetBildirimi() {
  const { hazir, liste, kazanilan } = useKazanilanRozetler();
  const [kuyruk, setKuyruk] = useState<Rozet[]>([]);
  const cal = useEfekt();

  useEffect(() => {
    // Yol yüklenmeden şehir rozetleri bilinmez; erken karar verilirse eski
    // kullanıcıya şehir rozetleri sonradan "yeni" diye çıkar.
    if (!hazir) return;
    let ilkKez = false;
    try {
      ilkKez = localStorage.getItem('kokavi-rozet-gorulen-v1') === null;
    } catch {
      return;
    }
    const gorulen = gorulenleriOku();
    const yeni = liste.filter((r) => kazanilan.has(r.id) && !gorulen.has(r.id));
    if (yeni.length === 0 && !ilkKez) return;
    yeni.forEach((r) => gorulen.add(r.id));
    gorulenleriYaz(gorulen);
    if (!ilkKez && yeni.length > 0) setKuyruk((k) => [...k, ...yeni]);
  }, [hazir, liste, kazanilan]);

  const ust = kuyruk[0];
  const kapat = useCallback(() => setKuyruk((k) => k.slice(1)), []);

  useEffect(() => {
    if (!ust) return;
    cal('rozet');
    const z = setTimeout(kapat, 5000);
    return () => clearTimeout(z);
  }, [ust, kapat, cal]);

  return (
    <div className="rozet-bildirim-kap" role="status" aria-live="polite">
      {ust && (
        <div className="rozet-bildirim" key={ust.id}>
          <RozetGorseli rozet={ust} acik boyut={56} />
          <div className="rozet-bildirim__metin">
            <span className="rozet-bildirim__ust">Yeni rozet!</span>
            <span className="rozet-bildirim__ad">{ust.ad}</span>
            <span className="rozet-bildirim__aciklama">{ust.aciklama}</span>
          </div>
          <button type="button" className="rozet-bildirim__kapat" onClick={kapat} aria-label="Bildirimi kapat">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
