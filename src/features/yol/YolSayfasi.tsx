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
import { useState } from 'react';
import { git } from '../../lib/yonlendirme';
import { useDurum, useSeviye } from '../../app/DurumSaglayici';
import {
  IkonDegistir,
  IkonKilit,
  IkonKumSaati,
  IkonSoru,
  IkonTekrar,
  YildizDugum,
  type YildizDurumu,
} from '../../app/Ikonlar';
import { Maskot } from '../../app/Maskot';
import { gunMetni, vadesiGelenler } from '../../lib/tekrar';
import type { YolUnitesi } from '@shared/types';
import { gununEseriDurumu } from '../gunun-eseri/GununEseriDavet';
import { TanitimTuru, tanitimGorulduMu } from './TanitimTuru';
import { PratikKartlari } from './PratikKartlari';
import { SeriSeridi } from '../seri/Seri';
import { ZamanListesi } from '../zaman/ZamanListesi';
import { gorunumOku, gorunumYaz, type YolGorunumu } from './yolGorunumu';
import { useHataSayisi } from '../hatalar/HatalarSayfasi';

/** Zikzak: düğümler sırayla sola/sağa kayar (px). */
const KAYMALAR = [0, -56, -84, -56, 0, 56, 84, 56];

/** "Yeşil Medrese (Sultaniye Medresesi; bugün …)" → "Yeşil Medrese" */
export function kisaAd(eserAdi: string): string {
  const kesik = eserAdi.split(' (')[0]?.trim();
  return kesik && kesik.length > 0 ? kesik : eserAdi;
}

