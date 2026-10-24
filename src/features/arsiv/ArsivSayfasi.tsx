/**
 * Meraklısına — envanterdeki tüm vakıf eserleri (ders olsun olmasın).
 *
 * Görev ve puan yok; yalnızca keşif. Kartlardaki yıldızlı çip ("Dersi var")
 * uygulamada dersi olan eserleri işaretler; gerisi arşiv/keşif eseridir.
 * Haritadaki ilçe balonundan `#/arsiv?il=bursa&ilce=Osmangazi` ile gelinirse
 * filtre dolu açılır.
 *
 * Erişilebilirlik: görünür etiketli filtreler, sonuç sayısı canlı bölgede,
 * kartlar gerçek <a>. Fotoğraf süs olarak işaretlidir (alt=""): bağlantının
 * adı zaten eser adıdır.
 */
import { useEffect, useMemo, useState } from 'react';
import { SuzgecPaneli } from '../../app/SuzgecPaneli';
import { soruMu } from '../../lib/soruMu';
import { sohbetiAc } from '../sohbet/KostikSohbeti';
import { git } from '../../lib/yonlendirme';
import { arsivFotoUrl, arsivListesi, IL_ADLARI, type ArsivEseri } from './arsivVeri';
import './arsiv.css';
import { IkonYildiz, IkonZar } from '../../app/Ikonlar';

const SAYFA = 24;

function hashSorgusu(): URLSearchParams {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '');
}

const kucult = (m: string) => m.toLocaleLowerCase('tr');

