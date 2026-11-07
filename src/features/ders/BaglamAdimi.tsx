/**
 * 02 · BAĞLAM — "Öğretim". PDF: "Bilgi burada verilir."
 *
 * Uzun metin tek ekranda verilmez: her paragraf ayrı bir kart olur, çocuk
 * "Devam" ile ilerler (Duolingo'daki gibi küçük lokmalar). Son kartta
 * anahtar kavramlar (terim + açıklama + örnek) ve kapanış sorusu çıkar.
 *
 * Erişilebilirlik: kart değişince odak yeni kartın başlığına taşınır; sayaç
 * metinle de söylenir ("Kart 2 / 4"), noktalar yalnızca görsel destek.
 */
import { useEffect, useRef, useState } from 'react';
import type { BaglamAdimi as BaglamVerisi } from '@shared/types';

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

  const kavramKartiVar = baglam.kavramlar.length > 0;
  const toplam = paragraflar.length + (kavramKartiVar ? 1 : 0);
  const [kart, setKart] = useState(0);
  const sonKartMi = kart >= toplam - 1;
  const kavramKartiMi = kavramKartiVar && kart === paragraflar.length;

  // İlk açılışta odak taşınmaz (adım değişimini DersSayfasi yönetir).
  const ilkCizim = useRef(true);
  const baslikRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (ilkCizim.current) {
      ilkCizim.current = false;
      return;
    }
    baslikRef.current?.focus();
  }, [kart]);

  return (
    <div className="yigin">
      <div className="ders-okuma__ust">
        <p className="ders-okuma__sayac">
          <span className="sr-only">Kart </span>
          {kart + 1} / {toplam}
        </p>
        <ol className="ders-okuma__noktalar" aria-hidden="true">
          {Array.from({ length: toplam }, (_, i) => (
            <li
              key={i}
              className={`ders-okuma__nokta${i <= kart ? ' ders-okuma__nokta--dolu' : ''}`}
            />
          ))}
        </ol>
      </div>

      <section className="kart ders-okuma__kart" key={kart} aria-labelledby="ders-okuma-baslik">
        <h3 id="ders-okuma-baslik" className="ders-soru" ref={baslikRef} tabIndex={-1}>
          {kavramKartiMi ? 'Anahtar kavramlar' : baglam.baslik}
        </h3>

        {kavramKartiMi ? (
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
        ) : (
          <p className="ders-okuma__metin">{paragraflar[kart]}</p>
        )}

        {sonKartMi ? <p className="ders-kapanis">{baglam.kapanis}</p> : null}
      </section>

      <div className="ders-eylem ders-okuma__eylem">
        {kart > 0 ? (
          <button
            type="button"
            className="dugme dugme--ikincil"
            onClick={() => setKart((k) => Math.max(0, k - 1))}
          >
            Geri
          </button>
        ) : null}
        <button
          type="button"
          className="dugme dugme--genis"
          onClick={() => (sonKartMi ? onDevam() : setKart((k) => k + 1))}
        >
          Devam
        </button>
      </div>
    </div>
  );
}
