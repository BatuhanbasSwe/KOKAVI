/**
 * Sınıf oluşturma formu.
 *
 * Öğretmen sınıfa bir ad verir; sunucu `XYZ-2345` biçiminde bir kod üretir.
 * Kod anonimdir: içinde kişi bilgisi yoktur, kime verildiği kaydedilmez.
 */
import { useState, type FormEvent } from 'react';
import { Alan } from '@/features/panel/Alan';
import { hataMetni, ogretmenApi, type Sinif } from './api';
import { CanliBolge, KodKopyala } from './parcalar';

export interface SinifOlusturmaFormuProps {
  /** Sınıf oluştuğunda çağrılır (liste tazelenir). */
  onOlusturuldu: (sinif: Sinif) => void;
}

/**
 * Hata mimarisi: aynı cümle iki kez duyurulmaz.
 * `ozet` → `role="alert"` canlı bölge, `ayrinti` → Alan'ın alan hatası
 * (girdiyle `aria-describedby` ile bağlı). Alan'a ait olmayan hatalarda
 * (ağ/sunucu) ayrıntı null kalır ve yalnızca canlı bölge görünür.
 */
interface HataDurumu {
  ozet: string;
  ayrinti: string | null;
}

export function SinifOlusturmaFormu({ onOlusturuldu }: SinifOlusturmaFormuProps) {
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<HataDurumu | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [olusan, setOlusan] = useState<Sinif | null>(null);

  async function gonder(olay: FormEvent<HTMLFormElement>) {
    olay.preventDefault();

    const temiz = ad.trim();
    if (temiz === '') {
      setHata({
        ozet: 'Sınıf adı eksik.',
        ayrinti: 'Sınıf adı zorunlu. Örn. “5-B Şehrimiz Dersi”.',
      });
      return;
    }
    if (temiz.length > 120) {
      setHata({
        ozet: 'Sınıf adı çok uzun.',
        ayrinti: 'Sınıf adı en fazla 120 karakter olabilir.',
      });
      return;
    }

    setHata(null);
    setGonderiliyor(true);
    try {
      const sinif = await ogretmenApi.sinifOlustur(temiz);
      setOlusan(sinif);
      setAd('');
      onOlusturuldu(sinif);
    } catch (e) {
      setOlusan(null);
      setHata({ ozet: hataMetni(e), ayrinti: null });
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <section className="kart ogretmen__bolum" aria-labelledby="yeni-sinif-baslik">
      <div>
        <h2 id="yeni-sinif-baslik">Sınıf oluştur</h2>
        <p className="metin-ikincil">
          Sınıfına bir ad ver; uygulama sana bir sınıf kodu üretir. Kodu tahtaya yazman yeterli —
          çocuklardan isim, e-posta veya üyelik istenmez.
        </p>
      </div>

      <CanliBolge tur="hata">
        {hata ? <p className="bildirim bildirim--hata">{hata.ozet}</p> : null}
      </CanliBolge>

      <form className="ogretmen__form" onSubmit={(olay) => void gonder(olay)}>
        <Alan
          id="sinif-adi"
          etiket="Sınıf adı"
          zorunlu
          hata={hata?.ayrinti ?? null}
          ipucu="Kodu hangi sınıfa verdiğini sonradan hatırlaman için açıklayıcı bir ad seç."
        >
          {(o) => (
            <input
              {...o}
              className="ogretmen__girdi"
              type="text"
              value={ad}
              maxLength={120}
              autoComplete="off"
              placeholder="5-B Şehrimiz Dersi"
              onChange={(olay) => {
                setAd(olay.target.value);
                setHata(null);
              }}
            />
          )}
        </Alan>

        <div className="ogretmen__form-eylem">
          <button type="submit" className="dugme" disabled={gonderiliyor}>
            {gonderiliyor ? 'Oluşturuluyor…' : 'Sınıf oluştur'}
          </button>
        </div>
      </form>

      <CanliBolge tur="durum">
        {olusan ? (
          <div className="bildirim bildirim--basari ogretmen__olusan">
            <p className="ogretmen__olusan-baslik">
              <span aria-hidden="true">✓ </span>“{olusan.ad}” sınıfı oluşturuldu.
            </p>
            <KodKopyala kod={olusan.kod} etiket="Sınıf kodu — tahtaya yaz" />
            <p className="ogretmen__olusan-not">
              Kod anonimdir: kişisel bilgi içermez ve kodu kimin kullandığı kaydedilmez. Sınıf
              sayıları aşağıdaki listede birikir.
            </p>
          </div>
        ) : null}
      </CanliBolge>
    </section>
  );
}