function UniteYolu({
  unite,
  sehirAdi,
  guncelDersId,
}: {
  unite: YolUnitesi;
  sehirAdi: string;
  guncelDersId: string | null;
}) {
  const yuzde = unite.toplamSayi ? Math.round((unite.tamamlananSayi / unite.toplamSayi) * 100) : 0;
  const bitti = !unite.kilitli && unite.toplamSayi > 0 && unite.tamamlananSayi === unite.toplamSayi;

  return (
    <section
      className={`unite${unite.kilitli ? ' unite--kilitli' : ''}`}
      aria-labelledby={`unite-${unite.uniteId}`}
    >
      <div className="unite-bandi">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="unite-bandi__ust">
            {sehirAdi}
            {unite.aktif ? ' · şu an burada' : ''}
            {unite.kilitli ? ' · kilitli' : ''}
            {bitti ? ' · tamamlandı' : ''}
          </div>
          <h3 id={`unite-${unite.uniteId}`}>{unite.ad}</h3>
          <div
            className="ilerleme-cubugu"
            role="progressbar"
            aria-valuenow={yuzde}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${sehirAdi} ${unite.ad} ilerlemesi: yüzde ${yuzde}`}
          >
            <div className="ilerleme-cubugu__dolgu" style={{ width: `${yuzde}%` }} />
          </div>
        </div>
        <span className="unite-bandi__sayac">
          {unite.kilitli ? <IkonKilit boyut={20} /> : null}
          {unite.tamamlananSayi}/{unite.toplamSayi}
        </span>
      </div>

      <ol className="yol-dugumleri" aria-label={`${unite.ad} dersleri`}>
        {unite.dersler.map((ders, i) => {
          const durum: YildizDurumu = unite.kilitli
            ? 'kilitli'
            : ders.tamamlandi
              ? 'tamam'
              : ders.dersId === guncelDersId
                ? 'aktif'
                : 'acik';
          const durumMetni =
            durum === 'kilitli'
              ? 'kilitli, önceki üniteyi tamamla'
              : durum === 'tamam'
                ? 'tamamlandı'
                : durum === 'aktif'
                  ? 'sıradaki ders, başla'
                  : 'başlayabilirsin';
          const ad = kisaAd(ders.eserAdi);
          const kayma = `${KAYMALAR[i % KAYMALAR.length]}px`;

          const gorunum = (
            <>
              <YildizDugum durum={durum} tur={ders.tur} />
              <span className="yol-dugumu__metin" aria-hidden="true">
                <span className="yol-dugumu__ad">{ad}</span>
                <span className="yol-dugumu__tur">{ders.tur}</span>
              </span>
            </>
          );

          return (
            <li
              key={ders.dersId}
              className={`yol-dugumu yol-dugumu--${durum}`}
              style={{ ['--sira' as string]: i }}
            >
              <div
                className="yol-dugumu__icerik"
                style={{ ['--kayma' as string]: kayma }}
              >
                {durum === 'aktif' ? (
                  <>
                    <span className="yol-dugumu__halka" aria-hidden="true" />
                    <span className="yol-dugumu__balon" aria-hidden="true">
                      BAŞLA
                    </span>
                  </>
                ) : null}

                {durum === 'kilitli' ? (
                  <span
                    className="yol-dugumu__baglanti"
                    role="img"
                    aria-label={`${ders.eserAdi}, ${ders.tur}, ${durumMetni}`}
                  >
                    {gorunum}
                  </span>
                ) : (
                  <a
                    className="yol-dugumu__baglanti"
                    href={`#/ders/${encodeURIComponent(ders.dersId)}`}
                    aria-label={`${ders.eserAdi}, ${ders.tur}, ${durumMetni}`}
                  >
                    {gorunum}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const GUNLUK_SOZLER = [
  'Bugün bir eser keşfedelim mi?',
  'Her eserin bir vakfı, her vakfın bir hikâyesi var!',
  'Bir han, uzak bir şehirdeki camiyi yaşatabilir. Merak ettin mi?',
  'Haritada yakınlaştır: ilçeler, sonra eserler çıkar!',
  'Yanlış cevap yok, sadece ipucu var. Hadi!',
];

/** Gün boyunca aynı kalan maskot sözü. */
function gunlukSoz(): string {
  return GUNLUK_SOZLER[Math.floor(Date.now() / 86_400_000) % GUNLUK_SOZLER.length]!;
}

export function YolSayfasi() {
  const { yol, yukleniyor, hata, ilerleme, tekrar } = useDurum();
  const seviye = useSeviye();
  const hataSayisi = useHataSayisi();
  const gunEseri = gununEseriDurumu();
  // Öğrenme sırası: şehir şehir (üniteler) ya da zaman sırasıyla (cihazda hatırlanır).
  const [gorunum, setGorunumDurum] = useState<YolGorunumu>(gorunumOku);
  const setGorunum = (g: YolGorunumu) => {
    setGorunumDurum(g);
    gorunumYaz(g);
  };
  // İlk açılış turu: yalnızca hiç ders bitirmemiş, turu görmemiş kullanıcıya.
  const [tanitim, setTanitim] = useState(
    () => ilerleme.tamamlananDersler.length === 0 && !tanitimGorulduMu(),
  );

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
      <header className="yol-ozet">
        <h1 className="yol-ozet__baslik">Öğrenme Yolun</h1>
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

      {tanitim ? (
        <TanitimTuru
          onBitti={(secim) => {
            if (secim) setGorunum(secim);
            setTanitim(false);
          }}
        />
      ) : (
        // Karşılama kartı: Köstik konuşur, ana eylem hemen altında (tek dokunuş).
        <section className="kart karsilama" aria-label="Köstik">
          <Maskot boyut={72} mutlu={tamamlanan === toplamDers} />
          <div className="karsilama__govde">
            <p className="karsilama__soz">
              {tamamlanan === 0
                ? 'Merhaba, ben Köstik! İlk eserimizi birlikte keşfedelim mi?'
                : tamamlanan === toplamDers
                  ? 'Bütün eserleri keşfettin! Arşivde daha yüzlercesi var.'
                  : gunlukSoz()}
            </p>
            {yol.guncelDersId && (
              <button type="button" className="dugme dugme--genis" onClick={() => git(`ders/${yol.guncelDersId}`)}>
                {tamamlanan === 0 ? 'Başla' : 'Derse devam'}
              </button>
            )}
          </div>
        </section>
      )}

      <SeriSeridi />

      <PratikKartlari
        kartlar={[
          {
            href: '#/gunun-eseri',
            baslik: `Günün Eseri #${gunEseri.no}`,
            alt: gunEseri.durum,
            simge: <IkonSoru boyut={22} />,
            vurgu: !gunEseri.bitti,
          },
          {
            href: '#/hayrat-akar',
            baslik: 'Hayrat mı Akar mı?',
            alt: 'Hizmet mi, gelir mi?',
            simge: <IkonDegistir boyut={22} />,
          },
          {
            href: '#/zaman-tuneli',
            baslik: 'Zaman tüneli',
            alt: 'Eserler yüzyıl yüzyıl',
            simge: <IkonKumSaati boyut={22} />,
          },
          ...(hataSayisi > 0
            ? [
                {
                  href: '#/hatalar',
                  baslik: 'Hatalarımı çalış',
                  alt: `${hataSayisi} soru seni bekliyor`,
                  simge: <IkonTekrar boyut={22} />,
                },
              ]
            : []),
        ]}
      />

      {bekleyenTekrar.length > 0 ? (
        <div className="kart tekrar-karti" role="status">
          <span className="tekrar-karti__ikon" aria-hidden="true">
            <IkonTekrar boyut={22} />
          </span>
          <div>
            <p style={{ fontWeight: 900 }}>Tekrar zamanı: {kisaAd(bekleyenTekrar[0]!.eserAdi)}</p>
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
              <UniteYolu
                key={unite.uniteId}
                unite={unite}
                sehirAdi={sehir.ad}
                guncelDersId={yol.guncelDersId}
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
