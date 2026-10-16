/**
 * Eser ekleme / düzenleme formu.
 *
 * Şartname 5.1.1: "İçerik ekleme ve mevcut içerikleri düzenleme imkânı olmalı" ve
 * "Sistem yeni vakıf eserleri eklenmesine uygun kurgulanmalı." Alanlar
 * `shared/types.ts` içindeki `Eser` sözleşmesiyle birebir uyumludur.
 *
 * Alan grupları PDF'teki dört soruyu izler:
 *  K1 kim yaptırdı · K2 neden yaptırdı · K3 kime fayda sağladı · K4 bugün ne oldu
 *
 * Bilgi Notu veri alanları: eser adı ve tarihçe Türkçe + İngilizce iki dilli
 * basılır (`adEn`, `tarihce`, `tarihceEn`). Fotoğraf galerileri ve sergi
 * bilgileri bu turda SALT OKUNUR gösterilir; görseller Vakıf Katılım'dan
 * beklenmektedir, düzenleme ekranı sonraki tura bırakılmıştır.
 *
 * Gelir dağılımı kuralı (PDF): "doğrulanmamış hiçbir bilgi kesin bilgi olarak
 * sunulmaz." Bu yüzden oran girilmediği sürece kayıt `belge-bulunamadi` olarak
 * işaretlenir ve arayüz bunu açıkça söyler.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Eser,
  EserFotograf,
  GelirKalemi,
  GelirTipi,
  Kaynak,
  Kulliye,
  Sehir,
  Sergi,
} from '@shared/types';
import { api, yonetimApi } from '../../lib/api';
import { Alan, CokSatirliGirdi, MetinGirdisi, OnayKutusu, SecimGirdisi, type Secenek } from './Alan';
import { kimlikUret, metinVeyaNull, sayiyaCevir, type AlanHatalari } from './yardimci';

// ---------------------------------------------------------------------------
// Form modeli
// ---------------------------------------------------------------------------

interface KalemSatiri {
  /** React anahtarı; satır silinip eklendiğinde kararlı kalır. */
  anahtar: string;
  kalem: string;
  yuzde: string;
  /**
   * `gelir` (para nereden geliyor) / `gider` (nereye harcanıyor) / `null` (belirsiz).
   * Her kalemde açıkça seçilir; iki taraf ayrı ayrı %100 eder.
   */
  tip: GelirTipi | null;
  kaynak: string;
}

interface KaynakSatiri {
  anahtar: string;
  kunye: string;
  url: string;
}

interface FormDurumu {
  id: string;
  ad: string;
  /** İngilizce ad — envanter kitapları iki dilli basılır. */
  adEn: string;
  sehirId: string;
  kulliyeId: string;
  tur: string;
  ilce: string;
  lat: string;
  lng: string;
  bani: string;
  baniDonem: string;
  yapimYili: string;
  vakfiyeAmaci: string;
  hizmet: string;
  bugunNeOldu: string;
  /** Tarihçe — Türkçe ve İngilizce iki dilli. */
  tarihce: string;
  tarihceEn: string;
  arsivNo: string;
  dogrulamaNotu: string;
  yayinda: boolean;
  kaynaklar: KaynakSatiri[];
  gelirKalemleri: KalemSatiri[];
}

/**
 * Salt okunur ilişkili kayıtlar. Düzenlenebilir form modeline KONMAZ: bu turda
 * fotoğraf ve sergi düzenlemesi kapsam dışıdır, yalnızca gösterilir.
 */
interface SaltOkunurVeri {
  fotograflar: EserFotograf[];
  sergiler: Sergi[];
}

function saltOkunurVeri(eser: Eser): SaltOkunurVeri {
  return {
    fotograflar: Array.isArray(eser.fotograflar) ? eser.fotograflar : [],
    sergiler: Array.isArray(eser.sergiler) ? eser.sergiler : [],
  };
}

let anahtarSayaci = 0;
function yeniAnahtar(): string {
  anahtarSayaci += 1;
  return `s${anahtarSayaci}`;
}

const bosKalem = (): KalemSatiri => ({
  anahtar: yeniAnahtar(),
  kalem: '',
  yuzde: '',
  tip: null,
  kaynak: '',
});
const bosKaynak = (): KaynakSatiri => ({ anahtar: yeniAnahtar(), kunye: '', url: '' });

function bosForm(): FormDurumu {
  return {
    id: '',
    ad: '',
    adEn: '',
    sehirId: '',
    kulliyeId: '',
    tur: '',
    ilce: '',
    lat: '',
    lng: '',
    bani: '',
    baniDonem: '',
    yapimYili: '',
    vakfiyeAmaci: '',
    hizmet: '',
    bugunNeOldu: '',
    tarihce: '',
    tarihceEn: '',
    arsivNo: '',
    dogrulamaNotu: '',
    yayinda: false,
    kaynaklar: [bosKaynak()],
    gelirKalemleri: [bosKalem()],
  };
}

