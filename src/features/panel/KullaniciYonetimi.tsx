/**
 * Kullanıcı yönetimi — YÖNETİCİ ekranı.
 *
 * Kapsam: yalnızca YETİŞKİN hesapları (yönetici ve öğretmen). Uygulamada çocuk
 * hesabı YOKTUR ve açılmaz: PDF "kişisel veri toplanmaz, sınıf kodu anonim"
 * diyor; öğrenciler cihaz-yerel anonim profille ilerler ve sunucuda çocuğa ait
 * hiçbir kayıt tutulmaz. Bu kural ekranda görünür bir bilgi kutusuyla yazılıdır.
 *
 * Uçlar (cookie tabanlı oturum, tümü `credentials: 'include'`):
 *  - GET    /api/yonetim/kullanicilar        → Kullanici[]
 *  - POST   /api/yonetim/kullanicilar        → 201 Kullanici | 400 zayıf parola | 409 e-posta var
 *  - PATCH  /api/yonetim/kullanicilar/:id    → { tamam: true } | 400 kendi hesabını kapatamazsın
 *
 * Erişilebilirlik (WCAG 2.2 AA):
 *  - Her alanda görünür `<label htmlFor>`; hata metni `role="alert"`,
 *    `aria-describedby` ile girdiye bağlı ve `aria-invalid` ayarlı (SC 3.3.1/3.3.2).
 *  - Tablo `<caption>` + `<th scope="col">` taşır (SC 1.3.1).
 *  - Her düğme `<button>` + `.dugme` (>= 44px dokunma hedefi, SC 2.5.8).
 *  - Kaydetme sonucu kalıcı canlı bölgede `role="status"` ile duyurulur (SC 4.1.3).
 *  - Anlam ASLA yalnızca renkle verilmez: rol ve durum rozetlerinde metin vardır.
 *  - Kendi hesabını kapatma düğmesi devre dışıdır: sunucu 400 döner, kullanıcı
 *    boşa uğraştırılmaz.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Rol } from '@shared/types';
import { useOturum } from '../../lib/oturum';
import { ApiHatasi, oturumBittiBildir } from '../../lib/api';
import { MetinGirdisi, ParolaGirdisi, SecimGirdisi } from './Alan';
import { OnayDiyalogu } from './OnayDiyalogu';
import { VeriTablosu } from './VeriTablosu';
import { panelHataMesaji, type AlanHatalari } from './yardimci';

// ---------------------------------------------------------------------------
// Sözleşme tipleri ve uç çağrıları
// ---------------------------------------------------------------------------

/** `GET /api/yonetim/kullanicilar` kaydı. Parola özeti ASLA istemciye gelmez. */
export interface Kullanici {
  id: string;
  email: string;
  ad: string;
  rol: Rol;
  aktif: boolean;
  sonGiris: string | null;
  createdAt: string;
}

/** Yeni hesap gövdesi. */
interface YeniKullaniciGirdisi {
  email: string;
  ad: string;
  parola: string;
  rol: Rol;
}

/** Sunucunun hata gövdesi: `detay` parola zayıflık nedenlerini taşır. */
interface HataGovdesi {
  hata?: string;
  kod?: string;
  detay?: string[];
}

const KULLANICI_YOLU = '/api/yonetim/kullanicilar';

/** Oturum çerezle taşındığı için `credentials: 'include'` zorunludur. */
async function kullaniciIstegi<T>(ekYol: string, secenekler?: RequestInit): Promise<T> {
  const cevap = await fetch(`${KULLANICI_YOLU}${ekYol}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...secenekler,
  });

  if (!cevap.ok) {
    let mesaj = `İstek başarısız (HTTP ${cevap.status}).`;
    let kod: string | null = null;
    let detay: string[] = [];
    try {
      const govde = (await cevap.json()) as HataGovdesi;
      if (typeof govde.hata === 'string' && govde.hata.trim() !== '') mesaj = govde.hata;
      if (typeof govde.kod === 'string') kod = govde.kod;
      if (Array.isArray(govde.detay)) {
        detay = govde.detay.filter((madde): madde is string => typeof madde === 'string');
      }
    } catch {
      /* Gövde JSON değilse genel mesaj kalır. */
    }
    // Oturum düştüyse KorumaliPanel yeniden giriş katmanı açsın.
    if (cevap.status === 401) oturumBittiBildir();
    throw new ApiHatasi(mesaj, cevap.status, kod, detay);
  }

  return (await cevap.json()) as T;
}

const kullaniciApi = {
  listele: () => kullaniciIstegi<Kullanici[]>(''),

  ekle: (girdi: YeniKullaniciGirdisi) =>
    kullaniciIstegi<Kullanici>('', { method: 'POST', body: JSON.stringify(girdi) }),

  durumDegistir: (id: string, aktif: boolean) =>
    kullaniciIstegi<{ tamam: boolean }>(`/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ aktif }),
    }),
};

