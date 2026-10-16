/**
 * VAKIF RÖNTGENİ — ürünün ayırt edici ekranı.
 *
 * PDF: "Vakıf eseri bir bina değil, kendi kendini finanse eden bir hayır
 * kurumudur." Çocuk burada eserin gelirinin nereye gittiğini görür.
 *
 * DÜRÜSTLÜK İLKESİ (pazarlık konusu değil):
 * Şartname: "doğrulanmamış içerik kesin bilgi olarak sunulmamalı."
 *  - Eserin gelir dağılımı belgelenmemişse (veya eser yüklenemediyse) ÇUBUK
 *    ÇİZİLMEZ; oran uydurulmaz, durum açıkça yazılır.
 *  - yuzde değeri null olan kalem için de çubuk çizilmez: "oran belgelenmemiş".
 *  - Her kalemin kaynağı ve varsa vakfiye arşiv numarası görünür.
 */
import type { Eser } from '@shared/types';
import { kalemEtiketi } from './kalemEtiketleri';
import { cubukSinifi, gelirKalemleriniSirala, gelirBelgeliMi, yuzdeYaz } from './yardimci';

/** Belgelenmemiş oranlarda gösterilen sabit metin — ürün ilkesi. */
const BELGE_YOK_METNI =
  'Bu eserin vakfiyesindeki gelir dağılımı belgelenememiştir. Doğrulanmamış bilgi kesin bilgi olarak sunulmaz.';

interface Props {
  eser: Eser | null;
  eserYukleniyor: boolean;
  eserHatasi: string | null;
}

/** Vakfiye arşiv numarası — PDF: "her değer arşiv numarasıyla gösterilir". */
function ArsivBilgisi({ arsivNo }: { arsivNo: string | null }) {
  if (!arsivNo) return null;
  return <p className="kaynak ders-rontgen__arsiv">Vakfiye arşiv no: {arsivNo}</p>;
}

