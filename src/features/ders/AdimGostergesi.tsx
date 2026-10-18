/**
 * Beş adımlı dersin ilerleme göstergesi (sabit / sticky).
 *
 * PDF: "Her gün 3–5 dakikalık bir ders: bir vakıf eseri, BEŞ ADIMLIK akış."
 *
 * Erişilebilirlik notları:
 *  - Görsel çubuk role="progressbar" ile sayısal olarak da duyurulur.
 *  - Adım listesi metinle okunur ("1/5 Merak"); tamamlanan adım ✓ işareti ve
 *    "tamamlandı" metni taşır — renk tek başına anlam taşımaz (WCAG 1.4.1).
 */

export interface AdimBilgisi {
  no: number;
  /** Kısa ad: "Merak" */
  ad: string;
  /** Açıklama: "Cezasız tahmin" */
  aciklama: string;
}

/** PDF'teki beş adım, sırasıyla. */
export const ADIMLAR: readonly AdimBilgisi[] = [
  { no: 1, ad: 'Merak', aciklama: 'Cezasız tahmin' },
  { no: 2, ad: 'Bağlam', aciklama: 'Öğretim' },
  { no: 3, ad: 'Perspektif', aciklama: 'Tek karar anı' },
  { no: 4, ad: 'Geri çağırma', aciklama: 'Karışık egzersizler' },
  { no: 5, ad: 'Yansıma', aciklama: 'Vakıf Röntgeni' },
];

/** Adım numarasından bilgi getirir; bilinmeyen numarada ilk adıma düşer. */
export function adimBilgisi(no: number): AdimBilgisi {
  return ADIMLAR.find((adim) => adim.no === no) ?? ADIMLAR[0];
}

export function AdimGostergesi({ aktifAdim }: { aktifAdim: number }) {
  const toplam = ADIMLAR.length;
  const suanki = adimBilgisi(aktifAdim);
  const oran = Math.max(0, Math.min(100, (aktifAdim / toplam) * 100));

  return (
    <div className="ders-ilerleme">
      <div
        className="ders-ilerleme__cubuk"
        role="progressbar"
        aria-label="Ders ilerlemesi"
        aria-valuemin={1}
        aria-valuemax={toplam}
        aria-valuenow={aktifAdim}
        aria-valuetext={`Adım ${aktifAdim}/${toplam}: ${suanki.ad}`}
      >
        <div className="cubuk" aria-hidden="true">
          <div className="cubuk__dolgu cubuk__dolgu--d1" style={{ width: `${oran}%` }}>
            {/* Her yeni adımda parıltı yeniden geçer (anahtar değişir). */}
            <span key={aktifAdim} className="cubuk__parilti" />
          </div>
        </div>
      </div>

      {/* Adım listesi ekran okuyucu için metin olarak kalır; görsel olarak
          Duolingo gibi yalnızca ilerleme çubuğu gösterilir. */}
      <ol className="ders-ilerleme__liste sr-only" aria-label="Dersin beş adımı">
        {ADIMLAR.map((adim) => {
          const tamamlandi = adim.no < aktifAdim;
          const aktif = adim.no === aktifAdim;
          const sinif = tamamlandi
            ? 'ders-ilerleme__adim ders-ilerleme__adim--tamam'
            : aktif
              ? 'ders-ilerleme__adim ders-ilerleme__adim--aktif'
              : 'ders-ilerleme__adim';

          return (
            <li
              key={adim.no}
              className={sinif}
              aria-current={aktif ? 'step' : undefined}
            >
              <span className="ders-ilerleme__isaret" aria-hidden="true">
                {tamamlandi ? '✓' : aktif ? '▸' : adim.no}
              </span>
              <span>
                Adım {adim.no}/{toplam}: {adim.ad}
              </span>
              {tamamlandi ? <span className="sr-only"> (tamamlandı)</span> : null}
              {aktif ? <span className="sr-only"> (şu anki adım)</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
