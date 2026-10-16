/**
 * Uygulama ikon seti — satır içi SVG, `currentColor` ile boyanır.
 *
 * Erişilebilirlik: ikonlar her zaman aria-hidden'dır; anlamı yanındaki metin
 * veya `aria-label` taşır (WCAG 1.1.1, 1.4.1). Emoji kullanılmaz: ekran
 * okuyucular emojiyi tutarsız okur ve temaya göre renklenmez.
 */
import type { ReactNode } from 'react';

interface IkonProps {
  boyut?: number;
  kalinlik?: number;
  className?: string;
}

function Svg({ boyut = 24, kalinlik = 2.2, className, children }: IkonProps & { children: ReactNode }) {
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={kalinlik}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/* --- Gezinme ------------------------------------------------------------ */

export const IkonYol = (p: IkonProps) => (
  <Svg {...p}>
    <path d="M4 20h16M6 20v-6a6 6 0 0 1 12 0v6M12 5v3M10 20v-3a2 2 0 0 1 4 0v3" />
  </Svg>
);

export const IkonDefter = (p: IkonProps) => (
  <Svg {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
    <path d="M4 19V5M9 7h6M9 11h6" />
  </Svg>
);

export const IkonHarita = (p: IkonProps) => (
  <Svg {...p}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </Svg>
);

export const IkonSinif = (p: IkonProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
  </Svg>
);

export const IkonAyarlar = (p: IkonProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
  </Svg>
);

/* --- Göstergeler -------------------------------------------------------- */

export const IkonAlev = ({ boyut = 22 }: IkonProps) => (
  <svg width={boyut} height={boyut} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2-1-4 0-6z"
      fill="var(--odul)"
      stroke="var(--odul-golge)"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const IkonElmas = ({ boyut = 22 }: IkonProps) => (
  <svg width={boyut} height={boyut} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M6 4h12l3 5-9 11L3 9z"
      fill="var(--ikincil-yumusak)"
      stroke="var(--ikincil)"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M3 9h18M9 4l3 16M15 4l-3 16" fill="none" stroke="var(--ikincil)" strokeWidth="1.4" />
  </svg>
);

export const IkonKilit = (p: IkonProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const IkonTik = (p: IkonProps) => (
  <Svg kalinlik={3.2} {...p}>
    <path d="M5 12l5 5L20 7" />
  </Svg>
);

export const IkonKapat = (p: IkonProps) => (
  <Svg kalinlik={3} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IkonHoparlor = (p: IkonProps) => (
  <Svg {...p}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
  </Svg>
);

export const IkonDur = (p: IkonProps) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Svg>
);

export const IkonIpucu = (p: IkonProps) => (
  <Svg {...p}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </Svg>
);

export const IkonTekrar = (p: IkonProps) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />
  </Svg>
);

/* --- Eser türleri ------------------------------------------------------- */

const TUR_YOLLARI: Record<string, ReactNode> = {
  cami: <path d="M3 21h18M5 21v-7a7 7 0 0 1 14 0v7M12 3v4M9 21v-4a3 3 0 0 1 6 0v4M2 21V9M2 9v-2" />,
  mescit: <path d="M4 21h16M6 21v-6a6 6 0 0 1 12 0v6M12 6v3M10 21v-3a2 2 0 0 1 4 0v3" />,
  medrese: (
    <path d="M3 21h18M4 21V10h16v11M4 10l8-6 8 6M8 21v-5a1.5 1.5 0 0 1 3 0v5M13 21v-5a1.5 1.5 0 0 1 3 0v5" />
  ),
  hamam: (
    <path d="M3 21h18M5 21v-6a7 7 0 0 1 14 0v6M9 11h.01M12 9h.01M15 11h.01M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2" />
  ),
  han: <path d="M3 21h18M4 21V8h16v13M4 8l2-4h12l2 4M9 21v-6a3 3 0 0 1 6 0v6M7 11h2M15 11h2" />,
  kervansaray: <path d="M3 21h18M3 21V9h18v12M3 9l3-5h12l3 5M8 21v-7a4 4 0 0 1 8 0v7" />,
  cesme: <path d="M5 21V10a7 7 0 0 1 14 0v11M3 21h18M12 12v3M9 18h6M12 15c-.6.9-1 1.4-1 2a1 1 0 0 0 2 0c0-.6-.4-1.1-1-2" />,
  turbe: <path d="M4 21h16M6 21V12l6-3 6 3v9M8 12a4 4 0 0 1 8 0M12 5v4M10 21v-4h4v4" />,
  kopru: <path d="M2 16h20M2 12h20M5 16a7 7 0 0 1 14 0M3 12v8M21 12v8" />,
  imaret: <path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zM2 11h20M9 7c0-1 1-1 1-2M14 7c0-1 1-1 1-2" />,
  kulliye: <path d="M2 21h20M3 21v-5a4 4 0 0 1 8 0v5M11 21v-7a5 5 0 0 1 10 0v7M16 6v3M7 9v3" />,
};

/** Türkçe tür adını anahtar kelimeye indirger: "Çeşme" → "cesme". */
export function turAnahtari(tur: string | undefined | null): string {
  const harita: Record<string, string> = { ç: 'c', ş: 's', ğ: 'g', ı: 'i', ö: 'o', ü: 'u', İ: 'i' };
  return (tur ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çşğıöüİ]/g, (h) => harita[h] ?? h)
    .trim();
}

export function IkonTur({ tur, ...p }: IkonProps & { tur: string | undefined | null }) {
  const yol = TUR_YOLLARI[turAnahtari(tur)] ?? TUR_YOLLARI.cami;
  return <Svg {...p}>{yol}</Svg>;
}

/* --- Selçuklu sekiz köşeli yıldızı (öğrenme yolu düğümü) ----------------- */

const YILDIZ_UST =
  '40,2 50.5,12.5 65.5,12.5 65.5,27.5 76,38 65.5,48.5 65.5,63.5 50.5,63.5 40,74 29.5,63.5 14.5,63.5 14.5,48.5 4,38 14.5,27.5 14.5,12.5 29.5,12.5';
const YILDIZ_ALT =
  '40,8 50.5,18.5 65.5,18.5 65.5,33.5 76,44 65.5,54.5 65.5,69.5 50.5,69.5 40,80 29.5,69.5 14.5,69.5 14.5,54.5 4,44 14.5,33.5 14.5,18.5 29.5,18.5';

export type YildizDurumu = 'tamam' | 'aktif' | 'acik' | 'kilitli';

/**
 * Yol düğümü: iki üst üste yıldız (alttaki koyu = 3B gölge) + ortada ikon.
 * Durum renkle DEĞİL, ortadaki ikonla da ayrışır: ✓ tamam, kilit, tür ikonu.
 */
export function YildizDugum({ durum, tur, boyut = 80 }: { durum: YildizDurumu; tur?: string | null; boyut?: number }) {
  const renk: Record<YildizDurumu, [string, string, string]> = {
    tamam: ['var(--odul)', 'var(--odul-golge)', 'var(--odul-metin)'],
    aktif: ['var(--vurgu)', 'var(--vurgu-golge)', 'var(--vurgu-metin)'],
    acik: ['var(--vurgu)', 'var(--vurgu-golge)', 'var(--vurgu-metin)'],
    kilitli: ['var(--kilit)', 'var(--kilit-golge)', 'var(--kilit-metin)'],
  };
  const [ust, alt, ikon] = renk[durum];
  return (
    <svg
      className="yildiz-dugum"
      width={boyut}
      height={(boyut * 82) / 80}
      viewBox="0 0 80 82"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={YILDIZ_ALT} fill={alt} />
      <polygon points={YILDIZ_UST} fill={ust} />
      <g
        transform="translate(23 21) scale(1.42)"
        fill="none"
        stroke={ikon}
        strokeWidth={durum === 'tamam' ? 3.2 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {durum === 'tamam' ? (
          <path d="M5 12l5 5L20 7" />
        ) : durum === 'kilitli' ? (
          <>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </>
        ) : (
          (TUR_YOLLARI[turAnahtari(tur)] ?? TUR_YOLLARI.cami)
        )}
      </g>
    </svg>
  );
}

/* --- Kâşif avatarları (Vakıf Çarşısı) ------------------------------------ */

const AVATAR_YOLLARI: Record<string, ReactNode> = {
  'avatar-yildiz': <path d="M12 2.5l2.8 2.8h4v4l2.7 2.7-2.7 2.7v4h-4L12 21.5l-2.8-2.8h-4v-4L2.5 12l2.7-2.7v-4h4z" />,
  'avatar-kubbe': <path d="M4 20h16M6 20v-5a6 6 0 0 1 12 0v5M12 4v5M10.5 5.5a1.5 1.5 0 1 0 3 0" />,
  'avatar-lale': (
    <path d="M12 21v-8M12 13c-3.5 0-5.5-2.6-5.5-7 1.8.8 3 1.8 3.7 3 .2-2 .9-3.6 1.8-5 .9 1.4 1.6 3 1.8 5 .7-1.2 1.9-2.2 3.7-3 0 4.4-2 7-5.5 7zM12 18c-1.6-1.2-3.4-1.4-5-.6M12 18c1.6-1.2 3.4-1.4 5-.6" />
  ),
  'avatar-kandil': <path d="M12 2v3M8 5h8M6.5 9h11l-2.5 6h-6zM10 15l2 4 2-4M12 19v2" />,
  'avatar-ibrik': (
    <path d="M9 3.5h6M10 3.5v3M8 6.5h8a2 2 0 0 1 2 2v1c0 5-2.7 10-6 10s-6-5-6-10v-1a2 2 0 0 1 2-2zM18 10l3-2.5M6 10H4a1.5 1.5 0 0 0 0 3h2.3" />
  ),
  'avatar-anahtar': <path d="M8 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM11.2 11.2 20.5 20.5M16.5 16.5l2-2M18.5 18.5l2-2" />,
};

export function Avatar({ id, boyut = 32 }: { id: string; boyut?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: boyut, height: boyut }}
      aria-hidden="true"
    >
      <Svg boyut={Math.round(boyut * 0.66)} kalinlik={2}>
        {AVATAR_YOLLARI[id] ?? AVATAR_YOLLARI['avatar-yildiz']}
      </Svg>
    </span>
  );
}
