/**
 * 02 · BAĞLAM — "Öğretim". PDF: "Bilgi burada verilir."
 *
 * Kavramlar kart çiftleri hâlinde gösterilir (örn. HAYRAT / AKAR): terim +
 * açıklama + varsa örnek. Örnek, kavramı çocuğun günlük diline bağlar.
 */
import type { BaglamAdimi as BaglamVerisi } from '@shared/types';
import { DinleDugmesi } from './DinleDugmesi';

interface Props {
  baglam: BaglamVerisi;
  onDevam: () => void;
}

export function BaglamAdimi({ baglam, onDevam }: Props) {
  // Metin içindeki boş satırlar paragraf ayracı sayılır.
  const paragraflar = baglam.metin
    .split(/\n{2,}/)
    .map((paragraf) => paragraf.trim())
    .filter(Boolean);

  return (
    <div className="yigin">
      <div className="ders-soru-kutusu">
        <h3 className="ders-soru">{baglam.baslik}</h3>
        <DinleDugmesi
          metin={[baglam.baslik, baglam.metin, ...baglam.kavramlar.map((k) => `${k.ad}: ${k.aciklama}`), baglam.kapanis].join('. ')}
        />
      </div>

      {paragraflar.map((paragraf) => (
        <p key={paragraf}>{paragraf}</p>
      ))}

      {baglam.kavramlar.length > 0 ? (
        <section className="yigin" aria-labelledby="ders-kavramlar-basligi">
          <h4 id="ders-kavramlar-basligi" className="ders-bolum-baslik">
            Anahtar kavramlar
          </h4>
          <div className="izgara-2">
            {baglam.kavramlar.map((kavram) => (
              <article className="kart ders-kavram" key={kavram.ad}>
                <dl className="ders-kavram__liste">
                  <dt className="ders-kavram__ad">{kavram.ad}</dt>
                  <dd className="ders-kavram__aciklama">{kavram.aciklama}</dd>
                  {kavram.ornek ? (
                    <dd className="ders-kavram__ornek">
                      <span className="ders-kavram__ornek-etiket">Örnek:</span> {kavram.ornek}
                    </dd>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p className="ders-kapanis">{baglam.kapanis}</p>

      <div className="ders-eylem">
        <button type="button" className="dugme dugme--genis" onClick={onDevam}>
          Devam
        </button>
      </div>
    </div>
  );
}
