/**
 * Öğretmenin sınıf listesi.
 *
 * Her kartta: kod (büyük + kopyalanabilir), sınıf adı, durum, TOPLAM TAMAMLAMA
 * ve tamamlanan FARKLI ders sayısı bulunur.
 *
 * ⚠️ Burada "öğrenci sayısı" diye bir alan YOKTUR ve olmayacaktır: sunucu
 * yalnızca sayaç tutar, kimin tamamladığını bilmez. Bu yüzden ölçümler
 * `<dl>` içinde "terim → sayı" olarak verilir ve altında ne anlama geldiği yazılır.
 */
import { tarihBicimle, type SinifOzeti } from './api';
import { CanliBolge, DurumRozeti, KodKopyala } from './parcalar';

export interface SinifListesiProps {
  siniflar: SinifOzeti[];
  yukleniyor: boolean;
  hata: string | null;
  onYenile: () => void;
  onDetay: (kod: string) => void;
}

export function SinifListesi({ siniflar, yukleniyor, hata, onYenile, onDetay }: SinifListesiProps) {
  return (
    <section className="kart ogretmen__bolum" aria-labelledby="siniflar-baslik">
      <div className="ogretmen__bolum-basligi">
        <h2 id="siniflar-baslik">Sınıflarım</h2>
        <button
          type="button"
          className="dugme dugme--ikincil"
          onClick={onYenile}
          disabled={yukleniyor}
        >
          {yukleniyor ? 'Yenileniyor…' : 'Sayıları yenile'}
        </button>
      </div>

      <p className="metin-ikincil">
        Sayılar sınıfın ortak ilerlemesidir: <strong>kaç kez tamamlandığı</strong> sayılır,{' '}
        <strong>kimin tamamladığı</strong> kaydedilmez.
      </p>

      <CanliBolge tur="hata">
        {hata ? (
          <div className="bildirim bildirim--hata ogretmen__hata-kutusu">
            <p>Sınıflar getirilemedi: {hata}</p>
            <button type="button" className="dugme dugme--ikincil" onClick={onYenile}>
              Tekrar dene
            </button>
          </div>
        ) : null}
      </CanliBolge>

      {yukleniyor && siniflar.length === 0 ? (
        <p className="metin-soluk" role="status">
          Sınıflar yükleniyor…
        </p>
      ) : null}

      {!yukleniyor && siniflar.length === 0 && !hata ? (
        <p className="bildirim bildirim--bilgi">
          Henüz sınıfın yok. Yukarıdaki formdan ilk sınıfını oluştur — kod hemen üretilir.
        </p>
      ) : null}

      {siniflar.length > 0 ? (
        <ul className="ogretmen__liste">
          {siniflar.map((sinif) => {
            const olusturma = tarihBicimle(sinif.createdAt);
            return (
              <li key={sinif.kod} className="ogretmen__sinif">
                <KodKopyala kod={sinif.kod} boyut="kucuk" />

                <div className="ogretmen__sinif-bilgi">
                  <h3>{sinif.ad}</h3>
                  <div className="ogretmen__sinif-durum">
                    <DurumRozeti aktif={sinif.aktif} />
                    {olusturma ? (
                      <span className="metin-soluk">Oluşturulma: {olusturma}</span>
                    ) : null}
                  </div>
                </div>

                <dl className="ogretmen__olcumler">
                  <div>
                    <dt>Toplam tamamlama</dt>
                    <dd>{sinif.ozet?.toplamTamamlama ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Tamamlanan farklı ders</dt>
                    <dd>{sinif.ozet?.tamamlananDersCesidi ?? 0}</dd>
                  </div>
                </dl>

                <p className="metin-soluk">
                  Toplam tamamlama, aynı dersin tekrar tamamlanmasını da sayar; bu yüzden sayı
                  öğrenci sayısı değildir.
                </p>

                <button type="button" className="dugme" onClick={() => onDetay(sinif.kod)}>
                  Sınıf detayını aç
                  {/* Erişilebilir ad görünen etiketi İÇERİR (SC 2.5.3). */}
                  <span className="sr-only">: {sinif.ad}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
