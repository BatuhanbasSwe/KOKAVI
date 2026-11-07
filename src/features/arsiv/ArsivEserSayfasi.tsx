/**
 * Arşivde tek eser — çocuk özeti, fotoğraf, kaynak.
 *
 * Envanter metni PDF'ten otomatik aktarıldığı için çok uzundur. Çocuğa yalnızca
 * ilk iki cümlelik kısa özet gösterilir; İngilizce çeviri paragrafları hiç
 * basılmaz ve tam Türkçe metin "Büyükler için kaynak metni" altında katlanır.
 * Eserin dersi varsa derse bağlantı verilir; yoksa bunun keşif eseri olduğu
 * söylenir. Sonda aynı ilçeden başka eserler önerilir (keşif sürsün).
 */
import { useEffect, useMemo, useState } from 'react';
import { YasiyorRozeti } from '../merkez/YasiyorRozeti';
import { BuradayimDugmesi } from '../muhur/BuradayimDugmesi';
import { api } from '../../lib/api';
import { useDurum } from '../../app/DurumSaglayici';
import { baslikAyarla } from '../../lib/yonlendirme';
import { arsivFotoUrl, arsivListesi, arsivMetni, IL_ADLARI, type ArsivEseri } from './arsivVeri';
import { cocukOzeti } from './ozet';
import './arsiv.css';
import { IkonYildiz } from '../../app/Ikonlar';

