/**
 * Profil: kâşifin özeti, seviye ilerlemesi, rozetler (sıradakiler ilerleme
 * çubuğuyla), kısayollar, giriş seçenekleri ve Vakıf Çarşısı. Kişisel veri yok:
 * ad/hesap tutulmaz, her şey cihazda.
 *
 * Giriş seçenekleri ve Vakıf Çarşısı ayrı SEKMELER değil, bu sayfanın
 * bölümleridir. `#/giris` ve `#/carsi` rotaları aynı sayfayı açar ve ilgili
 * bölüme kaydırıp odağı bölüm başlığına taşır — böylece alt gezinme yalnızca
 * çocuğun ana sekmelerini taşır (Bugün · Yol · Keşfet · Defter · Ayarlar).
 *
 * Yetişkin girişleri çocuğun ana gezinmesinde DEĞİL; giriş bölümünde durur.
 */
import { useEffect } from 'react';
import { useDurum, useSeviye } from '../../app/DurumSaglayici';
import {
  Avatar,
  IkonAlev,
  IkonAyarlar,
  IkonCarsi,
  IkonElmas,
  IkonGiris,
  IkonPusula,
  IkonSagOk,
  IkonSinif,
  IkonTakvim,
} from '../../app/Ikonlar';
import { TEMA_ETIKETLERI } from '../../lib/erisilebilirlik';
import { hedefDersSayisi, tercihleriOku, tercihVarMi } from '../../lib/tercihler';
import { SINIF_ADLARI } from '../giris/BaslangicSorulari';
import { GirisBolumu } from '../giris/GirisBolumu';
import { CarsiBolumu } from '../carsi/CarsiBolumu';
import { RozetGorseli, useKazanilanRozetler } from '../rozetler/Rozetler';
import { rozetIlerlemesi } from '../rozetler/rozetMantigi';
import './profil.css';

/** Profilde gösterilen en çok kazanılmış rozet ve sıradaki rozet sayısı. */
const VITRIN_SAYISI = 6;
const SIRADAKI_SAYISI = 3;

/** Bu sayfaya doğrudan gelinen bölüm (rota ile belirlenir). */
export type ProfilBolumu = 'carsi' | 'giris';

