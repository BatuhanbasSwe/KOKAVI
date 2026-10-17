/**
 * Köstik sohbeti: her ekrandan açılan yüzen soru-cevap penceresi.
 *
 * Cevaplar yalnızca kendi kaynaklı verimizden gelir (POST /api/sor); her
 * cümlenin kaynak numarası, balonun altında künyeleri vardır. Kaynaksız cevap
 * sunucuda düşer ve Köstik "bilmiyorum" der.
 *
 * Bağlam: eser sayfasındaysan soru o esere odaklanır; bir cevaptan sonraki
 * soru ("Peki kim yaptırdı?") aynı eser üzerinden sürer. Ders sırasında düğme
 * gizlidir (egzersiz cevabı sorulmasın). Sohbet hiçbir yere kaydedilmez.
 *
 * Erişilebilirlik: düğme aria-expanded; pencere role="dialog", açılınca odak
 * yazı alanında, Esc kapatır ve odak düğmeye döner; yeni mesajlar duyurulur.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Maskot } from '../../app/Maskot';
import { IkonKapat, IkonOk } from '../../app/Ikonlar';
import { sor, type SorSonucu } from '../../lib/sor';
import type { Rota } from '../../lib/yonlendirme';
import './sohbet.css';

export interface SohbetIstegi {
  /** Hemen gönderilecek soru. */
  soru?: string;
  /** Soruların odaklanacağı eser. */
  eserId?: string;
  eserAd?: string;
}

const OLAY = 'kokavi:sohbet';

/** Herhangi bir ekrandan sohbeti açar (isteğe bağlı soru ve eser bağlamıyla). */
export function sohbetiAc(istek: SohbetIstegi = {}): void {
  window.dispatchEvent(new CustomEvent<SohbetIstegi>(OLAY, { detail: istek }));
}

const ONERILER = ["Ulucami'de kaç kubbe var?", 'Koza Hanını kim yaptırdı?', 'Hangi hamam hâlâ çalışıyor?'];

type Mesaj =
  | { id: number; kimden: 'sen'; metin: string }
  | { id: number; kimden: 'kostik'; sonuc: SorSonucu | null };

