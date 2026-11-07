/**
 * Canlı yarışmanın ortak parçaları: şekilli seçenek rozetleri, yoklama kancası,
 * geri sayım halkası, podyum.
 *
 * ERİŞİLEBİLİRLİK: Kahoot gibi her seçeneğin bir rengi VE bir şekli var
 * (▲ ◆ ● ■). Renk tek başına anlam taşımaz: şeklin adı ekran okuyucuya da
 * söylenir ("Üçgen: …"). Metin her temada düz kart zemininde durur.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import type { CanliSiraSatiri } from '@shared/canli';

export const SEKILLER = [
  { ad: 'Üçgen', sinif: 'ucgen' },
  { ad: 'Elmas', sinif: 'elmas' },
  { ad: 'Daire', sinif: 'daire' },
  { ad: 'Kare', sinif: 'kare' },
] as const;

export function SekilRozeti({ i }: { i: number }) {
  const sekil = SEKILLER[i % SEKILLER.length]!;
  return (
    <span className={`canli-sekil canli-sekil--${sekil.sinif}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
        {sekil.sinif === 'ucgen' && <path d="M12 3 22 20H2Z" />}
        {sekil.sinif === 'elmas' && <path d="M12 2 22 12 12 22 2 12Z" />}
        {sekil.sinif === 'daire' && <circle cx="12" cy="12" r="9.5" />}
        {sekil.sinif === 'kare' && <rect x="3.5" y="3.5" width="17" height="17" rx="2" />}
      </svg>
    </span>
  );
}

/**
 * Sunucu durumunu düzenli aralıkla yoklar. Hata olursa son iyi veriyi tutar
 * (sınıf Wi-Fi'ı bir an kopunca ekran boşalmasın).
 */
