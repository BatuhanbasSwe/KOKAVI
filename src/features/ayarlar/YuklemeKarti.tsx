/**
 * "Uygulamayı yükle" kartı: Kök Avı ana ekranda bir uygulama gibi açılır,
 * internetsiz de çalışır. Kuruluysa ya da tarayıcı desteklemiyorsa gizlenir.
 */
import { useState } from 'react';
import { useYukleme } from '../../app/yukleme';

export function YuklemeKarti() {
  const { kurulu, yuklenebilir, ios, yukle } = useYukleme();
  const [sonuc, setSonuc] = useState<string | null>(null);

  // Sonuç mesajı varsa kart açık kalır (öneri kullanılınca "yüklenebilir" düşer).
  if (!sonuc && (kurulu || (!yuklenebilir && !ios))) return null;

  return (
    <section className="kart" aria-labelledby="yukleme-basligi">
      <h2 id="yukleme-basligi" style={{ fontSize: 'var(--yazi-xl)' }}>
        Uygulamayı yükle
      </h2>
      <p className="metin-ikincil">
        Kök Avı'yı ana ekranına ekle: bir uygulama gibi açılır, internet yokken de dersler çalışır.
      </p>
      {sonuc ? null : yuklenebilir ? (
        <button
          type="button"
          className="dugme"
          onClick={async () => setSonuc((await yukle()) ? 'Yüklendi! Ana ekranında Kök Avı var.' : 'Sonra da yükleyebilirsin.')}
        >
          Ana ekrana ekle
        </button>
      ) : (
        <ol className="metin-ikincil" style={{ margin: 0, paddingLeft: '1.2em' }}>
          <li>Safari'de alttaki <strong>Paylaş</strong> düğmesine dokun.</li>
          <li>
            <strong>Ana Ekrana Ekle</strong>'yi seç.
          </li>
        </ol>
      )}
      <p role="status" className="metin-soluk" style={{ margin: sonuc ? 'var(--b-2) 0 0' : 0 }}>
        {sonuc}
      </p>
    </section>
  );
}
