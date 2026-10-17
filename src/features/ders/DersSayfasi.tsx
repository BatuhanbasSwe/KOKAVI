/**
 * DERS MOTORU — beş adımlı akışın kabuğu.
 *
 * PDF: "Her gün 3–5 dakikalık bir ders: bir vakıf eseri, BEŞ ADIMLIK akış,
 * karışık egzersiz tipleri."
 *
 * Akış: 01 Merak (cezasız tahmin) → 02 Bağlam (öğretim) → 03 Perspektif
 * (tek karar anı) → 04 Geri çağırma (egzersizler) → 05 Yansıma (Vakıf Röntgeni).
 *
 * Erişilebilirlik (WCAG 2.2 AA — erişilebilirlik tasarımda değil ÜRÜNDE):
 *  - Adım değişince başlık odaklanır ve adım değişimi aria-live ile duyurulur.
 *  - Tüm etkileşim klavyeyle yapılabilir; hiçbir yerde sürükle-bırak yok.
 *  - İlerleme göstergesi role="progressbar" + metinli adım listesi sunar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ELMAS_ODULU, type Ders, type Egzersiz, type Eser } from '@shared/types';
import { api } from '../../lib/api';
import { baslikAyarla, git } from '../../lib/yonlendirme';
import { useDurum } from '../../app/DurumSaglayici';
import { ADIMLAR, AdimGostergesi, adimBilgisi } from './AdimGostergesi';
import { MerakAdimi } from './MerakAdimi';
import { BaglamAdimi } from './BaglamAdimi';
import { PerspektifAdimi } from './PerspektifAdimi';
import { GeriCagirmaAdimi } from './GeriCagirmaAdimi';
import { YansimaAdimi } from './YansimaAdimi';
import { DersSonu } from './DersSonu';
import { EserGalerisi, EserKapakAcilis } from './EserGalerisi';
import { EkIpucuBaglami } from './EgzersizKabugu';
import { IkonKapat, IkonTur } from '../../app/Ikonlar';
import { YasiyorRozeti } from '../merkez/YasiyorRozeti';
import {
  gunMetni,
  tekrarEgzersizSirasi,
  vadesiGelenler,
  type TekrarKaydi,
} from '../../lib/tekrar';
import './ders.css';

/** Bu derste sorulacak aralıklı tekrar sorusu (önceki bir dersten). */
export interface TekrarGorevi {
  kayit: TekrarKaydi;
  egzersiz: Egzersiz;
}

interface Props {
  dersId: string;
}

