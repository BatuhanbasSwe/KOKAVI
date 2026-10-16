/**
 * Köstik: uygulamanın maskotu. Kırmızı bandanalı, yuvarlak gözlüklü, meraklı
 * bir köstebek kâşif ("Tarihi keşfet, geleceği anla!").
 *
 * Görseller takımın karakter sayfasından (public/maskot/) daire portre olarak
 * kesildi; uygulamanın madalyon diliyle aynı. İfadeler: varsayılan meraklı
 * (dürbünlü) · `mutlu` · `saskin` · `dusunceli` (ipucu anı; üzgün DEĞİL).
 *
 * Süs olduğu için aria-hidden ve alt=""; anlam her zaman yanındaki metindedir.
 * Mutlu anda kısa bir zıplama yapar; "hareketi azalt" ayarında durur.
 */

type Ifade = 'merakli' | 'mutlu' | 'saskin' | 'dusunceli';

export function Maskot({
  boyut = 72,
  mutlu = false,
  dusunceli = false,
  saskin = false,
}: {
  boyut?: number;
  mutlu?: boolean;
  /** İpucu anı: düşünüyor, üzgün DEĞİL. */
  dusunceli?: boolean;
  /** Şaşkın: iri gözler, açık ağız. */
  saskin?: boolean;
}) {
  const ifade: Ifade = mutlu ? 'mutlu' : saskin ? 'saskin' : dusunceli ? 'dusunceli' : 'merakli';
  return (
    <span
      key={ifade}
      className={`maskot maskot--${ifade}`}
      style={{ width: boyut, height: boyut }}
      aria-hidden="true"
    >
      <img src={`/maskot/kostik-${ifade}.webp`} alt="" width={boyut} height={boyut} decoding="async" draggable={false} />
    </span>
  );
}

const SOZLER = [
  'Bugün bir eser keşfedelim mi?',
  'Her eserin bir vakfı, her vakfın bir hikâyesi var!',
  'Bir han, uzak bir şehirdeki camiyi yaşatabilir. Merak ettin mi?',
  'Haritada yakınlaştır: ilçeler, sonra eserler çıkar!',
  'Yanlış cevap yok, sadece ipucu var. Hadi!',
];

/** Konuşan maskot. Söz gün boyunca aynı kalır. */
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
