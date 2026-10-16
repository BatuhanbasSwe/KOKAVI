/**
 * Sınıf detayı — ünite ünite kırılım.
 *
 * Ekranın en başında DÜRÜSTLÜK KUTUSU vardır: sayılar "kaç öğrenci" değildir,
 * "kaç kez tamamlandı"dır. Bu kutu ürünün gizlilik ilkesinin arayüzdeki
 * görünür hâlidir (PDF: "Kişisel veri toplanmaz, sınıf kodu anonim").
 *
 * `aktif` bilgisi sunucunun detay cevabında yoktur; liste satırından gelir ve
 * tek doğruluk kaynağı üst bileşendir (`onDurumDegisti` ile geri bildirilir).
 */
import { useCallback, useEffect, useState } from 'react';
import { hataMetni, ogretmenApi, type SinifDetayCevabi } from './api';
import { CanliBolge, DurumRozeti, GizlilikNotu, IlerlemeCubugu, KodKopyala } from './parcalar';

export interface SinifDetayiProps {
  kod: string;
  aktif: boolean;
  onDurumDegisti: (kod: string, aktif: boolean) => void;
  onGeri: () => void;
}

export function SinifDetayi({ kod, aktif, onDurumDegisti, onGeri }: SinifDetayiProps) {
  const [veri, setVeri] = useState<SinifDetayCevabi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [durumGuncelleniyor, setDurumGuncelleniyor] = useState(false);
  const [durumHatasi, setDurumHatasi] = useState<string | null>(null);
  const [durumMesaji, setDurumMesaji] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setVeri(await ogretmenApi.sinifDetayiGetir(kod));
    } catch (e) {
      setVeri(null);
      setHata(hataMetni(e));
    } finally {
      setYukleniyor(false);
    }
  }, [kod]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function durumuDegistir(yeniDurum: boolean) {
    setDurumGuncelleniyor(true);
    setDurumHatasi(null);
    setDurumMesaji(null);
    try {
      await ogretmenApi.sinifDurumuDegistir(kod, yeniDurum);
      onDurumDegisti(kod, yeniDurum);
      setDurumMesaji(
        yeniDurum
          ? 'Sınıf açıldı: çocuklar bu kodla tamamlama kaydedebilir.'
          : 'Sınıf kapatıldı: bu kodla yeni tamamlama kaydedilmez, geçmiş sayılar silinmez.',
      );
    } catch (e) {
      setDurumHatasi(hataMetni(e));
    } finally {
      setDurumGuncelleniyor(false);
    }
  }

  return (
    <section className="ogretmen__detay" aria-labelledby="sinif-detay-baslik">
      <div>
        <button type="button" className="dugme dugme--ikincil" onClick={onGeri}>
          <span aria-hidden="true">←</span> Sınıflara dön
        </button>
      </div>

      <div className="ogretmen__detay-baslik">
        <div>
          <p className="etiket">Sınıf</p>
          <h2 id="sinif-detay-baslik">{veri?.ilerleme.ad ?? kod}</h2>
          <p className="metin-soluk">Kod: {kod}</p>
        </div>
        <DurumRozeti aktif={aktif} />
      </div>

      {/* Sayılar okunmadan ÖNCE ne anlama geldiği söylenir. */}
      <GizlilikNotu />

      <CanliBolge tur="durum">
        {durumMesaji ? <p className="bildirim bildirim--basari">{durumMesaji}</p> : null}
      </CanliBolge>

      <CanliBolge tur="hata">
        {durumHatasi ? <p className="bildirim bildirim--hata">{durumHatasi}</p> : null}
      </CanliBolge>

      {yukleniyor ? (
        <p className="metin-soluk" role="status">
          Sınıf ilerlemesi yükleniyor…
        </p>
      ) : null}

      {hata ? (
        <div className="kart ogretmen__hata-kutusu">
          <p className="bildirim bildirim--hata" role="alert">
            {hata}
          </p>
          <button type="button" className="dugme" onClick={() => void yukle()}>
            Yeniden dene
          </button>
        </div>
      ) : null}

      {veri ? (
        <>
          <div className="kart ogretmen__bolum">
            <KodKopyala kod={veri.ilerleme.kod} etiket="Sınıf kodu" />

            <dl className="ogretmen__olcumler">
              <div>
                <dt>Toplam tamamlama</dt>
                <dd>{veri.ilerleme.toplamTamamlama}</dd>
              </div>
              <div>
                <dt>Tamamlanan farklı ders</dt>
                <dd>{veri.ilerleme.tamamlananDersCesidi}</dd>
              </div>
              <div>
                <dt>Yayındaki ders</dt>
                <dd>{veri.uniteler.reduce((t, u) => t + u.toplamDers, 0)}</dd>
              </div>
            </dl>

            <p className="metin-ikincil">
              {aktif
                ? 'Sınıf açık: çocuklar bu kodla tamamlama kaydedebilir.'
                : 'Sınıf kapalı: bu kodla yeni tamamlama kaydedilmez; geçmiş sayılar silinmez.'}
            </p>

            <div className="ogretmen__form-eylem">
              <button
                type="button"
                className="dugme dugme--ikincil"
                disabled={durumGuncelleniyor}
                onClick={() => void durumuDegistir(!aktif)}
              >
                {durumGuncelleniyor ? 'Kaydediliyor…' : aktif ? 'Sınıfı kapat' : 'Sınıfı aç'}
                {/* Erişilebilir ad görünen etiketi İÇERİR (SC 2.5.3). */}
                <span className="sr-only">: {veri.ilerleme.ad}</span>
              </button>
            </div>
          </div>

          {veri.uniteler.length === 0 ? (
            <p className="bildirim bildirim--bilgi">
              Yayında ders bulunmuyor. İçerik eklendiğinde ilerleme burada ünite ünite görünür.
            </p>
          ) : (
            veri.uniteler.map((unite, sira) => (
              <section
                key={unite.uniteId}
                className="kart ogretmen__unite"
                aria-labelledby={`unite-baslik-${sira}`}
              >
                <div className="ogretmen__unite-ust">
                  <div>
                    <p className="etiket">{unite.sehirAdi}</p>
                    <h3 id={`unite-baslik-${sira}`}>{unite.uniteAdi}</h3>
                  </div>
                  <IlerlemeCubugu
                    etiket={`${unite.sehirAdi} · ${unite.uniteAdi}`}
                    tamamlanan={unite.tamamlananDersCesidi}
                    toplam={unite.toplamDers}
                    desen={3}
                  />
                </div>

                <div className="ogretmen__tablo-kaydirma">
                  <table className="ogretmen__tablo">
                    <caption className="sr-only">
                      {unite.sehirAdi} · {unite.uniteAdi} — ders tamamlama sayıları
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Ders</th>
                        <th scope="col">Tamamlama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unite.dersler.map((ders) => (
                        <tr key={ders.dersId}>
                          <th scope="row" className="ogretmen__ders-adi">
                            {ders.sira}. {ders.eserAdi}
                          </th>
                          <td>
                            {ders.sayi === 0 ? (
                              <span className="metin-soluk">henüz tamamlanmadı</span>
                            ) : (
                              <>
                                <strong>{ders.sayi}</strong> kez tamamlandı
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </>
      ) : null}
    </section>
  );
}