function CevapBalonu({ sonuc }: { sonuc: SorSonucu | null }) {
  if (!sonuc) return <p className="sohbet__yaziyor">Kaynaklara bakıyorum…</p>;
  if (sonuc.durum === 'cevap') {
    return (
      <>
        <p>
          {sonuc.cumleler.map((c, i) => (
            <span key={i}>
              {c.metin}{' '}
              {c.kaynaklar.map((n) => (
                <span key={n} className="sohbet__no">
                  <span aria-hidden="true">[{n}]</span>
                  <span className="sr-only">(kaynak {n})</span>
                </span>
              ))}{' '}
            </span>
          ))}
        </p>
        <details className="sohbet__kaynaklar">
          <summary>Kaynaklar ({sonuc.kaynaklar.length})</summary>
          <ol>
            {sonuc.kaynaklar.map((k) => (
              <li key={k.no}>
                <span aria-hidden="true">[{k.no}] </span>
                <a href={`#/arsiv/${encodeURIComponent(k.eserId)}`}>{k.eserAd}</a>
                <span className="sohbet__kunye"> · {k.kunye}</span>
              </li>
            ))}
          </ol>
        </details>
      </>
    );
  }
  if (sonuc.durum === 'bilmiyorum') {
    return (
      <>
        <p>
          Bunu kaynaklarımda bulamadım, o yüzden tahmin etmeyeceğim.
          {sonuc.oneriler.length > 0 ? ' Belki bu eserlerde vardır:' : ' Soruyu başka kelimelerle dene.'}
        </p>
        {sonuc.oneriler.length > 0 && (
          <ul className="sohbet__oneri-eserler">
            {sonuc.oneriler.map((o) => (
              <li key={o.eserId}>
                <a href={`#/arsiv/${encodeURIComponent(o.eserId)}`}>{o.eserAd}</a>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }
  if (sonuc.durum === 'kapali') return <p>Şu an soru-cevap kapalı. Arşivde arayarak da keşfedebilirsin.</p>;
  return <p>Şu an cevap veremedim. İnternet bağlantını kontrol edip tekrar dene.</p>;
}

/** Eser sayfasındaysa rotadan eser bağlamı. */
function rotaBaglami(rota: Rota): string | undefined {
  return rota.ad === 'arsiv-eser' ? rota.arsivId : undefined;
}

export function KostikSohbeti({ rota }: { rota: Rota }) {
  const [acik, setAcik] = useState(false);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [girdi, setGirdi] = useState('');
  const [konu, setKonu] = useState<{ eserId: string; eserAd?: string } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const sayac = useRef(0);
  const dugme = useRef<HTMLButtonElement>(null);
  const alan = useRef<HTMLInputElement>(null);
  const liste = useRef<HTMLOListElement>(null);
  const gizli = rota.ad === 'ders' || rota.ad === 'canli-oyna';

  async function gonder(soru: string, eserId?: string) {
    const temiz = soru.trim();
    if (temiz.length < 3 || bekliyor) return;
    const senId = ++sayac.current;
    const kostikId = ++sayac.current;
    setMesajlar((m) => [...m, { id: senId, kimden: 'sen', metin: temiz }, { id: kostikId, kimden: 'kostik', sonuc: null }]);
    setGirdi('');
    setBekliyor(true);
    const sonuc = await sor(temiz, eserId ?? konu?.eserId ?? rotaBaglami(rota));
    setMesajlar((m) => m.map((x) => (x.id === kostikId ? { ...x, sonuc } : x)));
    // Takip sorusu aynı eser üzerinden sürsün ("Peki kim yaptırdı?").
    if (sonuc.durum === 'cevap' && sonuc.kaynaklar[0]) {
      setKonu({ eserId: sonuc.kaynaklar[0].eserId, eserAd: sonuc.kaynaklar[0].eserAd });
    }
    setBekliyor(false);
  }

  // Başka ekranlardan açma isteği (Arşiv "Köstik'e sor", eser sayfası).
  useEffect(() => {
    const dinle = (o: Event) => {
      const istek = (o as CustomEvent<SohbetIstegi>).detail ?? {};
      setAcik(true);
      if (istek.eserId) setKonu({ eserId: istek.eserId, eserAd: istek.eserAd });
      if (istek.soru) void gonder(istek.soru, istek.eserId);
    };
    window.addEventListener(OLAY, dinle);
    return () => window.removeEventListener(OLAY, dinle);
  });

  // Açılınca odak yazı alanına; kapanınca (bir kez açıldıysa) düğmeye döner.
  const acildi = useRef(false);
  useEffect(() => {
    if (acik) {
      acildi.current = true;
      alan.current?.focus();
    } else if (acildi.current) dugme.current?.focus();
  }, [acik]);

  useEffect(() => {
    liste.current?.lastElementChild?.scrollIntoView?.({ block: 'end' });
  }, [mesajlar]);

  function kapat() {
    setAcik(false);
  }

  if (gizli) return null;

  return (
    <>
      {!acik && (
        <button
          ref={dugme}
          type="button"
          className="sohbet-dugme"
          aria-expanded={false}
          aria-controls="kostik-sohbet"
          onClick={() => setAcik(true)}
        >
          <Maskot boyut={52} />
          <span className="sohbet-dugme__etiket">Köstik'e sor</span>
        </button>
      )}

      {acik && (
        <section
          id="kostik-sohbet"
          className="sohbet"
          role="dialog"
          aria-labelledby="sohbet-baslik"
          onKeyDown={(o) => {
            if (o.key === 'Escape') kapat();
          }}
        >
          <div className="sohbet__ust">
            <Maskot boyut={36} mutlu={mesajlar.length > 0} />
            <div className="sohbet__baslik-kap">
              <h2 id="sohbet-baslik" className="sohbet__baslik">
                Köstik'e sor
              </h2>
              <p className="sohbet__alt">Yalnızca kaynaklarımdan cevaplarım</p>
            </div>
            <button type="button" className="sohbet__kapat" aria-label="Sohbeti kapat" onClick={kapat}>
              <IkonKapat boyut={20} />
            </button>
          </div>

          <ol className="sohbet__mesajlar" ref={liste} aria-live="polite" aria-label="Sohbet">
            <li className="sohbet__mesaj sohbet__mesaj--kostik">
              <p>
                Merhaba! Vakıf eserleri hakkında merak ettiğini sor. Kaynaklarımda yazanı söylerim, bilmediğimi
                uydurmam.
              </p>
              {mesajlar.length === 0 && (
                <div className="sohbet__oneriler">
                  {ONERILER.map((o) => (
                    <button key={o} type="button" className="sohbet__oneri" onClick={() => void gonder(o)}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </li>
            {mesajlar.map((m) =>
              m.kimden === 'sen' ? (
                <li key={m.id} className="sohbet__mesaj sohbet__mesaj--sen">
                  <span className="sr-only">Sen: </span>
                  {m.metin}
                </li>
              ) : (
                <li key={m.id} className="sohbet__mesaj sohbet__mesaj--kostik">
                  <span className="sr-only">Köstik: </span>
                  <CevapBalonu sonuc={m.sonuc} />
                </li>
              ),
            )}
          </ol>

          {konu?.eserAd ? (
            <p className="sohbet__konu">
              Konu: {konu.eserAd}
              <button type="button" className="sohbet__konu-sil" onClick={() => setKonu(null)}>
                Konuyu temizle
              </button>
            </p>
          ) : null}

          <form
            className="sohbet__form"
            onSubmit={(o: FormEvent) => {
              o.preventDefault();
              void gonder(girdi);
            }}
          >
            <label className="sr-only" htmlFor="sohbet-girdi">
              Sorunu yaz
            </label>
            <input
              id="sohbet-girdi"
              ref={alan}
              type="text"
              value={girdi}
              maxLength={200}
              autoComplete="off"
              placeholder="Bir soru sor…"
              onChange={(o) => setGirdi(o.target.value)}
            />
            <button type="submit" className="sohbet__gonder" aria-label="Gönder" disabled={girdi.trim().length < 3 || bekliyor}>
              <IkonOk boyut={20} />
            </button>
          </form>
          <p className="sohbet__not">Sohbet kaydedilmez. Adını ya da kişisel bilgini yazma.</p>
        </section>
      )}
    </>
  );
}
