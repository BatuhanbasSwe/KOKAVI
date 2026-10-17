/**
 * Uygulama kabuğu: atlama bağlantısı, gezinme ve yönlendirme.
 *
 * Erişilebilirlik notları:
 *  - Klavye kullanıcısı için "içeriğe atla" bağlantısı (WCAG 2.4.1)
 *  - Gezinme bir `<nav>` içinde ve aktif öğe `aria-current="page"` taşır
 *  - Sayfa değişiminde ana içerik odağı taşınır ve başlık güncellenir
 */
import { useEffect, useRef } from 'react';
import { DurumSaglayici, useDurum, useSeviye } from './DurumSaglayici';
import { HataSiniri } from './HataSiniri';
import { useRota, git, baslikAyarla } from '../lib/yonlendirme';
import { YolSayfasi } from '../features/yol/YolSayfasi';
import { DefterSayfasi } from '../features/defter/DefterSayfasi';
import { AyarlarSayfasi } from '../features/ayarlar/AyarlarSayfasi';
import { HaritaSayfasi } from '../features/harita/HaritaSayfasi';
import { ArsivSayfasi } from '../features/arsiv/ArsivSayfasi';
import { ArsivEserSayfasi } from '../features/arsiv/ArsivEserSayfasi';
import { DersSayfasi } from '../features/ders/DersSayfasi';
import { CarsiSayfasi } from '../features/carsi/CarsiSayfasi';
import { KorumaliPanel } from '../features/panel/KorumaliPanel';
import { OgretmenPaneli, SinifKoduGirisi } from '../features/ogretmen';
import { GununEseriSayfasi } from '../features/gunun-eseri/GununEseriSayfasi';
import { RozetBildirimi } from '../features/rozetler/Rozetler';
import { HayratAkarSayfasi } from '../features/hayrat-akar/HayratAkarSayfasi';
import { HatalarSayfasi } from '../features/hatalar/HatalarSayfasi';
import { ZamanTuneliSayfasi } from '../features/zaman/ZamanTuneliSayfasi';
import { SeriSayfasi } from '../features/seri/Seri';
import { RotaSayfasi } from '../features/rota/RotaSayfasi';
import { SertifikaSayfasi } from '../features/sertifika/SertifikaSayfasi';
import { CanliGirisSayfasi, CanliOynaSayfasi } from '../features/canli/CanliOyuncu';
import { CanliKurSayfasi, CanliYonetSayfasi } from '../features/canli/CanliYonetim';
import { BugunSayfasi } from '../features/bugun/BugunSayfasi';
import { KesfetSayfasi } from '../features/merkez/KesfetSayfasi';
import { YasayanSayfasi } from '../features/merkez/YasayanSayfasi';
import { ProfilSayfasi } from '../features/profil/ProfilSayfasi';
import { Avatar, IkonAlev, IkonDefter, IkonElmas, IkonEv, IkonPusula, IkonYol } from './Ikonlar';
import './app.css';

/**
 * Çocuğun ana gezinmesi: 4 sekme (Bugün · Yol · Keşfet · Defter). Mobilde
 * ekranın altında sabit sekme çubuğu, geniş ekranda üstte. Profil üst çubukta.
 * Öğretmen ve yönetim girişleri çocuğun gezinmesinde DEĞİL; Profil sayfasındaki
 * "Yetişkinler için" gezinmesinde durur.
 */
const GEZINME = [
  { yol: 'bugun', etiket: 'Bugün', ad: 'bugun', Ikon: IkonEv },
  { yol: 'yol', etiket: 'Yol', ad: 'yol', Ikon: IkonYol },
  { yol: 'kesfet', etiket: 'Keşfet', ad: 'kesfet', Ikon: IkonPusula },
  { yol: 'defter', etiket: 'Defter', ad: 'defter', Ikon: IkonDefter },
] as const;

