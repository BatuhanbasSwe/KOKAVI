import type { ReactNode } from 'react';

/** Her prototipin ortak çerçevesi: üst bilgi, ilerleme, kaynak. */
export function LabKabuk(props: {
  kod: string;
  ad: string;
  eser: string;
  adim: number;
  toplamAdim: number;
  kaynak: string;
  children: ReactNode;
}) {
  const yuzde = Math.round((Math.min(props.adim, props.toplamAdim) / props.toplamAdim) * 100);
  return (
    <main className="lab sarmal yigin" aria-labelledby="lab-baslik">
      <header className="lab__ust">
        <a className="dugme dugme--ikincil dugme--kucuk" href="#">
          ← Tüm prototipler
        </a>
        <span className="etiket">
          {props.kod} · {props.ad}
        </span>
      </header>
      <div
        className="lab__ilerleme"
        role="progressbar"
        aria-label="Ders ilerlemesi"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={yuzde}
      >
        <div className="lab__ilerleme-dolgu" style={{ width: `${yuzde}%` }} />
      </div>
      <h1 id="lab-baslik" className="lab__eser">
        {props.eser}
      </h1>
      {props.children}
      <p className="kaynak">Kaynak: {props.kaynak}</p>
    </main>
  );
}

/** Ceza yok: yanlışta ipucu, doğruda açıklama. Renk tek başına anlam taşımaz. */
export function Geribildirim(props: { tur: 'dogru' | 'ipucu'; children: ReactNode }) {
  return (
    <div
      className={`bildirim ${props.tur === 'dogru' ? 'bildirim--basari' : 'bildirim--uyari'}`}
      role="status"
    >
      <strong>{props.tur === 'dogru' ? '✓ Doğru! ' : 'İpucu: '}</strong>
      {props.children}
    </div>
  );
}

export interface Secim {
  metin: string;
  dogru: boolean;
  geri: string;
}

/** Tek doğrulu seçim; yanlış seçenek ipucu verir ve tekrar denenebilir. */
export function SecimSorusu(props: {
  soru: string;
  secenekler: Secim[];
  onDogru: () => void;
  cozuldu: boolean;
  denenen: number[];
  onDene: (i: number) => void;
}) {
  const son = props.denenen[props.denenen.length - 1];
  const sonSecim = son === undefined ? undefined : props.secenekler[son];
  return (
    <fieldset className="lab__soru yigin">
      <legend className="lab__soru-metni">{props.soru}</legend>
      {props.secenekler.map((s, i) => {
        const denendi = props.denenen.includes(i);
        const sinif = denendi ? (s.dogru ? 'secenek--dogru' : 'secenek--yanlis') : '';
        return (
          <button
            key={s.metin}
            type="button"
            className={`secenek ${sinif}`}
            disabled={props.cozuldu || (denendi && !s.dogru)}
            onClick={() => {
              props.onDene(i);
              if (s.dogru) props.onDogru();
            }}
          >
            {s.metin}
          </button>
        );
      })}
      {sonSecim && <Geribildirim tur={sonSecim.dogru ? 'dogru' : 'ipucu'}>{sonSecim.geri}</Geribildirim>}
    </fieldset>
  );
}
