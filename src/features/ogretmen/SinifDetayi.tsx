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
import {
  hataMetni,
  ogretmenApi,
  type KulliyeIlerlemesi,
  type SinifDetayCevabi,
} from './api';
import { CanliBolge, DurumRozeti, GizlilikNotu, IlerlemeCubugu, KodKopyala } from './parcalar';

/**
 * Sınıf külliyesi — PDF Senaryo B.
 *
 * Hedef, yol sırasındaki ilk tamamlanmamış külliyedir; öğretmen seçim yapmaz.
 * Külliyeler yalnızca kaynakta belgelenmiş bağlardan gelir; bağ yoksa kart
 * gösterilmez (uydurma külliye adı basılmaz).
 */
function KulliyeBolumu({
  kulliyeler,
  kod,
}: {
  kulliyeler: KulliyeIlerlemesi[];
  kod: string;
}) {
  if (kulliyeler.length === 0) return null;

  const hedef = kulliyeler.find((k) => k.hedefMi);

  return (
    <section className="kart ogretmen__bolum" aria-labelledby="sinif-kulliye-baslik">
      <div className="ogretmen__bolum-basligi">
        <div>
          <p className="etiket">Birlikte öğrenme · PDF Senaryo B</p>
          <h3 id="sinif-kulliye-baslik">Sınıf külliyesi</h3>
        </div>
        <a
          className="dugme dugme--ikincil dugme--kucuk"
          href={`#/tahta/${encodeURIComponent(kod)}/rontgen`}
        >
          Sınıf Röntgeni&apos;ni tahtada aç
        </a>
      </div>

      <p className="metin-ikincil" style={{ margin: 0 }}>
        Sınıf birlikte bir külliyeyi tamamlar; dersler tahtada işlendikçe hedef külliye dolar.
        Yalnızca kaynakta belgelenmiş külliye bağları gösterilir.
      </p>

      {hedef ? (
        <>
          <p className="etiket" style={{ margin: 0 }}>
            Sıradaki hedef
          </p>
          <p className="ogretmen__kulliye-ad">{hedef.ad}</p>
          <IlerlemeCubugu
            etiket={`Sınıf külliyesi: ${hedef.ad}`}
            tamamlanan={hedef.tamamlananDersCesidi}
            toplam={hedef.toplamDers}
            desen={2}
          />
          <p className="metin-ikincil" style={{ margin: 0 }}>
            {hedef.toplamDers - hedef.tamamlananDersCesidi} ders kaldı. Külliye tamamlanınca hedef
            sıradaki külliyeye geçer.
          </p>
        </>
      ) : (
        <p className="bildirim bildirim--basari" role="status">
          <strong>Belgelenmiş tüm külliyeler tamamlandı.</strong> Sınıf birlikte tamamladı.
        </p>
      )}

      <ul className="ogretmen__kulliye-liste" aria-label="Külliye ilerlemeleri">
        {kulliyeler.map((k) => (
          <li key={k.id}>
            <span className="rozet">{k.tamamlandiMi ? '✓ Tamamlandı' : 'Devam ediyor'}</span>{' '}
            <span>{k.ad}</span>{' '}
            <span className="metin-soluk">
              {k.tamamlananDersCesidi}/{k.toplamDers} ders
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

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

      <div className="kart ogretmen__bolum">
        <p className="metin-ikincil" style={{ margin: 0 }}>
          <strong>Okulda telefon yok:</strong> dersi tahtada birlikte işleyin. Aşağıdaki
          &quot;Tahtada aç&quot; bağlantısı büyük yazılı sunum modunu açar; ders bitince sınıf
          külliyesine işlenir. Öğrenciler isterse aynı kodla <em>evde</em> devam edebilir.
        </p>
      </div>

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
          <KulliyeBolumu kulliyeler={veri.kulliyeler} kod={veri.ilerleme.kod} />

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

                <div
                  className="ogretmen__tablo-kaydirma"
                  role="region"
                  aria-label={`${unite.sehirAdi} · ${unite.uniteAdi} ders tablosu (yatay kaydırılabilir)`}
                  tabIndex={0}
                >
                  <table className="ogretmen__tablo">
                    <caption className="sr-only">
                      {unite.sehirAdi} · {unite.uniteAdi}: ders tamamlama sayıları ve tahtada açma
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Ders</th>
                        <th scope="col">Tamamlama</th>
                        <th scope="col">Tahtada</th>
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
                          <td>
                            <a
                              className="dugme dugme--kucuk"
                              href={`#/tahta/${encodeURIComponent(veri.ilerleme.kod)}/${encodeURIComponent(ders.dersId)}`}
                            >
                              Tahtada aç
                              <span className="sr-only">
                                : {ders.sira}. {ders.eserAdi}
                              </span>
                            </a>
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
