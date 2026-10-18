/**
 * Fotoğraf patikası: bir ünitenin dersleri, eserin kapak fotoğrafıyla yuvarlak
 * madalyonlar hâlinde zikzak bir yol üzerinde.
 *
 * Durum renkle DEĞİL, simge + metinle de verilir: biten = safran kenar + onay,
 * sıradaki = büyük madalyon + ilerleme halkası + "Devam et", kilitli = gri +
 * kilit simgesi. Madalyonlar gerçek <a>; erişilebilir adı "Eser, tür, durum".
 *
 * Canlı yol (yolSahnesi.ts): madalyonları kıvrımlı bir yol bağlar; biten kısım
 * altın, kalan kısım kesik çizgi. Ders bitince Köstik yol boyunca zıplayarak
 * yeni durağa gider; yeni açılan ünitede kilitler kırılır, fotoğraflar renklenir.
 * Bütün hareket katmanları aria-hidden; "hareketi azalt" açıksa sahne oynamaz.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { YolUnitesi } from '@shared/types';
import { IkonKilit, IkonTik, IkonTur } from '../../app/Ikonlar';
import { Maskot } from '../../app/Maskot';
import { canlandirilabilir } from '../../app/hareket';
import { kisaAd } from './kisaAd';
import { BOS_SAHNE, egriYolu, ziplayanNoktalar, type Nokta, type YolSahnesi } from './yolSahnesi';
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

const YAY = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

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
    const r = kap.getBoundingClientRect();
    if (r.width === 0) return;
    const noktalar = [...kap.querySelectorAll<HTMLElement>(':scope > li .patika__madalyon')].map((m) => {
      const k = m.getBoundingClientRect();
      return { x: k.left + k.width / 2 - r.left, y: k.top + k.height / 2 - r.top };
    });
    setOlcu({ noktalar, w: r.width, h: r.height });
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
  const gezgin = useRef<HTMLSpanElement>(null);
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
  // Köstik yürürken duraktaki asıl Köstik gizlenir, varınca yeniden belirir.
  const [vardi, setVardi] = useState(false);
  const yuruyor = kimeSira >= 0 && !vardi;
  const oynadi = useRef(false);

  // Ölçüler her giriş animasyonundan sonra yenilenir; sahne yalnızca ilk hazır
  // olduğunda bir kez başlar ve zamanlayıcıları yalnızca kapanışta temizlenir.
  const olcuHazir = !!olcu && olcu.noktalar.length > Math.max(kimeSira, kimdenSira, 0);
  const zamanlayicilar = useRef<number[]>([]);
  useEffect(() => () => zamanlayicilar.current.forEach((z) => window.clearTimeout(z)), []);

  // --- İlerleme sahnesi: onay patlar → yol altınla dolar → Köstik zıplayarak gelir
  useEffect(() => {
    if (kimeSira < 0 || oynadi.current || !olcuHazir) return;
    const kap = ol.current;
    const yuruyen = gezgin.current;
    const duraklar = kap ? [...kap.querySelectorAll<HTMLElement>(':scope > li')] : [];
    const hedefDurak = duraklar[kimeSira];
    const asilKostik = hedefDurak?.querySelector<HTMLElement>('.patika__maskot');
    if (!kap || !canlandirilabilir(yuruyen) || !hedefDurak || !asilKostik) {
      setVardi(true);
      return;
    }
    oynadi.current = true;
    hedefDurak.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const ayniUnite = kimdenSira >= 0;
    const adim = ayniUnite ? Math.max(3, (kimeSira - kimdenSira) * 3) : 1;
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
      // Konumlar yürüyüş anında ölçülür (giriş animasyonları bitmiş olur).
      const r = kap.getBoundingClientRect();
      const merkez = (o: Element) => {
        const k = o.getBoundingClientRect();
        return { x: k.left + k.width / 2 - r.left, y: k.top + k.height / 2 - r.top };
      };
      const varis = merkez(asilKostik);
      const onceki = duraklar[kimdenSira]?.querySelector('.patika__madalyon');
      const cikis =
        ayniUnite && onceki
          ? { x: merkez(onceki).x, y: merkez(onceki).y - 64 }
          : { x: varis.x, y: varis.y - 160 };
      const noktalar = ziplayanNoktalar(cikis, varis, adim, ayniUnite ? 26 : 0, 8);
      const sure = ayniUnite ? 260 * adim : 700;
      yuruyen.style.opacity = '1';
      const yuruyus = yuruyen.animate(
        noktalar.map((n) => ({ transform: `translate(${n.x - 24}px, ${n.y - 24}px)` })),
        { duration: sure, easing: ayniUnite ? 'linear' : 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
      );
      yuruyus.onfinish = () => {
        yuruyen.style.opacity = '0';
        setVardi(true);
        asilKostik.animate([{ transform: 'scale(0.8) translateY(6px)' }, { transform: 'scale(1.15)' }, { transform: 'none' }], {
          duration: 420,
          easing: YAY,
        });
        hedefDurak
          .querySelector('.patika__halka-cizgi')
          ?.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 900, easing: 'ease-out' });
        hedefDurak
          .querySelector('.patika__devam')
          ?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(0.96)' }, { transform: 'none' }], {
            duration: 600,
            delay: 250,
            easing: YAY,
          });
      };
    });
  }, [olcuHazir, kimeSira, kimdenSira, yeniAcildi]);

  // Sahne yarıda kalırsa (ör. ölçü yok) Köstik görünmez kalmasın.
  useEffect(() => {
    if (!yuruyor) return;
    const z = window.setTimeout(() => setVardi(true), 6000);
    return () => window.clearTimeout(z);
  }, [yuruyor]);

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
        {kimeSira >= 0 && (
          <span ref={gezgin} className="patika__gezgin" aria-hidden="true">
            <Maskot boyut={48} />
          </span>
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
              {durum === 'aktif' && (
                <span className={`patika__maskot${yuruyor ? ' patika__maskot--bekliyor' : ''}`} aria-hidden="true">
                  <Maskot boyut={48} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
