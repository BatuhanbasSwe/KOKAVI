/**
 * Arşivde tek eser — envanter metni, fotoğraf, kaynak.
 *
 * Metin PDF'ten otomatik aktarıldığı için uzun olabilir: ilk paragraflar
 * gösterilir, gerisi "Devamını oku" ile açılır. Eserin dersi varsa derse
 * bağlantı verilir; sonda aynı ilçeden başka eserler önerilir (keşif sürsün).
 */
import { useEffect, useMemo, useState } from 'react';
import { DinleDugmesi } from '../ders/DinleDugmesi';
import { useDurum } from '../../app/DurumSaglayici';
import { baslikAyarla } from '../../lib/yonlendirme';
import { arsivFotoUrl, arsivListesi, arsivMetni, IL_ADLARI, type ArsivEseri } from './arsivVeri';
import './arsiv.css';

const KISA = 3;

export function ArsivEserSayfasi({ arsivId }: { arsivId: string }) {
  const { yol } = useDurum();
  const [liste, setListe] = useState<ArsivEseri[]>([]);
  const [paragraflar, setParagraflar] = useState<string[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    let iptal = false;
    setParagraflar(null);
    setAcik(false);
    setHata(null);
    Promise.all([arsivListesi(), arsivMetni(arsivId)])
      .then(([l, p]) => {
        if (iptal) return;
        setListe(l);
        setParagraflar(p);
      })
      .catch((e: unknown) => {
        if (!iptal) setHata(e instanceof Error ? e.message : 'Eser yüklenemedi.');
      });
    return () => {
      iptal = true;
    };
  }, [arsivId]);

  const eser = liste.find((e) => e.id === arsivId) ?? null;
  useEffect(() => {
    if (eser) baslikAyarla(eser.ad);
  }, [eser]);

  const dersId = useMemo(() => {
    if (!eser?.ders) return null;
    for (const s of yol?.sehirler ?? [])
      for (const u of s.uniteler) for (const d of u.dersler) if (d.eserId === eser.ders) return d.dersId;
    return null;
  }, [eser, yol]);

  const komsular = useMemo(
    () =>
      eser
        ? liste.filter((e) => e.id !== eser.id && e.il === eser.il && e.ilce && e.ilce === eser.ilce).slice(0, 6)
        : [],
    [eser, liste],
  );

  if (hata) {
    return (
      <div className="kart yigin">
        <h1>Eser açılamadı</h1>
        <p>{hata} İnternet bağlantını kontrol et.</p>
        <a className="dugme dugme--ikincil" href="#/arsiv">
          Arşive dön
        </a>
      </div>
    );
  }
  if (!eser || !paragraflar) {
    return (
      <p className="metin-soluk" role="status">
        Eser yükleniyor…
      </p>
    );
  }

  const gorunen = acik ? paragraflar : paragraflar.slice(0, KISA);

  return (
    <article className="yigin arsiv-eser" style={{ gap: 'var(--b-4)' }}>
      <a className="arsiv-geri" href="#/arsiv">
        ← Arşive dön
      </a>

      {eser.foto ? (
        <img className="arsiv-eser__resim" src={arsivFotoUrl(eser.id)} alt={`${eser.ad} fotoğrafı`} decoding="async" />
      ) : null}

      <header className="yigin" style={{ gap: 'var(--b-2)' }}>
        <h1 style={{ margin: 0 }}>{eser.ad}</h1>
        <ul className="arsiv-cipler" aria-label="Künye">
          <li>{IL_ADLARI[eser.il]}</li>
          {eser.ilce ? <li>{eser.ilce}</li> : null}
          <li>{eser.tur}</li>
        </ul>
      </header>

      {dersId ? (
        <div className="kart arsiv-ders">
          <p style={{ margin: 0, fontWeight: 900 }}>★ Bu eserin bir dersi var!</p>
          <a className="dugme" href={`#/ders/${encodeURIComponent(dersId)}`}>
            Derse git
          </a>
        </div>
      ) : null}

      {/* Okuma güçlüğü olan çocuklar için: görünen metni Türkçe sesle okur
          (sessiz modda ya da Türkçe ses yoksa düğme hiç çıkmaz). */}
      <DinleDugmesi metin={`${eser.ad}. ${gorunen.join(' ')}`} etiket="Hikâyesini dinle" />

      <div className="arsiv-metin">
        {gorunen.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {paragraflar.length > KISA ? (
        <button type="button" className="dugme dugme--ikincil" aria-expanded={acik} onClick={() => setAcik((a) => !a)}>
          {acik ? 'Kısalt' : `Devamını oku (${paragraflar.length - KISA} paragraf daha)`}
        </button>
      ) : null}

      <footer className="arsiv-kaynak">
        <p style={{ margin: 0 }}>
          <strong>Kaynak:</strong> {eser.kaynak}
        </p>
        <p className="metin-soluk" style={{ margin: 0 }}>
          Metin PDF'ten otomatik aktarılmıştır; yazım hataları olabilir.
        </p>
      </footer>

      {komsular.length > 0 ? (
        <section aria-labelledby="arsiv-komsu-baslik" className="yigin" style={{ gap: 'var(--b-3)' }}>
          <h2 id="arsiv-komsu-baslik" className="bolum-basligi">
            {eser.ilce}'den başka eserler
          </h2>
          <ul className="arsiv-izgara arsiv-izgara--kucuk">
            {komsular.map((k) => (
              <li key={k.id} className="arsiv-kart">
                <a className="arsiv-kart__bag" href={`#/arsiv/${encodeURIComponent(k.id)}`}>
                  {k.foto ? (
                    <img className="arsiv-kart__resim" src={arsivFotoUrl(k.id)} alt="" loading="lazy" />
                  ) : (
                    <span className="arsiv-kart__resim arsiv-kart__resim--bos" aria-hidden="true" />
                  )}
                  <span className="arsiv-kart__govde">
                    <span className="arsiv-kart__ad">{k.ad}</span>
                    <span className="arsiv-kart__alt">{k.tur}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