// ---------------------------------------------------------------------------
// Etiketler ve doğrulama
// ---------------------------------------------------------------------------

const ROL_ETIKETLERI: Record<Rol, string> = {
  admin: 'Yönetici',
  ogretmen: 'Öğretmen',
};

/** Rol açıklaması — yetki sınırı ekranda yazılıdır. */
const ROL_ACIKLAMALARI: Record<Rol, string> = {
  admin: 'Tam yetki: içerik ekleme ve düzenleme, ünite tanımlama ve kullanıcı yönetimi.',
  ogretmen: 'Kendi sınıflarını yönetir; içerik (eser, ünite, ders) değiştiremez.',
};

/**
 * Parola kuralları — formda AÇIKÇA yazılır ve sunucudaki `parolaZayifMi`
 * denetiminin ilk dört kuralıyla birebir aynıdır. Sunucu ek kural dönerse
 * (örn. "Tek karakter tekrarı olamaz.") `detay` dizisiyle gösterilir.
 */
export const PAROLA_KURALLARI = [
  'En az 8 karakter olmalı.',
  'En az bir küçük harf içermeli.',
  'En az bir büyük harf içermeli.',
  'En az bir rakam içermeli.',
] as const;

/** Karşılanmayan parola kurallarını döner; boş dizi = parola kabul edilebilir. */
function parolaSorunlari(parola: string): string[] {
  const sorunlar: string[] = [];
  if (parola.length < 8) sorunlar.push(PAROLA_KURALLARI[0]);
  if (!/[a-zçğıöşü]/.test(parola)) sorunlar.push(PAROLA_KURALLARI[1]);
  if (!/[A-ZÇĞİÖŞÜ]/.test(parola)) sorunlar.push(PAROLA_KURALLARI[2]);
  if (!/[0-9]/.test(parola)) sorunlar.push(PAROLA_KURALLARI[3]);
  return sorunlar;
}

/** Sunucudaki `emailDogrula` ile aynı desen — ReDoS üretmez. */
const EPOSTA_DESENI = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const TARIH_BICIMI = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Son giriş tarihini okunur metne çevirir; renk/simge tek başına anlam taşımaz. */
function tarihYaz(deger: string | null): string {
  if (deger === null || deger.trim() === '') return 'Hiç giriş yapmadı';
  const tarih = new Date(deger);
  if (Number.isNaN(tarih.getTime())) return 'Tarih okunamadı';
  return TARIH_BICIMI.format(tarih);
}

interface YeniKullaniciFormu {
  ad: string;
  email: string;
  parola: string;
  /** Boş dize: kullanıcı henüz rol seçmedi. */
  rol: Rol | '';
}

/** En az yetki ilkesi: form öğretmen rolüyle açılır. */
const bosForm = (): YeniKullaniciFormu => ({ ad: '', email: '', parola: '', rol: 'ogretmen' });

interface OnayDurumu {
  kullanici: Kullanici;
  /** İşlem sonrasında hedeflenen durum. */
  aktif: boolean;
}

// ---------------------------------------------------------------------------
// Bileşen
// ---------------------------------------------------------------------------

