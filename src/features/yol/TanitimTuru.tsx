/**
 * İlk açılış turu — Duolingo'daki "tanışalım" ekranları gibi, uygulamayı
 * 4 kısa sayfada anlatır.
 *
 * Neden modal değil: tam ekran pencere odak tuzağı ve ekran okuyucu için
 * ek risk getirir; tur yol sayfasının üstünde bir kart olarak durur, "Atla"
 * ile tek dokunuşta kapanır. Yalnızca hiç ders bitirmemiş yeni kullanıcıya,
 * bir kez gösterilir (cihazda hatırlanır).
 */
import { useState } from 'react';
import type { YolGorunumu } from './yolGorunumu';

const ANAHTAR = 'kokavi-tanitim-v1';

const SAYFALAR = [
  {
    baslik: 'Kök Avı’na hoş geldin!',
    metin:
      'Birlikte vakıf eserlerini keşfedeceğiz: camiler, hanlar, çeşmeler… Yüzlerce yıl önce insanlar bunları herkes için yaptırdı.',
  },
  {
    baslik: 'Her gün kısa bir ders',
    metin:
      'Her ders 5 adım: Merak, Bağlam, Perspektif, Egzersiz ve Yansıma. Yanlış yapmaktan korkma; ceza yok, sadece ipucu var!',
  },
  {
    baslik: 'Elmas, seri ve rozet',
    metin:
      'Ders bitirince elmas kazanırsın. Her gün gelirsen serin büyür. Başarılarına rozetler eklenir, hepsi Kâşif Defteri’nde.',
  },
  {
    baslik: 'Nasıl ilerlemek istersin?',
    metin:
      'Şehir şehir gidebilir ya da yüzyıllar boyunca, en eski eserden en yeniye yolculuk edebilirsin. Sonra da değiştirebilirsin.',
  },
];

export function tanitimGorulduMu(): boolean {
  try {
    return localStorage.getItem(ANAHTAR) !== null;
  } catch {
    return true; // depolama yoksa her açılışta göstermeyelim
  }
}

export function TanitimTuru({ onBitti }: { onBitti: (secim?: YolGorunumu) => void }) {
  const [sayfa, setSayfa] = useState(0);
  const son = sayfa === SAYFALAR.length - 1;
  const s = SAYFALAR[sayfa]!;

  function kapat(secim?: YolGorunumu) {
    try {
      localStorage.setItem(ANAHTAR, new Date().toISOString().slice(0, 10));
    } catch {
      /* yine de kapanır */
    }
    onBitti(secim);
  }

  return (
    <section className="kart tanitim" aria-labelledby="tanitim-baslik" aria-roledescription="tanıtım">
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
        {son ? (
          <>
            <button type="button" className="dugme" onClick={() => kapat('sehir')}>
              Şehir şehir ilerle
            </button>
            <button type="button" className="dugme dugme--mavi" onClick={() => kapat('zaman')}>
              Zaman sırasıyla ilerle
            </button>
          </>
        ) : (
          <>
            <button type="button" className="dugme dugme--ikincil" onClick={() => kapat()}>
              Atla
            </button>
            <button type="button" className="dugme" onClick={() => setSayfa(sayfa + 1)}>
              İleri
            </button>
          </>
        )}
      </div>
    </section>
  );
}
