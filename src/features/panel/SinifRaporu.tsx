/**
 * Yönetim paneli → "Sınıflar ve öğrenciler".
 *
 * İki katman veri gösterir:
 *  · Anonim sınıf sayaçları (her sınıf): toplam tamamlama, farklı ders, en çok
 *    bitirilen eserler. Kimlik yok.
 *  · Takma adla katılan öğrenciler (isteğe bağlı): takma ad, bitirdiği ders
 *    sayısı, son etkinlik. Gerçek ad, cihaz, IP tutulmaz (repo/sinif.ts).
 *
 * Her sınıf `<details>` ile açılır kapanır (klavye ve ekran okuyucu yerleşik).
 */
import { useEffect, useState } from 'react';
import { ApiHatasi, hataMetni, tarihBicimle, yonetimSinifApi, type YonetimSinifRaporu } from '../ogretmen/api';

export function SinifRaporu() {
  const [rapor, setRapor] = useState<YonetimSinifRaporu[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    yonetimSinifApi
      .raporGetir()
      .then((r) => !iptal && setRapor(r))
      .catch((e: unknown) => !iptal && setHata(e instanceof ApiHatasi && e.durum === 403 ? 'Bu bölümü yalnızca yönetici görür.' : hataMetni(e)));
    return () => {
      iptal = true;
    };
  }, []);

  if (hata) return <p className="bildirim bildirim--hata" role="alert">{hata}</p>;
  if (!rapor) return <p className="metin-soluk" role="status">Sınıflar yükleniyor…</p>;

  const ogrenciSayisi = rapor.reduce((t, s) => t + s.ogrenciler.length, 0);
  const toplam = rapor.reduce((t, s) => t + s.toplamTamamlama, 0);

  return (
    <div className="yigin sinif-raporu">
      <dl className="sinif-raporu__ozet">
        <div className="kart">
          <dt>Sınıf</dt>
          <dd>{rapor.length}</dd>
        </div>
        <div className="kart">
          <dt>Takma adlı öğrenci</dt>
          <dd>{ogrenciSayisi}</dd>
        </div>
        <div className="kart">
          <dt>Toplam ders tamamlama</dt>
          <dd>{toplam}</dd>
        </div>
      </dl>

      <p className="metin-ikincil">
        Takma ad isteğe bağlıdır: takma ad yazmadan katılan öğrenciler yalnızca sınıfın toplam sayacında görünür.
        Gerçek ad, cihaz bilgisi veya IP tutulmaz; öğrenci sınıftan çıkınca kaydı silinir.
      </p>

      {rapor.length === 0 ? (
        <p className="kart metin-ikincil">Henüz sınıf yok. Öğretmenler Öğretmen Paneli'nden sınıf açar.</p>
      ) : (
        rapor.map((s) => (
          <details key={s.kod} className="kart sinif-raporu__sinif">
            <summary>
              <span className="sinif-raporu__ad">{s.ad}</span>
              <span className="sinif-raporu__alt">
                {s.kod} · {s.ogretmen} · {s.ogrenciler.length} öğrenci · {s.toplamTamamlama} tamamlama
                {s.aktif ? '' : ' · kapalı'}
              </span>
            </summary>

            <div className="yigin sinif-raporu__govde">
              <p className="metin-ikincil" style={{ margin: 0 }}>
                Açılış: {tarihBicimle(s.createdAt)} · {s.tamamlananDersCesidi} farklı ders tamamlandı
                {s.enCok.length > 0 ? ` · En çok: ${s.enCok.map((e) => `${e.eserAdi} (${e.sayi})`).join(', ')}` : ''}
              </p>

              {s.ogrenciler.length === 0 ? (
                <p className="metin-soluk" style={{ margin: 0 }}>
                  Bu sınıfa takma adla katılan öğrenci yok.
                </p>
              ) : (
                <div
                  className="panel__tablo-kaydirma"
                  role="region"
                  aria-label={`${s.ad} öğrencileri (yatay kaydırılabilir tablo)`}
                  tabIndex={0}
                >
                  <table className="panel__tablo">
                    <caption className="sr-only">{s.ad} öğrencileri</caption>
                    <thead>
                      <tr>
                        <th scope="col">Takma ad</th>
                        <th scope="col">Bitirdiği ders</th>
                        <th scope="col">Son bitirdiği eser</th>
                        <th scope="col">Son etkinlik</th>
                        <th scope="col">Katıldı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.ogrenciler.map((o, i) => (
                        <tr key={`${o.takmaAd}-${i}`}>
                          <th scope="row">{o.takmaAd}</th>
                          <td>{o.tamamlananDers}</td>
                          <td>{o.sonEser ?? 'Henüz yok'}</td>
                          <td>{o.sonEtkinlik ? tarihBicimle(o.sonEtkinlik) : 'Henüz yok'}</td>
                          <td>{tarihBicimle(o.katildi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </details>
        ))
      )}
    </div>
  );
}