/** Alt sayfanın gezinmede hangi sekmeyi seçili gösterdiği. */
const UST_SEKME: Partial<Record<string, string>> = {
  harita: 'kesfet',
  arsiv: 'kesfet',
  'arsiv-eser': 'kesfet',
  'zaman-tuneli': 'kesfet',
  rota: 'kesfet',
  yasayan: 'kesfet',
  'gunun-eseri': 'bugun',
  'hayrat-akar': 'bugun',
  hatalar: 'bugun',
  canli: 'bugun',
  'canli-oyna': 'bugun',
  sinif: 'bugun',
  seri: 'defter',
  sertifika: 'defter',
  ayarlar: 'profil',
  carsi: 'profil',
  ogretmen: 'profil',
  'canli-kur': 'profil',
  'canli-yonet': 'profil',
  panel: 'profil',
  'panel-eser': 'profil',
};

/**
 * Çocuk tarafı sınıf ekranı.
 *
 * `SinifKoduGirisi` sunucudan kodu doğrular; katılım başarılı olunca kodu
 * CİHAZA yazar (`sinifKoduAyarla`). Böylece ders tamamlandığında anonim
 * sayaç kaydı gönderilebilir — PDF Senaryo B: "Sınıf birlikte bir külliyeyi
 * tamamlar."
 *
 * Gizlilik: sunucuya giden tek şey {sınıf kodu, ders kimliği}. Kimlik yok.
 */
function CocukSinifSayfasi() {
  const { ilerleme, sinifKoduAyarla } = useDurum();

  return (
    <div className="yigin" style={{ gap: 'var(--b-4)' }}>
      <div>
        <h1>Sınıfım</h1>
        <p className="metin-ikincil">
          Öğretmeninin verdiği kodu gir ve sınıfınla birlikte keşfet.
        </p>
      </div>

      {ilerleme.sinifKodu && (
        <div className="bildirim bildirim--bilgi" role="status">
          <strong>{ilerleme.sinifKodu}</strong> kodlu sınıfa bağlısın.
        </div>
      )}

      <SinifKoduGirisi onKatildi={sinifKoduAyarla} />

      <section className="kart canli-davet" aria-labelledby="canli-davet-baslik">
        <h2 id="canli-davet-baslik">Canlı yarışma</h2>
        <p className="metin-ikincil">
          Öğretmenin tahtada bir PIN mi gösteriyor? Sınıfınla aynı anda yarış!
        </p>
        <a className="dugme" href="#/canli">
          Canlı yarışmaya katıl
        </a>
      </section>
    </div>
  );
}

