/**
 * Uygulama durumu: ilerleme (cihazda) + erişilebilirlik ayarları + öğrenme yolu.
 *
 * İlerleme asla sunucuya gönderilmez. Ağ yalnızca içerik (ders/eser/yol) için
 * kullanılır; bu yüzden çevrimdışıyken de mevcut içerikle oynanabilir.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Ayarlar, Ilerleme, OgrenmeYolu } from '@shared/types';
import { api, type YolIskeletiSehir } from '../lib/api';
import {
  dersTamamla as dersTamamlaSaf,
  ilerlemeKaydet,
  ilerlemeYukle,
  ilerlemeSifirla,
  seviyeHesapla,
  yolHesapla,
} from '../lib/ilerleme';
import { ayarlariUygula } from '../lib/erisilebilirlik';
import { temaGocuUygula } from './temaGocu';
import {
  dersiTakvimeEkle,
  gunMetni,
  tekrarKaydet,
  tekrarSifirla,
  tekrarSonucunuIsle,
  tekrarYukle,
  type TekrarDurumu,
} from '../lib/tekrar';
import {
  carsiKaydet,
  carsiSifirla,
  carsiYukle,
  ipucuKullan as ipucuKullanSaf,
  satinAl as satinAlSaf,
  sec as secSaf,
  sehirPaketleriniUygula,
  bosCarsiDurumu,
  type CarsiDurumu,
  type SatinAlmaSonucu,
  type Urun,
} from '../lib/carsi';

interface DurumDegeri {
  ilerleme: Ilerleme;
  ayarlar: Ayarlar;
  yolIskeleti: YolIskeletiSehir[];
  yol: OgrenmeYolu | null;
  yukleniyor: boolean;
  hata: string | null;
  cevrimdisi: boolean;
  dersTamamla: (dersId: string, eserId: string) => void;
  ayarGuncelle: (kismi: Partial<Ayarlar>) => void;
  sinifKoduAyarla: (kod: string | null) => void;
  /** Aralıklı tekrar takvimi (yalnızca cihazda). */
  tekrar: TekrarDurumu;
  /** Ders bitince takvime ekler: ilk tekrar sonraki derste gelir. */
  tekrarTakvimeEkle: (dersId: string, eserAdi: string) => void;
  /** Tekrar sorusu bitince: ipucusuz çözüldüyse aralık uzar. */
  tekrarSonucu: (dersId: string, ipucusuz: boolean) => void;
  /** Vakıf Çarşısı: elmasın harcandığı yer (yalnızca cihazda). */
  carsi: CarsiDurumu;
  satinAl: (urun: Urun, hedefSehirId?: string) => SatinAlmaSonucu;
  sec: (urun: Urun) => void;
  /** Ek ipucu hakkı kullanır; hak yoksa false. */
  ipucuKullan: () => boolean;
  sifirla: () => void;
  yenile: () => Promise<void>;
}

const DurumBaglami = createContext<DurumDegeri | null>(null);

