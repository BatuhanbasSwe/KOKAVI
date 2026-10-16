/**
 * ÖĞRETMEN PANELİ — ana ekran.
 *
 * PDF Senaryo B: "Öğretmen sınıf kodunu açar. Sınıf birlikte bir külliyeyi
 * tamamlar; Vakıf Röntgeni'ni birlikte görür."
 *
 * Bu ekran o yarım kalan halkayı kapatır: sınıf kodu artık cihazda kalmaz,
 * sunucuda tutulur ve sınıfla paylaşılır.
 *
 * 🔒 GİZLİLİK: Sunucu yalnızca sayaç tutar; kimin tamamladığı bilinmez. Bu
 * yüzden arayüzün hiçbir yerinde "kaç öğrenci" DENMEZ — yalnızca
 * "toplam tamamlama" ve "tamamlanan farklı ders" denir. Bu bir eksiklik
 * değil, ürünün dürüstlük ilkesidir.
 *
 * GÜVENLİK NOTU: Bu bileşendeki oturum kontrolü yalnızca kullanıcı deneyimi
 * içindir; gerçek sınır sunucudadır (`oturumGerekli` her istekte çerezi
 * yeniden doğrular).
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Rol } from '@shared/types';
import { Alan } from '@/features/panel/Alan';
import { useOturum, type OturumKullanicisi } from '../../lib/oturum';
import { hataMetni, ogretmenApi, type SinifOzeti } from './api';
import { CanliBolge } from './parcalar';
import { SinifDetayi } from './SinifDetayi';
import { SinifListesi } from './SinifListesi';
import { SinifOlusturmaFormu } from './SinifOlusturmaFormu';
import './ogretmen.css';

/** Roller yalnızca yetişkinler içindir; çocuk hesabı yoktur. */
const ROL_ETIKETI: Record<Rol, string> = {
  admin: 'Yönetici',
  ogretmen: 'Öğretmen',
};

type GirisYap = (
  email: string,
  parola: string,
) => Promise<{ tamam: boolean; hata?: string }>;

// ---------------------------------------------------------------------------
// Oturum kapısı
// ---------------------------------------------------------------------------

/** Oturum yoksa gösterilen giriş ekranı. */
function GirisKapisi({ girisYap }: { girisYap: GirisYap }) {
  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [girisHatasi, setGirisHatasi] = useState<string | null>(null);
  const [parolaHatasi, setParolaHatasi] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(olay: FormEvent<HTMLFormElement>) {
    olay.preventDefault();

    const emailHatasi = email.trim() === '' ? 'E-posta adresini yaz.' : null;
    const sifreHatasi = parola === '' ? 'Parolanı yaz.' : null;
    setGirisHatasi(emailHatasi);
    setParolaHatasi(sifreHatasi);

    if (emailHatasi || sifreHatasi) {
      setHata('Giriş için e-posta ve parola gerekli.');
      return;
    }

    setHata(null);
    setGonderiliyor(true);
    const sonuc = await girisYap(email.trim(), parola);
    setGonderiliyor(false);
    if (!sonuc.tamam) setHata(sonuc.hata ?? 'Giriş yapılamadı.');
  }

  return (
    <div className="ogretmen">
      <div>
        <p className="etiket">Öğretmen paneli</p>
        <h1>Öğretmen Paneli</h1>
        <p className="metin-ikincil">
          Sınıf kodunu oluşturmak ve sınıfın ortak ilerlemesini görmek için giriş yap. Panel
          öğretmenler ve yöneticiler içindir; çocuklar hesap açmaz, kodla katılır.
        </p>
      </div>

      <CanliBolge tur="hata">
        {hata ? <p className="bildirim bildirim--hata">{hata}</p> : null}
      </CanliBolge>

      <form className="kart ogretmen__form" onSubmit={(olay) => void gonder(olay)}>
        <Alan id="ogretmen-eposta" etiket="E-posta" zorunlu hata={girisHatasi}>
          {(o) => (
            <input
              {...o}
              className="ogretmen__girdi"
              type="email"
              value={email}
              autoComplete="username"
              onChange={(olay) => {
                setEmail(olay.target.value);
                setGirisHatasi(null);
                setHata(null);
              }}
            />
          )}
        </Alan>

        <Alan id="ogretmen-parola" etiket="Parola" zorunlu hata={parolaHatasi}>
          {(o) => (
            <input
              {...o}
              className="ogretmen__girdi"
              type="password"
              value={parola}
              autoComplete="current-password"
              onChange={(olay) => {
                setParola(olay.target.value);
                setParolaHatasi(null);
                setHata(null);
              }}
            />
          )}
        </Alan>

        <div className="ogretmen__form-eylem">
          <button type="submit" className="dugme" disabled={gonderiliyor}>
            {gonderiliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panelin içeriği (giriş yapılmış)
// ---------------------------------------------------------------------------

interface PanelIcerikProps {
  kullanici: OturumKullanicisi;
  cikisYap: () => Promise<void>;
}

function PanelIcerik({ kullanici, cikisYap }: PanelIcerikProps) {
  const [siniflar, setSiniflar] = useState<SinifOzeti[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [seciliKod, setSeciliKod] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setSiniflar(await ogretmenApi.siniflariGetir());
    } catch (e) {
      setHata(hataMetni(e));
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  // Açık sınıfın satırı listede yoksa (silinmiş/tazelenmiş) listeye dönülür.
  const secili = seciliKod === null ? null : (siniflar.find((s) => s.kod === seciliKod) ?? null);

  return (
    <div className="ogretmen">
      <div className="ogretmen__ust">
        <div>
          <p className="etiket">Öğretmen paneli</p>
          <h1>Öğretmen Paneli</h1>
        </div>
        <div className="ogretmen__kimlik">
          <span className="rozet">
            <span aria-hidden="true">🎓</span> {kullanici.ad} · {ROL_ETIKETI[kullanici.rol]}
          </span>
          <button type="button" className="dugme dugme--ikincil" onClick={() => void cikisYap()}>
            Çıkış yap
          </button>
        </div>
      </div>

      <p className="metin-ikincil">
        Sınıfını oluştur, kodu tahtaya yaz; çocuklar o kodla katılır. Dersler bitirildikçe sınıfın
        ortak ilerlemesi burada birikir — <strong>kimin</strong> bitirdiği değil,{' '}
        <strong>kaç kez</strong> bitirildiği.
      </p>

      {secili ? (
        <SinifDetayi
          kod={secili.kod}
          aktif={secili.aktif}
          onDurumDegisti={(kod, aktif) =>
            setSiniflar((mevcut) => mevcut.map((s) => (s.kod === kod ? { ...s, aktif } : s)))
          }
          onGeri={() => setSeciliKod(null)}
        />
      ) : (
        <>
          <SinifOlusturmaFormu onOlusturuldu={() => void yukle()} />
          <SinifListesi
            siniflar={siniflar}
            yukleniyor={yukleniyor}
            hata={hata}
            onYenile={() => void yukle()}
            onDetay={setSeciliKod}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dışa açılan bileşen
// ---------------------------------------------------------------------------

export function OgretmenPaneli() {
  const { kullanici, yukleniyor, girisYap, cikisYap } = useOturum();

  if (yukleniyor) {
    return (
      <p className="metin-soluk" role="status">
        Oturum kontrol ediliyor…
      </p>
    );
  }

  if (!kullanici) {
    return <GirisKapisi girisYap={girisYap} />;
  }

  return <PanelIcerik kullanici={kullanici} cikisYap={cikisYap} />;
}
