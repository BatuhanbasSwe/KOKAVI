/**
 * Korumalı panel sarmalayıcısı.
 *
 * Sunucu tarafı zaten korumalıdır (`yoneticiGerekli`); bu bileşen yalnızca
 * kullanıcı deneyimi içindir: oturum yoksa giriş ekranını gösterir, varsa
 * paneli render eder. **Güvenlik sınırı burası DEĞİLDİR** — sunucu her istekte
 * belirteci yeniden doğrular.
 */
import { useOturum } from '../../lib/oturum';
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
  const { kullanici, yukleniyor, cikisYap } = useOturum();

  if (yukleniyor) return <Yukleniyor />;
  if (!kullanici) return <GirisEkrani />;

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
          <span aria-hidden="true">🔒</span> {kullanici.ad} · {kullanici.rol}
        </span>
        <button type="button" className="dugme dugme--ikincil" onClick={() => void cikisYap()}>
          Çıkış yap
        </button>
      </div>
      <PanelSayfasi eserId={eserId} />
    </div>
  );
}
