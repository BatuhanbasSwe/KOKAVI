/**
 * SINIF VAKIF RÖNTGENİ — tahtada birlikte açılan büyük ekran.
 *
 * PDF Senaryo B: "Öğretmen sınıf kodunu açar. Sınıf birlikte bir külliyeyi
 * tamamlar; Vakıf Röntgeni'ni birlikte görür."
 *
 * Bu ekran öğretmen oturumu istemez: sınıf kodu yeterlidir. Sunucu yalnızca
 * toplu sayaçları ve YAYIN İÇERİĞİNİ döner; hangi çocuğun hangi dersi gördüğü
 * bilinmez. Ekranda hiçbir öğrenci adı, sayısı veya cihaz bilgisi yoktur.
 *
 * Dürüstlük ilkesi VakıfRöntgeni ile aynıdır: gelir dağılımı belgelenmemişse
 * çubuk çizilmez, oran uydurulmaz; durum açıkça yazılır.
 */
import { useEffect, useRef, useState } from 'react';
import { baslikAyarla } from '../../lib/yonlendirme';
import {
  hataMetni,
  katilimApi,
  type KulliyeIlerlemesi,
  type SinifRontgenCevabi,
  type SinifRontgenEseri,
} from './api';
import { IlerlemeCubugu } from './parcalar';
import './SinifRontgen.css';

const BELGE_YOK_METNI =
  'Bu eserin vakfiyesindeki gelir dağılımı belgelenememiştir. Doğrulanmamış bilgi kesin bilgi olarak sunulmaz.';

