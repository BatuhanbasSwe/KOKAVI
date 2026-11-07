/**
 * "Hayrat mı Akar mı?" — uygulamanın çekirdek kavramını pekiştiren hızlı oyun.
 *
 * Her kartta bir vakıf eseri: çocuk "hizmet eder (hayrat)" ya da "gelir getirir
 * (akar)" seçer. Süre baskısı YOK; yanlışta açıklama + kaynak gelir, puan düşmez.
 *
 * Erişilebilirlik: kart sürüklenebilir AMA zorunlu değil — iki büyük düğme ve
 * klavyede ← / → aynı işi yapar. Sonuç metinle ve tek canlı bölgeyle duyurulur.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Konfeti } from '@/app/Konfeti';
import { useEfekt } from '@/app/useEfekt';
import { eserBul } from '../gunun-eseri/oyun';
import { TUR_BOYU, turKartlari, type HayratAkar, type Kart } from './kartlar';
import './hayrat-akar.css';

const ETIKET: Record<HayratAkar, string> = { hayrat: 'Hayrat', akar: 'Akar' };
const ESIK = 90; // px: bu kadar sürüklenirse cevap sayılır

export function HayratAkarSayfasi() {
  const [tur, setTur] = useState(0);
  const kartlar = useMemo(() => turKartlari(), [tur]);
  const [sira, setSira] = useState(0);
  const [cevaplar, setCevaplar] = useState<{ kart: Kart; secim: HayratAkar }[]>([]);
  const [kayma, setKayma] = useState(0);
  const surukle = useRef<{ x: number; id: number } | null>(null);
  const sonrakiRef = useRef<HTMLButtonElement>(null);
  const cal = useEfekt();

  const kart = kartlar[sira];
  const cevap = cevaplar[sira];
  const bitti = sira >= kartlar.length;
  const dogruSayisi = cevaplar.filter((c) => c.secim === c.kart.dogru).length;

  const sec = useCallback(
    (secim: HayratAkar) => {
      if (!kart || cevaplar[sira]) return;
      setCevaplar((c) => [...c, { kart, secim }]);
      setKayma(0);
      cal(secim === kart.dogru ? 'dogru' : 'ipucu');
    },
    [kart, cevaplar, sira, cal],
  );

  const sonraki = useCallback(() => {
    setSira((s) => s + 1);
  }, []);

  // Klavye: ← hayrat, → akar, Enter/boşluk sonraki.
  useEffect(() => {
    if (bitti) return;
    const dinle = (o: KeyboardEvent) => {
      const hedef = o.target as HTMLElement | null;
      if (hedef && /^(INPUT|TEXTAREA|SELECT)$/.test(hedef.tagName)) return;
      if (!cevap && o.key === 'ArrowLeft') sec('hayrat');
      else if (!cevap && o.key === 'ArrowRight') sec('akar');
    };
    window.addEventListener('keydown', dinle);
    return () => window.removeEventListener('keydown', dinle);
  }, [bitti, cevap, sec]);

  useEffect(() => {
    if (cevap) sonrakiRef.current?.focus();
  }, [cevap]);

  useEffect(() => {
    if (bitti) cal(dogruSayisi >= 8 ? 'kutlama' : 'rozet');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bitti]);

  if (bitti) {
    return (
      <div className="yigin ha">
        {dogruSayisi >= 8 && <Konfeti />}
        <section className="kart yigin ha-son" aria-labelledby="ha-son-baslik">
          
          <h1 id="ha-son-baslik">
            {dogruSayisi === TUR_BOYU ? 'Kusursuz! Vakıf ustasısın!' : `${dogruSayisi}/${kartlar.length} doğru!`}
          </h1>
          <p className="metin-ikincil">
            Unutma: <strong>hayrat</strong> insanlara doğrudan hizmet eder, <strong>akar</strong> kirasıyla
            bir hayratı yaşatır.
          </p>
          <ul className="ha-ozet">
            {cevaplar.map(({ kart: k, secim }) => {
              const e = eserBul(k.eserId)!;
              const tamam = secim === k.dogru;
              return (
                <li key={k.eserId} className={tamam ? 'ha-ozet--dogru' : 'ha-ozet--ogrenildi'}>
                  <span aria-hidden="true">{tamam ? '✓' : '↻'}</span>
                  <span>
                    <strong>{e.kisaAd}</strong>: {ETIKET[k.dogru]}
                    <span className="sr-only">{tamam ? ' (doğru bildin)' : ' (yeni öğrendin)'}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="satir">
            <button
              type="button"
              className="dugme"
              onClick={() => {
                setTur((t) => t + 1);
                setSira(0);
                setCevaplar([]);
              }}
            >
              Yeniden oyna
            </button>
            <a className="dugme dugme--ikincil" href="#/yol">
              Yola dön
            </a>
          </div>
        </section>
      </div>
    );
  }

  const e = eserBul(kart!.eserId)!;
  const dogruMu = cevap ? cevap.secim === kart!.dogru : null;

  return (
    <div className="yigin ha">
      <div className="sr-only" role="status" aria-live="polite">
        {cevap
          ? `${dogruMu ? 'Doğru!' : 'Bu sefer olmadı.'} ${e.kisaAd} bir ${ETIKET[kart!.dogru].toLocaleLowerCase('tr')}. ${kart!.neden}`
          : ''}
      </div>

      <header className="ha-ust">
        <div>
          <p className="etiket">Pratik · Hayrat mı Akar mı?</p>
          <h1 className="ha-ust__baslik">Bu eser ne yapardı?</h1>
        </div>
        <span className="rozet">
          {sira + 1} / {kartlar.length}
        </span>
      </header>
      <div className="ha-cubuk" aria-hidden="true">
        <span style={{ ['--oran' as string]: sira / kartlar.length }} />
      </div>

      <div className="ha-sahne">
        <article
          key={kart!.eserId}
          className={`kart ha-kart${cevap ? (dogruMu ? ' ha-kart--dogru' : ' ha-kart--ogren') : ''}`}
          style={{ ['--kayma' as string]: `${kayma}px`, ['--donus' as string]: `${kayma / 18}deg` }}
          aria-labelledby="ha-kart-ad"
          onPointerDown={(o) => {
            if (cevap) return;
            surukle.current = { x: o.clientX, id: o.pointerId };
            (o.currentTarget as HTMLElement).setPointerCapture?.(o.pointerId);
          }}
          onPointerMove={(o) => {
            if (surukle.current?.id === o.pointerId) setKayma(o.clientX - surukle.current.x);
          }}
          onPointerUp={() => {
            if (!surukle.current) return;
            surukle.current = null;
            if (kayma <= -ESIK) sec('hayrat');
            else if (kayma >= ESIK) sec('akar');
            else setKayma(0);
          }}
          onPointerCancel={() => {
            surukle.current = null;
            setKayma(0);
          }}
        >
          <img className="ha-kart__foto" src={`/gorseller/${e.eserId}/k.webp`} alt="" draggable={false} />
          <div className="ha-kart__govde">
            <h2 id="ha-kart-ad" className="ha-kart__ad">
              {e.kisaAd}
            </h2>
            <p className="ha-kart__alt">
              {e.sehir} · {e.kategori}
            </p>
          </div>
          {!cevap && kayma !== 0 && (
            <span className={`ha-kart__ipucu ha-kart__ipucu--${kayma < 0 ? 'sol' : 'sag'}`} aria-hidden="true">
              {kayma < 0 ? 'Hayrat' : 'Akar'}
            </span>
          )}
        </article>
      </div>

      {!cevap ? (
        <div className="ha-secim" role="group" aria-label="Cevabın">
          <button type="button" className="ha-dugme ha-dugme--hayrat" onClick={() => sec('hayrat')}>
            <span className="ha-dugme__ok" aria-hidden="true">
              ←
            </span>
            <span>
              <strong>Hayrat</strong>
              <span className="ha-dugme__alt">insanlara hizmet eder</span>
            </span>
          </button>
          <button type="button" className="ha-dugme ha-dugme--akar" onClick={() => sec('akar')}>
            <span>
              <strong>Akar</strong>
              <span className="ha-dugme__alt">gelir getirir</span>
            </span>
            <span className="ha-dugme__ok" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      ) : (
        <div className={`ha-sonuc ${dogruMu ? 'ha-sonuc--dogru' : 'ha-sonuc--ogren'}`}>
          <p className="ha-sonuc__baslik">
            <span aria-hidden="true">{dogruMu ? '✓ ' : '↻ '}</span>
            {dogruMu ? 'Doğru!' : `Bu bir ${ETIKET[kart!.dogru].toLocaleLowerCase('tr')}.`}
          </p>
          <p className="ha-sonuc__metin">{kart!.neden}</p>
          <p className="kaynak">Kaynak: {e.kaynak}</p>
          <button ref={sonrakiRef} type="button" className="dugme" onClick={sonraki}>
            {sira + 1 < kartlar.length ? 'Sonraki' : 'Sonucu gör'}
          </button>
        </div>
      )}
      <p className="metin-soluk ha-klavye">İpucu: klavyede ← hayrat, → akar.</p>
    </div>
  );
}
