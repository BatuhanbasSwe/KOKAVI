/**
 * DENEYSEL: Öğrenme Yolu arka planı denemeleri (oyun "level map" tarzları).
 *
 * Mobil oyunlardaki dikey kaydırmalı seviye haritaları (Candy Crush, Duolingo,
 * Royal Match) yolu bir "dünya"nın içine koyar: çayır, gökyüzü, parşömen,
 * gece. Burada aynı fikri vakıf temasıyla deniyoruz. Hepsi CSS + satır içi
 * SVG; ek görsel indirmez, tıklanamaz ve ekran okuyucudan gizlidir.
 *
 * Seçim cihazda saklanır. Beğenilen tarz kalıcı olursa renkleri tokens.css'e
 * taşınmalı ve seçici kaldırılmalı.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';

export type YolZeminiAdi = 'foto' | 'cini' | 'cayir' | 'gokyuzu' | 'parsomen' | 'gece' | 'siluet';

export const YOL_ZEMINLERI: { ad: YolZeminiAdi; etiket: string }[] = [
  { ad: 'foto', etiket: 'Fotoğraf (şimdiki)' },
  { ad: 'cini', etiket: 'Çini desen' },
  { ad: 'cayir', etiket: 'Oyun çayırı' },
  { ad: 'gokyuzu', etiket: 'Gökyüzü' },
  { ad: 'parsomen', etiket: 'Eski harita' },
  { ad: 'gece', etiket: 'Gece' },
  { ad: 'siluet', etiket: 'Şehir silüeti' },
];

const ANAHTAR = 'kokavi.yol-zemini.v1';

export function yolZeminiOku(): YolZeminiAdi {
  try {
    const d = localStorage.getItem(ANAHTAR) as YolZeminiAdi | null;
    return d && YOL_ZEMINLERI.some((z) => z.ad === d) ? d : 'foto';
  } catch {
    return 'foto';
  }
}

/** Seçici + zemin katmanı. Zemin body'ye taşınır (sabit katman, bkz. ortam-zemin). */
export function YolZemini() {
  const [zemin, setZemin] = useState<YolZeminiAdi>(yolZeminiOku);
  const sec = (z: YolZeminiAdi) => {
    setZemin(z);
    try {
      localStorage.setItem(ANAHTAR, z);
    } catch {
      /* yalnızca bu oturum */
    }
  };

  return (
    <>
      <div className="yol-zemin-secici">
        <label htmlFor="yol-zemin-sec" className="yol-zemin-secici__etiket">
          Arka plan <span className="etiket">deneysel</span>
        </label>
        <select
          id="yol-zemin-sec"
          className="secim-dugmesi"
          value={zemin}
          onChange={(e) => sec(e.target.value as YolZeminiAdi)}
        >
          {YOL_ZEMINLERI.map((z) => (
            <option key={z.ad} value={z.ad}>
              {z.etiket}
            </option>
          ))}
        </select>
      </div>
      {createPortal(
        zemin === 'foto' ? (
          <div className="ortam-zemin" aria-hidden="true" />
        ) : (
          <div className={`yol-zemin yol-zemin--${zemin}`} aria-hidden="true">
            <Suslemeler zemin={zemin} />
          </div>
        ),
        document.body,
      )}
    </>
  );
}

/** Sabit (kaymayan) süs katmanları: güneş, ay, silüet, pusula, tepeler. */
function Suslemeler({ zemin }: { zemin: YolZeminiAdi }) {
  if (zemin === 'gokyuzu') {
    return (
      <>
        <span className="yol-zemin__gunes" />
        <svg className="yol-zemin__alt" viewBox="0 0 1200 220" preserveAspectRatio="none">
          <path d="M0 140 Q150 60 320 120 T640 110 T960 130 T1200 100 V220 H0Z" className="yz-tepe-arka" />
          <path d="M0 180 Q200 110 420 170 T840 160 T1200 150 V220 H0Z" className="yz-tepe-on" />
        </svg>
      </>
    );
  }
  if (zemin === 'gece') {
    return (
      <>
        <svg className="yol-zemin__ay" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="34" className="yz-ay" />
          <circle cx="64" cy="42" r="30" className="yz-ay-golge" />
        </svg>
        <Siluet sinif="yz-siluet-gece" />
      </>
    );
  }
  if (zemin === 'siluet') {
    return (
      <>
        <span className="yol-zemin__gunes yol-zemin__gunes--batan" />
        <Siluet sinif="yz-siluet-arka" kaydir />
        <Siluet sinif="yz-siluet-on" />
      </>
    );
  }
  if (zemin === 'parsomen') {
    return (
      <svg className="yol-zemin__pusula" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" className="yz-pusula-halka" />
        <circle cx="100" cy="100" r="64" className="yz-pusula-halka" />
        <path d="M100 14 L112 100 L100 186 L88 100Z" className="yz-pusula-ok" />
        <path d="M14 100 L100 88 L186 100 L100 112Z" className="yz-pusula-ok yz-pusula-ok--yan" />
        <text x="100" y="10" className="yz-pusula-harf">K</text>
      </svg>
    );
  }
  if (zemin === 'cayir') {
    return (
      <svg className="yol-zemin__alt" viewBox="0 0 1200 160" preserveAspectRatio="none">
        <path d="M0 90 Q300 30 600 80 T1200 70 V160 H0Z" className="yz-cayir-tepe" />
      </svg>
    );
  }
  return null;
}

/** Kubbe ve minarelerden basit bir şehir silüeti (Bursa'yı çağrıştırır). */
function Siluet({ sinif, kaydir }: { sinif: string; kaydir?: boolean }) {
  const parcalar: React.ReactNode[] = [];
  const kubbe = (x: number, r: number, taban: number) => (
    <g key={`k${x}`}>
      <rect x={x - r} y={taban - r * 0.6} width={r * 2} height={r * 0.6 + 2} />
      <path d={`M${x - r} ${taban - r * 0.6} A${r} ${r} 0 0 1 ${x + r} ${taban - r * 0.6}Z`} />
      <rect x={x - 1.5} y={taban - r * 1.6 - 10} width={3} height={12} />
    </g>
  );
  const minare = (x: number, h: number, taban: number) => (
    <g key={`m${x}`}>
      <rect x={x - 4} y={taban - h} width={8} height={h} />
      <rect x={x - 7} y={taban - h * 0.72} width={14} height={4} />
      <path d={`M${x - 5} ${taban - h} L${x} ${taban - h - 26} L${x + 5} ${taban - h}Z`} />
    </g>
  );
  const taban = 200;
  const plan: [string, number, number][] = kaydir
    ? [['k', 90, 34], ['m', 150, 110], ['k', 260, 52], ['m', 330, 96], ['k', 470, 40], ['k', 640, 60], ['m', 720, 120], ['k', 860, 36], ['m', 990, 100], ['k', 1100, 48]]
    : [['m', 40, 120], ['k', 160, 58], ['k', 250, 30], ['m', 300, 140], ['k', 420, 70], ['m', 520, 130], ['k', 600, 34], ['k', 760, 64], ['m', 850, 116], ['k', 950, 44], ['m', 1050, 136], ['k', 1150, 56]];
  for (const [tur, x, olcu] of plan) parcalar.push(tur === 'k' ? kubbe(x, olcu, taban) : minare(x, olcu, taban));
  return (
    <svg className={`yol-zemin__siluet ${sinif}`} viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice">
      <rect x="0" y={taban - 14} width="1200" height="20" />
      {parcalar}
    </svg>
  );
}
