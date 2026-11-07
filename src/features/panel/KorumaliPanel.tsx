/**
 * Korumalı panel sarmalayıcısı.
 *
 * Sunucu tarafı zaten korumalıdır (`yoneticiGerekli`); bu bileşen yalnızca
 * kullanıcı deneyimi içindir: oturum yoksa giriş ekranını gösterir, varsa
 * paneli render eder. **Güvenlik sınırı burası DEĞİLDİR** — sunucu her istekte
 * belirteci yeniden doğrular.
 *
 * OTURUM DÜŞERSE (401): Panel AÇIK kalır — formdaki girilmiş bilgiler
 * kaybolmasın diye panel unmount edilmez. Üstte, panelin üzerinde yeniden giriş
 * katmanı açılır; giriş başarılı olunca katman kapanır ve kullanıcı kaldığı
 * yerden kaydetmeyi yeniden deneyebilir.
 */
import { useEffect, useState } from 'react';
import { useOturum } from '../../lib/oturum';
import { baslikAyarla } from '../../lib/yonlendirme';
import { IkonKilit, IkonUyari } from '../../app/Ikonlar';
import { PanelSayfasi } from './PanelSayfasi';
import { GirisEkrani } from './GirisEkrani';

function Yukleniyor() {
  return (
    <p className="metin-soluk" role="status">
      Oturum kontrol ediliyor…
    </p>
  );
}

export function KorumaliPanel({ eserId }: { eserId?: string }) {
  const { kullanici, yukleniyor, girisYap, cikisYap } = useOturum();

  /**
   * Oturumun düştüğü bir istek olduysa `true`. Panel açık kalır; yeniden giriş
   * katmanı gösterilir. `api.ts` 401'de `kokavi-oturum-bitti` olayını yayınlar.
   */
  const [oturumBitti, setOturumBitti] = useState(false);

  useEffect(() => {
    const dinleyici = () => setOturumBitti(true);
    window.addEventListener('kokavi-oturum-bitti', dinleyici);
    return () => window.removeEventListener('kokavi-oturum-bitti', dinleyici);
  }, []);

  // Giriş katmanı yalnızca panel zaten açıkken (oturum düşünce) gösterilir.
  useEffect(() => {
    if (kullanici === null) setOturumBitti(false);
  }, [kullanici]);

  // Oturum yokken sekme başlığı ekrandaki h1 ile aynı olsun (WCAG 2.4.2).
  useEffect(() => {
    if (!yukleniyor && kullanici === null) baslikAyarla('Yönetim girişi');
  }, [yukleniyor, kullanici]);

  if (yukleniyor) return <Yukleniyor />;
  if (!kullanici) return <GirisEkrani girisYap={girisYap} />;

  if (kullanici.rol !== 'admin') {
    return (
      <div className="kart yigin">
        <h1>Yetkin yok</h1>
        <p className="metin-ikincil">
          Bu bölüm yalnızca yöneticiler içindir. Giriş yaptığın hesabın rolü:{' '}
          <strong>{kullanici.rol}</strong>.
        </p>
        <button type="button" className="dugme dugme--ikincil" onClick={() => void cikisYap()}>
          Çıkış yap
        </button>
      </div>
    );
  }

  return (
    <div className="yigin">
      <div
        className="satir"
        style={{ justifyContent: 'space-between', gap: 'var(--b-3)', flexWrap: 'wrap' }}
      >
        <span className="rozet">
          <IkonKilit boyut={16} /> {kullanici.ad} · {kullanici.rol}
        </span>
        <button type="button" className="dugme dugme--ikincil" onClick={() => void cikisYap()}>
          Çıkış yap
        </button>
      </div>

      {oturumBitti ? (
        <section className="kart yigin" aria-labelledby="panel-oturum-bitti-baslik">
          <div className="bildirim bildirim--hata" role="alert">
            <IkonUyari boyut={16} />{' '}
            <span>
              <strong id="panel-oturum-bitti-baslik">Oturumun sona erdi.</strong> Sayfadaki
              bilgiler silinmedi; yeniden giriş yaptıktan sonra kaydetmeyi tekrar deneyebilirsin.
            </span>
          </div>
          <GirisEkrani
            girisYap={async (email, parola) => {
              const sonuc = await girisYap(email, parola);
              if (sonuc.tamam) setOturumBitti(false);
              return sonuc;
            }}
          />
        </section>
      ) : null}

      <PanelSayfasi eserId={eserId} />
    </div>
  );
}