export function DurumSaglayici({ children }: { children: ReactNode }) {
  /**
   * Cihazdaki ilerleme DOĞRUDAN başlangıç durumu olarak yüklenir.
   *
   * ÖNEMLİ — düzeltilen yarış durumu: Daha önce yükleme bir `useEffect`
   * içindeydi. React'te çocuk bileşenlerin efektleri ebeveynden ÖNCE çalışır;
   * yani bir ders tamamlanıp ilerleme güncellendikten hemen sonra ebeveynin
   * yükleme efekti çalışıp DİSKTEN GELEN ESKİ kaydı yazıyor ve tamamlamayı
   * SİLİYORDU. `useState` başlatıcısı bu yarışı tamamen ortadan kaldırır.
   */
  const [ilerleme, setIlerleme] = useState<Ilerleme>(() => {
    const i = ilerlemeYukle();
    return { ...i, ayarlar: temaGocuUygula(i.ayarlar) };
  });
  const [yolIskeleti, setYolIskeleti] = useState<YolIskeletiSehir[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [cevrimdisi, setCevrimdisi] = useState(!navigator.onLine);
  // Aralıklı tekrar takvimi: ilerleme ile aynı yarış-güvenli başlatma.
  const [tekrar, setTekrar] = useState<TekrarDurumu>(() => tekrarYukle());

  useEffect(() => {
    tekrarKaydet(tekrar);
  }, [tekrar]);

  const tekrarTakvimeEkle = useCallback((dersId: string, eserAdi: string) => {
    setTekrar((d) => dersiTakvimeEkle(d, dersId, eserAdi, gunMetni(new Date())));
  }, []);

  // Vakıf Çarşısı
  const [carsi, setCarsi] = useState<CarsiDurumu>(() => carsiYukle());
  useEffect(() => {
    carsiKaydet(carsi);
  }, [carsi]);

  const satinAl = useCallback(
    (urun: Urun, hedefSehirId?: string): SatinAlmaSonucu => {
      const sonuc = satinAlSaf(carsi, ilerleme.elmas, urun, hedefSehirId);
      if (sonuc.tamam) {
        setCarsi(sonuc.durum);
        // Elmas yalnızca burada, çocuğun kendi seçimiyle azalır; asla ceza değildir.
        setIlerleme((m) => ({ ...m, elmas: Math.max(0, m.elmas - urun.fiyat) }));
      }
      return sonuc;
    },
    [carsi, ilerleme.elmas],
  );

  const sec = useCallback((urun: Urun) => setCarsi((d) => secSaf(d, urun)), []);

  const ipucuKullan = useCallback((): boolean => {
    const { durum, kullanildi } = ipucuKullanSaf(carsi);
    if (kullanildi) setCarsi(durum);
    return kullanildi;
  }, [carsi]);

  const tekrarSonucu = useCallback((dersId: string, ipucusuz: boolean) => {
    setTekrar((d) => tekrarSonucunuIsle(d, dersId, ipucusuz, gunMetni(new Date())));
  }, []);

  // Ayarları ilk açılışta belgeye uygula (DOM gerektirir, efekt şart).
  useEffect(() => {
    ayarlariUygula(ilerleme.ayarlar);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca ilk mount
  }, []);

  const yenile = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const sonuc = await api.yolIskeleti();

      // ŞEKİL DOĞRULAMASI: Sunucu beklenmedik bir gövde dönerse (ters vekil
      // arkasında HTML, eski sürüm, `[]`) `sonuc.sehirler` undefined olur ve
      // `.length` çağrısı tüm ağacı hata sınırına düşürür — yani TEK bozuk
      // yanıt bütün uygulamayı beyaz ekrana çevirir. Bu yüzden veri
      // kullanılmadan önce şekli doğrulanır.
      if (Array.isArray(sonuc?.sehirler)) {
        setYolIskeleti(sonuc.sehirler);
        setCevrimdisi(false);
      } else {
        setYolIskeleti([]);
        setHata('İçerik sunucusu beklenmeyen bir yanıt döndürdü.');
        setCevrimdisi(true);
      }
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İçerik yüklenemedi');
      setCevrimdisi(true);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  // Çevrimiçi/çevrimdışı durumu
  useEffect(() => {
    const cevrimici = () => setCevrimdisi(false);
    const cevrimdisiOl = () => setCevrimdisi(true);
    window.addEventListener('online', cevrimici);
    window.addEventListener('offline', cevrimdisiOl);
    return () => {
      window.removeEventListener('online', cevrimici);
      window.removeEventListener('offline', cevrimdisiOl);
    };
  }, []);

  // İlerleme değişince cihaza yaz
  useEffect(() => {
    ilerlemeKaydet(ilerleme);
  }, [ilerleme]);

  const dersTamamla = useCallback((dersId: string, eserId: string) => {
    setIlerleme((mevcut) => {
      const { ilerleme: yeni, yeniTamamlandi } = dersTamamlaSaf(mevcut, dersId, eserId);

      // Sınıf sayacına ANONİM kayıt — PDF Senaryo B: "Sınıf birlikte bir
      // külliyeyi tamamlar." Gönderilen tek şey sınıf kodu + ders kimliği.
      // Kimlik, cihaz bilgisi veya ilerleme ayrıntısı GÖNDERİLMEZ.
      // Ateşle-unut: başarısız olsa da çocuğun deneyimi kesintiye uğramaz.
      if (yeniTamamlandi && mevcut.sinifKodu) {
        void fetch('/api/sinif/tamamla', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kod: mevcut.sinifKodu, dersId }),
        }).catch(() => {
          /* çevrimdışı veya sınıf kapanmış — sessizce yut */
        });
      }

      return yeni;
    });
  }, []);

  const ayarGuncelle = useCallback((kismi: Partial<Ayarlar>) => {
    setIlerleme((mevcut) => {
      const ayarlar = { ...mevcut.ayarlar, ...kismi };
      ayarlariUygula(ayarlar);
      return { ...mevcut, ayarlar };
    });
  }, []);

  const sinifKoduAyarla = useCallback((kod: string | null) => {
    setIlerleme((mevcut) => ({ ...mevcut, sinifKodu: kod }));
  }, []);

  const sifirla = useCallback(() => {
    const temiz = ilerlemeSifirla();
    setIlerleme(temiz);
    tekrarSifirla();
    setTekrar({ surum: 1, kayitlar: {} });
    carsiSifirla();
    setCarsi(bosCarsiDurumu());
    ayarlariUygula(temiz.ayarlar);
  }, []);

  const yol = useMemo(
    () =>
      yolIskeleti.length
        ? sehirPaketleriniUygula(
            yolHesapla(yolIskeleti, ilerleme.tamamlananDersler),
            carsi.acikSehirler,
          )
        : null,
    [yolIskeleti, ilerleme.tamamlananDersler, carsi.acikSehirler],
  );

  const deger = useMemo<DurumDegeri>(
    () => ({
      ilerleme,
      ayarlar: ilerleme.ayarlar,
      yolIskeleti,
      yol,
      yukleniyor,
      hata,
      cevrimdisi,
      dersTamamla,
      ayarGuncelle,
      sinifKoduAyarla,
      tekrar,
      tekrarTakvimeEkle,
      tekrarSonucu,
      carsi,
      satinAl,
      sec,
      ipucuKullan,
      sifirla,
      yenile,
    }),
    [
      carsi,
      satinAl,
      sec,
      ipucuKullan,
      tekrar,
      tekrarTakvimeEkle,
      tekrarSonucu,
      ilerleme,
      yolIskeleti,
      yol,
      yukleniyor,
      hata,
      cevrimdisi,
      dersTamamla,
      ayarGuncelle,
      sinifKoduAyarla,
      sifirla,
      yenile,
    ],
  );

  return <DurumBaglami.Provider value={deger}>{children}</DurumBaglami.Provider>;
}

export function useDurum(): DurumDegeri {
  const baglam = useContext(DurumBaglami);
  if (!baglam) throw new Error('useDurum, DurumSaglayici içinde kullanılmalıdır.');
  return baglam;
}

/** Seviye bilgisini doğrudan veren yardımcı kanca. */
export function useSeviye() {
  const { ilerleme } = useDurum();
  return seviyeHesapla(ilerleme.tamamlananDersler.length);
}