function Kabuk() {
  const rota = useRota();
  const { ilerleme, yol, hata, cevrimdisi, yukleniyor, carsi } = useDurum();
  const seviye = useSeviye();
  const anaIcerik = useRef<HTMLElement>(null);

  // Sayfa değişince başlığı güncelle ve içeriğe odaklan (ekran okuyucu duyurusu)
  useEffect(() => {
    // Ekran okuyucunun doğru telaffuz kuralını seçmesi için dil garanti edilir.
    // (index.html'de de var; bu, istemci tarafı yönlendirmede güvence.)
    document.documentElement.lang = 'tr';

    const basliklar: Record<string, string> = {
      bugun: 'Bugün',
      kesfet: 'Keşfet',
      yasayan: 'Hâlâ yaşayan vakıflar',
      profil: 'Profil',
      yol: 'Öğrenme Yolu',
      defter: 'Kâşif Defteri',
      harita: 'Harita',
      arsiv: 'Meraklısına Arşivi',
      'arsiv-eser': 'Arşiv',
      ayarlar: 'Ayarlar',
      carsi: 'Vakıf Çarşısı',
      sinif: 'Sınıf',
      'gunun-eseri': 'Günün Eseri',
      'hayrat-akar': 'Hayrat mı Akar mı?',
      hatalar: 'Hatalarımı Çalış',
      'zaman-tuneli': 'Zaman Tüneli',
      seri: 'Keşif Serisi',
      rota: 'Keşif Rotası',
      sertifika: 'Sertifika',
      canli: 'Canlı Yarışma',
      'canli-kur': 'Canlı Yarışma Kur',
      'canli-yonet': 'Canlı Yarışma',
      'canli-oyna': 'Canlı Yarışma',
      panel: 'Yönetim Paneli',
      'panel-eser': 'Eser Düzenle',
      ders: 'Ders',
      bulunamadi: 'Sayfa bulunamadı',
    };
    baslikAyarla(basliklar[rota.ad] ?? 'Kök Avı');
    // Yeni sayfa en üstten başlar (ders sonundan yola dönünce kaymış kalmasın).
    if (typeof window.scrollTo === 'function') {
      try {
        window.scrollTo(0, 0);
      } catch {
        /* test ortamı */
      }
    }
    if (rota.ad !== 'ders') anaIcerik.current?.focus();
  }, [rota]);

  // Alt sayfalar gezinmede ait oldukları sekmeyi seçili gösterir
  // (harita/arşiv → Keşfet, Günün Eseri/yarışma → Bugün, seri → Defter).
  const aktifAd = UST_SEKME[rota.ad] ?? rota.ad;
  const odakModu = rota.ad === 'ders';

  return (
    <>
      <a className="atla-baglantisi" href="#ana-icerik">
        İçeriğe atla
      </a>

      {/* Ders odak modu: Duolingo gibi derste yalnızca çıkış + ilerleme çubuğu
          görünür (DersSayfasi kendi üst çubuğunu çizer). */}
      {!odakModu && (
        <header className="ustbar">
          <div className="sarmal ustbar__ic">
            <a className="marka" href="#/bugun" aria-label="Kök Avı ana sayfa">
              <span className="marka__ad">Kök Avı</span>
            </a>

            <div className="gostergeler">
              <a
                className="gosterge gosterge--seri"
                href="#/seri"
                title="Keşif serisi takvimi"
                aria-current={rota.ad === 'seri' ? 'page' : undefined}
              >
                <IkonAlev />
                <span className="sr-only">Keşif serisi:</span>
                {ilerleme.seri.gunSayisi}
                <span className="gosterge__birim"> gün</span>
                <span className="sr-only"> — takvimi aç</span>
              </a>
              <a
                className="gosterge gosterge--elmas"
                href="#/carsi"
                aria-current={rota.ad === 'carsi' ? 'page' : undefined}
                title="Vakıf Çarşısı"
              >
                <IkonElmas />
                <span className="sr-only">Elmas:</span>
                {ilerleme.elmas}
                <span className="sr-only"> — Vakıf Çarşısı'na git</span>
              </a>
              <a
                className="gosterge gosterge--profil"
                href="#/profil"
                aria-current={rota.ad === 'profil' ? 'page' : undefined}
              >
                <Avatar id={carsi.avatar} boyut={34} />
                <span className="sr-only">Profil (seviye: {seviye.ad})</span>
              </a>
            </div>
          </div>

          <nav className="gezinme" aria-label="Ana gezinme">
            <div className="sarmal gezinme__ic">
              {GEZINME.map(({ yol: hedef, etiket, ad, Ikon }) => (
                <a
                  key={hedef}
                  href={`#/${hedef}`}
                  className={`gezinme__baglanti${aktifAd === ad ? ' gezinme__baglanti--aktif' : ''}`}
                  aria-current={aktifAd === ad ? 'page' : undefined}
                >
                  <span className="gezinme__ikon">
                    <Ikon boyut={26} dolu={aktifAd === ad} />
                  </span>
                  <span className="gezinme__etiket">{etiket}</span>
                </a>
              ))}
            </div>
          </nav>
        </header>
      )}

      {(cevrimdisi || hata) && (
        <div className="sarmal" style={{ marginTop: 'var(--b-3)' }}>
          <div className="bildirim bildirim--uyari" role="status">
            {hata
              ? `İçerik sunucusuna ulaşılamadı (${hata}). Çevrimdışı önbellekteki içerik gösteriliyor.`
              : 'Çevrimdışısın — önbellekteki derslerle devam edebilirsin.'}
            {cevrimdisi && (
              <button
                type="button"
                className="dugme dugme--ikincil"
                style={{ marginLeft: 'var(--b-3)', minHeight: 32, padding: '2px 12px' }}
                onClick={() => void window.location.reload()}
              >
                Yeniden dene
              </button>
            )}
          </div>
        </div>
      )}

      <main
        id="ana-icerik"
        ref={anaIcerik}
        tabIndex={-1}
        className={`sarmal ana${odakModu ? ' ana--odak' : ''}`}
      >
        {rota.ad === 'bugun' && <BugunSayfasi />}
        {rota.ad === 'kesfet' && <KesfetSayfasi />}
        {rota.ad === 'yasayan' && <YasayanSayfasi />}
        {rota.ad === 'profil' && <ProfilSayfasi />}
        {rota.ad === 'yol' && <YolSayfasi />}
        {rota.ad === 'defter' && <DefterSayfasi />}
        {rota.ad === 'harita' && <HaritaSayfasi />}
        {rota.ad === 'arsiv' && <ArsivSayfasi />}
        {rota.ad === 'arsiv-eser' && <ArsivEserSayfasi arsivId={rota.arsivId} />}
        {rota.ad === 'ayarlar' && <AyarlarSayfasi />}
        {rota.ad === 'carsi' && <CarsiSayfasi />}
        {rota.ad === 'sinif' && <CocukSinifSayfasi />}
        {rota.ad === 'gunun-eseri' && <GununEseriSayfasi />}
        {rota.ad === 'hayrat-akar' && <HayratAkarSayfasi />}
        {rota.ad === 'hatalar' && <HatalarSayfasi />}
        {rota.ad === 'zaman-tuneli' && <ZamanTuneliSayfasi />}
        {rota.ad === 'seri' && <SeriSayfasi />}
        {rota.ad === 'rota' && <RotaSayfasi />}
        {rota.ad === 'sertifika' && <SertifikaSayfasi sehirId={rota.sehirId} />}
        {rota.ad === 'canli' && <CanliGirisSayfasi />}
        {rota.ad === 'canli-kur' && <CanliKurSayfasi />}
        {rota.ad === 'canli-yonet' && <CanliYonetSayfasi pin={rota.pin} />}
        {rota.ad === 'canli-oyna' && <CanliOynaSayfasi pin={rota.pin} />}
        {rota.ad === 'ogretmen' && <OgretmenPaneli />}
        {rota.ad === 'panel' && <KorumaliPanel />}
        {rota.ad === 'panel-eser' && <KorumaliPanel eserId={rota.eserId} />}
        {rota.ad === 'ders' && <DersSayfasi dersId={rota.dersId} />}
        {rota.ad === 'bulunamadi' && (
          <div className="kart yigin">
            <h1>Sayfa bulunamadı</h1>
            <p className="metin-ikincil">“{rota.yol}” diye bir sayfa yok.</p>
            <button type="button" className="dugme" onClick={() => git('bugun')}>
              Ana sayfaya dön
            </button>
          </div>
        )}

        {yukleniyor && !yol && rota.ad === 'yol' && (
          <p className="metin-soluk" role="status">
            İçerik yükleniyor…
          </p>
        )}
      </main>

      <RozetBildirimi />

      {!odakModu && (
        <footer className="altbilgi">
          <div className="sarmal">
            <p className="metin-soluk" style={{ margin: 0 }}>
              Kök Avı · TRİA · KÖK &amp; KOD Hackathon. İçerik ve görseller envanter projesine
              aittir; tarihsel bilgiler kaynak künyesiyle birlikte gösterilir.
            </p>
          </div>
        </footer>
      )}
    </>
  );
}

export function App() {
  return (
    <HataSiniri>
      <DurumSaglayici>
        <Kabuk />
      </DurumSaglayici>
    </HataSiniri>
  );
}
