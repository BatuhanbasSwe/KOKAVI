/**
 * Sayarak artan sayı (elmas, seri): değer büyüyünce eski değerden yeniye
 * sayar ve "zıplar"; yanında süzülen "+N" belirir.
 *
 * Erişilebilirlik: ekran okuyucu her zaman GERÇEK değeri okur (sr-only);
 * sayan görsel sayı aria-hidden'dır. "Hareketi azalt" açıksa sayma yok.
 *
 * `anahtar` verilirse son gösterilen değer oturum boyunca hatırlanır: ders
 * ekranından (üst çubuk gizli) yola dönünce sayaç eski değerden sayar.
 */
import { useEffect, useRef, useState } from 'react';
import { hareketAzaltildiMi } from './hareket';

/** Yumuşak çıkışlı ara değer: t ∈ [0,1] → baş..son arası tam sayı. */
export function araDeger(bas: number, son: number, t: number): number {
  const s = Math.min(1, Math.max(0, t));
  return Math.round(bas + (son - bas) * (1 - (1 - s) ** 3));
}

function oku(anahtar?: string): number | null {
  if (!anahtar) return null;
  try {
    const v = sessionStorage.getItem(`kokavi-sayac-${anahtar}`);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

function yaz(anahtar: string | undefined, deger: number) {
  if (!anahtar) return;
  try {
    sessionStorage.setItem(`kokavi-sayac-${anahtar}`, String(deger));
  } catch {
    // depolama kapalı: bir sonraki açılışta sayma olmaz, zararsız
  }
}

export function ArtanSayi({
  deger,
  baslangic,
  anahtar,
  gecikme = 0,
  sure = 900,
  onek = '',
}: {
  deger: number;
  /** Verilirse buradan sayar (ör. ders sonu kartı 0'dan). */
  baslangic?: number;
  anahtar?: string;
  gecikme?: number;
  sure?: number;
  onek?: string;
}) {
  const ilk = baslangic ?? oku(anahtar) ?? deger;
  const [gosterilen, setGosterilen] = useState(hareketAzaltildiMi() ? deger : Math.min(ilk, deger));
  const [artis, setArtis] = useState(0);
  const onceki = useRef(Math.min(ilk, deger));

  useEffect(() => {
    const bas = onceki.current;
    const bitti = () => {
      onceki.current = deger;
      yaz(anahtar, deger);
    };
    if (deger <= bas || hareketAzaltildiMi() || typeof requestAnimationFrame !== 'function') {
      bitti();
      setGosterilen(deger);
      return;
    }
    // Önceki değer yalnızca sayma bitince güncellenir: efekt yarıda kesilip
    // yeniden çalışırsa (StrictMode, hızlı değişim) sayma baştan doğru başlar.
    let kare = 0;
    let basZaman = 0;
    const adim = (zaman: number) => {
      basZaman ||= zaman;
      const t = (zaman - basZaman - gecikme) / sure;
      setGosterilen(araDeger(bas, deger, t));
      if (t < 1) kare = requestAnimationFrame(adim);
      else bitti();
    };
    kare = requestAnimationFrame(adim);
    const zipla = window.setTimeout(() => setArtis(deger - bas), gecikme);
    const bitir = window.setTimeout(() => setArtis(0), gecikme + sure + 900);
    return () => {
      cancelAnimationFrame(kare);
      window.clearTimeout(zipla);
      window.clearTimeout(bitir);
    };
  }, [deger, anahtar, gecikme, sure]);

  return (
    <span className={`artan-sayi${artis > 0 ? ' artan-sayi--zipla' : ''}`}>
      <span aria-hidden="true">
        {onek}
        {gosterilen}
      </span>
      <span className="sr-only">
        {onek}
        {deger}
      </span>
      {artis > 0 && (
        <span className="artan-sayi__arti" aria-hidden="true">
          +{artis}
        </span>
      )}
    </span>
  );
}
