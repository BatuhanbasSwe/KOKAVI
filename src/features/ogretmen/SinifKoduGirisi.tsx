/**
 * ÇOCUK TARAFI — sınıf kodu girişi.
 *
 * PDF Senaryo B: "Öğretmen sınıf kodunu açar. Sınıf birlikte bir külliyeyi
 * tamamlar." Çocuk bu ekranda öğretmenin tahtaya yazdığı kodu girer.
 *
 * 🔒 GİZLİLİK: Bu ekran sunucuya YALNIZCA kodu gönderir. İsim, e-posta,
 * cihaz kimliği veya konum gönderilmez ve saklanmaz. Karşılığında yalnızca
 * toplu sayaçlar gelir; bu yüzden ekranda "kaç kişi" değil "toplam tamamlama"
 * yazar ve bu ayrım çocuğa açıkça anlatılır.
 *
 * HATA MİMARİSİ: Aynı cümle iki kez duyurulmaz.
 *  · `role="alert"` canlı bölge → KISA özet (hemen duyurulur).
 *  · Alan'ın alan hatası → AYRINTI (girdiyle `aria-describedby` ile bağlı,
 *    `aria-invalid` işaretli). Alan'a ait olmayan hatalar (ağ/sunucu) yalnızca
 *    canlı bölgede görünür.
 *
 * Kullanım (rota eklenirken):
 *   <SinifKoduGirisi onKatildi={(kod) => sinifKoduAyarla(kod)} />
 * `onKatildi` isteğe bağlıdır; verilmezse ekran yalnızca doğrulama yapar.
 */
import { useState, type FormEvent } from 'react';
import { Alan } from '@/features/panel/Alan';
import { IkonYildiz } from '@/app/Ikonlar';
import {
  ApiHatasi,
  SINIF_KODU_ORNEK,
  hataMetni,
  katilimApi,
  sinifKoduBicimle,
  sinifKoduGecerliMi,
  type KatilimBilgisi,
} from './api';
import { CanliBolge, KatilimGizlilikNotu } from './parcalar';
import './ogretmen.css';

export interface SinifKoduGirisiProps {
  /** Çocuğun cihazı sınıfa bağlandığında çağrılır (örn. ilerleme.sinifKoduAyarla). */
  onKatildi?: (kod: string) => void;
}

/** Kısa özet canlı bölgede, ayrıntı alanın yanında gösterilir. */
interface HataDurumu {
  ozet: string;
  ayrinti: string | null;
}

export function SinifKoduGirisi({ onKatildi }: SinifKoduGirisiProps) {
  const [girdi, setGirdi] = useState('');
  const [hata, setHata] = useState<HataDurumu | null>(null);
  const [sorgulaniyor, setSorgulaniyor] = useState(false);
  const [katilim, setKatilim] = useState<KatilimBilgisi | null>(null);

  async function gonder(olay: FormEvent<HTMLFormElement>) {
    olay.preventDefault();

    if (girdi.trim() === '') {
      setHata({
        ozet: 'Sınıf kodu eksik.',
        ayrinti: 'Sınıf kodunu yaz. Öğretmenin tahtaya yazdığı kodu gir.',
      });
      return;
    }
    if (!sinifKoduGecerliMi(girdi)) {
      setHata({
        ozet: 'Kodun biçimi hatalı.',
        ayrinti: `Kod ${SINIF_KODU_ORNEK} biçiminde olmalı: 3 harf, tire, 4 karakter.`,
      });
      return;
    }

    setHata(null);
    setSorgulaniyor(true);
    try {
      const bilgi = await katilimApi.sinifiSorgula(girdi);
      setKatilim(bilgi);
      setGirdi('');
      onKatildi?.(bilgi.kod);
    } catch (e) {
      setKatilim(null);
      const bulunamadi = e instanceof ApiHatasi && e.durum === 404;
      setHata({
        ozet: bulunamadi ? 'Bu kod bulunamadı.' : hataMetni(e),
        ayrinti: bulunamadi ? 'Böyle bir sınıf kodu yok. Öğretmeninden tekrar iste.' : null,
      });
    } finally {
      setSorgulaniyor(false);
    }
  }

  return (
    <div className="ogretmen ogretmen--katilim">
      <div>
        <p className="etiket">Kök Avı · Sınıf</p>
        <h1>Sınıfına katıl</h1>
        <p className="metin-ikincil">
          Öğretmeninin tahtaya yazdığı kodu gir. Senden isim, e-posta veya telefon istenmez —
          sınıf kodu anonimdir.
        </p>
      </div>

      <CanliBolge tur="hata">
        {hata ? <p className="bildirim bildirim--hata">{hata.ozet}</p> : null}
      </CanliBolge>

      {katilim ? (
        <CanliBolge tur="durum">
          <section className="kart ogretmen__bolum" aria-labelledby="katilim-baslik">
            <div>
              <p className="etiket">Katıldın</p>
              <h2 id="katilim-baslik">
                <IkonYildiz boyut={22} />{' '}
                {katilim.ad} sınıfına katıldın
              </h2>
              <p className="metin-ikincil">
                Sınıf kodu: <strong>{katilim.kod}</strong>
              </p>
            </div>

            <dl className="ogretmen__olcumler">
              <div>
                <dt>Sınıfın toplam tamamlama sayısı</dt>
                <dd>{katilim.toplamTamamlama}</dd>
              </div>
              <div>
                <dt>Tamamlanan farklı ders</dt>
                <dd>{katilim.tamamlananDersCesidi}</dd>
              </div>
            </dl>

            <KatilimGizlilikNotu />

            <div className="ogretmen__form-eylem">
              <button
                type="button"
                className="dugme dugme--ikincil"
                onClick={() => {
                  setKatilim(null);
                  setHata(null);
                }}
              >
                Başka bir kod gir
              </button>
            </div>
          </section>
        </CanliBolge>
      ) : (
        <form className="kart ogretmen__form" onSubmit={(olay) => void gonder(olay)}>
          <Alan
            id="katilim-sinif-kodu"
            etiket="Sınıf kodu"
            zorunlu
            hata={hata?.ayrinti ?? null}
            ipucu={`3 harf, tire, 4 karakter — örn. ${SINIF_KODU_ORNEK}`}
          >
            {(o) => (
              <input
                {...o}
                className="ogretmen__kod-girdisi"
                type="text"
                value={girdi}
                maxLength={8}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder={SINIF_KODU_ORNEK}
                onChange={(olay) => {
                  setGirdi(sinifKoduBicimle(olay.target.value));
                  setHata(null);
                }}
              />
            )}
          </Alan>

          <div className="ogretmen__form-eylem">
            <button type="submit" className="dugme" disabled={sorgulaniyor}>
              {sorgulaniyor ? 'Kontrol ediliyor…' : 'Sınıfa katıl'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
