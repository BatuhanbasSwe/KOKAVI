/**
 * Köstik — uygulamanın maskotu: kırmızı bandanalı, yuvarlak gözlüklü, meraklı
 * bir köstebek kâşif ("Tarihi keşfet, geleceği anla!"). Takımın karakter
 * tasarımından vektöre çevrildi; küçük boyutta da okunsun diye büst olarak.
 *
 * İfadeler: varsayılan meraklı · `mutlu` (gözler kapalı gülüş) · `saskin`
 * (iri göz, yuvarlak ağız) · `dusunceli` (gözler yukarı, küçük "o" — ipucu
 * anı; üzgün DEĞİL).
 *
 * Süs olduğu için aria-hidden; anlam her zaman yanındaki metindedir. Renkler
 * tokens.css'teki --maskot-* jetonlarından. Animasyon (süzülme, göz kırpma)
 * "hareketi azalt" ayarında durur.
 */

export function Maskot({
  boyut = 72,
  mutlu = false,
  dusunceli = false,
  saskin = false,
}: {
  boyut?: number;
  mutlu?: boolean;
  /** İpucu anı: gözler yukarı, ağız küçük "o" — üzgün DEĞİL, düşünüyor. */
  dusunceli?: boolean;
  /** Şaşkın: iri gözler, yuvarlak açık ağız. */
  saskin?: boolean;
}) {
  const bak = dusunceli ? { x: 2, y: -3 } : { x: 0, y: 0 };
  const gozR = saskin ? 8 : 7;
  return (
    <svg
      className={`maskot${mutlu ? ' maskot--mutlu' : ''}${dusunceli ? ' maskot--dusunceli' : ''}`}
      width={boyut}
      height={boyut}
      viewBox="0 0 120 124"
      aria-hidden="true"
      focusable="false"
    >
      {/* Omuzlar: yelek ve kırmızı kuşak */}
      <path d="M22 124 Q24 100 60 98 Q96 100 98 124Z" fill="var(--maskot-yelek)" />
      <path d="M44 100 L60 124 L76 100" fill="var(--maskot-gomlek)" />
      <path d="M30 112 Q60 104 90 112" stroke="var(--maskot-bandana)" strokeWidth="5" fill="none" />

      {/* Kafa */}
      <ellipse cx="60" cy="64" rx="40" ry="38" fill="var(--maskot-kurk)" />
      <ellipse cx="60" cy="86" rx="24" ry="16" fill="var(--maskot-yuz)" />

      {/* Bandana: madalyon, altın desen, yandan sarkan düğüm ve püskül */}
      <path d="M17 62 Q16 22 60 19 Q104 22 103 62 Q96 46 60 45 Q24 46 17 62Z" fill="var(--maskot-bandana)" />
      <path
        d="M22 52 L28 46 L34 52 L40 46 L46 52 L52 46 L58 52 L64 46 L70 52 L76 46 L82 52 L88 46 L94 52 L99 47"
        fill="none"
        stroke="var(--maskot-desen)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="31" r="5.5" fill="var(--maskot-desen)" stroke="var(--maskot-bandana-koyu)" strokeWidth="1.5" />
      <circle cx="18" cy="60" r="7" fill="var(--maskot-bandana-koyu)" />
      <path d="M15 64 Q8 74 11 86" stroke="var(--maskot-bandana)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="6" y="84" width="10" height="12" rx="3" fill="var(--maskot-bandana-koyu)" />
      <path d="M8 96 V102 M11 96 V103 M14 96 V102" stroke="var(--maskot-desen)" strokeWidth="1.6" />

      {/* Gözler (kırpılan grup) */}
      <g className="maskot__gozler">
        {mutlu ? (
          <>
            <path d="M38 64 Q46 56 54 64" fill="none" stroke="var(--maskot-goz)" strokeWidth="4" strokeLinecap="round" />
            <path d="M66 64 Q74 56 82 64" fill="none" stroke="var(--maskot-goz)" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="46" cy="63" r={gozR + 4} fill="var(--maskot-goz-beyaz)" />
            <circle cx="74" cy="63" r={gozR + 4} fill="var(--maskot-goz-beyaz)" />
            <circle cx={46 + bak.x} cy={63 + bak.y} r={gozR} fill="var(--maskot-iris)" />
            <circle cx={74 + bak.x} cy={63 + bak.y} r={gozR} fill="var(--maskot-iris)" />
            <circle cx={46 + bak.x} cy={63 + bak.y} r={gozR - 3} fill="var(--maskot-goz)" />
            <circle cx={74 + bak.x} cy={63 + bak.y} r={gozR - 3} fill="var(--maskot-goz)" />
            <circle cx={44 + bak.x} cy={60 + bak.y} r="2.2" fill="var(--maskot-goz-beyaz)" />
            <circle cx={72 + bak.x} cy={60 + bak.y} r="2.2" fill="var(--maskot-goz-beyaz)" />
          </>
        )}
      </g>

      {/* Yuvarlak altın gözlük */}
      <circle cx="46" cy="63" r="13.5" fill="none" stroke="var(--maskot-gozluk)" strokeWidth="3" />
      <circle cx="74" cy="63" r="13.5" fill="none" stroke="var(--maskot-gozluk)" strokeWidth="3" />
      <path d="M58 61 Q60 58 62 61" fill="none" stroke="var(--maskot-gozluk)" strokeWidth="2.5" />
      <path d="M32.5 61 L22 58 M87.5 61 L98 58" stroke="var(--maskot-gozluk)" strokeWidth="2" />

      {/* Burun, yanaklar, bıyıklar */}
      <circle cx="40" cy="84" r="4.5" fill="var(--maskot-burun)" opacity="0.45" />
      <circle cx="80" cy="84" r="4.5" fill="var(--maskot-burun)" opacity="0.45" />
      <ellipse cx="60" cy="80" rx="7.5" ry="5.5" fill="var(--maskot-burun)" />
      <ellipse cx="58" cy="78" rx="2.5" ry="1.5" fill="var(--maskot-goz-beyaz)" opacity="0.7" />
      <path
        d="M44 84 L28 81 M44 88 L28 90 M76 84 L92 81 M76 88 L92 90"
        stroke="var(--maskot-biyik)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Ağız */}
      {saskin ? (
        <ellipse cx="60" cy="93" rx="4.5" ry="5.5" fill="var(--maskot-agiz)" />
      ) : dusunceli ? (
        <circle cx="64" cy="92" r="3" fill="none" stroke="var(--maskot-goz)" strokeWidth="2.5" />
      ) : mutlu ? (
        <>
          <path d="M48 88 Q60 102 72 88Z" fill="var(--maskot-agiz)" />
          <rect x="56.5" y="88" width="7" height="5" rx="1" fill="var(--maskot-goz-beyaz)" />
        </>
      ) : (
        <>
          <path d="M50 88 Q60 97 70 88" fill="none" stroke="var(--maskot-goz)" strokeWidth="3" strokeLinecap="round" />
          <rect x="56.5" y="89" width="7" height="5" rx="1" fill="var(--maskot-goz-beyaz)" />
        </>
      )}
    </svg>
  );
}

const SOZLER = [
  'Bugün bir eser keşfedelim mi?',
  'Her eserin bir vakfı, her vakfın bir hikâyesi var!',
  'Bir han, uzak bir şehirdeki camiyi yaşatabilir. Merak ettin mi?',
  'Haritada yakınlaştır: ilçeler, sonra eserler çıkar!',
  'Yanlış cevap yok, sadece ipucu var. Hadi!',
];

/** Yol ekranının üstünde konuşan maskot. Söz gün boyunca aynı kalır. */
export function KonusanMaskot({ mesaj }: { mesaj?: string }) {
  const gun = Math.floor(Date.now() / 86_400_000);
  const soz = mesaj ?? SOZLER[gun % SOZLER.length]!;
  return (
    <div className="konusan-maskot">
      <Maskot boyut={64} />
      <p className="konusan-maskot__balon">{soz}</p>
    </div>
  );
}
