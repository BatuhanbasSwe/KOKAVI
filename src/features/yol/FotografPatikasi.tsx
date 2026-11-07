/**
 * Fotoğraf patikası: bir ünitenin dersleri, eserin kapak fotoğrafıyla yuvarlak
 * madalyonlar hâlinde zikzak bir yol üzerinde.
 *
 * Durum renkle DEĞİL, simge + metinle de verilir: biten = safran kenar + onay,
 * sıradaki = büyük madalyon + ilerleme halkası + "Devam et", kilitli = gri +
 * kilit simgesi. Madalyonlar gerçek <a>; erişilebilir adı "Eser, tür, durum".
 *
 * Canlı yol (yolSahnesi.ts): madalyonları kıvrımlı bir yol bağlar; biten kısım
 * altın, kalan kısım kesik çizgi. Ders bitince yol altınla dolar; yeni açılan
 * ünitede kilitler kırılır, fotoğraflar renklenir.
 * Bütün hareket katmanları aria-hidden; "hareketi azalt" açıksa sahne oynamaz.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { YolUnitesi } from '@shared/types';
import { IkonKilit, IkonTik, IkonTur } from '../../app/Ikonlar';
import { canlandirilabilir } from '../../app/hareket';
import { kisaAd } from './kisaAd';
import { BOS_SAHNE, egriYolu, type Nokta, type YolSahnesi } from './yolSahnesi';
import './patika.css';

/** Zikzak: duraklar sırayla sola/sağa kayar (px; telefonda CSS ile küçülür). */
const KAYMALAR = [0, -60, -84, -60, 0, 60, 84, 60];

type Durum = 'tamam' | 'aktif' | 'acik' | 'kilitli';

const DURUM_METNI: Record<Durum, string> = {
  tamam: 'tamamlandı',
  aktif: 'sıradaki ders, devam et',
  acik: 'başlayabilirsin',
  kilitli: 'kilitli, önceki üniteyi tamamla',
};

const YAY = 'cubic-bezier(0.22, 1, 0.36, 1)';

function Madalyon({ eserId, tur }: { eserId: string; tur: string }) {
  const [yok, setYok] = useState(false);
  return (
    <span className="patika__madalyon">
      {yok ? (
        <IkonTur tur={tur} boyut={30} />
      ) : (
        <img src={`/gorseller/${eserId}/k.webp`} alt="" loading="lazy" decoding="async" onError={() => setYok(true)} />
      )}
    </span>
  );
}

/** Madalyon merkezlerini (patikaya göre) ölçer; boyut ve giriş animasyonu bitince yeniler. */
function useMadalyonMerkezleri(ol: RefObject<HTMLOListElement | null>) {
  const [olcu, setOlcu] = useState<{ noktalar: Nokta[]; w: number; h: number } | null>(null);
  const olc = useCallback(() => {
    const kap = ol.current;
    if (!kap) return;
    if (kap.offsetWidth === 0) return;
    // Yerleşimden ölçülür (offset zinciri + durağın zikzak kayması). Giriş ve
    // kaydırma animasyonları (translate/scale) ölçüyü etkilemez: yol yerinde kalır.
    const noktalar = [...kap.querySelectorAll<HTMLElement>(':scope > li')].map((li) => {
      const m = li.querySelector<HTMLElement>('.patika__madalyon');
      if (!m) return { x: 0, y: 0 };
      let x = m.offsetWidth / 2;
      let y = m.offsetHeight / 2;
      for (let o: HTMLElement | null = m; o && o !== li; o = o.offsetParent as HTMLElement | null) {
        x += o.offsetLeft;
        y += o.offsetTop;
      }
      const donusum = getComputedStyle(li).transform;
      const kayma = typeof DOMMatrixReadOnly === 'undefined' || donusum === 'none' ? { e: 0, f: 0 } : new DOMMatrixReadOnly(donusum);
      return { x: x + li.offsetLeft + kayma.e, y: y + li.offsetTop + kayma.f };
    });
    setOlcu({ noktalar, w: kap.offsetWidth, h: kap.offsetHeight });
  }, [ol]);

  useLayoutEffect(() => {
    const kap = ol.current;
    if (!kap) return;
    olc();
    let kare = 0;
    const yenile = () => {
      cancelAnimationFrame(kare);
      kare = requestAnimationFrame(olc);
    };
    // Duraklar yaylanarak gelir (durak-gel); bitince merkezler son yerindedir.
    kap.addEventListener('animationend', yenile);
    const gozlemci = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(yenile);
    gozlemci?.observe(kap);
    return () => {
      cancelAnimationFrame(kare);
      kap.removeEventListener('animationend', yenile);
      gozlemci?.disconnect();
    };
  }, [ol, olc]);

  return olcu;
}