export function VakifRontgeni({ eser, eserYukleniyor, eserHatasi }: Props) {
  if (eserYukleniyor) {
    return (
      <p className="bildirim bildirim--bilgi" role="status">
        Eserin vakfiye bilgileri yükleniyor…
      </p>
    );
  }

  // Eser kaydı yoksa hiçbir oran gösterilmez — tahmin yürütülmez.
  if (!eser) {
    return (
      <div className="bildirim bildirim--bilgi ders-rontgen__bildiri">
        <p>
          <span className="ders-isaret" aria-hidden="true">
            !
          </span>{' '}
          Eser kaydı yüklenemediği için gelir dağılımı gösterilmiyor.
          {eserHatasi ? ` (${eserHatasi})` : ''}
        </p>
        <p>{BELGE_YOK_METNI}</p>
      </div>
    );
  }

  const kalemler = gelirKalemleriniSirala(eser.gelirKalemleri);
  const belgeli = gelirBelgeliMi(eser);

  if (!belgeli) {
    return (
      <div className="yigin">
        <div className="bildirim bildirim--bilgi ders-rontgen__bildiri">
          <p>
            <span className="ders-isaret" aria-hidden="true">
              !
            </span>{' '}
            {BELGE_YOK_METNI}
          </p>
        </div>
        <ArsivBilgisi arsivNo={eser.arsivNo} />
      </div>
    );
  }

  /**
   * GELİR / GİDER AYRIMI — vakfiye belgeleri iki farklı şeyi kaydeder:
   *  · `gelir` — vakfa para **nereden** geliyor (köy mahsulü, han kirası)
   *  · `gider` — vakıf geliri **nereye** harcanıyor (maaş, bakım, burs)
   *
   * İkisi aynı paranın iki tarafıdır ve **ayrı ayrı** %100 eder. Tek liste
   * hâlinde gösterilirse çocuk "%200" görür ve oranlar anlamsızlaşır.
   * Bu yüzden iki grup varsa AYRI başlıklarla sunulur.
   */
  const gelirKalemleri = kalemler.filter((k) => k.tip === 'gelir');
  const giderKalemleri = kalemler.filter((k) => k.tip === 'gider');
  const tipsizKalemler = kalemler.filter((k) => k.tip === null);
  const ikiGrupVar = gelirKalemleri.length > 0 && giderKalemleri.length > 0;

  function kalemListesi(liste: typeof kalemler, baslangicIndeks = 0) {
    return (
      <ul className="ders-rontgen__liste">
        {liste.map((kalem, i) => (
          <li className="ders-rontgen__satir" key={kalem.id}>
            <p className="ders-rontgen__baslik">
              <span className="ders-rontgen__ad">{kalemEtiketi(kalem.kalem)}</span>
              {kalem.yuzde !== null ? (
                <span className="ders-rontgen__yuzde">{yuzdeYaz(kalem.yuzde)}</span>
              ) : null}
            </p>

            {kalem.yuzde !== null ? (
              <div
                className="cubuk"
                role="progressbar"
                aria-label={`${kalemEtiketi(kalem.kalem)} oranı`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={kalem.yuzde}
                aria-valuetext={yuzdeYaz(kalem.yuzde)}
              >
                <div
                  className={`cubuk__dolgu ${cubukSinifi(baslangicIndeks + i)}`}
                  style={{ width: `${Math.max(0, Math.min(100, kalem.yuzde))}%` }}
                  aria-hidden="true"
                />
              </div>
            ) : (
              <p className="ders-rontgen__belgesiz">
                <span className="ders-isaret" aria-hidden="true">
                  !
                </span>{' '}
                oran belgelenmemiş
              </p>
            )}

            {/* Kalemin kaynağı "Bu bilgi nereden?" bölümünde (çocuk ekranı sade kalsın). */}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="yigin ders-rontgen">
      {ikiGrupVar ? (
        <>
          <section aria-labelledby="rontgen-gelir">
            <h4 className="ders-bolum-baslik" id="rontgen-gelir">
              Vakfa para nereden geliyordu?
            </h4>
            {kalemListesi(gelirKalemleri, 0)}
          </section>

          <section aria-labelledby="rontgen-gider">
            <h4 className="ders-bolum-baslik" id="rontgen-gider">
              Bu para nereye harcanıyordu?
            </h4>
            {kalemListesi(giderKalemleri, gelirKalemleri.length)}
          </section>

          <p className="ders-rontgen__belgesiz" style={{ paddingLeft: 0 }}>
            <span className="ders-isaret" aria-hidden="true">
              i
            </span>{' '}
            Bu iki liste aynı paranın iki tarafıdır: her biri kendi içinde
            %100 eder. Vakfiye ikisini ayrı ayrı şart koşar.
          </p>
        </>
      ) : (
        kalemListesi(kalemler)
      )}

      {tipsizKalemler.length > 0 && !ikiGrupVar && kalemler.length !== tipsizKalemler.length ? (
        <p className="metin-soluk">
          {tipsizKalemler.length} kalemin gelir/gider ayrımı belgelenememiştir.
        </p>
      ) : null}

      {/*
        Kaynaklar kaybolmaz, geri çekilir: çocuk ekranı sade kalır, tek dokunuşla
        tüm künye açılır (şartname 5.1.3 — kaynak bilgisi gösterilmeli).
      */}
      {eser.kaynaklar.length > 0 || eser.arsivNo || kalemler.some((k) => k.kaynak) ? (
        <details className="ders-ayrinti">
          <summary>
            Bu bilgi nereden?
            {eser.kaynaklar.length > 0 ? ` (${eser.kaynaklar.length} kaynak)` : ''}
          </summary>
          <div className="ders-ayrinti__icerik">
            <ArsivBilgisi arsivNo={eser.arsivNo} />
            {kalemler.some((k) => k.kaynak) ? (
              <ul className="ders-rontgen__kaynak-listesi">
                {kalemler
                  .filter((k) => k.kaynak)
                  .map((k) => (
                    <li key={`kalem-${k.id}`}>
                      <span className="kaynak">
                        <strong>{k.kalem}:</strong> {k.kaynak}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}
            <ul className="ders-rontgen__kaynak-listesi">
              {eser.kaynaklar.map((kaynak) => (
                <li key={kaynak.kunye}>
                  <span className="kaynak">
                    {kaynak.kunye}
                    {kaynak.url ? (
                      <>
                        {' — '}
                        <a href={kaynak.url} rel="noreferrer noopener" target="_blank">
                          kaynağı aç
                        </a>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}

      {/*
        Doğrulama notu ekip içi araştırma notudur ("düzeltilen / yanlış
        olabilecek noktalar"). Çocuğun varsayılan görünümünde GÖSTERİLMEZ;
        meraklı yetişkin için kapalı bir bölümde durur. Dürüstlük ilkesi
        korunur: not silinmez, yalnızca geri çekilir.
      */}
      {eser.dogrulamaNotu ? (
        <details className="ders-ayrinti">
          <summary>Büyükler için: araştırma notu</summary>
          <div className="ders-ayrinti__icerik">
            <p className="kaynak ders-rontgen__not">{eser.dogrulamaNotu}</p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
