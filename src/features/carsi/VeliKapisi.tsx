/**
 * Veli kapısı: elmas harcamadan (ya da veli onayı kuralını kapatmadan) önce
 * bir yetişkinin yazıyla verilmiş çarpma sorusunu rakamla cevaplaması.
 * PDF: "Satın almalar platform kuralı gereği veli onaylıdır."
 *
 * Erişilebilirlik: açılınca odak başlığa gelir; soru etiketli bir alan,
 * hata mesajı alanla ilişkili (aria-describedby) ve duyurulur. Yanlış cevapta
 * soru değişir (deneme-yanılmayla geçilmesin). Gerçek para yoktur.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { cevapDogruMu, onayKaydet, veliSorusuUret } from '../../lib/veliOnayi';

export function VeliKapisi({
  amac,
  onOnay,
  onVazgec,
}: {
  /** Neyin onaylandığı: "Kubbe avatarı · 20 elmas". */
  amac: string;
  onOnay: () => void;
  onVazgec: () => void;
}) {
  const [soru, setSoru] = useState(() => veliSorusuUret());
  const [girdi, setGirdi] = useState('');
  const [hata, setHata] = useState('');
  const baslik = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    baslik.current?.focus();
  }, []);

  function gonder(o: FormEvent) {
    o.preventDefault();
    if (cevapDogruMu(girdi, soru)) {
      onayKaydet();
      onOnay();
      return;
    }
    setSoru(veliSorusuUret());
    setGirdi('');
    setHata('Cevap doğru değil. Soru değişti; lütfen yeni soruyu cevaplayın.');
  }

  return (
    <section className="kart veli-kapisi" aria-labelledby="veli-kapisi-baslik">
      <h2 id="veli-kapisi-baslik" className="veli-kapisi__baslik" tabIndex={-1} ref={baslik}>
        Bir yetişkin onaylamalı
      </h2>
      <p className="veli-kapisi__amac">{amac}</p>
      <p className="metin-ikincil veli-kapisi__not">
        Kök Avı'da harcamalar veli onaylıdır. Gerçek para harcanmaz; çocuğun derslerle kazandığı
        elmaslar kullanılır. Onay bu cihazda 10 dakika geçerlidir.
      </p>
      <form className="veli-kapisi__form" onSubmit={gonder} noValidate>
        <label htmlFor="veli-cevap" className="veli-kapisi__soru">
          {soru.soru.charAt(0).toLocaleUpperCase('tr') + soru.soru.slice(1)}
        </label>
        <input
          id="veli-cevap"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={girdi}
          onChange={(o) => setGirdi(o.target.value)}
          aria-describedby={hata ? 'veli-hata' : 'veli-ipucu'}
          aria-invalid={hata ? true : undefined}
        />
        <p id="veli-ipucu" className="metin-soluk veli-kapisi__ipucu">
          Cevabı rakamla yazın.
        </p>
        <p id="veli-hata" className="veli-kapisi__hata" role="status" aria-live="polite">
          {hata}
        </p>
        <div className="satir veli-kapisi__eylem">
          <button type="submit" className="dugme">
            Onayla
          </button>
          <button type="button" className="dugme dugme--ikincil" onClick={onVazgec}>
            Vazgeç
          </button>
        </div>
      </form>
    </section>
  );
}