export function useYoklama<T>(getir: (() => Promise<T>) | null, aralikMs = 1000) {
  const [veri, setVeri] = useState<T | null>(null);
  const [hata, setHata] = useState<Error | null>(null);
  const getirRef = useRef(getir);
  getirRef.current = getir;
  const [tetik, setTetik] = useState(0);
  const ardisik = useRef(0);
  const veriGeldi = useRef(false);

  useEffect(() => {
    if (!getirRef.current) return;
    let iptal = false;
    let zamanlayici: ReturnType<typeof setTimeout>;
    // Sunucusuz ortamda tek tük 404/ağ hatası gelebilir; veri bir kez geldiyse
    // hatayı ancak art arda ESIK kez tekrarlanınca gösteririz (ekran titremesin).
    // 404'ler canliApi içinde kısa aralıkla yeniden denenir; bu eşik son
    // savunma: geçici bir kopma "Oyun bulunamadı" ekranına dönüşmesin.
    const ESIK = 12;
    const tur = async () => {
      try {
        const yeni = await getirRef.current!();
        if (iptal) return;
        ardisik.current = 0;
        veriGeldi.current = true;
        setVeri(yeni);
        setHata(null);
      } catch (e) {
        if (!iptal) {
          ardisik.current += 1;
          if (!veriGeldi.current ? ardisik.current >= 3 : ardisik.current >= ESIK) setHata(e as Error);
        }
      }
      if (!iptal) zamanlayici = setTimeout(() => void tur(), aralikMs);
    };
    void tur();
    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [aralikMs, tetik, getir === null]);

  return {
    veri,
    hata,
    /** Bir eylemden sonra beklemeden taze durum ister. */
    yenile: () => setTetik((t) => t + 1),
    ayarla: setVeri,
  };
}

/**
 * Kalıcı canlı bölge: aşama değişince tek cümle duyurulur. Sayfayla birlikte
 * yaşar (içerik her aşamada yeniden çizilse de bölge DOM'da kalır, ekran
 * okuyucu değişikliği kaçırmaz). Her saniye değişen sayılar buraya girmez.
 */
export function Duyuru({ mesaj }: { mesaj: string }) {
  return (
    <div className="sr-only" role="status" aria-live="polite">
      {mesaj}
    </div>
  );
}

/** Sunucunun verdiği kalan süreyi bu cihazın saatine çevirip geri sayar. */
export function GeriSayim({ kalanMs, sureSn, anahtar }: { kalanMs: number; sureSn: number; anahtar: string }) {
  const bitis = useRef(0);
  const sonAnahtar = useRef('');
  // Aynı soru içinde gelen her yoklama bitişi düzeltir; geri sayım sıçramaz.
  if (sonAnahtar.current !== anahtar || Math.abs(Date.now() + kalanMs - bitis.current) > 1500) {
    bitis.current = Date.now() + kalanMs;
    sonAnahtar.current = anahtar;
  }
  const [simdi, setSimdi] = useState(() => Date.now());
  useEffect(() => {
    const z = setInterval(() => setSimdi(Date.now()), 250);
    return () => clearInterval(z);
  }, []);

  const kalan = Math.max(0, bitis.current - simdi);
  const saniye = Math.ceil(kalan / 1000);
  const oran = kalan / (sureSn * 1000);
  const cevre = 2 * Math.PI * 26;
  return (
    <div
      className={`canli-sayac${saniye <= 5 ? ' canli-sayac--az' : ''}`}
      role="timer"
      aria-live="off"
      aria-label={`Kalan süre: ${saniye} saniye`}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">
        <circle className="canli-sayac__iz" cx="30" cy="30" r="26" />
        <circle
          className="canli-sayac__dolgu"
          cx="30"
          cy="30"
          r="26"
          strokeDasharray={cevre}
          strokeDashoffset={cevre * (1 - oran)}
        />
      </svg>
      <span className="canli-sayac__sayi" aria-hidden="true">
        {saniye}
      </span>
    </div>
  );
}

/**
 * İlk üç. DOM sırası 1-2-3 (ekran okuyucu doğru okur); görsel diziliş CSS
 * `order` ile klasik podyum: ortada birinci, solda ikinci, sağda üçüncü.
 * Basamaklar 3 → 2 → 1 sırasıyla yükselir.
 */
export function Podyum({ siralama, ben }: { siralama: CanliSiraSatiri[]; ben?: string }) {
  return (
    <ol className="canli-podyum" aria-label="Podyum">
      {siralama.slice(0, 3).map((s, i) => (
          <li
            key={s.takmaAd}
            className={`canli-podyum__basamak canli-podyum__basamak--${i + 1}${s.takmaAd === ben ? ' canli-podyum__basamak--ben' : ''}`}
            style={{ ['--gecikme' as string]: `${[900, 400, 0][i]}ms` }}
          >
            <span className="canli-podyum__ad">
              {s.takmaAd}
              {s.takmaAd === ben ? ' (sen)' : ''}
            </span>
            <span className="canli-podyum__puan">{s.puan} puan</span>
            <span className="canli-podyum__sira">
              <span className="sr-only">Sıra: </span>
              {s.sira}.
            </span>
          </li>
      ))}
    </ol>
  );
}

export function SiraListesi({ siralama, baslik }: { siralama: CanliSiraSatiri[]; baslik: string }) {
  if (siralama.length === 0) return null;
  return (
    <section className="kart canli-sira" aria-label={baslik}>
      <h2 className="canli-sira__baslik">{baslik}</h2>
      <ol className="canli-sira__liste">
        {siralama.map((s, i) => (
          <li key={s.takmaAd} style={{ ['--sira' as string]: i }}>
            <span className="canli-sira__no">{s.sira}.</span>
            <span className="canli-sira__ad">{s.takmaAd}</span>
            <span className="canli-sira__puan">{s.puan}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Katılım bağlantısının QR kodu. Telefon kamerasıyla okutulunca PIN dolu
 * katılma ekranı açılır. Tek `<path>` olarak çizilir; renkler jetonlardan.
 */
export function QrKod({ metin, etiket }: { metin: string; etiket: string }) {
  const { yol, boyut } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(metin);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
    return { yol: d, boyut: n + 8 }; // 4 modül sessiz bölge (QR standardı)
  }, [metin]);
  return (
    <svg className="canli-qr" viewBox={`0 0 ${boyut} ${boyut}`} role="img" aria-label={etiket}>
      <rect width={boyut} height={boyut} className="canli-qr__zemin" />
      <path d={yol} className="canli-qr__nokta" shapeRendering="crispEdges" />
    </svg>
  );
}
