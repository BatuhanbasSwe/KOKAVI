/**
 * Profil: kâşifin özeti, ayarlar ve çarşı girişleri, yetişkinler için
 * bağlantılar. Kişisel veri yok: ad/hesap tutulmaz, her şey cihazda.
 *
 * Öğretmen ve yönetim girişleri çocuğun ana gezinmesinde DEĞİL; burada,
 * ayrı etiketli bir <nav> içinde durur.
 */
import { useDurum, useSeviye } from '../../app/DurumSaglayici';
import {
  Avatar,
  IkonAlev,
  IkonAyarlar,
  IkonCarsi,
  IkonElmas,
  IkonSagOk,
  IkonSinif,
  IkonTakvim,
} from '../../app/Ikonlar';
import { TEMA_ETIKETLERI } from '../../lib/erisilebilirlik';
import './profil.css';

const YETISKIN_GEZINME = [
  { yol: 'ogretmen', etiket: 'Öğretmen paneli' },
  { yol: 'canli/kur', etiket: 'Canlı yarışma kur' },
  { yol: 'panel', etiket: 'İçerik yönetimi' },
] as const;

export function ProfilSayfasi() {
  const { ilerleme, carsi } = useDurum();
  const seviye = useSeviye();

  const satirlar = [
    {
      href: '#/ayarlar',
      etiket: 'Ayarlar',
      alt: `Tema: ${TEMA_ETIKETLERI[ilerleme.ayarlar.tema]} · yazı, ses, hareket`,
      Ikon: IkonAyarlar,
    },
    { href: '#/carsi', etiket: 'Vakıf Çarşısı', alt: 'Elmaslarınla avatar ve süs al', Ikon: IkonCarsi },
    { href: '#/seri', etiket: 'Seri takvimi', alt: 'Hangi günler keşfettin?', Ikon: IkonTakvim },
    {
      href: '#/sinif',
      etiket: 'Sınıfım',
      alt: ilerleme.sinifKodu ? `${ilerleme.sinifKodu} kodlu sınıf` : 'Sınıf koduyla katıl',
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

      <dl className="profil__sayilar">
        <div>
          <dt>Ders</dt>
          <dd>{ilerleme.tamamlananDersler.length}</dd>
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
      </dl>

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

      <nav aria-label="Yetişkinler için" className="profil__yetiskin">
        <h2 className="profil__yetiskin-baslik">Yetişkinler için</h2>
        <ul>
          {YETISKIN_GEZINME.map((oge) => (
            <li key={oge.yol}>
              <a href={`#/${oge.yol}`}>{oge.etiket}</a>
            </li>
          ))}
        </ul>
      </nav>

      <p className="profil__not">
        Kök Avı hesap açmaz ve kişisel veri toplamaz. İlerlemen yalnızca bu cihazda saklanır.
      </p>
    </div>
  );
}
