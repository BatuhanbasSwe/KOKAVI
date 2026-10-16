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
import { IkonKilit, IkonTekrar, YildizDugum, type YildizDurumu } from '../../app/Ikonlar';
import { gunMetni, vadesiGelenler } from '../../lib/tekrar';
import type { YolUnitesi } from '@shared/types';
import { KonusanMaskot } from '../../app/Maskot';
import { GununEseriDavet } from '../gunun-eseri/GununEseriDavet';
import { TanitimTuru, tanitimGorulduMu } from './TanitimTuru';
import { PratikKartlari } from './PratikKartlari';
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

export function YolSayfasi() {
  const { yol, yukleniyor, hata, ilerleme, tekrar } = useDurum();
  const seviye = useSeviye();
  const hataSayisi = useHataSayisi();
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
      <div className="yol-ozet">
        <div>
          <h1>Öğrenme Yolun</h1>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            {tamamlanan}/{toplamDers} ders · {seviye.ad}
            {seviye.kalanDers !== null ? ` · ${seviye.kalanDers} ders sonra bir üst seviye` : ''}
          </p>
        </div>
        {yol.guncelDersId && (
          <button
            type="button"
            className="dugme"
            onClick={() => git(`ders/${yol.guncelDersId}`)}
          >
            Derse devam
          </button>
        )}
      </div>

      {tanitim ? (
        <TanitimTuru onBitti={() => setTanitim(false)} />
      ) : (
        <KonusanMaskot
          mesaj={
            tamamlanan === 0
              ? 'Merhaba, ben Kâşif! İlk eserimizi birlikte keşfedelim mi?'
              : tamamlanan === toplamDers
                ? 'Bütün eserleri keşfettin! Arşivde daha yüzlercesi var.'
                : undefined
          }
        />
      )}

      <GununEseriDavet />

      <PratikKartlari
        kartlar={[
          {
            href: '#/hayrat-akar',
            baslik: 'Hayrat mı Akar mı?',
            alt: 'Hizmet mi eder, gelir mi getirir?',
            simge: '⇄',
          },
          {
            href: '#/zaman-tuneli',
            baslik: 'Zaman tüneli',
            alt: 'Eserler yüzyıl yüzyıl',
            simge: '⌛',
          },
          ...(hataSayisi > 0
            ? [
                {
                  href: '#/hatalar',
                  baslik: 'Hatalarımı çalış',
                  alt: `${hataSayisi} soru seni bekliyor`,
                  simge: '↻',
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

      {yol.sehirler.map((sehir) => (
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