export function ArsivEserSayfasi({ arsivId }: { arsivId: string }) {
  const { yol } = useDurum();
  const [liste, setListe] = useState<ArsivEseri[]>([]);
  const [paragraflar, setParagraflar] = useState<string[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    setParagraflar(null);
    setHata(null);
    Promise.all([arsivListesi(), arsivMetni(arsivId)])
      .then(([l, p]) => {
        if (iptal) return;
        setListe(l);
        setParagraflar(p);
      })
      .catch(() => {
        if (!iptal) setHata('Eser şu an yüklenemedi.');
      });
    return () => {
      iptal = true;
    };
  }, [arsivId]);

  const eser = liste.find((e) => e.id === arsivId) ?? null;

  // Dersi olan eserin koordinatı (sahada mühür için); yaklaşık konumda mühür yok.
  const [konum, setKonum] = useState<{ koordinat: { lat: number; lng: number } | null; yaklasik: boolean } | null>(null);
  useEffect(() => {
    if (!eser?.ders) return;
    let iptal = false;
    api
      .eser(eser.ders)
      .then((e) => {
        if (!iptal)
          setKonum({
            koordinat: e.koordinat,
            yaklasik: (e.kaynaklar ?? []).some((k) => k.kunye.includes('YAKLAŞIK')),
          });
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [eser?.ders]);
  useEffect(() => {
    if (eser) baslikAyarla(eser.ad);
  }, [eser]);

  const dersId = useMemo(() => {
    if (!eser?.ders) return null;
    for (const s of yol?.sehirler ?? [])
      for (const u of s.uniteler) for (const d of u.dersler) if (d.eserId === eser.ders) return d.dersId;
    return null;
  }, [eser, yol]);

  // Bir kart yalnızca tek derse bağlanabildiği için kardeş dersler
  // `ilgiliDersler` içinde durur (ör. külliye kartı → medrese/türbe dersleri).
  const ilgiliDersler = useMemo(() => {
    const sonuc: { dersId: string; eserAdi: string }[] = [];
    const istenen = new Set(eser?.ilgiliDersler ?? []);
    if (istenen.size === 0) return sonuc;
    for (const s of yol?.sehirler ?? [])
      for (const u of s.uniteler)
        for (const d of u.dersler) {
          if (istenen.has(d.eserId) && d.dersId !== dersId) {
            sonuc.push({ dersId: d.dersId, eserAdi: d.eserAdi });
          }
        }
    return sonuc;
  }, [eser, yol, dersId]);

  const komsular = useMemo(
    () =>
      eser
        ? liste.filter((e) => e.id !== eser.id && e.il === eser.il && e.ilce && e.ilce === eser.ilce).slice(0, 6)
        : [],
    [eser, liste],
  );

  // İngilizce çeviriler ayıklanır; çocuğa ilk iki cümlelik özet kalır.
  const { ozet, kalan } = useMemo(() => cocukOzeti(paragraflar ?? []), [paragraflar]);

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

  return (
    <article className="yigin arsiv-eser" style={{ gap: 'var(--b-4)' }}>
      <a className="arsiv-geri" href="#/arsiv">
        ← Arşive dön
      </a>

      {eser.foto ? (
        <img
          className="arsiv-eser__resim"
          src={arsivFotoUrl(eser.id)}
          alt={`${eser.ad} fotoğrafı`}
          decoding="async"
          onError={(olay) => {
            // İnternetsiz ve fotoğraf önbellekte yoksa kırık görsel gösterme.
            olay.currentTarget.hidden = true;
          }}
        />
      ) : null}

      <header className="yigin" style={{ gap: 'var(--b-2)' }}>
        <h1 style={{ margin: 0 }}>{eser.ad}</h1>
        <YasiyorRozeti eserId={eser.ders ?? eser.ilgiliDersler?.[0] ?? eser.id} />
        <ul className="arsiv-cipler" aria-label="Künye">
          <li>{IL_ADLARI[eser.il]}</li>
          {eser.ilce ? <li>{eser.ilce}</li> : null}
          <li>{eser.tur}</li>
        </ul>
        {/* Derssiz eserler Keşfet'ten girilen arşivde çoğunlukta; ayrım görünür olsun. */}
        {!dersId && ilgiliDersler.length === 0 ? (
          <p className="arsiv-not">Dersi yok · yalnızca keşif</p>
        ) : null}
      </header>

      {dersId ? (
        <div className="kart arsiv-ders">
          <p style={{ margin: 0, fontWeight: 900 }}>
            <IkonYildiz boyut={18} /> Bu eserin bir dersi var!
          </p>
          <a className="dugme" href={`#/ders/${encodeURIComponent(dersId)}`}>
            Derse git
          </a>
        </div>
      ) : null}

      {ilgiliDersler.length > 0 ? (
        <div className="kart arsiv-ders">
          <p style={{ margin: 0, fontWeight: 900 }}>Bu eserle ilgili dersler</p>
          <ul className="yigin" style={{ gap: 'var(--b-2)', margin: 0, padding: 0, listStyle: 'none' }}>
            {ilgiliDersler.map((d) => (
              <li key={d.dersId}>
                <a className="dugme dugme--ikincil" href={`#/ders/${encodeURIComponent(d.dersId)}`}>
                  {d.eserAdi.split(' (')[0]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}


      <div className="arsiv-metin arsiv-ozet">
        {ozet ? (
          <p style={{ margin: 0 }}>{ozet}</p>
        ) : (
          <p className="metin-soluk" style={{ margin: 0 }}>
            Bu eser için Türkçe kısa metin bulunamadı.
          </p>
        )}
      </div>

      {/* Tam Türkçe metin yetişkinler için katlanır; İngilizce paragraflar
          hiç gösterilmez (kalan yalnızca Türkçe paragraflardan oluşur). */}
      {kalan.length > 0 ? (
        <details className="arsiv-kaynak-metni">
          <summary>Büyükler için kaynak metni</summary>
          <div className="arsiv-metin">
            {kalan.map((paragraf, sira) => (
              <p key={`${sira}-${paragraf.slice(0, 24)}`}>{paragraf}</p>
            ))}
          </div>
          <p className="metin-soluk arsiv-metin__not">Metin PDF'ten otomatik aktarılmıştır; yazım hataları olabilir.</p>
        </details>
      ) : null}

      {konum && eser.ders ? (
        <BuradayimDugmesi eserId={eser.ders} eserAd={eser.ad} koordinat={konum.koordinat} yaklasik={konum.yaklasik} />
      ) : null}

      <footer className="arsiv-kaynak">
        <p style={{ margin: 0 }}>
          <strong>Kaynak:</strong> {eser.kaynak}
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
                    <img
                      className="arsiv-kart__resim"
                      src={arsivFotoUrl(k.id)}
                      alt=""
                      loading="lazy"
                      onError={(olay) => {
                        olay.currentTarget.hidden = true;
                      }}
                    />
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