export function DersSayfasi({ dersId }: Props) {
  const { dersTamamla, ayarlar, ilerleme, tekrar, tekrarTakvimeEkle, tekrarSonucu, carsi, ipucuKullan } =
    useDurum();

  const [ders, setDers] = useState<Ders | null>(null);
  const [eser, setEser] = useState<Eser | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [eserYukleniyor, setEserYukleniyor] = useState(false);
  const [eserHatasi, setEserHatasi] = useState<string | null>(null);
  const [denemeSayisi, setDenemeSayisi] = useState(0);

  const [adim, setAdim] = useState(1);
  const [egzersizSirasi, setEgzersizSirasi] = useState(0);

  // Aralıklı tekrar: ders açılırken BİR KEZ seçilir (ders sırasında değişmez).
  const [tekrarGorevi, setTekrarGorevi] = useState<TekrarGorevi | null>(null);
  const [tekrarSonucMetni, setTekrarSonucMetni] = useState<string | null>(null);
  const tekrarRef = useRef(tekrar);
  tekrarRef.current = tekrar;
  const adimRef = useRef(1);

  // Ders sonu ekranı
  const [bitti, setBitti] = useState<{ yeni: boolean } | null>(null);

  // Adım başlığı: adım değişince odak buraya taşınır.
  const baslikRef = useRef<HTMLHeadingElement>(null);

  // --- Yükleme --------------------------------------------------------------
  useEffect(() => {
    let iptal = false;

    setYukleniyor(true);
    setHata(null);
    setDers(null);
    setEser(null);
    setEserHatasi(null);
    setAdim(1);
    setEgzersizSirasi(0);
    setTekrarGorevi(null);
    setTekrarSonucMetni(null);
    setBitti(null);

    void (async () => {
      try {
        const gelenDers = await api.ders(dersId);
        if (iptal) return;

        setDers(gelenDers);
        setYukleniyor(false);

        // Vadesi gelen bir tekrar varsa önceki dersten bir egzersiz getirilir.
        // Hata olursa ders tekrarsız devam eder — tekrar asla akışı kilitlemez.
        const vadeli = vadesiGelenler(tekrarRef.current, gunMetni(new Date()), dersId)[0];
        if (vadeli) {
          void api
            .ders(vadeli.dersId)
            .then((eskiDers) => {
              if (iptal) return;
              const i = tekrarEgzersizSirasi(vadeli, eskiDers.egzersizler.length);
              const egzersiz = i >= 0 ? eskiDers.egzersizler[i] : undefined;
              // Çocuk Geri çağırma adımına geldiyse sıralama kaymasın: o derste tekrar yok.
              if (egzersiz && adimRef.current < 4) setTekrarGorevi({ kayit: vadeli, egzersiz });
            })
            .catch(() => {
              /* çevrimdışı vb.: tekrar bir sonraki derse kalır */
            });
        }

        // Eser bilgisi yalnızca Vakıf Röntgeni için gerekli; ders onu beklemez.
        setEserYukleniyor(true);
        try {
          const gelenEser = await api.eser(gelenDers.eserId);
          if (!iptal) setEser(gelenEser);
        } catch (eserHatasiNesnesi) {
          if (!iptal) {
            setEserHatasi(
              eserHatasiNesnesi instanceof Error
                ? eserHatasiNesnesi.message
                : 'Eser bilgisi yüklenemedi',
            );
          }
        } finally {
          if (!iptal) setEserYukleniyor(false);
        }
      } catch (dersHatasiNesnesi) {
        if (iptal) return;
        setHata(
          dersHatasiNesnesi instanceof Error ? dersHatasiNesnesi.message : 'Ders yüklenemedi',
        );
        setYukleniyor(false);
      }
    })();

    return () => {
      iptal = true;
    };
  }, [dersId, denemeSayisi]);

  // PDF/erişilebilirlik: sayfa başlığı ekran okuyucu ve sekme için ayarlanır.
  useEffect(() => {
    if (hata) {
      baslikAyarla('Ders açılamadı');
      return;
    }
    if (!ders) {
      baslikAyarla('Ders yükleniyor');
      return;
    }
    baslikAyarla(eser?.ad ?? ders.eser?.ad ?? 'Ders');
  }, [ders, eser, hata]);

  // Adım (veya egzersiz) değişince odak yeni başlığa taşınır.
  useEffect(() => {
    if (!ders || bitti) return;
    baslikRef.current?.focus();
  }, [ders, adim, egzersizSirasi, bitti]);

  // --- Gezinme --------------------------------------------------------------
  // Tekrar sorusu varsa Geri çağırma adımının İLK egzersizidir.
  const tekrarSayisi = tekrarGorevi ? 1 : 0;
  const toplamEgzersiz = (ders?.egzersizler.length ?? 0) + tekrarSayisi;

  const adimIlerle = useCallback(() => {
    setAdim((mevcut) => Math.min(ADIMLAR.length, mevcut + 1));
  }, []);

  /** Egzersiz bitince sıradakine, son egzersizde Yansıma adımına geçer. */
  const egzersizIlerle = useCallback(() => {
    if (egzersizSirasi + 1 < toplamEgzersiz) {
      setEgzersizSirasi(egzersizSirasi + 1);
      return;
    }
    setAdim((mevcut) => Math.min(ADIMLAR.length, mevcut + 1));
  }, [egzersizSirasi, toplamEgzersiz]);

  const yenidenDene = useCallback(() => {
    setDenemeSayisi((mevcut) => mevcut + 1);
  }, []);

  /** Tekrar sorusu bitti: ipucusuz çözüldüyse aralık uzar, değilse yarın tekrar. */
  const tekrarBitti = useCallback(
    (ipucusuz: boolean) => {
      if (!tekrarGorevi) return;
      tekrarSonucu(tekrarGorevi.kayit.dersId, ipucusuz);
      const ad = tekrarGorevi.kayit.eserAdi.split(' (')[0];
      setTekrarSonucMetni(
        ipucusuz
          ? `${ad} tekrarını ipucusuz bildin. Bu eser daha uzun bir aradan sonra yeniden sorulacak.`
          : `${ad} tekrarında ipucu aldın. Bu eser yarın yeniden karşına çıkacak.`,
      );
    },
    [tekrarGorevi, tekrarSonucu],
  );

  /** PDF: "Kâşif Defteri dolar" — ilerleme cihazda tutulur, sunucuya gitmez. */
  const dersiBitir = useCallback(() => {
    if (!ders) return;
    const yeni = !ilerleme.tamamlananDersler.includes(ders.id);
    dersTamamla(ders.id, ders.eserId);
    tekrarTakvimeEkle(ders.id, eser?.ad ?? ders.eser?.ad ?? 'Bu eser');
    setBitti({ yeni });
  }, [ders, dersTamamla, eser, ilerleme.tamamlananDersler, tekrarTakvimeEkle]);

  // --- Görünüm --------------------------------------------------------------
  adimRef.current = adim;
  const bilgi = adimBilgisi(adim);
  const dersBasligi = eser?.ad ?? ders?.eser?.ad ?? 'Kök Avı dersi';
  const eserAltBilgi = [eser?.tur ?? ders?.eser?.tur, eser?.ilce].filter(Boolean).join(' · ');

  // Adım değişimini ekran okuyucuya duyurur; egzersiz sırası da buradadır.
  const duyuru =
    adim === 4 && toplamEgzersiz > 0
      ? `${adim}/${ADIMLAR.length} ${bilgi.ad} — Egzersiz ${egzersizSirasi + 1}/${toplamEgzersiz}`
      : `${adim}/${ADIMLAR.length} ${bilgi.ad} — ${bilgi.aciklama}`;

  if (yukleniyor) {
    return (
      <div className="ders-sayfa">
        <p className="bildirim bildirim--bilgi" role="status">
          Ders yükleniyor…
        </p>
      </div>
    );
  }

  if (hata || !ders) {
    return (
      <div className="ders-sayfa">
        <div className="kart yigin ders-hata">
          <h1 className="ders-baslik">Ders açılamadı</h1>
          <p className="bildirim bildirim--hata" role="alert">
            {hata ?? 'Ders bulunamadı.'}
          </p>
          <div className="satir">
            <button type="button" className="dugme" onClick={yenidenDene}>
              Yeniden dene
            </button>
            <button type="button" className="dugme dugme--ikincil" onClick={() => git('yol')}>
              Öğrenme yoluna dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (bitti) {
    return (
      <div className="ders-sayfa">
        <DersSonu
          eserAdi={dersBasligi}
          eserTur={eser?.tur ?? ders.eser?.tur ?? null}
          eserSehir={eser?.ilce ?? null}
          kapak={eser?.fotograflar?.[0] ?? null}
          kazanilanElmas={bitti.yeni ? ELMAS_ODULU : 0}
          seriGun={ilerleme.seri.gunSayisi}
          tekrarSonucMetni={tekrarSonucMetni}
          onDevam={() => git('yol')}
        />
      </div>
    );
  }

  return (
    <div className="ders-sayfa">
      {/* Odak modu üst çubuğu: çıkış + ilerleme (Duolingo gibi, başka hiçbir şey yok). */}
      <div className="ders-ustcubuk">
        <a className="ders-cikis" href="#/yol" aria-label="Dersten çık, öğrenme yoluna dön">
          <IkonKapat boyut={26} />
        </a>
        <AdimGostergesi aktifAdim={adim} />
      </div>

      {/* Adım değişimi duyurusu (ekran okuyucu, görünmez). */}
      <p className="sr-only" role="status" aria-live="polite">
        {duyuru}
      </p>

      <header className="ders-ust">
        <span className="ders-ust__ikon" aria-hidden="true">
          <IkonTur tur={eser?.tur ?? ders.eser?.tur} boyut={30} kalinlik={1.8} />
        </span>
        <div>
          <h1 className="ders-baslik">{dersBasligi.split(' (')[0]}</h1>
          {eserAltBilgi ? <p className="ders-ust__alt">{eserAltBilgi}</p> : null}
          <YasiyorRozeti eserId={ders.eserId} />
        </div>
      </header>

      <section className="ders-adim" aria-labelledby="ders-adim-basligi">
        {/* tabIndex={-1}: adım değişiminde programatik odak hedefi. */}
        <h2
          id="ders-adim-basligi"
          ref={baslikRef}
          tabIndex={-1}
          className="ders-adim-baslik"
        >
          <span className="etiket">
            {adim}/{ADIMLAR.length}
          </span>{' '}
          <span className="ders-adim-baslik__ad">{bilgi.ad}</span>
          <span className="ders-adim-baslik__alt">
            {adim === 4 && toplamEgzersiz > 0
              ? `${bilgi.aciklama} · Egzersiz ${egzersizSirasi + 1}/${toplamEgzersiz}`
              : bilgi.aciklama}
          </span>
        </h2>

        {/* key: her adımda giriş animasyonu yeniden oynar */}
        <div className="ders-adim-icerik" key={adim}>
          {adim === 1 ? (
            <>
              <EserKapakAcilis foto={eser?.fotograflar?.[0]} />
              <MerakAdimi merak={ders.merak} onDevam={adimIlerle} />
            </>
          ) : null}

          {adim === 2 ? (
            <>
              <EserGalerisi
                fotograflar={eser?.fotograflar ?? []}
                eserAdi={dersBasligi.split(' (')[0] ?? dersBasligi}
              />
              <BaglamAdimi baglam={ders.baglam} onDevam={adimIlerle} />
            </>
          ) : null}

          {adim === 3 ? (
            <PerspektifAdimi perspektif={ders.perspektif} onDevam={adimIlerle} />
          ) : null}

          {adim === 4 ? (
            <EkIpucuBaglami.Provider
              value={{ kavramlar: ders.baglam.kavramlar, hak: carsi.ipucuHakki, kullan: ipucuKullan }}
            >
              <GeriCagirmaAdimi
                egzersizler={ders.egzersizler}
                sirasi={egzersizSirasi}
                sessizMod={ayarlar.sessizMod}
                onIlerle={egzersizIlerle}
                tekrarGorevi={tekrarGorevi}
                onTekrarBitti={tekrarBitti}
                eserAdi={dersBasligi.split(' (')[0] ?? dersBasligi}
              />
            </EkIpucuBaglami.Provider>
          ) : null}

          {adim === 5 ? (
            <YansimaAdimi
              yansima={ders.yansima}
              eser={eser}
              eserYukleniyor={eserYukleniyor}
              eserHatasi={eserHatasi}
              onBitir={dersiBitir}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default DersSayfasi;