export function ArsivSayfasi() {
  const [liste, setListe] = useState<ArsivEseri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [il, setIl] = useState(() => hashSorgusu().get('il') ?? '');
  const [ilce, setIlce] = useState(() => hashSorgusu().get('ilce') ?? '');
  const [tur, setTur] = useState('');
  const [arama, setArama] = useState('');
  const [gosterilen, setGosterilen] = useState(SAYFA);
  const soruYazildi = soruMu(arama);

  useEffect(() => {
    let iptal = false;
    arsivListesi()
      .then((l) => {
        if (!iptal) setListe(l);
      })
      .catch((e: unknown) => {
        if (!iptal) setHata(e instanceof Error ? e.message : 'Arşiv yüklenemedi.');
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, []);

  // Filtre değişince ilk sayfaya dön
  useEffect(() => setGosterilen(SAYFA), [il, ilce, tur, arama]);

  const ilceler = useMemo(
    () =>
      [...new Set(liste.filter((e) => !il || e.il === il).map((e) => e.ilce).filter((x): x is string => !!x))].sort(
        (a, b) => a.localeCompare(b, 'tr'),
      ),
    [liste, il],
  );
  const turler = useMemo(
    () => [...new Set(liste.map((e) => e.tur))].sort((a, b) => a.localeCompare(b, 'tr')),
    [liste],
  );

  const sonuc = useMemo(() => {
    // Soru yazılıyorsa ad araması yapılmaz (liste diğer süzgeçlerle kalır).
    const aranan = soruMu(arama) ? '' : kucult(arama.trim());
    return liste.filter(
      (e) =>
        (!il || e.il === il) &&
        (!ilce || e.ilce === ilce) &&
        (!tur || e.tur === tur) &&
        (!aranan || kucult(e.ad).includes(aranan)),
    );
  }, [liste, il, ilce, tur, arama]);

  const durum = yukleniyor
    ? 'Arşiv yükleniyor…'
    : hata
      ? 'Arşiv yüklenemedi.'
      : `${sonuc.length} eser bulundu.`;

  return (
    <div className="yigin" style={{ gap: 'var(--b-5)' }}>
      <div className="arsiv-ust">
        <div>
          <span className="etiket">Meraklısına</span>
          <h1>Vakıf Eserleri Arşivi</h1>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            Envanterdeki {liste.length || 'tüm'} eserin hepsi burada; yıldızlı olanların bir dersi var,
            diğerleri yalnızca keşif.
          </p>
        </div>
        <button
          type="button"
          className="dugme dugme--ikincil"
          disabled={sonuc.length === 0}
          onClick={() => {
            const e = sonuc[Math.floor(Math.random() * sonuc.length)];
            if (e) git(`arsiv/${e.id}`);
          }}
        >
          <IkonZar boyut={20} /> Şansına bir eser!
        </button>
      </div>

      <section className="harita-filtreler arsiv-filtreler" aria-labelledby="arsiv-filtre-basligi">
        <h2 id="arsiv-filtre-basligi" className="sr-only">
          Ara ve süz
        </h2>
        <div className="arsiv-arama">
          <div className="harita-filtre">
            <label className="sr-only" htmlFor="arsiv-arama">
              Sor ya da ara
            </label>
            <input
              id="arsiv-arama"
              className="harita-filtre__secim"
              type="search"
              value={arama}
              onChange={(o) => setArama(o.target.value)}
              onKeyDown={(o) => {
                if (o.key === 'Enter' && soruYazildi) sohbetiAc({ soru: arama.trim() });
              }}
              placeholder="Ara ya da sor: Ulucami'de kaç kubbe var?"
              aria-describedby="arsiv-sor-ipucu"
            />
          </div>
          <SuzgecPaneli
            etkinSayisi={[il, ilce, tur].filter(Boolean).length}
            baslangictaAcik={!!il}
            onTemizle={() => {
              setIl('');
              setIlce('');
              setTur('');
            }}
          >
            <div className="harita-filtreler__izgara">
              <div className="harita-filtre">
                <label className="harita-filtre__etiket" htmlFor="arsiv-il">
                  Şehir
                </label>
                <select
                  id="arsiv-il"
                  className="harita-filtre__secim"
                  value={il}
                  onChange={(o) => {
                    setIl(o.target.value);
                    setIlce('');
                  }}
                >
                  <option value="">Tümü</option>
                  {Object.entries(IL_ADLARI).map(([k, ad]) => (
                    <option key={k} value={k}>
                      {ad}
                    </option>
                  ))}
                </select>
              </div>
              <div className="harita-filtre">
                <label className="harita-filtre__etiket" htmlFor="arsiv-ilce">
                  İlçe
                </label>
                <select
                  id="arsiv-ilce"
                  className="harita-filtre__secim"
                  value={ilce}
                  onChange={(o) => setIlce(o.target.value)}
                >
                  <option value="">Tümü</option>
                  {ilceler.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div className="harita-filtre">
                <label className="harita-filtre__etiket" htmlFor="arsiv-tur">
                  Tür
                </label>
                <select id="arsiv-tur" className="harita-filtre__secim" value={tur} onChange={(o) => setTur(o.target.value)}>
                  <option value="">Tümü</option>
                  {turler.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SuzgecPaneli>
        </div>
        {soruYazildi ? (
          <button type="button" className="dugme dugme--kucuk arsiv-sor" onClick={() => sohbetiAc({ soru: arama.trim() })}>
            Köstik'e sor
          </button>
        ) : null}
        <p id="arsiv-sor-ipucu" className="sr-only">
          Bir eser adı yaz ya da soru sor; soru sorarsan Köstik kaynaklarıyla cevaplar.
        </p>
        <p className="harita-filtreler__durum" role="status" aria-live="polite">
          {durum}
        </p>
      </section>


      {hata ? <div className="bildirim bildirim--uyari">{hata} İnternet bağlantını kontrol et.</div> : null}

      <ul className="arsiv-izgara">
        {sonuc.slice(0, gosterilen).map((e, i) => (
          <li key={e.id} className="arsiv-kart" style={{ ['--gecikme' as string]: `${(i % SAYFA) * 25}ms` }}>
            <a className="arsiv-kart__bag" href={`#/arsiv/${encodeURIComponent(e.id)}`}>
              {e.foto ? (
                <img className="arsiv-kart__resim" src={arsivFotoUrl(e.id)} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="arsiv-kart__resim arsiv-kart__resim--bos" aria-hidden="true" />
              )}
              <span className="arsiv-kart__govde">
                <span className="arsiv-kart__ad">{e.ad}</span>
                <span className="arsiv-kart__alt">
                  {[IL_ADLARI[e.il], e.ilce, e.tur].filter(Boolean).join(' · ')}
                </span>
                {e.ders ? <span className="arsiv-kart__rozet"><IkonYildiz boyut={12} /> Dersi var</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {gosterilen < sonuc.length ? (
        <button type="button" className="dugme dugme--ikincil dugme--genis" onClick={() => setGosterilen((g) => g + SAYFA)}>
          Daha fazla göster ({sonuc.length - gosterilen} eser kaldı)
        </button>
      ) : null}

      <p className="metin-soluk" style={{ fontSize: 'var(--yazi-xs)' }}>
        Metin ve fotoğraflar Vakıf Katılım'ın Bursa, Konya ve Hatay vakıf eserleri envanterlerinden
        aktarılmıştır. Arşiv metinleri PDF'ten otomatik aktarıldığı için yazım hataları içerebilir;
        her eser sayfasında kitap ve sayfa numarası yazılıdır.
      </p>
    </div>
  );
}