export function KullaniciYonetimi() {
  /** Kendi hesabını kapatma koruması için aktif oturum bilgisi. */
  const { kullanici: aktifKullanici } = useOturum();

  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);

  const [form, setForm] = useState<YeniKullaniciFormu>(bosForm);
  const [hatalar, setHatalar] = useState<AlanHatalari>({});
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [islemHatasi, setIslemHatasi] = useState<{ mesaj: string; detay: string[] } | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);

  const [onayDurumu, setOnayDurumu] = useState<OnayDurumu | null>(null);
  const [durumDegisiyor, setDurumDegisiyor] = useState(false);

  const yukle = useCallback(async (sessiz = false) => {
    if (!sessiz) setYukleniyor(true);
    try {
      const liste = await kullaniciApi.listele();
      setKullanicilar(liste);
      setYuklemeHatasi(null);
    } catch (hata: unknown) {
      setYuklemeHatasi(panelHataMesaji(hata, 'Kullanıcı listesi yüklenemedi.'));
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  // --- Yeni kullanıcı kaydı -------------------------------------------------
  const yeniKullaniciKaydet = async () => {
    const bulunanlar: AlanHatalari = {};
    const ad = form.ad.trim();
    const email = form.email.trim();
    const rol = form.rol === '' ? null : form.rol;

    if (rol === null) bulunanlar['kullanici-rol'] = 'Rol seçilmelidir.';
    if (ad === '') bulunanlar['kullanici-ad'] = 'Ad ve soyad zorunludur.';
    if (email === '') bulunanlar['kullanici-email'] = 'E-posta zorunludur.';
    else if (!EPOSTA_DESENI.test(email)) {
      bulunanlar['kullanici-email'] = 'Geçerli bir e-posta adresi gir (örn. ad@okul.k12.tr).';
    }

    const parolaSorunu = parolaSorunlari(form.parola);
    if (form.parola === '') bulunanlar['kullanici-parola'] = 'Parola zorunludur.';
    else if (parolaSorunu.length > 0) bulunanlar['kullanici-parola'] = parolaSorunu.join(' ');

    setHatalar(bulunanlar);
    setIslemHatasi(null);
    setBildirim(null);

    // İlk hatalı alana odak taşınır; hata özeti role="alert" ile duyurulur.
    const ilkHataId = Object.keys(bulunanlar)[0];
    if (ilkHataId !== undefined || rol === null) {
      if (ilkHataId !== undefined) document.getElementById(ilkHataId)?.focus();
      return;
    }

    setKaydediliyor(true);
    try {
      const olusan = await kullaniciApi.ekle({ ad, email, parola: form.parola, rol });
      setBildirim(
        `“${olusan.ad}” kullanıcısı ${ROL_ETIKETLERI[olusan.rol].toLocaleLowerCase('tr-TR')} rolüyle eklendi.`,
      );
      setForm(bosForm());
      setHatalar({});
      await yukle(true);
    } catch (hata: unknown) {
      const detay = hata instanceof ApiHatasi ? hata.detay : [];
      setIslemHatasi({
        mesaj: panelHataMesaji(hata, 'Kullanıcı eklenemedi.'),
        detay,
      });

      // Sunucunun bildirdiği zayıflık nedenleri parola alanına da bağlanır (SC 3.3.1):
      // alan `aria-invalid` + `aria-describedby` taşır, maddeler kutuda listelenir.
      if (detay.length > 0) {
        setHatalar((mevcut) => ({
          ...mevcut,
          'kullanici-parola': 'Parola kuralları karşılanmadı; aşağıdaki maddeleri düzelt.',
        }));
        document.getElementById('kullanici-parola')?.focus();
      } else if (hata instanceof Error && hata.message.includes('e-posta')) {
        setHatalar((mevcut) => ({ ...mevcut, 'kullanici-email': hata.message }));
        document.getElementById('kullanici-email')?.focus();
      }
    } finally {
      setKaydediliyor(false);
    }
  };

  // --- Aktif/pasif değiştirme ----------------------------------------------
  const durumDegistir = async () => {
    if (onayDurumu === null) return;

    const { kullanici, aktif } = onayDurumu;
    setDurumDegisiyor(true);
    setBildirim(null);
    setIslemHatasi(null);

    try {
      await kullaniciApi.durumDegistir(kullanici.id, aktif);
      setBildirim(
        aktif
          ? `“${kullanici.ad}” hesabı etkinleştirildi; yeniden giriş yapabilir.`
          : `“${kullanici.ad}” hesabı pasifleştirildi; giriş yapamaz ve açık oturumları kapatıldı.`,
      );
      setOnayDurumu(null);
      await yukle(true);
    } catch (hata: unknown) {
      setIslemHatasi({
        mesaj: panelHataMesaji(hata, 'Hesap durumu değiştirilemedi.'),
        detay: [],
      });
      setOnayDurumu(null);
    } finally {
      setDurumDegisiyor(false);
    }
  };

  const aktifSayi = kullanicilar.filter((kullanici) => kullanici.aktif).length;
  const hataOzeti = [...new Set(Object.values(hatalar))];

  const rolSecenekleri = (['ogretmen', 'admin'] as const).map((rol) => ({
    deger: rol,
    etiket: `${ROL_ETIKETLERI[rol]} (${rol})`,
  }));

  return (
    <section className="panel__bolum" aria-labelledby="kullanici-baslik">
      <div className="panel__bolum-basligi">
        <div>
          <h2 id="kullanici-baslik">Kullanıcı yönetimi</h2>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            Yönetici ve öğretmen hesaplarını buradan açın, kapatın ve rollerini görün.
            Yeni hesap açıldığında kullanıcıya parolayı güvenli bir kanaldan iletin.
          </p>
        </div>
        <span className="rozet">
          {kullanicilar.length} hesap · {aktifSayi} aktif · {kullanicilar.length - aktifSayi} pasif
        </span>
      </div>

      {/*
        ZORUNLU POLİTİKA METNİ — birebir korunur.
        Çocuk hesabı açılmadığının ürün kararı olduğu ekranda yazılıdır.
      */}
      <div className="bildirim bildirim--bilgi panel__bilgi-kutusu" role="note">
        <p style={{ margin: 0 }}>
          <strong>Çocuklar için hesap açılmaz.</strong>{' '}
          Başvuru PDF'i &quot;kişisel veri toplanmaz, sınıf kodu anonim&quot; diyor.{' '}
          Öğrenciler cihaz-yerel anonim profille ilerler; sunucuda çocuğa ait hiçbir kayıt
          tutulmaz.{' '}
          Bu ekrandaki hesaplar yalnızca yetişkinler (yönetici ve öğretmen) içindir.
        </p>
      </div>

      {/* Rol açıklaması: yetki sınırı seçim yapılmadan önce okunur. */}
      <div className="kart">
        <h3>Roller ne yapabilir?</h3>
        <dl>
          {(['admin', 'ogretmen'] as const).map((rol) => (
            <div className="panel__rol-satir" key={rol}>
              <dt>
                <span className={`rozet rozet--rol-${rol} panel__kullanici-rol-rozet`}>
                  {ROL_ETIKETLERI[rol]} ({rol})
                </span>
              </dt>
              <dd>{ROL_ACIKLAMALARI[rol]}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Kaydetme/silme sonucu: kalıcı canlı bölge — duyuru güvenilir olur (SC 4.1.3). */}
      <div className="panel__bildirim-alani" role="status" aria-live="polite">
        {bildirim ? <p className="bildirim bildirim--basari">{bildirim}</p> : null}
      </div>

      {islemHatasi ? (
        <div className="bildirim bildirim--hata" role="alert">
          <p className="panel__ozet-baslik">
            <strong>İşlem tamamlanamadı.</strong> {islemHatasi.mesaj}
          </p>
          {islemHatasi.detay.length > 0 ? (
            <>
              <p className="panel__ozet-baslik">Sunucunun bildirdiği nedenler:</p>
              <ul className="panel__ozet-listesi">
                {islemHatasi.detay.map((madde) => (
                  <li key={madde}>{madde}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {yuklemeHatasi ? (
        <div className="bildirim bildirim--hata" role="alert">
          <p style={{ margin: 0 }}>
            <strong>Kullanıcı listesi yüklenemedi.</strong> {yuklemeHatasi}
          </p>
          <button
            type="button"
            className="dugme dugme--ikincil"
            style={{ marginTop: 'var(--b-3)' }}
            onClick={() => void yukle()}
          >
            Yeniden dene
          </button>
        </div>
      ) : null}

      {/* --- Kullanıcı tablosu ---------------------------------------------- */}
      <div>
        <div className="panel__bolum-basligi">
          <h3>Hesaplar</h3>
          {/* Liste her değiştiğinde sayaç canlı bölgede duyurulur (SC 4.1.3). */}
          <p className="panel__sonuc" role="status" aria-live="polite">
            {kullanicilar.length} kullanıcı listeleniyor
          </p>
        </div>

        {yukleniyor && kullanicilar.length === 0 ? (
          <p className="metin-soluk" role="status">
            Kullanıcılar yükleniyor…
          </p>
        ) : (
          <VeriTablosu
            baslik="Yönetici ve öğretmen hesapları"
            baslikGorunur
            bosMesaj="Henüz kullanıcı kaydı yok. Aşağıdaki formla ilk yetişkin hesabını ekleyin."
            satirlar={kullanicilar}
            satirAnahtari={(kullanici) => kullanici.id}
            sutunlar={[
              {
                anahtar: 'ad',
                baslik: 'Ad soyad',
                icerik: (kullanici) => (
                  <>
                    <strong>{kullanici.ad}</strong>
                    {aktifKullanici?.id === kullanici.id ? (
                      <>
                        {' '}
                        <span className="rozet">sen</span>
                      </>
                    ) : null}
                  </>
                ),
              },
              { anahtar: 'email', baslik: 'E-posta', icerik: (kullanici) => kullanici.email },
              {
                anahtar: 'rol',
                baslik: 'Rol',
                icerik: (kullanici) => (
                  <span className={`rozet rozet--rol-${kullanici.rol}`}>
                    {ROL_ETIKETLERI[kullanici.rol]} ({kullanici.rol})
                  </span>
                ),
              },
              {
                anahtar: 'durum',
                baslik: 'Durum',
                icerik: (kullanici) =>
                  kullanici.aktif ? (
                    <span className="rozet rozet--aktif">Aktif: giriş yapabilir</span>
                  ) : (
                    <span className="rozet rozet--pasif">Pasif: giriş yapamaz</span>
                  ),
              },
              {
                anahtar: 'sonGiris',
                baslik: 'Son giriş',
                icerik: (kullanici) =>
                  kullanici.sonGiris === null ? (
                    <span className="metin-soluk">{tarihYaz(null)}</span>
                  ) : (
                    <time dateTime={kullanici.sonGiris}>{tarihYaz(kullanici.sonGiris)}</time>
                  ),
              },
              {
                anahtar: 'islem',
                baslik: 'İşlemler',
                icerik: (kullanici) => {
                  const kendisi = aktifKullanici?.id === kullanici.id;
                  const hedefAktif = !kullanici.aktif;
                  const eylem = hedefAktif ? 'Etkinleştir' : 'Pasifleştir';

                  return (
                    <div className="panel__satir-eylemler">
                      <button
                        type="button"
                        className={hedefAktif ? 'dugme dugme--ikincil' : 'dugme dugme--tehlike'}
                        // Kendi hesabını kapatmak sunucuda 400 döner; kullanıcı
                        // boşa uğraştırılmaz, düğme baştan devre dışıdır.
                        disabled={kendisi}
                        aria-describedby={
                          kendisi ? `kullanici-${kullanici.id}-kendi-hesap` : undefined
                        }
                        aria-label={`${kullanici.ad} hesabını ${eylem}`}
                        onClick={() => {
                          setBildirim(null);
                          setIslemHatasi(null);
                          setOnayDurumu({ kullanici, aktif: hedefAktif });
                        }}
                      >
                        {eylem}
                      </button>
                      {kendisi ? (
                        <span
                          className="panel__kendi-hesap"
                          id={`kullanici-${kullanici.id}-kendi-hesap`}
                        >
                          Kendi hesabın: kapatılamaz.
                        </span>
                      ) : null}
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </div>

      {/* --- Yeni kullanıcı formu ------------------------------------------- */}
      <div className="kart panel__form-kart">
        <h3>Yeni kullanıcı ekle</h3>
        <p className="metin-ikincil">
          Hesaplar yalnızca yetişkinler içindir. Eklenen kullanıcı aktif olarak açılır ve
          verilen parolayla giriş yapabilir.
        </p>

        {/*
          İstemci doğrulama özeti. Sunucu hatası varken gösterilmez: aynı mesaj
          iki kez duyurulmasın (sunucu kutusu `islemHatasi` ile zaten görünür).
        */}
        {hataOzeti.length > 0 && islemHatasi === null ? (
          <div className="bildirim bildirim--hata" role="alert">
            <p className="panel__ozet-baslik">
              <strong>Kullanıcı eklenemedi.</strong> Lütfen aşağıdaki alanları düzeltin:
            </p>
            <ul className="panel__ozet-listesi">
              {hataOzeti.map((mesaj) => (
                <li key={mesaj}>{mesaj}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form
          className="panel__form"
          noValidate
          aria-busy={kaydediliyor}
          onSubmit={(olay) => {
            olay.preventDefault();
            void yeniKullaniciKaydet();
          }}
        >
          <div className="izgara-2">
            <MetinGirdisi
              id="kullanici-ad"
              etiket="Ad soyad"
              deger={form.ad}
              onDegistir={(deger) => setForm((mevcut) => ({ ...mevcut, ad: deger }))}
              hata={hatalar['kullanici-ad']}
              zorunlu
              ornek="Ayşe Yılmaz"
            />
            <MetinGirdisi
              id="kullanici-email"
              etiket="E-posta"
              deger={form.email}
              onDegistir={(deger) => setForm((mevcut) => ({ ...mevcut, email: deger }))}
              hata={hatalar['kullanici-email']}
              ipucu="Giriş için kullanılır; aynı e-posta ile ikinci hesap açılamaz."
              zorunlu
              ornek="ayse@okul.k12.tr"
            />
            <ParolaGirdisi
              id="kullanici-parola"
              etiket="Parola"
              deger={form.parola}
              onDegistir={(deger) => setForm((mevcut) => ({ ...mevcut, parola: deger }))}
              hata={hatalar['kullanici-parola']}
              ipucu="En az 8 karakter; bir küçük harf, bir büyük harf ve bir rakam içermeli."
              zorunlu
            />
            <SecimGirdisi
              id="kullanici-rol"
              etiket="Rol"
              deger={form.rol}
              onDegistir={(deger) =>
                setForm((mevcut) => ({
                  ...mevcut,
                  rol: deger === 'admin' || deger === 'ogretmen' ? deger : '',
                }))
              }
              secenekler={rolSecenekleri}
              bosEtiket="Rol seçin"
              hata={hatalar['kullanici-rol']}
              ipucu="Varsayılan: Öğretmen (en az yetki). Rollerin yetkileri yukarıdaki listede yazılıdır."
              zorunlu
            />
          </div>

          {/* Parola kuralları formda açıkça yazılır (SC 3.3.2 Etiketler veya Talimatlar). */}
          <div className="panel__kurallar">
            <h4>Parola kuralları</h4>
            <ul className="panel__kural-listesi">
              <li>En az 8 karakter</li>
              <li>En az bir küçük harf</li>
              <li>En az bir büyük harf</li>
              <li>En az bir rakam</li>
            </ul>
          </div>

          <div className="panel__form-eylem">
            <button type="submit" className="dugme" disabled={kaydediliyor}>
              {kaydediliyor ? 'Kaydediliyor…' : 'Kullanıcıyı kaydet'}
            </button>
          </div>
        </form>
      </div>

      <OnayDiyalogu
        acik={onayDurumu !== null}
        baslik={onayDurumu?.aktif === false ? 'Hesabı pasifleştir' : 'Hesabı etkinleştir'}
        aciklama={
          onayDurumu !== null ? (
            <>
              <p>
                <strong>“{onayDurumu.kullanici.ad}”</strong> ({onayDurumu.kullanici.email}) hesabı{' '}
                {onayDurumu.aktif ? 'yeniden açılacak' : 'kapatılacak'}.
              </p>
              <p style={{ margin: 0 }}>
                {onayDurumu.aktif
                  ? 'Hesap sahibi verilen parolayla yeniden giriş yapabilir.'
                  : 'Hesap sahibi artık giriş yapamaz; açık oturumları da kapatılır. Kayıt silinmez, daha sonra yeniden etkinleştirilebilir.'}
              </p>
            </>
          ) : null
        }
        onayEtiketi={onayDurumu?.aktif ? 'Etkinleştir' : 'Pasifleştir'}
        tehlike={onayDurumu?.aktif === false}
        mesgul={durumDegisiyor}
        onOnay={() => void durumDegistir()}
        onKapat={() => setOnayDurumu(null)}
      />
    </section>
  );
}

export default KullaniciYonetimi;
