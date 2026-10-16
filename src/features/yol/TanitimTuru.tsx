/**
 * İlk açılış turu — Duolingo'daki "tanışalım" ekranları gibi, maskot Kâşif
 * uygulamayı 4 kısa sayfada anlatır.
 *
 * Neden modal değil: tam ekran pencere odak tuzağı ve ekran okuyucu için
 * ek risk getirir; tur yol sayfasının üstünde bir kart olarak durur, "Atla"
 * ile tek dokunuşta kapanır. Yalnızca hiç ders bitirmemiş yeni kullanıcıya,
 * bir kez gösterilir (cihazda hatırlanır).
 */
import { useState } from 'react';
import { Maskot } from '@/app/Maskot';

const ANAHTAR = 'kokavi-tanitim-v1';

const SAYFALAR = [
  {
    baslik: 'Merhaba, ben Kâşif!',
    metin:
      'Birlikte vakıf eserlerini keşfedeceğiz: camiler, hanlar, çeşmeler… Yüzlerce yıl önce insanlar bunları herkes için yaptırdı.',
  },
  {
    baslik: 'Her gün kısa bir ders',
    metin:
      'Her ders 5 adım: Merak, Bağlam, Perspektif, Egzersiz ve Yansıma. Yanlış yapmaktan korkma — ceza yok, sadece ipucu var!',
  },
  {
    baslik: 'Elmas, seri ve rozet',
    metin:
      'Ders bitirince elmas kazanırsın. Her gün gelirsen serin büyür. Başarılarına rozetler eklenir, hepsi Kâşif Defteri’nde.',
  },
  {
    baslik: 'Haritada ve sınıfta keşfet',
    metin:
      'Eserleri haritada bul, Günün Eseri’ni tahmin et, sınıfınla canlı yarışmaya katıl. Hazırsan başlayalım!',
  },
];

export function tanitimGorulduMu(): boolean {
  try {
    return localStorage.getItem(ANAHTAR) !== null;
  } catch {
    return true; // depolama yoksa her açılışta göstermeyelim
  }
}

export function TanitimTuru({ onBitti }: { onBitti: () => void }) {
  const [sayfa, setSayfa] = useState(0);
  const son = sayfa === SAYFALAR.length - 1;
  const s = SAYFALAR[sayfa]!;

  function kapat() {
    try {
      localStorage.setItem(ANAHTAR, new Date().toISOString().slice(0, 10));
    } catch {
      /* yine de kapanır */
    }
    onBitti();
  }

  return (
    <section className="kart tanitim" aria-labelledby="tanitim-baslik" aria-roledescription="tanıtım">
      <div className="tanitim__maskot" key={`m-${sayfa}`}>
        <Maskot boyut={84} mutlu={son} />
      </div>
      <div className="tanitim__govde" key={sayfa} aria-live="polite">
        <p className="etiket">
          Tanışalım · {sayfa + 1}/{SAYFALAR.length}
        </p>
        <h2 id="tanitim-baslik" className="tanitim__baslik">
          {s.baslik}
        </h2>
        <p className="tanitim__metin">{s.metin}</p>
      </div>
      <div className="tanitim__noktalar" aria-hidden="true">
        {SAYFALAR.map((_, i) => (
          <span key={i} className={`tanitim__nokta${i === sayfa ? ' tanitim__nokta--aktif' : ''}`} />
        ))}
      </div>
      <div className="tanitim__eylem">
        {!son && (
          <button type="button" className="dugme dugme--ikincil" onClick={kapat}>
            Atla
          </button>
        )}
        <button type="button" className="dugme" onClick={() => (son ? kapat() : setSayfa(sayfa + 1))}>
          {son ? 'Hadi başlayalım!' : 'İleri'}
        </button>
      </div>
    </section>
  );
}
