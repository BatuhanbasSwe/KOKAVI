/**
 * "Köstik'e sor" cevap kartı. Her cümlenin sonunda kaynak numarası, altta
 * numaralı künyeler (eser sayfasına bağlantı). Yükleniyor/bilmiyorum/kapalı
 * durumları metinle duyurulur.
 */
import { useEffect, useState } from 'react';
import { Maskot } from '../../app/Maskot';
import { sor, type SorSonucu } from '../../lib/sor';

export function SorKarti({ soru, eserId, onKapat }: { soru: string; eserId?: string; onKapat: () => void }) {
  const [sonuc, setSonuc] = useState<SorSonucu | null>(null);

  useEffect(() => {
    let iptal = false;
    setSonuc(null);
    void sor(soru, eserId).then((s) => !iptal && setSonuc(s));
    return () => {
      iptal = true;
    };
  }, [soru, eserId]);

  return (
    <section className="kart sor-karti" aria-labelledby="sor-karti-baslik">
      <div className="sor-karti__ust">
        <Maskot boyut={44} dusunceli={!sonuc} mutlu={sonuc?.durum === 'cevap'} />
        <div className="sor-karti__soru">
          <h2 id="sor-karti-baslik" className="sor-karti__baslik">
            Köstik'in cevabı
          </h2>
          <p className="metin-soluk sor-karti__sorulan">“{soru}”</p>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sor-karti__govde">
        {!sonuc && <p className="metin-ikincil">Kaynaklara bakıyorum…</p>}

        {sonuc?.durum === 'cevap' && (
          <>
            <p className="sor-karti__cevap">
              {sonuc.cumleler.map((c, i) => (
                <span key={i}>
                  {c.metin}{' '}
                  {/* Hash yönlendirmesiyle çakışmasın diye bağlantı değil; künye aşağıda aynı numarayla. */}
                  {c.kaynaklar.map((n) => (
                    <span key={n} className="sor-karti__no">
                      <span aria-hidden="true">[{n}]</span>
                      <span className="sr-only">(kaynak {n})</span>
                    </span>
                  ))}{' '}
                </span>
              ))}
            </p>
            <ol className="sor-karti__kaynaklar" aria-label="Kaynaklar">
              {sonuc.kaynaklar.map((k) => (
                <li key={k.no} id={`sor-kaynak-${k.no}`}>
                  <span aria-hidden="true">[{k.no}] </span>
                  <a href={`#/arsiv/${encodeURIComponent(k.eserId)}`}>{k.eserAd}</a>
                  <span className="metin-soluk"> · {k.kunye}</span>
                </li>
              ))}
            </ol>
            <p className="metin-soluk sor-karti__not">
              Köstik yalnızca bu kaynaklarda yazanları anlatır.
            </p>
          </>
        )}

        {sonuc?.durum === 'bilmiyorum' && (
          <>
            <p className="sor-karti__cevap">
              Bunu kaynaklarımda bulamadım, o yüzden tahmin etmeyeceğim.
              {sonuc.oneriler.length > 0 ? ' Belki bu eserlerde vardır:' : ' Soruyu başka kelimelerle dene.'}
            </p>
            {sonuc.oneriler.length > 0 && (
              <ul className="sor-karti__oneriler">
                {sonuc.oneriler.map((o) => (
                  <li key={o.eserId}>
                    <a href={`#/arsiv/${encodeURIComponent(o.eserId)}`}>{o.eserAd}</a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {sonuc?.durum === 'kapali' && (
          <p className="sor-karti__cevap">
            Soru-cevap şu an kapalı. Aşağıdaki arama sonuçlarına bakabilirsin.
          </p>
        )}

        {sonuc?.durum === 'hata' && (
          <p className="sor-karti__cevap">Şu an cevap veremedim. İnternet bağlantını kontrol edip tekrar dene.</p>
        )}
      </div>

      <button type="button" className="dugme dugme--ikincil dugme--kucuk" onClick={onKapat}>
        Kapat
      </button>
    </section>
  );
}

/** Eser sayfasında "Bu esere sor": soru o esere odaklanır (eserId). */
export function EsereSor({ eserId, eserAd }: { eserId: string; eserAd: string }) {
  const [girdi, setGirdi] = useState('');
  const [soru, setSoru] = useState<string | null>(null);
  return (
    <section className="esere-sor" aria-labelledby="esere-sor-baslik">
      <h2 id="esere-sor-baslik" className="bolum-basligi">
        Bu esere sor
      </h2>
      <form
        className="esere-sor__form"
        onSubmit={(o) => {
          o.preventDefault();
          if (girdi.trim().length >= 3) setSoru(girdi.trim());
        }}
      >
        <label className="sr-only" htmlFor="esere-sor-girdi">
          {eserAd} hakkında sorun
        </label>
        <input
          id="esere-sor-girdi"
          type="text"
          value={girdi}
          maxLength={200}
          onChange={(o) => setGirdi(o.target.value)}
          placeholder="Örneğin: Kim yaptırdı?"
        />
        <button type="submit" className="dugme dugme--kucuk" disabled={girdi.trim().length < 3}>
          Sor
        </button>
      </form>
      {soru ? <SorKarti soru={soru} eserId={eserId} onKapat={() => setSoru(null)} /> : null}
    </section>
  );
}
