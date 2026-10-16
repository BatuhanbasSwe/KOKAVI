/**
 * Eser fotoğrafları — Vakıf Katılım envanterlerinden.
 *
 * İki parça:
 *  - `EserKapakAcilis`: Merak adımında tek fotoğraf; daire biçiminde açılarak
 *    belirir ("Bu eseri tanıyor musun?"). Çocuğun ilk teması görseldir.
 *  - `EserGalerisi`: Bağlam adımında kaydırılabilir galeri.
 *
 * Erişilebilirlik:
 *  - Her `<img>` için `altMetin` zorunlu (şema); konum "Fotoğraf 2/6" olarak
 *    canlı bölgede duyurulur.
 *  - Gezinme gerçek `<button>`larla yapılır (44 px). Parmakla kaydırma yalnızca
 *    ek kolaylıktır; düğmesiz çalışan bir şey yoktur.
 *  - Animasyonlar "hareketi azalt" ayarında kapanır (tokens.css genel kuralı).
 */
import { useRef, useState } from 'react';
import type { EserFotograf } from '@shared/types';

/** "/gorseller/x/3.webp" → "/gorseller/x/k.webp" (480 px kapak) */
export function kucukKapak(url: string): string {
  return url.replace(/\/\d+\.webp$/, '/k.webp');
}

export function EserKapakAcilis({ foto }: { foto: EserFotograf | undefined }) {
  if (!foto) return null;
  return (
    <figure className="kapak-acilis">
      <img
        className="kapak-acilis__resim"
        src={foto.url}
        alt={foto.altMetin}
        decoding="async"
        width={1280}
        height={853}
      />
      <figcaption className="kapak-acilis__alt">Bu eseri tanıyor musun?</figcaption>
    </figure>
  );
}

interface GaleriProps {
  fotograflar: EserFotograf[];
  /** Ekran okuyucu için galeri adı: "Ulucami fotoğrafları" */
  eserAdi: string;
}

export function EserGalerisi({ fotograflar, eserAdi }: GaleriProps) {
  const [sira, setSira] = useState(0);
  const dokunmaX = useRef<number | null>(null);
  const toplam = fotograflar.length;
  if (toplam === 0) return null;

  const foto = fotograflar[sira]!;
  const git = (yeni: number) => setSira((yeni + toplam) % toplam);

  return (
    <figure className="galeri" aria-label={`${eserAdi} fotoğrafları`}>
      <div
        className="galeri__cerceve"
        onPointerDown={(o) => {
          dokunmaX.current = o.clientX;
        }}
        onPointerUp={(o) => {
          if (dokunmaX.current === null) return;
          const fark = o.clientX - dokunmaX.current;
          dokunmaX.current = null;
          if (Math.abs(fark) > 40) git(sira + (fark < 0 ? 1 : -1));
        }}
      >
        {/* key: fotoğraf değişince giriş animasyonu yeniden oynar */}
        <img
          key={foto.url}
          className="galeri__resim"
          src={foto.url}
          alt={foto.altMetin}
          decoding="async"
          draggable={false}
        />
        {toplam > 1 ? (
          <>
            <button
              type="button"
              className="galeri__ok galeri__ok--sol"
              aria-label="Önceki fotoğraf"
              onClick={() => git(sira - 1)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="galeri__ok galeri__ok--sag"
              aria-label="Sonraki fotoğraf"
              onClick={() => git(sira + 1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        ) : null}
      </div>

      <figcaption className="galeri__alt">
        <span className="galeri__sira" aria-live="polite">
          Fotoğraf {sira + 1}/{toplam}
        </span>
        {foto.kaynak ? <span className="galeri__kaynak">Kaynak: {foto.kaynak}</span> : null}
      </figcaption>

      {toplam > 1 ? (
        <div className="galeri__noktalar" role="group" aria-label="Fotoğraf seç">
          {fotograflar.map((f, i) => (
            <button
              key={f.url}
              type="button"
              className="galeri__nokta"
              aria-label={`Fotoğraf ${i + 1}`}
              aria-current={i === sira ? 'true' : undefined}
              onClick={() => git(i)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