function yuzdeYaz(yuzde: number): string {
  return `%${yuzde.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
}

/** Tek eserin Röntgeni — gelir ve gider ayrı listeler (aynı paranın iki tarafı). */
function EserRontgeni({ eser }: { eser: SinifRontgenEseri }) {
  const belgeli = eser.gelirDagilimiDurumu === 'belgeli' && eser.gelirKalemleri.length > 0;
  const gelirler = eser.gelirKalemleri.filter((k) => k.tip === 'gelir');
  const giderler = eser.gelirKalemleri.filter((k) => k.tip === 'gider');
  const tipsizler = eser.gelirKalemleri.filter((k) => k.tip === null);
  const ikiGrup = gelirler.length > 0 && giderler.length > 0;

  function liste(
    baslik: string,
    kalemler: SinifRontgenEseri['gelirKalemleri'],
    kimlik: string,
  ) {
    if (kalemler.length === 0) return null;
    return (
      <section className="sinif-rontgen__grup" aria-labelledby={kimlik}>
        <h3 className="sinif-rontgen__grup-baslik" id={kimlik}>
          {baslik}
        </h3>
        <ul className="sinif-rontgen__liste">
          {kalemler.map((kalem) => (
            <li className="sinif-rontgen__kalem" key={kalem.id}>
              <p className="sinif-rontgen__kalem-ust">
                <span>{kalem.kalem}</span>
                {kalem.yuzde !== null ? (
                  <strong className="sinif-rontgen__yuzde">{yuzdeYaz(kalem.yuzde)}</strong>
                ) : null}
              </p>
              {kalem.yuzde !== null ? (
                <div
                  className="cubuk sinif-rontgen__cubuk"
                  role="progressbar"
                  aria-label={`${kalem.kalem} oranı`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={kalem.yuzde}
                  aria-valuetext={yuzdeYaz(kalem.yuzde)}
                >
                  <div
                    className="cubuk__dolgu"
                    style={{ width: `${Math.max(0, Math.min(100, kalem.yuzde))}%` }}
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <p className="sinif-rontgen__belgesiz">oran belgelenmemiş</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <article className="kart sinif-rontgen__eser" aria-labelledby={`eser-${eser.eserId}`}>
      <header className="sinif-rontgen__eser-ust">
        <h2 id={`eser-${eser.eserId}`}>{eser.eserAdi}</h2>
        <p className="metin-ikincil">
          {eser.tur} · {eser.sehirAdi} · {eser.uniteAdi}
        </p>
      </header>

      {!belgeli ? (
        <div className="bildirim bildirim--bilgi sinif-rontgen__bildiri" role="note">
          <p>{BELGE_YOK_METNI}</p>
        </div>
      ) : ikiGrup ? (
        <>
          {liste('Vakfa para nereden geliyordu?', gelirler, `gelir-${eser.eserId}`)}
          {liste('Bu para nereye harcanıyordu?', giderler, `gider-${eser.eserId}`)}
          <p className="metin-soluk sinif-rontgen__not">
            Bu iki liste aynı paranın iki tarafıdır; her biri kendi içinde %100 eder.
          </p>
        </>
      ) : (
        <>
          {liste('Vakfa para nereden geliyordu?', gelirler, `gelir-${eser.eserId}`)}
          {liste('Bu para nereye harcanıyordu?', giderler, `gider-${eser.eserId}`)}
          {liste('Vakıf geliri / gideri', tipsizler, `tipsiz-${eser.eserId}`)}
        </>
      )}

      {eser.kaynakKunye ? (
        <details className="sinif-rontgen__kaynak">
          <summary>Bu bilgi nereden?</summary>
          <p className="kaynak">{eser.kaynakKunye}</p>
        </details>
      ) : null}
    </article>
  );
}

function KulliyeDurumu({ kulliyeler }: { kulliyeler: KulliyeIlerlemesi[] }) {
  if (kulliyeler.length === 0) return null;

  const hedef = kulliyeler.find((k) => k.hedefMi);
  const tamamlanan = kulliyeler.filter((k) => k.tamamlandiMi);

  return (
    <section className="kart sinif-rontgen__kulliye" aria-labelledby="sinif-kulliye-baslik">
      <h2 id="sinif-kulliye-baslik">Sınıf külliyesi</h2>
      {hedef ? (
        <>
          <p className="etiket">Sıradaki hedef</p>
          <p className="sinif-rontgen__kulliye-ad">{hedef.ad}</p>
          <IlerlemeCubugu
            etiket={`Sınıf külliyesi: ${hedef.ad}`}
            tamamlanan={hedef.tamamlananDersCesidi}
            toplam={hedef.toplamDers}
            desen={2}
          />
          <p className="metin-ikincil">
            {hedef.toplamDers - hedef.tamamlananDersCesidi} ders kaldı. Bu hedef, sınıf bitirince
            sıradaki külliyeye geçer.
          </p>
        </>
      ) : (
        <p className="bildirim bildirim--basari" role="status">
          <strong>Belgelenmiş tüm külliyeler tamamlandı.</strong> Sınıf birlikte tamamladı.
        </p>
      )}

      {tamamlanan.length > 0 ? (
        <ul className="sinif-rontgen__kulliye-liste" aria-label="Tamamlanan külliyeler">
          {tamamlanan.map((k) => (
            <li key={k.id}>
              <span aria-hidden="true">✓</span> {k.ad}: {k.toplamDers}/{k.toplamDers} ders
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

interface Props {
  kod: string;
}

export function SinifRontgenSayfasi({ kod }: Props) {
  const [veri, setVeri] = useState<SinifRontgenCevabi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const baslik = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    setHata(null);

    void katilimApi
      .sinifRontgeni(kod)
      .then((gelen) => {
        if (iptal) return;
        setVeri(gelen);
        baslikAyarla(`Sınıf Röntgeni: ${gelen.ad}`);
      })
      .catch((e: unknown) => {
        if (!iptal) setHata(hataMetni(e));
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });

    return () => {
      iptal = true;
    };
  }, [kod]);

  useEffect(() => {
    if (!yukleniyor) baslik.current?.focus();
  }, [yukleniyor]);

  return (
    <div className="sinif-rontgen">
      <header className="sinif-rontgen__ust">
        <p className="etiket">Tahtada birlikte · Sınıf Vakıf Röntgeni</p>
        <h1 ref={baslik} tabIndex={-1}>
          Vakıf Röntgeni
        </h1>
        {veri ? (
          <p className="sinif-rontgen__alt">
            {veri.ad} · Kod {veri.kod} · {veri.eserler.length} eser birlikte görüldü ·{' '}
            {veri.toplamTamamlama} tamamlama
          </p>
        ) : null}
        <a className="dugme dugme--ikincil" href="#/ogretmen">
          ← Öğretmen paneline dön
        </a>
      </header>

      {yukleniyor ? (
        <p className="bildirim bildirim--bilgi" role="status">
          Sınıfın Röntgeni yükleniyor…
        </p>
      ) : null}

      {hata ? (
        <div className="kart yigin">
          <p className="bildirim bildirim--hata" role="alert">
            Sınıf Röntgeni açılamadı: {hata}
          </p>
          <p className="metin-ikincil">
            Sınıf kodu doğru mu? Bu ekran yalnızca sınıf koduyla açılır; öğretmen girişi
            gerekmez.
          </p>
          <a className="dugme" href="#/ogretmen">
            Öğretmen paneline dön
          </a>
        </div>
      ) : null}

      {veri ? (
        <>
          <KulliyeDurumu kulliyeler={veri.kulliyeler} />

          {veri.eserler.length === 0 ? (
            <div className="kart sinif-rontgen__bos" role="status">
              <p>
                <strong>Henüz birlikte görülen eser yok.</strong> Öğretmen panelinden bir dersi
                &quot;Tahtada aç&quot; ile başlatın; ders bitince bu ekrana düşer.
              </p>
              <a className="dugme" href="#/ogretmen">
                Öğretmen paneline git
              </a>
            </div>
          ) : (
            <div className="sinif-rontgen__eserler">
              {veri.eserler.map((eser) => (
                <EserRontgeni eser={eser} key={eser.dersId} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default SinifRontgenSayfasi;
