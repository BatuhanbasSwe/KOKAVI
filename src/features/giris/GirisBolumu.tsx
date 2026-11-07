/**
 * Giriş bölümü: yetişkin ve yarışma girişlerinin dağıtımı.
 *
 * Profil sayfasının içinde yaşar (ayrı bir sekme sayfası DEĞİL). Öğrenci canlı
 * yarışmaya PIN ile katılır; yarışma kurmak öğretmen panelinin içindedir.
 * Satır deseni Profil listesiyle aynıdır.
 *
 * `#/giris` rotası doğrudan bu bölüme kaydırır; bu yüzden bölümün kimliği ve
 * odaklanabilir başlığı vardır.
 */
import { IkonCanli, IkonSagOk, IkonSinif, IkonYonetim } from '../../app/Ikonlar';
import '../profil/profil.css';

const SATIRLAR = [
  {
    href: '#/canli',
    etiket: 'Canlı yarışmaya katıl',
    alt: 'Öğretmenin verdiği 6 haneli PIN ile katıl',
    Ikon: IkonCanli,
  },
  {
    href: '#/ogretmen',
    etiket: 'Öğretmen girişi',
    alt: 'Sınıf oluştur, canlı yarışma kur',
    Ikon: IkonSinif,
  },
  {
    href: '#/panel',
    etiket: 'Yönetim paneli',
    alt: 'İçerik yönetimi (yönetici)',
    Ikon: IkonYonetim,
  },
] as const;

export function GirisBolumu() {
  return (
    <section id="giris" className="profil__bolum-kabi" aria-labelledby="profil-giris-baslik">
      <h2 id="profil-giris-baslik" className="profil__bolum" tabIndex={-1}>
        Giriş
      </h2>
      <p className="profil__not">Yarışmaya katıl ya da öğretmen ve yönetici olarak giriş yap.</p>

      <nav aria-label="Giriş seçenekleri">
        <ul className="profil__liste">
          {SATIRLAR.map(({ href, etiket, alt, Ikon }) => (
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
      </nav>
    </section>
  );
}