export function ProfilSayfasi({ bolum }: { bolum?: ProfilBolumu } = {}) {
  const { ilerleme, carsi } = useDurum();
  const seviye = useSeviye();
  const rozetler = useKazanilanRozetler();
  const dersSayisi = ilerleme.tamamlananDersler.length;

  // `#/carsi` ve `#/giris` aynı sayfayı açar; ilgili bölüme kaydır ve odağı
  // bölüm başlığına taşı (ekran okuyucu bölümün adını okur).
  // Kabuk, rota değişiminde ana içeriğe odaklanır ve sayfayı başa alır; çocuk
  // effect'ler önce çalıştığı için bu iş bir sonraki göreve bırakılır.
  useEffect(() => {
    if (!bolum) return;
    const zaman = window.setTimeout(() => {
      const hedef = document.getElementById(bolum);
      if (!hedef) return;
      // jsdom'da scrollIntoView yoktur.
      if (typeof hedef.scrollIntoView === 'function') {
        try {
          hedef.scrollIntoView({ block: 'start' });
        } catch {
          /* test ortamı */
        }
      }
      const baslik = hedef.querySelector<HTMLElement>('h2');
      (baslik ?? hedef).focus();
    }, 0);
    return () => window.clearTimeout(zaman);
  }, [bolum]);

  const kazanilanListe = rozetler.liste.filter((r) => rozetler.kazanilan.has(r.id));
  // Sıradakiler: kilitli rozetlerden bitmeye en yakın olanlar (oran, sonra kalan adım).
  const siradakiler = rozetler.liste
    .filter((r) => !rozetler.kazanilan.has(r.id))
    .map((r) => ({ rozet: r, ...rozetIlerlemesi(r, rozetler.girdi) }))
    .sort((a, b) => b.simdi / b.hedef - a.simdi / a.hedef || a.hedef - a.simdi - (b.hedef - b.simdi))
    .slice(0, SIRADAKI_SAYISI);

  const seviyeOrani =
    seviye.sonrakiEsik && seviye.kalanDers !== null
      ? Math.min(1, (seviye.sonrakiEsik - seviye.kalanDers) / seviye.sonrakiEsik)
      : 1;

  const tercih = tercihleriOku();
  const tercihOzeti = tercihVarMi()
    ? [
        tercih.sinif ? SINIF_ADLARI[tercih.sinif] : null,
        tercih.gunlukHedef ? `Günde ${hedefDersSayisi(tercih.gunlukHedef)} ders` : 'Serbest tempo',
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Başlangıç sorularını yanıtla';

  const satirlar = [
    { href: '#/baslangic', etiket: 'Tercihlerim', alt: tercihOzeti, Ikon: IkonPusula },
    {
      href: '#/ayarlar',
      etiket: 'Ayarlar',
      alt: `Tema: ${TEMA_ETIKETLERI[ilerleme.ayarlar.tema]} · yazı, ses, hareket`,
      Ikon: IkonAyarlar,
    },
    { href: '#/carsi', etiket: 'Vakıf Çarşısı', alt: 'Elmaslarınla avatar ve süs al', Ikon: IkonCarsi },
    { href: '#/giris', etiket: 'Giriş', alt: 'Yarışma, öğretmen ve yönetici girişi', Ikon: IkonGiris },
    { href: '#/seri', etiket: 'Seri takvimi', alt: 'Hangi günler keşfettin?', Ikon: IkonTakvim },
    {
      href: '#/sinif',
      etiket: 'Sınıfım (evde katıl)',
      alt: ilerleme.sinifKodu ? `${ilerleme.sinifKodu} kodlu sınıf` : 'Öğretmenin verdiği kodla evde devam et',
      Ikon: IkonSinif,
    },
  ];

  return (
    <div className="profil">
      <header className="profil__kimlik">
        <Avatar id={carsi.avatar} boyut={72} />
        <div>
          <h1 className="profil__baslik">Kâşif</h1>
          <p className="profil__seviye">{seviye.ad}</p>
        </div>
      </header>

      <div className="profil__seviye-ilerleme">
        <p className="profil__seviye-metin">
          {seviye.kalanDers !== null && seviye.kalanDers > 0
            ? `Bir sonraki seviyeye ${seviye.kalanDers} ders kaldı`
            : 'En yüksek seviyedesin!'}
        </p>
        <span className="profil__cubuk" aria-hidden="true">
          <span className="profil__cubuk-dolgu" style={{ width: `${Math.round(seviyeOrani * 100)}%` }} />
        </span>
      </div>

      <dl className="profil__sayilar">
        <div>
          <dt>Ders</dt>
          <dd>{dersSayisi}</dd>
        </div>
        <div>
          <dt>
            <IkonAlev boyut={16} /> Seri
          </dt>
          <dd>{ilerleme.seri.gunSayisi} gün</dd>
        </div>
        <div>
          <dt>
            <IkonElmas boyut={16} /> Elmas
          </dt>
          <dd>{ilerleme.elmas}</dd>
        </div>
        <div>
          <dt>Rozet</dt>
          <dd>
            {kazanilanListe.length}
            <span className="profil__sayi-alt">/{rozetler.liste.length}</span>
          </dd>
        </div>
      </dl>

      <section className="profil__rozetler" aria-labelledby="profil-rozet-baslik">
        <h2 id="profil-rozet-baslik" className="profil__bolum">
          Rozetlerim
        </h2>

        {siradakiler.length > 0 && (
          <>
            <h3 className="profil__alt-baslik">Sıradaki rozetler</h3>
            <ul className="profil__siradaki">
              {siradakiler.map(({ rozet, simdi, hedef }) => (
                <li key={rozet.id} className="profil__hedef">
                  <RozetGorseli rozet={rozet} acik={false} boyut={48} />
                  <span className="profil__hedef-metin">
                    <span className="profil__hedef-ad">{rozet.ad}</span>
                    <span className="profil__hedef-aciklama">{rozet.aciklama}</span>
                    <span className="profil__cubuk profil__cubuk--ince" aria-hidden="true">
                      <span className="profil__cubuk-dolgu" style={{ width: `${Math.round((simdi / hedef) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="profil__hedef-sayi">
                    {simdi}/{hedef}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="profil__alt-baslik">Kazandıkların</h3>
        {kazanilanListe.length > 0 ? (
          <ul className="profil__vitrin">
            {kazanilanListe.slice(0, VITRIN_SAYISI).map((r) => (
              <li key={r.id} className="profil__madalya">
                <RozetGorseli rozet={r} acik boyut={56} />
                <span>{r.ad}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="profil__bos">İlk dersini bitir, ilk rozetin burada parlasın.</p>
        )}

        <a className="profil__tumu" href="#/defter?sekme=rozetler">
          Tüm rozetleri gör
          <IkonSagOk boyut={16} />
        </a>
      </section>

      <ul className="profil__liste">
        {satirlar.map(({ href, etiket, alt, Ikon }) => (
          <li key={href}>
            <a className="profil__satir" href={href}>
              <span className="profil__simge" aria-hidden="true">
                <Ikon boyut={22} />
              </span>
              <span className="profil__metin">
                <span className="profil__etiket">{etiket}</span>
                <span className="profil__alt">{alt}</span>
              </span>
              <IkonSagOk boyut={18} className="profil__ok" />
            </a>
          </li>
        ))}
      </ul>

      <GirisBolumu />

      <CarsiBolumu />

      <p className="profil__not">
        Kök Avı hesap açmaz ve kişisel veri toplamaz. İlerlemen yalnızca bu cihazda saklanır.
      </p>
    </div>
  );
}
