/**
 * Giriş ekranı — yönetim paneline erişim.
 *
 * Erişilebilirlik: her alanın görünür etiketi, hata `role="alert"` ile
 * duyurulur, `aria-invalid` ve `aria-describedby` bağlanır, düğme gönderim
 * sırasında devre dışı kalır (çift gönderim engeli).
 *
 * GÜVENLİK: Sunucu hataları olduğu gibi gösterilir — ama sunucu zaten
 * "e-posta var mı" bilgisini sızdırmaz (bkz. server/routes/auth.ts).
 */
import { useRef, useState, type FormEvent } from 'react';
import { useOturum } from '../../lib/oturum';

export function GirisEkrani() {
  const { girisYap } = useOturum();
  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const hataKutusu = useRef<HTMLDivElement>(null);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    if (gonderiliyor) return;

    setHata(null);

    if (!email.trim() || !parola) {
      setHata('E-posta ve parola zorunludur.');
      return;
    }

    setGonderiliyor(true);
    const sonuc = await girisYap(email, parola);

    if (!sonuc.tamam) {
      setHata(sonuc.hata ?? 'Giriş yapılamadı.');
      setParola('');
    }
    setGonderiliyor(false);
  }

  return (
    <div className="sarmal" style={{ maxWidth: 460, margin: '0 auto' }}>
      <form className="kart yigin" onSubmit={gonder} noValidate>
        <div>
          <h1 style={{ marginBottom: 'var(--b-2)' }}>Yönetim girişi</h1>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            İçerik yönetimi için yetkili hesabınla giriş yap.
          </p>
        </div>

        {hata && (
          <div
            ref={hataKutusu}
            className="bildirim bildirim--hata"
            role="alert"
            tabIndex={-1}
          >
            <span aria-hidden="true">⚠ </span>
            {hata}
          </div>
        )}

        <div>
          <label htmlFor="giris-email" style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
            E-posta
          </label>
          <input
            id="giris-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? 'giris-hata-aciklama' : undefined}
            required
            style={{
              width: '100%',
              minHeight: 48,
              padding: 'var(--b-2) var(--b-3)',
              font: 'inherit',
              borderRadius: 'var(--kose-md)',
              border: '2px solid var(--cizgi)',
              background: 'var(--zemin-kart)',
              color: 'var(--metin)',
            }}
          />
        </div>

        <div>
          <label htmlFor="giris-parola" style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
            Parola
          </label>
          <input
            id="giris-parola"
            type="password"
            autoComplete="current-password"
            value={parola}
            onChange={(e) => setParola(e.target.value)}
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? 'giris-hata-aciklama' : undefined}
            required
            style={{
              width: '100%',
              minHeight: 48,
              padding: 'var(--b-2) var(--b-3)',
              font: 'inherit',
              borderRadius: 'var(--kose-md)',
              border: '2px solid var(--cizgi)',
              background: 'var(--zemin-kart)',
              color: 'var(--metin)',
            }}
          />
        </div>

        {hata && (
          <p id="giris-hata-aciklama" className="sr-only">
            Giriş başarısız: {hata}
          </p>
        )}

        <button type="submit" className="dugme" disabled={gonderiliyor} aria-busy={gonderiliyor}>
          {gonderiliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>

        <p className="metin-soluk" style={{ margin: 0, fontSize: 'var(--yazi-sm)' }}>
          Çocuklar için hesap gerekmez. Ders ilerlemesi bu cihazda anonim olarak saklanır;
          hiçbir kişisel veri toplanmaz.
        </p>
      </form>
    </div>
  );
}