function eserdenForm(eser: Eser): FormDurumu {
  return {
    id: eser.id,
    ad: eser.ad,
    adEn: eser.adEn ?? '',
    sehirId: eser.sehirId,
    kulliyeId: eser.kulliyeId ?? '',
    tur: eser.tur,
    ilce: eser.ilce ?? '',
    lat: eser.koordinat ? String(eser.koordinat.lat) : '',
    lng: eser.koordinat ? String(eser.koordinat.lng) : '',
    bani: eser.bani ?? '',
    baniDonem: eser.baniDonem ?? '',
    yapimYili: eser.yapimYili ?? '',
    vakfiyeAmaci: eser.vakfiyeAmaci ?? '',
    hizmet: eser.hizmet ?? '',
    bugunNeOldu: eser.bugunNeOldu ?? '',
    tarihce: eser.tarihce ?? '',
    tarihceEn: eser.tarihceEn ?? '',
    arsivNo: eser.arsivNo ?? '',
    dogrulamaNotu: eser.dogrulamaNotu ?? '',
    yayinda: eser.yayinda,
    kaynaklar: eser.kaynaklar.length
      ? eser.kaynaklar.map((k) => ({
          anahtar: yeniAnahtar(),
          kunye: k.kunye,
          url: k.url ?? '',
        }))
      : [bosKaynak()],
    gelirKalemleri: eser.gelirKalemleri.length
      ? eser.gelirKalemleri.map((k) => ({
          anahtar: yeniAnahtar(),
          kalem: k.kalem,
          yuzde: k.yuzde === null ? '' : String(k.yuzde),
          tip: k.tip ?? null,
          kaynak: k.kaynak ?? '',
        }))
      : [bosKalem()],
  };
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** Tamamen boş satırlar yok sayılır; kullanıcı boş satır yüzünden engellenmez. */
const doluKalemler = (satirlar: KalemSatiri[]): KalemSatiri[] =>
  satirlar.filter((s) => s.kalem.trim() !== '' || s.yuzde.trim() !== '' || s.kaynak.trim() !== '');

const doluKaynaklar = (satirlar: KaynakSatiri[]): KaynakSatiri[] =>
  satirlar.filter((s) => s.kunye.trim() !== '' || s.url.trim() !== '');

/**
 * Kalem tipi seçenekleri.
 *
 * Vakfiye iki tarafı ayrı kaydeder; karıştırılırsa oran toplamı %200 çıkar ve
 * Röntgeni çubukları bozulur. Bu yüzden tip her kalemde açıkça seçilir.
 */
const TIP_SECENEKLERI: Secenek[] = [
  { deger: 'gelir', etiket: 'Gelir kaynağı' },
  { deger: 'gider', etiket: 'Gider kalemi' },
];

/** Seçim kutusundan gelen ham değeri `GelirTipi | null`'a çevirir. */
function tipCoz(deger: string): GelirTipi | null {
  return deger === 'gelir' || deger === 'gider' ? deger : null;
}

/** Sunucuya gönderilecek gövde. */
interface EserGirdisi extends Partial<Eser> {
  id: string;
  ad: string;
  sehirId: string;
  tur: string;
}

function girdiOlustur(form: FormDurumu, etkinId: string): EserGirdisi {
  const kalemler: GelirKalemi[] = doluKalemler(form.gelirKalemleri).map((satir, sira) => ({
    id: sira,
    eserId: etkinId,
    kalem: satir.kalem.trim(),
    // Oran yoksa null: uygulama "belge bulunamadı" gösterir, tahmin üretmez.
    yuzde: sayiyaCevir(satir.yuzde),
    // Tip alanı bu turda düzenlenmez; okunan değer aynen geri yazılır.
    tip: satir.tip,
    kaynak: metinVeyaNull(satir.kaynak),
    sira,
  }));

  const kaynaklar: Kaynak[] = doluKaynaklar(form.kaynaklar).map((satir) => ({
    kunye: satir.kunye.trim(),
    url: metinVeyaNull(satir.url),
  }));

  const lat = sayiyaCevir(form.lat);
  const lng = sayiyaCevir(form.lng);

  return {
    id: etkinId,
    ad: form.ad.trim(),
    // İki dilli envanter: İngilizce ad ve tarihçe boşsa null yazılır.
    adEn: metinVeyaNull(form.adEn),
    sehirId: form.sehirId,
    kulliyeId: metinVeyaNull(form.kulliyeId),
    tur: form.tur.trim(),
    ilce: metinVeyaNull(form.ilce),
    koordinat: lat !== null && lng !== null ? { lat, lng } : null,
    bani: metinVeyaNull(form.bani),
    baniDonem: metinVeyaNull(form.baniDonem),
    yapimYili: metinVeyaNull(form.yapimYili),
    vakfiyeAmaci: metinVeyaNull(form.vakfiyeAmaci),
    hizmet: metinVeyaNull(form.hizmet),
    bugunNeOldu: metinVeyaNull(form.bugunNeOldu),
    tarihce: metinVeyaNull(form.tarihce),
    tarihceEn: metinVeyaNull(form.tarihceEn),
    gelirDagilimiDurumu: kalemler.some((k) => k.yuzde !== null) ? 'belgeli' : 'belge-bulunamadi',
    arsivNo: metinVeyaNull(form.arsivNo),
    kaynaklar,
    dogrulamaNotu: metinVeyaNull(form.dogrulamaNotu),
    yayinda: form.yayinda,
    gelirKalemleri: kalemler,
  };
}

/**
 * Alan bazlı doğrulama. Anahtarlar doğrudan DOM eleman kimlikleridir; böylece
 * ilk hatalı alana odak taşınabilir (SC 3.3.1).
 */
function dogrula(form: FormDurumu, yeniMi: boolean): AlanHatalari {
  const hatalar: AlanHatalari = {};

  if (yeniMi) {
    const id = form.id.trim();
    if (id === '') {
      hatalar['eser-id'] = 'Kimlik zorunludur; eser adından otomatik üretilir.';
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      hatalar['eser-id'] = 'Kimlik yalnızca küçük harf, rakam ve tire içerebilir (örn. bursa-ulu-cami).';
    }
  }

  if (form.ad.trim() === '') hatalar['eser-ad'] = 'Eser adı zorunludur.';
  if (form.sehirId === '') hatalar['eser-sehir'] = 'Şehir seçilmelidir.';
  if (form.tur.trim() === '') {
    hatalar['eser-tur'] = 'Eser türü zorunludur (örn. Cami, Han, Hamam, Medrese).';
  }

  const latHam = form.lat.trim();
  const lngHam = form.lng.trim();
  const lat = sayiyaCevir(latHam);
  const lng = sayiyaCevir(lngHam);

  if (latHam === '' && lngHam !== '') hatalar['eser-lat'] = 'Enlem ve boylam birlikte girilmelidir.';
  else if (latHam !== '' && lat === null) hatalar['eser-lat'] = 'Enlem sayı olmalıdır (örn. 40,1836).';
  else if (lat !== null && (lat < -90 || lat > 90)) {
    hatalar['eser-lat'] = 'Enlem -90 ile 90 arasında olmalıdır.';
  }

  if (lngHam === '' && latHam !== '') hatalar['eser-lng'] = 'Enlem ve boylam birlikte girilmelidir.';
  else if (lngHam !== '' && lng === null) hatalar['eser-lng'] = 'Boylam sayı olmalıdır (örn. 29,0662).';
  else if (lng !== null && (lng < -180 || lng > 180)) {
    hatalar['eser-lng'] = 'Boylam -180 ile 180 arasında olmalıdır.';
  }

  for (const satir of doluKalemler(form.gelirKalemleri)) {
    if (satir.kalem.trim() === '') {
      hatalar[`eser-kalem-${satir.anahtar}-kalem`] =
        'Gelir kalemi adı zorunludur (örn. Han kirası, Dükkân kirası).';
    }
    const yuzdeHam = satir.yuzde.trim();
    if (yuzdeHam !== '') {
      const yuzde = sayiyaCevir(yuzdeHam);
      if (yuzde === null) {
        hatalar[`eser-kalem-${satir.anahtar}-yuzde`] = 'Oran sayı olmalıdır (örn. 40 veya 40,5).';
      } else if (yuzde < 0 || yuzde > 100) {
        hatalar[`eser-kalem-${satir.anahtar}-yuzde`] = 'Oran 0 ile 100 arasında olmalıdır.';
      }
    }
  }

  for (const satir of doluKaynaklar(form.kaynaklar)) {
    if (satir.kunye.trim() === '') {
      hatalar[`eser-kaynak-${satir.anahtar}-kunye`] =
        'Kaynak künyesi zorunludur (örn. VGM Vakıf Kayıtlar Arşivi, No: 1234).';
    }
    const url = satir.url.trim();
    if (url !== '' && !/^https?:\/\//i.test(url)) {
      hatalar[`eser-kaynak-${satir.anahtar}-url`] =
        'Bağlantı http:// veya https:// ile başlamalıdır.';
    }
  }

  return hatalar;
}

// ---------------------------------------------------------------------------
// Bileşen
// ---------------------------------------------------------------------------

export interface EserFormuProps {
  /** null → yeni kayıt; dolu → mevcut kaydı düzenleme. */
  eserId: string | null;
  sehirler: Sehir[];
  kulliyeler: Kulliye[];
  onListeyeDon: () => void;
}

/** Alan grubu — `<legend>` ile ekran okuyucuya bölüm adı verilir. */
function Grup({
  baslik,
  aciklama,
  children,
}: {
  baslik: string;
  aciklama?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="panel__grup">
      <legend className="panel__grup-baslik">{baslik}</legend>
      {aciklama ? <p className="panel__grup-aciklama">{aciklama}</p> : null}
      <div className="panel__grup-ic">{children}</div>
    </fieldset>
  );
}

/** Boş/eksik metni `null`'a indirger. */
function doluMetin(deger: string | null | undefined): string | null {
  if (typeof deger !== 'string') return null;
  const temiz = deger.trim();
  return temiz === '' ? null : temiz;
}

/**
 * Fotoğraf ve sergi kayıtlarının SALT OKUNUR görünümü.
 *
 * Bu turda düzenleme kapsam dışıdır (görseller Vakıf Katılım'dan bekleniyor);
 * burada yalnızca kayıtlı veri gösterilir. Her `<img>` etiketlidir: `altMetin`
 * boşsa görselin bağlamını taşıyan bir metin üretilir ve eksiklik ayrıca
 * METİNLE bildirilir (SC 1.1.1, SC 1.4.1).
 */
function SaltOkunurGaleri({
  veri,
  eserAdi,
  yeniMi,
}: {
  veri: SaltOkunurVeri | null;
  eserAdi: string;
  yeniMi: boolean;
}) {
  if (veri === null) {
    return (
      <p className="panel__salt-okunur-not">
        {yeniMi
          ? 'Fotoğraf ve sergi bilgileri kayıt oluşturulduktan sonra burada salt okunur görünür.'
          : 'Fotoğraf ve sergi bilgileri yükleniyor…'}
      </p>
    );
  }

  const fotograflar = [...veri.fotograflar].sort((a, b) => a.sira - b.sira);
  const sergiler = veri.sergiler;

  if (fotograflar.length === 0 && sergiler.length === 0) {
    return <p className="panel__salt-okunur-not">Bu eser için kayıtlı fotoğraf veya sergi yok.</p>;
  }

  const gosterilecekAd = doluMetin(eserAdi) ?? 'Eser';

  return (
    <>
      {fotograflar.length > 0 ? (
        <div>
          <p className="panel__alt-baslik">Fotoğraflar</p>
          <ul className="panel__foto-listesi">
            {fotograflar.map((foto) => {
              const alt = doluMetin(foto.altMetin);
              const kunye = [doluMetin(foto.kaynak), doluMetin(foto.lisans)].filter(
                (parca): parca is string => parca !== null,
              );
              return (
                <li key={foto.id} className="panel__foto-kare">
                  <img
                    className="panel__foto"
                    src={foto.url}
                    // `alt` ZORUNLU — hiçbir görsel etiketsiz kalmaz.
                    alt={alt ?? `${gosterilecekAd} — arşiv fotoğrafı`}
                  />
                  {alt === null ? (
                    <span className="panel__foto-uyari">
                      Alt metni eksik; görsel yayınlanmadan önce eklenmelidir.
                    </span>
                  ) : null}
                  {kunye.length > 0 ? (
                    <span className="panel__foto-kunye">{kunye.join(' · ')}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {sergiler.length > 0 ? (
        <div>
          <p className="panel__alt-baslik">Sergiler</p>
          <ul className="panel__sergi-listesi">
            {sergiler.map((sergi) => {
              const adEn = doluMetin(sergi.adEn);
              const kunye = [doluMetin(sergi.tarih), doluMetin(sergi.mekan)].filter(
                (parca): parca is string => parca !== null,
              );
              const aciklama = doluMetin(sergi.aciklama);
              return (
                <li key={sergi.id} className="panel__sergi">
                  <p className="panel__sergi-ad">
                    <strong>{sergi.ad}</strong>
                    {adEn ? (
                      <span className="panel__sergi-ad-en" lang="en">
                        {' '}
                        {adEn}
                      </span>
                    ) : null}
                  </p>
                  {kunye.length > 0 ? (
                    <p className="panel__sergi-kunye">{kunye.join(' · ')}</p>
                  ) : null}
                  {aciklama ? <p className="panel__sergi-aciklama">{aciklama}</p> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export function EserFormu({ eserId, sehirler, kulliyeler, onListeyeDon }: EserFormuProps) {
  const [form, setForm] = useState<FormDurumu>(bosForm);
  const [yukleniyor, setYukleniyor] = useState(eserId !== null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);
  const [hatalar, setHatalar] = useState<AlanHatalari>({});
  const [kaydetmeHatasi, setKaydetmeHatasi] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  /** Yeni kayıt başarıyla oluşturulunca kimlik burada tutulur; form düzenlemeye döner. */
  const [olusanId, setOlusanId] = useState<string | null>(null);
  /** Kullanıcı kimliği elle değiştirdiyse addan türetme durur. */
  const [idElleDegisti, setIdElleDegisti] = useState(false);
  /**
   * Fotoğraflar ve sergiler bu turda düzenlenemez; kayıttan okunup salt okunur
   * gösterilir (görseller Vakıf Katılım'dan beklenmektedir).
   */
  const [kayitliVeri, setKayitliVeri] = useState<SaltOkunurVeri | null>(null);

  const etkinId = eserId ?? olusanId;
  const yeniMi = etkinId === null;

  // Düzenleme kipinde kaydı sunucudan tazele
  useEffect(() => {
    if (eserId === null) return;

    let iptal = false;
    setYukleniyor(true);
    setYuklemeHatasi(null);

    api
      .eser(eserId)
      .then((eser) => {
        if (iptal) return;
        setForm(eserdenForm(eser));
        setKayitliVeri(saltOkunurVeri(eser));
      })
      .catch((hata: unknown) => {
        if (!iptal) setYuklemeHatasi(hata instanceof Error ? hata.message : 'Eser yüklenemedi.');
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });

    return () => {
      iptal = true;
    };
  }, [eserId]);

  const alan = <K extends keyof FormDurumu>(ad: K, deger: FormDurumu[K]) =>
    setForm((mevcut) => ({ ...mevcut, [ad]: deger }));

  const adDegistir = (yeniAd: string) =>
    setForm((mevcut) => ({
      ...mevcut,
      ad: yeniAd,
      // Yeni kayıtta kimlik addan türetilir; kullanıcı kimliğe dokunduysa korunur.
      id: yeniMi && !idElleDegisti ? kimlikUret(yeniAd) : mevcut.id,
    }));

  const kalemDegistir = (anahtar: string, kismi: Partial<KalemSatiri>) =>
    setForm((mevcut) => ({
      ...mevcut,
      gelirKalemleri: mevcut.gelirKalemleri.map((satir) =>
        satir.anahtar === anahtar ? { ...satir, ...kismi } : satir,
      ),
    }));

  const kaynakDegistir = (anahtar: string, kismi: Partial<KaynakSatiri>) =>
    setForm((mevcut) => ({
      ...mevcut,
      kaynaklar: mevcut.kaynaklar.map((satir) =>
        satir.anahtar === anahtar ? { ...satir, ...kismi } : satir,
      ),
    }));

  const kalemEkle = () =>
    setForm((mevcut) => ({ ...mevcut, gelirKalemleri: [...mevcut.gelirKalemleri, bosKalem()] }));

  const kalemCikar = (anahtar: string) =>
    setForm((mevcut) => {
      const kalan = mevcut.gelirKalemleri.filter((satir) => satir.anahtar !== anahtar);
      return { ...mevcut, gelirKalemleri: kalan.length ? kalan : [bosKalem()] };
    });

  const kaynakEkle = () =>
    setForm((mevcut) => ({ ...mevcut, kaynaklar: [...mevcut.kaynaklar, bosKaynak()] }));

  const kaynakCikar = (anahtar: string) =>
    setForm((mevcut) => {
      const kalan = mevcut.kaynaklar.filter((satir) => satir.anahtar !== anahtar);
      return { ...mevcut, kaynaklar: kalan.length ? kalan : [bosKaynak()] };
    });

  // --- Otomatik hesaplanan gelir dağılımı durumu ---------------------------
  const doluKalemListesi = doluKalemler(form.gelirKalemleri);
  const oranliSayi = doluKalemListesi.filter((s) => sayiyaCevir(s.yuzde) !== null).length;
  const belgeli = oranliSayi > 0;

  /**
   * Oran toplamı TARAF BAŞINA hesaplanır: vakfiyede `gelir` (para nereden
   * geliyor) ve `gider` (nereye harcanıyor) ayrı ayrı %100 eder. İkisi tek
   * havuzda toplanırsa geçerli bir vakfiye yanlışlıkla "%200" görünür.
   */
  const toplamlar = { gelir: 0, gider: 0, belirsiz: 0 };
  for (const satir of doluKalemListesi) {
    toplamlar[satir.tip ?? 'belirsiz'] += sayiyaCevir(satir.yuzde) ?? 0;
  }
  const asanTaraflar = (
    [
      { anahtar: 'gelir', etiket: 'Gelir kaynağı kalemleri', toplam: toplamlar.gelir },
      { anahtar: 'gider', etiket: 'Gider kalemleri', toplam: toplamlar.gider },
      { anahtar: 'belirsiz', etiket: 'Tipi belirsiz kalemler', toplam: toplamlar.belirsiz },
    ] as const
  ).filter((taraf) => taraf.toplam > 100);

  const kaydet = async () => {
    const bulunanlar = dogrula(form, yeniMi);
    setHatalar(bulunanlar);
    setKaydetmeHatasi(null);
    setBasari(null);

    // İlk hatalı alana odak taşınır ve hata özeti role="alert" ile duyurulur.
    const ilkHataId = Object.keys(bulunanlar)[0];
    if (ilkHataId !== undefined) {
      document.getElementById(ilkHataId)?.focus();
      return;
    }

    const temizId = etkinId ?? form.id.trim();
    const girdi = girdiOlustur(form, temizId);

    setMesgul(true);
    try {
      if (yeniMi) {
        const kaydedilen = await yonetimApi.eserKaydet(girdi);
        setOlusanId(temizId);
        // Kayıt oluşunca salt okunur bölümler (fotoğraf, sergi) dolar.
        setKayitliVeri(saltOkunurVeri(kaydedilen));
        setBasari(`“${girdi.ad}” kaydedildi. Bundan sonraki kayıtlar bu eseri günceller.`);
      } else {
        const kaydedilen = await yonetimApi.eserGuncelle(temizId, girdi);
        setKayitliVeri(saltOkunurVeri(kaydedilen));
        setBasari(`“${girdi.ad}” güncellendi.`);
      }
      setHatalar({});
    } catch (hata: unknown) {
      // Sunucu 400 döndüğünde Türkçe doğrulama mesajı doğrudan gösterilir (şartname 5.1.5).
      setKaydetmeHatasi(hata instanceof Error ? hata.message : 'Kaydetme başarısız oldu.');
    } finally {
      setMesgul(false);
    }
  };

  const sehirSecenekleri = sehirler.map((sehir) => ({ deger: sehir.id, etiket: sehir.ad }));
  const kulliyeSecenekleri = kulliyeler
    .filter((kulliye) => form.sehirId === '' || kulliye.sehirId === form.sehirId)
    .map((kulliye) => ({ deger: kulliye.id, etiket: kulliye.ad }));

  const hataOzeti = [...new Set(Object.values(hatalar))];

  return (
    <section className="panel__form-bolum" aria-labelledby="eser-form-baslik">
      <div className="panel__baslik-satiri">
        <div>
          <p className="etiket">KATMAN 04 · İçerik yönetimi</p>
          <h1 id="eser-form-baslik">{yeniMi ? 'Yeni eser ekle' : 'Eseri düzenle'}</h1>
          <p className="metin-ikincil">
            Vakıf eseri künyesi, vakfiye amacı ve gelir dağılımı buradan yönetilir. Her
            bilgi kaynağıyla birlikte kaydedilir.
          </p>
        </div>
        <button type="button" className="dugme dugme--ikincil" onClick={onListeyeDon}>
          ← Listeye dön
        </button>
      </div>

      {/*
        Kaydetme sonucu kalıcı bir canlı bölgede duyurulur; bölge önceden var
        olduğu için ekran okuyucular içerik değişimini güvenilir biçimde okur.
      */}
      <div className="panel__bildirim-alani" role="status" aria-live="polite">
        {basari ? <p className="bildirim bildirim--basari">{basari}</p> : null}
      </div>

      {kaydetmeHatasi ? (
        <div className="bildirim bildirim--hata" role="alert">
          <p style={{ margin: 0 }}>
            <strong>Kaydedilemedi.</strong> {kaydetmeHatasi}
          </p>
        </div>
      ) : null}

      {hataOzeti.length > 0 ? (
        <div className="bildirim bildirim--hata" role="alert">
          <p className="panel__ozet-baslik">
            <strong>Form gönderilemedi.</strong> Lütfen aşağıdaki alanları düzeltin:
          </p>
          <ul className="panel__ozet-listesi">
            {hataOzeti.map((mesaj) => (
              <li key={mesaj}>{mesaj}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {yuklemeHatasi ? (
        <div className="bildirim bildirim--hata" role="alert">
          <p style={{ margin: 0 }}>
            <strong>Eser yüklenemedi.</strong> {yuklemeHatasi}
          </p>
        </div>
      ) : null}

      {yukleniyor ? (
        <p className="metin-soluk" role="status">
          Eser bilgileri yükleniyor…
        </p>
      ) : null}

      {!yukleniyor && !yuklemeHatasi ? (
        <form
          className="panel__form"
          noValidate
          aria-busy={mesgul}
          onSubmit={(olay) => {
            olay.preventDefault();
            void kaydet();
          }}
        >
          {sehirler.length === 0 ? (
            <p className="bildirim bildirim--uyari">
              Şehir listesi boş. Eser ekleyebilmek için önce <strong>Üniteler</strong> bölümünden
              bir şehir tanımlayın.
            </p>
          ) : null}

          <Grup baslik="Künye ve konum" aciklama="Kimlik, ad, şehir ve harita bilgileri.">
            <div className="izgara-2">
              <MetinGirdisi
                id="eser-id"
                etiket="Kimlik"
                deger={form.id}
                onDegistir={(deger) => {
                  setIdElleDegisti(true);
                  alan('id', deger);
                }}
                hata={hatalar['eser-id']}
                ipucu={
                  yeniMi
                    ? 'Eser adından otomatik üretilir. Kaydedildikten sonra değiştirilemez.'
                    : 'Kimlik kayıt oluşturulduktan sonra değiştirilemez.'
                }
                zorunlu
                saltOkunur={!yeniMi}
                ornek="bursa-ulu-cami"
              />
              <MetinGirdisi
                id="eser-ad"
                etiket="Eser adı"
                deger={form.ad}
                onDegistir={adDegistir}
                hata={hatalar['eser-ad']}
                zorunlu
                ornek="Ulu Cami"
              />
              <MetinGirdisi
                id="eser-ad-en"
                etiket="İngilizce ad"
                deger={form.adEn}
                onDegistir={(deger) => alan('adEn', deger)}
                ipucu="Envanter kitapları Türkçe ve İngilizce iki dilli basılır."
                ornek="Grand Mosque"
              />
              <SecimGirdisi
                id="eser-sehir"
                etiket="Şehir"
                deger={form.sehirId}
                onDegistir={(deger) => {
                  alan('sehirId', deger);
                  // Şehir değişince külliyenin de o şehre ait olması gerekir.
                  alan('kulliyeId', '');
                }}
                secenekler={sehirSecenekleri}
                bosEtiket="— Şehir seçin —"
                hata={hatalar['eser-sehir']}
                zorunlu
              />
              <MetinGirdisi
                id="eser-tur"
                etiket="Tür"
                deger={form.tur}
                onDegistir={(deger) => alan('tur', deger)}
                hata={hatalar['eser-tur']}
                ipucu="Cami, Han, Hamam, Medrese, Kervansaray…"
                zorunlu
                ornek="Cami"
              />
              <MetinGirdisi
                id="eser-ilce"
                etiket="İlçe"
                deger={form.ilce}
                onDegistir={(deger) => alan('ilce', deger)}
                ornek="Osmangazi"
              />
              <SecimGirdisi
                id="eser-kulliye"
                etiket="Külliye"
                deger={form.kulliyeId}
                onDegistir={(deger) => alan('kulliyeId', deger)}
                secenekler={kulliyeSecenekleri}
                bosEtiket="— Külliye yok —"
                ipucu={
                  kulliyeSecenekleri.length === 0
                    ? 'Bu şehirde tanımlı külliye yok.'
                    : 'Eser bir külliyenin parçasıysa seçin.'
                }
              />
              <MetinGirdisi
                id="eser-lat"
                etiket="Enlem"
                deger={form.lat}
                onDegistir={(deger) => alan('lat', deger)}
                hata={hatalar['eser-lat']}
                girdiModu="decimal"
                ornek="40,1836"
              />
              <MetinGirdisi
                id="eser-lng"
                etiket="Boylam"
                deger={form.lng}
                onDegistir={(deger) => alan('lng', deger)}
                hata={hatalar['eser-lng']}
                girdiModu="decimal"
                ipucu="Haritada göstermek için enlem ve boylam birlikte girilir."
                ornek="29,0662"
              />
            </div>
          </Grup>

          <Grup baslik="K1 · Kim yaptırdı?" aciklama="Bani (yaptıran) ve dönemi.">
            <div className="izgara-2">
              <MetinGirdisi
                id="eser-bani"
                etiket="Bani"
                deger={form.bani}
                onDegistir={(deger) => alan('bani', deger)}
                ornek="Hüdavendigar Murad"
              />
              <MetinGirdisi
                id="eser-bani-donem"
                etiket="Bani dönemi"
                deger={form.baniDonem}
                onDegistir={(deger) => alan('baniDonem', deger)}
                ornek="Osmanlı, 14. yüzyıl"
              />
              <MetinGirdisi
                id="eser-yapim-yili"
                etiket="Yapım yılı"
                deger={form.yapimYili}
                onDegistir={(deger) => alan('yapimYili', deger)}
                ipucu="Metin olarak saklanır: “1399”, “15. yüzyıl başı” gibi."
                ornek="1399"
              />
            </div>
          </Grup>

          <Grup baslik="K2 · Neden yaptırdı?" aciklama="Vakfiyedeki amaç.">
            <CokSatirliGirdi
              id="eser-vakfiye-amaci"
              etiket="Vakfiye amacı"
              deger={form.vakfiyeAmaci}
              onDegistir={(deger) => alan('vakfiyeAmaci', deger)}
              ornek="Şehrin su ihtiyacını karşılamak ve yolculara hizmet etmek."
            />
          </Grup>

          <Grup baslik="K3 · Kime fayda sağladı?" aciklama="Vakfın hizmet ettiği topluluk.">
            <CokSatirliGirdi
              id="eser-hizmet"
              etiket="Hizmet"
              deger={form.hizmet}
              onDegistir={(deger) => alan('hizmet', deger)}
              ornek="Yolcular, öğrenciler, mahalle halkı."
            />
          </Grup>

          <Grup baslik="K4 · Bugün ne oldu?" aciklama="Eserin bugünkü durumu ve işlevi.">
            <CokSatirliGirdi
              id="eser-bugun"
              etiket="Bugün ne oldu?"
              deger={form.bugunNeOldu}
              onDegistir={(deger) => alan('bugunNeOldu', deger)}
              ornek="Restore edildi; müze olarak kullanılıyor."
            />
          </Grup>

          <Grup
            baslik="Tarihçe · Türkçe ve İngilizce"
            aciklama="Envanter kitapları Türkçe ve İngilizce iki dilli basılır."
          >
            <div className="izgara-2">
              <CokSatirliGirdi
                id="eser-tarihce"
                etiket="Tarihçe (Türkçe)"
                deger={form.tarihce}
                onDegistir={(deger) => alan('tarihce', deger)}
                ipucu="Eserin geçmişi; bilgi kaynağıyla birlikte yazılır."
                satirSayisi={6}
                ornek="1399'da Hüdavendigar Murad tarafından yaptırılmıştır…"
              />
              <CokSatirliGirdi
                id="eser-tarihce-en"
                etiket="Tarihçe (English)"
                deger={form.tarihceEn}
                onDegistir={(deger) => alan('tarihceEn', deger)}
                ipucu="Türkçe metnin İngilizce karşılığı."
                satirSayisi={6}
                ornek="It was commissioned in 1399 by Murad I…"
              />
            </div>
          </Grup>

          <Grup
            baslik="Fotoğraflar ve sergiler (salt okunur)"
            aciklama="Bu turda fotoğraf ve sergi düzenlemesi kapsam dışıdır; kayıtlı bilgiler yalnızca gösterilir. Görseller Vakıf Katılım arşivinden beklenmektedir."
          >
            <SaltOkunurGaleri veri={kayitliVeri} eserAdi={form.ad} yeniMi={yeniMi} />
          </Grup>

          <Grup
            baslik="Vakıf Röntgeni · gelir dağılımı"
            aciklama="Vakfiye iki şeyi ayrı kaydeder: para NEREDEN geliyor (gelir kaynağı) ve NEREYE harcanıyor (gider kalemi). Her iki taraf kendi içinde %100 eder; kalemin tipini seçin. Oran bilinmiyorsa boş bırakın."
          >
            <div className="panel__dinamik">
              {form.gelirKalemleri.map((satir, indeks) => (
                <div className="panel__dinamik-satir panel__dinamik-satir--kalem" key={satir.anahtar}>
                  <MetinGirdisi
                    id={`eser-kalem-${satir.anahtar}-kalem`}
                    etiket={`Kalem ${indeks + 1}`}
                    deger={satir.kalem}
                    onDegistir={(deger) => kalemDegistir(satir.anahtar, { kalem: deger })}
                    hata={hatalar[`eser-kalem-${satir.anahtar}-kalem`]}
                    ornek="Han kirası"
                  />
                  <SecimGirdisi
                    id={`eser-kalem-${satir.anahtar}-tip`}
                    etiket={`Kalem tipi ${indeks + 1}`}
                    deger={satir.tip ?? ''}
                    onDegistir={(deger) => kalemDegistir(satir.anahtar, { tip: tipCoz(deger) })}
                    secenekler={TIP_SECENEKLERI}
                    bosEtiket="— Belirsiz —"
                    ipucu="Gelir: para nereden geliyor. Gider: nereye harcanıyor."
                  />
                  <MetinGirdisi
                    id={`eser-kalem-${satir.anahtar}-yuzde`}
                    etiket={`Oran % ${indeks + 1}`}
                    deger={satir.yuzde}
                    onDegistir={(deger) => kalemDegistir(satir.anahtar, { yuzde: deger })}
                    hata={hatalar[`eser-kalem-${satir.anahtar}-yuzde`]}
                    girdiModu="decimal"
                    ornek="40"
                  />
                  <MetinGirdisi
                    id={`eser-kalem-${satir.anahtar}-kaynak`}
                    etiket={`Kaynak ${indeks + 1}`}
                    deger={satir.kaynak}
                    onDegistir={(deger) => kalemDegistir(satir.anahtar, { kaynak: deger })}
                    ornek="Vakfiye, s. 12"
                  />
                  <div className="panel__dinamik-eylem">
                    <button
                      type="button"
                      className="dugme dugme--ikincil"
                      aria-label={`${indeks + 1}. kalem: Kaldır`}
                      onClick={() => kalemCikar(satir.anahtar)}
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="satir">
              <button type="button" className="dugme dugme--ikincil" onClick={kalemEkle}>
                + Kalem ekle
              </button>
            </div>

            <Alan
              id="eser-gelir-durum"
              etiket="Gelir dağılımı durumu (otomatik hesaplanır)"
              ipucu="Oran girilmediği sürece uygulama bu eser için “gelir dağılımı belgelenememiştir” gösterir. Doğrulanmamış bilgi kesin bilgi olarak sunulmaz."
            >
              {(ozellikler) => (
                <output {...ozellikler} className="panel__cikti">
                  {belgeli
                    ? `Belgeli — ${oranliSayi} kalemde oran verilmiş`
                    : 'Belge bulunamadı — hiçbir kalemde oran yok'}
                </output>
              )}
            </Alan>

            {asanTaraflar.map((taraf) => (
              <p className="bildirim bildirim--uyari" role="status" key={taraf.anahtar}>
                {taraf.etiket} toplamı %
                {taraf.toplam.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}. Vakfiyedeki
                dağılım her iki tarafta ayrı ayrı 100'ü aşmamalıdır; kalemleri ve kalem tiplerini
                kontrol edin.
              </p>
            ))}
          </Grup>

          <Grup
            baslik="Kaynaklar ve doğrulama"
            aciklama="Her eser kaynağıyla öğretilir; künye görünür, bağlantı isteğe bağlıdır."
          >
            <MetinGirdisi
              id="eser-arsiv-no"
              etiket="Vakfiye arşiv numarası"
              deger={form.arsivNo}
              onDegistir={(deger) => alan('arsivNo', deger)}
              ipucu="Örn. VGM Vakıf Kayıtlar Arşivi numarası."
              ornek="VGM-1234"
            />

            <div className="panel__dinamik">
              {form.kaynaklar.map((satir, indeks) => (
                <div
                  className="panel__dinamik-satir panel__dinamik-satir--kaynak"
                  key={satir.anahtar}
                >
                  <MetinGirdisi
                    id={`eser-kaynak-${satir.anahtar}-kunye`}
                    etiket={`Kaynak künyesi ${indeks + 1}`}
                    deger={satir.kunye}
                    onDegistir={(deger) => kaynakDegistir(satir.anahtar, { kunye: deger })}
                    hata={hatalar[`eser-kaynak-${satir.anahtar}-kunye`]}
                    ornek="VGM Vakıf Kayıtlar Arşivi, No: 1234"
                  />
                  <MetinGirdisi
                    id={`eser-kaynak-${satir.anahtar}-url`}
                    etiket={`Bağlantı ${indeks + 1}`}
                    deger={satir.url}
                    onDegistir={(deger) => kaynakDegistir(satir.anahtar, { url: deger })}
                    hata={hatalar[`eser-kaynak-${satir.anahtar}-url`]}
                    girdiModu="url"
                    ornek="https://..."
                  />
                  <div className="panel__dinamik-eylem">
                    <button
                      type="button"
                      className="dugme dugme--ikincil"
                      aria-label={`Kaynak ${indeks + 1}: Kaldır`}
                      onClick={() => kaynakCikar(satir.anahtar)}
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="satir">
              <button type="button" className="dugme dugme--ikincil" onClick={kaynakEkle}>
                + Kaynak ekle
              </button>
            </div>

            <CokSatirliGirdi
              id="eser-dogrulama-notu"
              etiket="Doğrulama notu"
              deger={form.dogrulamaNotu}
              onDegistir={(deger) => alan('dogrulamaNotu', deger)}
              ipucu="Bilginin nereden doğrulandığını veya eksik kalan noktaları not edin."
              ornek="Oran bilgisi vakfiyede okunamadı; arşivden teyit bekleniyor."
            />
          </Grup>

          <Grup baslik="Yayın durumu" aciklama="Yalnızca yayında olan eserler öğrenme yolunda görünür.">
            <OnayKutusu
              id="eser-yayinda"
              etiket="Yayında"
              isaretli={form.yayinda}
              onDegistir={(isaretli) => alan('yayinda', isaretli)}
              ipucu="Kapalıyken eser taslak kalır; derslerde gösterilmez."
            />
          </Grup>

          <div className="panel__form-eylem">
            <button type="submit" className="dugme" disabled={mesgul}>
              {mesgul ? 'Kaydediliyor…' : yeniMi ? 'Eseri kaydet' : 'Değişiklikleri kaydet'}
            </button>
            <button
              type="button"
              className="dugme dugme--ikincil"
              onClick={onListeyeDon}
              disabled={mesgul}
            >
              Vazgeç ve listeye dön
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
