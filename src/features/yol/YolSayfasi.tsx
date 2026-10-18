/**
 * Öğrenme Yolu — uygulamanın ana ekranı.
 *
 * PDF: "Öğrenme Yolu — her şehir bir ünite, her eser bir ders"
 * PDF yol görseli: Bursa Ü1 ✅ → Bursa Ü2 ✅ → Bursa Ü3 (buradasın) →
 *                  Konya Ü1 🔒 → Kütahya Ü1 🔒 → İzmir Ü1 🔒
 * Kuzey Yıldızı metriği: "Bir öğrencinin bir şehri uçtan uca tamamlaması"
 *
 * Görsel dil (Duolingo benzeri): her ünite renkli bir bant, dersler zikzak bir
 * yol üzerinde Selçuklu sekiz köşeli yıldızı düğümleri. Tamamlanan altın,
 * sıradaki ana renk + "BAŞLA" balonu, kilitli kurşun gri.
 *
 * Erişilebilirlik: düğümler gerçek <a> bağlantısıdır ve erişilebilir adı
 * "Eser adı, tür, durum" biçimindedir; durum renk + ikon + metinle verilir.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDurum, useSeviye } from '../../app/DurumSaglayici';
import { IkonKilit, IkonTekrar } from '../../app/Ikonlar';
import { gunMetni, vadesiGelenler } from '../../lib/tekrar';
import { ZamanListesi } from '../zaman/ZamanListesi';
import { gorunumOku, gorunumYaz, type YolGorunumu } from './yolGorunumu';
import { FotografPatikasi } from './FotografPatikasi';
import { kisaAd } from './kisaAd';
import { useOrtamRengi } from './ortamRengi';
import { BOS_SAHNE, aniOku, aniYaz, sahneHesapla, yolAnisi, type YolSahnesi } from './yolSahnesi';
import { hareketAzaltildiMi } from '../../app/hareket';

export { kisaAd };

export function YolSayfasi() {
  const { yol, yukleniyor, hata, ilerleme, tekrar } = useDurum();
  const seviye = useSeviye();
  // Öğrenme sırası: şehir şehir (üniteler) ya da zaman sırasıyla (cihazda hatırlanır).
  const [gorunum, setGorunumDurum] = useState<YolGorunumu>(gorunumOku);
  const setGorunum = (g: YolGorunumu) => {
    setGorunumDurum(g);
    gorunumYaz(g);
  };

  // Bugün'deki "Başla / Derse devam" buraya `#/yol?odak=siradaki` ile gelir:
  // sayfa sıradaki durağa kayar (kabuk önce en üste kaydırır, bu yüzden kısa gecikme).
  const yolHazir = !!yol;
  useEffect(() => {
    if (!yolHazir || !window.location.hash.includes('odak=siradaki')) return;
    const zaman = window.setTimeout(() => {
      document
        .querySelector('.patika__durak--aktif, .zt-siradaki')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    return () => window.clearTimeout(zaman);
  }, [yolHazir, gorunum]);

  // Kaydırırken ortadaki eserin fotoğraf rengi arka plana yayılır.
  useOrtamRengi(yolHazir);

  // Canlı yol: son ziyaretten bu yana ders bittiyse Köstik ilerler, ünite
  // açıldıysa kilit kırılır, ünite bittiyse mühür basılır. Bir kez hesaplanır;
  // yeni durum hemen cihaza yazılır (sahne tekrar oynamaz).
  const [sahne, setSahne] = useState<YolSahnesi>(BOS_SAHNE);
  const sahneAlindi = useRef(false);
  useEffect(() => {
    if (!yol || sahneAlindi.current) return;
    sahneAlindi.current = true;
    const onceki = aniOku();
    aniYaz(yolAnisi(yol));
    if (!hareketAzaltildiMi()) setSahne(sahneHesapla(onceki, yol));
  }, [yol]);

  if (yukleniyor && !yol) {
    return (
      <p className="metin-soluk" role="status">
        Öğrenme yolu yükleniyor…
      </p>
    );
  }

  if (!yol || yol.sehirler.length === 0) {
    return (
      <div className="kart yigin">
        <h1>Henüz içerik yok</h1>
        <p>
          {hata
            ? 'İçerik sunucusuna ulaşılamadı. Sunucuyu başlatıp veriyi yükleyin: npm run seed'
            : 'Veri tabanı boş. İçeriği yüklemek için: npm run seed'}
        </p>
      </div>
    );
  }

  const toplamDers = yol.sehirler.reduce((t, s) => t + s.toplamSayi, 0);
  const tamamlanan = ilerleme.tamamlananDersler.length;
  const bekleyenTekrar = vadesiGelenler(tekrar, gunMetni(new Date()));

  return (
    <div className="yigin" style={{ gap: 'var(--b-5)' }}>
      {/* body'ye taşınır: animasyonlu ata kutular sabit katmanı kendine bağlamasın. */}
      {createPortal(<div className="ortam-zemin" aria-hidden="true" />, document.body)}
      <header className="yol-ozet">
        <h1 className="yol-ozet__baslik">Öğrenme Yolu</h1>
        <p className="yol-ozet__alt">
          {tamamlanan}/{toplamDers} ders · {seviye.ad}
          {seviye.kalanDers !== null ? ` · ${seviye.kalanDers} ders sonra bir üst seviye` : ''}
        </p>
        <div
          className="yol-ozet__cubuk"
          role="progressbar"
          aria-label="Öğrenme yolu ilerlemesi"
          aria-valuemin={0}
          aria-valuemax={toplamDers}
          aria-valuenow={tamamlanan}
        >
          <span style={{ ['--oran' as string]: toplamDers ? tamamlanan / toplamDers : 0 }} />
        </div>
      </header>

      {bekleyenTekrar.length > 0 ? (
        <div className="kart tekrar-karti" role="status">
          <span className="tekrar-karti__ikon" aria-hidden="true">
            <IkonTekrar boyut={22} />
          </span>
          <div>
            <p style={{ fontWeight: 700 }}>Tekrar zamanı: {kisaAd(bekleyenTekrar[0]!.eserAdi)}</p>
            <p className="metin-soluk">
              {bekleyenTekrar.length === 1
                ? 'Bir sonraki dersinde bu eserden bir soru karşına çıkacak.'
                : `${bekleyenTekrar.length} eserin tekrarı bekliyor; her derste biri karşına çıkacak.`}
            </p>
          </div>
        </div>
      ) : null}

      <div className="yol-gorunum" role="group" aria-label="Öğrenme sırası">
        <button
          type="button"
          className="yol-gorunum__dugme"
          aria-pressed={gorunum === 'sehir'}
          onClick={() => setGorunum('sehir')}
        >
          Şehirlere göre
        </button>
        <button
          type="button"
          className="yol-gorunum__dugme"
          aria-pressed={gorunum === 'zaman'}
          onClick={() => setGorunum('zaman')}
        >
          Zamana göre
        </button>
      </div>

      {gorunum === 'zaman' && <ZamanListesi mod="yol" />}

      {gorunum === 'sehir' && yol.sehirler.map((sehir) => (
        <section key={sehir.sehirId} aria-labelledby={`sehir-${sehir.sehirId}`}>
          <div className="sehir-basligi">
            <h2 id={`sehir-${sehir.sehirId}`}>
              {sehir.ad}
              {sehir.kilitli && (
                <span className="rozet">
                  <IkonKilit boyut={14} /> kilitli
                </span>
              )}
              {sehir.tamamlandi && <span className="rozet">şehir tamamlandı</span>}
            </h2>
            <span className="metin-soluk">
              {sehir.tamamlananSayi}/{sehir.toplamSayi} ders
            </span>
          </div>

          <div className="yigin" style={{ gap: 'var(--b-4)' }}>
            {sehir.uniteler.map((unite) => (
              <FotografPatikasi
                key={unite.uniteId}
                unite={unite}
                sehirAdi={sehir.ad}
                guncelDersId={yol.guncelDersId}
                sahne={sahne}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Kuzey Yıldızı metriği görünür olsun */}
      <div className="kart kart--duz">
        <div className="etiket">Kuzey Yıldızı Metriğimiz</div>
        <p style={{ margin: 'var(--b-2) 0 0', fontWeight: 800 }}>
          Bir öğrencinin bir şehri uçtan uca tamamlaması.
        </p>
      </div>
    </div>
  );
}
