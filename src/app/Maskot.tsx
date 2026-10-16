/**
 * Kâşif — uygulamanın maskotu: gözleri olan bir Selçuklu çini yıldızı.
 *
 * Yol düğümleriyle aynı sekiz köşeli yıldız; çocuk onu "yol arkadaşı" olarak
 * tanır. Süs olduğu için aria-hidden; konuşma balonundaki metin ayrıca
 * görünür metin olarak verilir. Renkler tema jetonlarından gelir.
 * Animasyon (süzülme, göz kırpma) "hareketi azalt" ayarında durur.
 */

const DIS =
  '60,6 75.8,21.8 98.2,21.8 98.2,44.2 114,60 98.2,75.8 98.2,98.2 75.8,98.2 60,114 44.2,98.2 21.8,98.2 21.8,75.8 6,60 21.8,44.2 21.8,21.8 44.2,21.8';

export function Maskot({ boyut = 72, mutlu = false }: { boyut?: number; mutlu?: boolean }) {
  return (
    <svg
      className={`maskot${mutlu ? ' maskot--mutlu' : ''}`}
      width={boyut}
      height={boyut}
      viewBox="0 0 120 124"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={DIS} transform="translate(0 6)" fill="var(--vurgu-golge)" />
      <polygon points={DIS} fill="var(--vurgu)" />
      <circle cx="60" cy="60" r="34" fill="var(--zemin-kart)" />
      <g className="maskot__gozler">
        <ellipse cx="48" cy="56" rx="6" ry="8" fill="var(--metin)" />
        <ellipse cx="72" cy="56" rx="6" ry="8" fill="var(--metin)" />
        <circle cx="50" cy="53" r="2.2" fill="var(--zemin-kart)" />
        <circle cx="74" cy="53" r="2.2" fill="var(--zemin-kart)" />
      </g>
      <path
        d={mutlu ? 'M46 70 Q60 86 74 70' : 'M48 72 Q60 80 72 72'}
        fill="none"
        stroke="var(--metin)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="40" cy="70" r="5" fill="var(--odul)" opacity="0.7" />
      <circle cx="80" cy="70" r="5" fill="var(--odul)" opacity="0.7" />
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