/** Bölüm ekranda yeterince görününce bir kez true olur (sahneler görülmeden oynamasın). */
function useGoruldu(oge: RefObject<HTMLElement | null>, etkin: boolean) {
  const [goruldu, setGoruldu] = useState(false);
  useEffect(() => {
    const kap = oge.current;
    if (!etkin || !kap || typeof IntersectionObserver === 'undefined') return;
    const gozlemci = new IntersectionObserver(
      (girdiler) => {
        if (girdiler.some((g) => g.isIntersecting)) {
          setGoruldu(true);
          gozlemci.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    gozlemci.observe(kap);
    return () => gozlemci.disconnect();
  }, [oge, etkin]);
  return goruldu;
}

export function FotografPatikasi({
  unite,
  sehirAdi,
  guncelDersId,
  sahne = BOS_SAHNE,
}: {
  unite: YolUnitesi;
  sehirAdi: string;
  guncelDersId: string | null;
  sahne?: YolSahnesi;
}) {
  const yuzde = unite.toplamSayi ? Math.round((unite.tamamlananSayi / unite.toplamSayi) * 100) : 0;
  const bolum = useRef<HTMLElement>(null);
  const ol = useRef<HTMLOListElement>(null);
  const olcu = useMadalyonMerkezleri(ol);

  const sira = (dersId: string | null) => unite.dersler.findIndex((d) => d.dersId === dersId);
  const kimeSira = sira(sahne.kime);
  const kimdenSira = sira(sahne.kimden);
  const yeniAcildi = sahne.yeniAcilan.includes(unite.uniteId);
  const goruldu = useGoruldu(bolum, yeniAcildi);
  // Ünite mührü: bütün dersler bittiyse başlıkta durur; bu ziyarette bittiyse basılır.
  const bitti = unite.toplamSayi > 0 && unite.tamamlananSayi === unite.toplamSayi;
  const yeniBitti = sahne.yeniBiten.includes(unite.uniteId);
  const baslik = useRef<HTMLElement>(null);
  const muhurGoruldu = useGoruldu(baslik, yeniBitti);
  const oynadi = useRef(false);

  // Ölçüler her giriş animasyonundan sonra yenilenir; sahne yalnızca ilk hazır
  // olduğunda bir kez başlar ve zamanlayıcıları yalnızca kapanışta temizlenir.
  const olcuHazir = !!olcu && olcu.noktalar.length > Math.max(kimeSira, kimdenSira, 0);
  const zamanlayicilar = useRef<number[]>([]);
  useEffect(() => () => zamanlayicilar.current.forEach((z) => window.clearTimeout(z)), []);

  // --- İlerleme sahnesi: onay patlar → yol altınla dolar → hedef durak vurgulanır
  useEffect(() => {
    if (kimeSira < 0 || oynadi.current || !olcuHazir) return;
    const kap = ol.current;
    const duraklar = kap ? [...kap.querySelectorAll<HTMLElement>(':scope > li')] : [];
    const hedefDurak = duraklar[kimeSira];
    if (!kap || !hedefDurak || !canlandirilabilir(kap)) return;
    oynadi.current = true;
    hedefDurak.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Yeni açılan ünitede önce kilitler kırılsın.
    const baslangic = yeniAcildi ? 1500 : 650;
    const sonra = (ms: number, is: () => void) => zamanlayicilar.current.push(window.setTimeout(is, ms));

    sonra(baslangic - 400, () => {
      duraklar[kimdenSira]
        ?.querySelector('.patika__rozet')
        ?.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], {
          duration: 480,
          easing: YAY,
        });
      for (const parca of kap.querySelectorAll<SVGPathElement>('.patika__yol-altin--yeni')) {
        parca.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: 800,
          easing: 'ease-in-out',
          fill: 'forwards',
        });
      }
    });
    sonra(baslangic, () => {
      hedefDurak
        .querySelector('.patika__halka-cizgi')
        ?.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 900, easing: 'ease-out' });
      hedefDurak
        .querySelector('.patika__devam')
        ?.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], {
          duration: 240,
          delay: 250,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'backwards',
        });
    });
  }, [olcuHazir, kimeSira, kimdenSira, yeniAcildi]);

  // Yolun parçaları: ders i bittiyse i → i+1 altın. Bu ziyarette bitenler sahneyle dolar.
  const parcalar = olcu
    ? olcu.noktalar.slice(1).map((n, i) => ({
        d: egriYolu(olcu.noktalar[i]!, n),
        altin: unite.dersler[i]?.tamamlandi ?? false,
        yeni: kimdenSira >= 0 && i >= kimdenSira && i < kimeSira,
      }))
    : [];

  return (
    <section
      ref={bolum}
      className={`patika-unite${unite.kilitli ? ' patika-unite--kilitli' : ''}${yeniAcildi ? (goruldu ? ' patika-unite--aciliyor' : ' patika-unite--acilacak') : ''}`}
      aria-labelledby={`unite-${unite.uniteId}`}
    >
      <header ref={baslik} className="patika-unite__baslik">
        <div className="patika-unite__satir">
          <h3 id={`unite-${unite.uniteId}`}>{unite.ad}</h3>
          <span className="patika-unite__sayac">
            {unite.kilitli ? <IkonKilit boyut={16} /> : null}
            {unite.tamamlananSayi}/{unite.toplamSayi}
            <span className="sr-only">{unite.kilitli ? ' (kilitli)' : ' ders tamamlandı'}</span>
          </span>
          {bitti && (
            <span
              className={`patika-unite__muhur${yeniBitti ? (muhurGoruldu ? ' patika-unite__muhur--bas' : ' patika-unite__muhur--bekle') : ''}`}
              aria-hidden="true"
            >
              <IkonTik boyut={14} />
              Tamam
            </span>
          )}
        </div>
        <div
          className="patika-unite__cubuk"
          role="progressbar"
          aria-valuenow={yuzde}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${sehirAdi} ${unite.ad} ilerlemesi: yüzde ${yuzde}`}
        >
          <span style={{ width: `${yuzde}%` }} />
        </div>
      </header>

      <ol ref={ol} className="patika" aria-label={`${unite.ad} dersleri`}>
        {parcalar.length > 0 && olcu && (
          <svg
            className="patika__yol"
            width={olcu.w}
            height={olcu.h}
            viewBox={`0 0 ${olcu.w} ${olcu.h}`}
            aria-hidden="true"
            focusable="false"
          >
            {parcalar.map((p, i) => (
              <path key={`iz${i}`} className="patika__yol-iz" d={p.d} />
            ))}
            {parcalar.map((p, i) =>
              p.altin ? (
                <path
                  key={`altin${i}`}
                  className={`patika__yol-altin${p.yeni ? ' patika__yol-altin--yeni' : ''}`}
                  d={p.d}
                  pathLength={1}
                />
              ) : null,
            )}
          </svg>
        )}
        {unite.dersler.map((ders, i) => {
          const durum: Durum = unite.kilitli
            ? 'kilitli'
            : ders.tamamlandi
              ? 'tamam'
              : ders.dersId === guncelDersId
                ? 'aktif'
                : 'acik';
          const ad = kisaAd(ders.eserAdi);
          // Ad, ekranda görünen metinle aynı sırada başlar (WCAG 2.5.3): "Ulucami Devam et, …".
          const etiket =
            durum === 'aktif'
              ? `${ad} Devam et, ${ders.eserAdi === ad ? '' : `${ders.eserAdi}, `}${ders.tur}, sıradaki ders`
              : `${ders.eserAdi}, ${ders.tur}, ${DURUM_METNI[durum]}`;
          const kayma = KAYMALAR[i % KAYMALAR.length]!;
          const stil = { '--kayma': `${kayma}px`, '--sira': i } as CSSProperties;

          const gorunum = (
            <>
              <span className="patika__cerceve" aria-hidden="true">
                {durum === 'aktif' && (
                  <svg className="patika__halka" viewBox="0 0 120 120" focusable="false">
                    <circle className="patika__halka-iz" cx="60" cy="60" r="56" />
                    <circle className="patika__halka-cizgi" cx="60" cy="60" r="56" pathLength="100" />
                  </svg>
                )}
                <Madalyon eserId={ders.eserId} tur={ders.tur} />
                {durum === 'tamam' && (
                  <span className="patika__rozet">
                    <IkonTik boyut={16} />
                  </span>
                )}
                {durum === 'kilitli' && (
                  <span className="patika__rozet patika__rozet--kilit">
                    <IkonKilit boyut={14} />
                  </span>
                )}
                {/* Yeni açılan ünite: kilit ikiye ayrılıp dağılır (yalnızca süs). */}
                {yeniAcildi && durum !== 'kilitli' && (
                  <span className="patika__kirik">
                    <span className="patika__kirik-yari patika__kirik-yari--sol">
                      <IkonKilit boyut={14} />
                    </span>
                    <span className="patika__kirik-yari patika__kirik-yari--sag">
                      <IkonKilit boyut={14} />
                    </span>
                  </span>
                )}
              </span>
              <span className="patika__ad" aria-hidden="true">
                {ad}
              </span>
              {/* Boşluk: görünen metin "Ulucami Devam et" olarak birleşsin (WCAG 2.5.3). */}
              {durum === 'aktif' && ' '}
              {durum === 'aktif' && (
                <span className="patika__devam" aria-hidden="true">
                  Devam et
                </span>
              )}
            </>
          );

          return (
            <li
              key={ders.dersId}
              className={`patika__durak patika__durak--${durum}${kayma > 0 ? ' patika__durak--sag' : ''}`}
              style={stil}
            >
              {durum === 'kilitli' ? (
                <span className="patika__baglanti" role="img" aria-label={etiket}>
                  {gorunum}
                </span>
              ) : (
                <a className="patika__baglanti" href={`#/ders/${encodeURIComponent(ders.dersId)}`} aria-label={etiket}>
                  {gorunum}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
