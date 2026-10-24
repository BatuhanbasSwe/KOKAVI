/**
 * Kâşif Defteri — albüm görünümü.
 *
 * PDF: "Kâşif Defteri: öğrenilenin biriktiği yer"
 * PDF: "Kazanç rozet değil, aidiyet. Çocuk '12 rozetim var' demez —
 *       'Bursa'yı biliyorum' der."
 *
 * Bu yüzden defter bir rozet vitrini değil, şehir şehir doldurulan bir
 * albümdür: öğrenilmemiş eserler baştan gri silüet olarak görünür (çocuk ne
 * kaldığını görür), öğrenilen eser renklenir ve dokununca sayfası açılır.
 * Aynı baninin eserleri tamamlandıkça "bağlantı" kartı belirir.
 *
 * Defter teması Vakıf Çarşısı'ndan elmasla seçilir (PDF s. 3: "Kâşif
 * Defteri teması") — yalnızca görünüm değişir, bilgi değişmez.
 *
 * Defter dört iç sekmeden oluşur: Pullar (albüm) · Rozetler · Seri · Belgeler.
 * Seçili sekme `#/defter?sekme=…` ile doğrudan açılabilir.
 *
 * Erişilebilirlik: sekmeler WAI-ARIA tablist (ok tuşları, Home/End); şehir
 * seçimi aria-pressed düğmeleri; öğrenilen pullar gerçek <button>,
 * öğrenilmeyenler metinle "henüz öğrenilmedi" diye okunur.
 */
import { RozetPanosu } from '../rozetler/Rozetler';
import { SertifikaBaglantilari } from '../sertifika/SertifikaBaglantilari';
import { SeriSayfasi } from '../seri/Seri';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Eser } from '@shared/types';
import { api } from '../../lib/api';
import { arsivKaydiMetni } from '../../lib/arsivKaydi';
import { useDurum } from '../../app/DurumSaglayici';
import { IkonTur } from '../../app/Ikonlar';
import { kisaAd } from '../yol/kisaAd';
import { muhurleriOku } from '../../lib/muhur';
import '../muhur/muhur.css';
import '../ders/ders.css'; // .ders-ayrinti (Büyükler için)
import './defter.css';

const SEKMELER = [
  { id: 'pullar', ad: 'Pullar' },
  { id: 'rozetler', ad: 'Rozetler' },
  { id: 'seri', ad: 'Seri' },
  { id: 'belgeler', ad: 'Belgeler' },
] as const;
type Sekme = (typeof SEKMELER)[number]['id'];

function sekmeOku(): Sekme {
  const istenen = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('sekme');
  return SEKMELER.find((s) => s.id === istenen)?.id ?? 'pullar';
}

/** Pul: eserin kapak fotoğrafı tırtıklı kenarlı çerçevede; görsel yoksa tür simgesi. */
function PulGorseli({ eserId, tur }: { eserId: string; tur: string }) {
  const [yok, setYok] = useState(false);
  return (
    <span className="defter-pul__resim" aria-hidden="true">
      {yok ? (
        <IkonTur tur={tur} boyut={28} />
      ) : (
        <img src={`/gorseller/${eserId}/k.webp`} alt="" loading="lazy" decoding="async" onError={() => setYok(true)} />
      )}
    </span>
  );
}

export function DefterSayfasi() {
  const [sekme, setSekmeDurum] = useState<Sekme>(sekmeOku);
  const sekmeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function setSekme(s: Sekme, odak = false) {
    setSekmeDurum(s);
    // replaceState: hashchange tetiklemez (sayfa odağı ve kaydırma yerinde kalır).
    try {
      window.history.replaceState(null, '', s === 'pullar' ? '#/defter' : `#/defter?sekme=${s}`);
    } catch {
      /* geçmiş API'si yoksa yalnızca görünüm değişir */
    }
    if (odak) sekmeRefs.current[s]?.focus();
  }

  function tusla(e: KeyboardEvent<HTMLDivElement>) {
    const i = SEKMELER.findIndex((s) => s.id === sekme);
    const hedef =
      e.key === 'ArrowRight'
        ? (i + 1) % SEKMELER.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + SEKMELER.length) % SEKMELER.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? SEKMELER.length - 1
              : -1;
    if (hedef < 0) return;
    e.preventDefault();
    setSekme(SEKMELER[hedef]!.id, true);
  }

  return (
    <div className="defter-kok yigin" style={{ gap: 'var(--b-4)' }}>
      <h1 style={{ margin: 0 }}>Kâşif Defteri</h1>
      <div className="defter-sekmeler" role="tablist" aria-label="Defter bölümleri" onKeyDown={tusla}>
        {SEKMELER.map((s) => (
          <button
            key={s.id}
            ref={(el) => {
              sekmeRefs.current[s.id] = el;
            }}
            type="button"
            role="tab"
            id={`defter-sekme-${s.id}`}
            aria-selected={sekme === s.id}
            aria-controls={`defter-panel-${s.id}`}
            tabIndex={sekme === s.id ? 0 : -1}
            className="defter-sekme"
            onClick={() => setSekme(s.id)}
          >
            {s.ad}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`defter-panel-${sekme}`}
        aria-labelledby={`defter-sekme-${sekme}`}
        className="defter-panel"
        key={sekme}
      >
        {sekme === 'pullar' && <Pullar />}
        {sekme === 'rozetler' && <RozetPanosu />}
        {sekme === 'seri' && <SeriSayfasi gomulu />}
        {sekme === 'belgeler' && <Belgeler />}
      </div>
    </div>
  );
}

function Belgeler() {
  const { yol } = useDurum();
  if (!yol || yol.sehirler.length === 0) {
    return <p className="metin-ikincil">Bir şehri bitirince sertifikan burada olacak.</p>;
  }
  return <SertifikaBaglantilari />;
}

function Pullar() {
  const { ilerleme, yol, carsi } = useDurum();
  // Sahada mühür: "Buradayım" ile eserin yanında basılan damgalar (yalnızca cihazda).
  const [muhurler] = useState(muhurleriOku);
  const [eserler, setEserler] = useState<Eser[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [secilenSehir, setSecilenSehir] = useState<string | null>(null);
  const [acikSayfa, setAcikSayfa] = useState<string | null>(null);
  const [ozetler, setOzetler] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let iptal = false;
    // Ders özeti çocuğa gösterilir; dersler gelmezse defter yine açılır.
    api
      .dersler()
      .then((dersler) => {
        if (!iptal) setOzetler(new Map(dersler.map((d) => [d.eserId, d.yansima.ozet])));
      })
      .catch(() => undefined);
    api
      .eserler()
      .then((liste) => {
        if (!iptal) setEserler(liste);
      })
      .catch((e: unknown) => {
        if (!iptal) setHata(e instanceof Error ? e.message : 'Eserler yüklenemedi');
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, []);

  const ogrenilen = useMemo(() => new Set(ilerleme.defterSayfalari), [ilerleme.defterSayfalari]);

  // Şehir sırası öğrenme yolundan; eser sırası yoldaki ders sırasından.
  const sehirler = useMemo(() => {
    const sira = yol?.sehirler.map((s) => ({ id: s.sehirId, ad: s.ad })) ?? [];
    const yolSirasi = new Map<string, number>();
    yol?.sehirler.forEach((s) =>
      s.uniteler.forEach((u) => u.dersler.forEach((d) => yolSirasi.set(d.eserId, yolSirasi.size))),
    );
    return sira.map((s) => {
      const liste = eserler
        .filter((e) => e.sehirId === s.id)
        .sort((a, b) => (yolSirasi.get(a.id) ?? 999) - (yolSirasi.get(b.id) ?? 999));
      return { ...s, eserler: liste, ogrenilen: liste.filter((e) => ogrenilen.has(e.id)).length };
    });
  }, [yol, eserler, ogrenilen]);

  const aktifSehirId = secilenSehir ?? sehirler.find((s) => s.ogrenilen > 0)?.id ?? sehirler[0]?.id ?? null;
  const aktifSehir = sehirler.find((s) => s.id === aktifSehirId) ?? null;
  const toplamOgrenilen = eserler.filter((e) => ogrenilen.has(e.id)).length;
  const acikEser = eserler.find((e) => e.id === acikSayfa && ogrenilen.has(e.id)) ?? null;

  // Bağlantılar: aynı baninin en az iki eseri öğrenildiyse
  const bagliBani = useMemo(() => {
    const gruplar = new Map<string, Eser[]>();
    for (const e of eserler) {
      if (!e.bani || !ogrenilen.has(e.id)) continue;
      gruplar.set(e.bani, [...(gruplar.get(e.bani) ?? []), e]);
    }
    return [...gruplar.entries()].filter(([, liste]) => liste.length > 1);
  }, [eserler, ogrenilen]);

  return (
    <div className="yigin" data-defter-tema={carsi.defterTemasi} style={{ gap: 'var(--b-4)' }}>
      <div className="defter-ust">
        <p className="metin-ikincil" style={{ margin: 0 }}>
          Öğrendiğin her eser deftere bir pul olur. Boş yerler seni bekliyor.
        </p>
        <span className="defter-sayac">
          {toplamOgrenilen}/{eserler.length} pul
        </span>
      </div>

      {yukleniyor && (
        <p className="metin-soluk" role="status">
          Defter açılıyor…
        </p>
      )}

      {hata && (
        <div className="bildirim bildirim--uyari" role="status">
          {hata}
        </div>
      )}

      {sehirler.length > 0 && (
        <div className="defter-sehirler" role="group" aria-label="Şehir seç">
          {sehirler.map((s) => (
            <button
              key={s.id}
              type="button"
              className="defter-sehir"
              aria-pressed={s.id === aktifSehirId}
              onClick={() => {
                setSecilenSehir(s.id);
                setAcikSayfa(null);
              }}
            >
              {s.ad} {s.ogrenilen}/{s.eserler.length}
            </button>
          ))}
        </div>
      )}

      {aktifSehir && (
        <section aria-labelledby="defter-sehir-basligi" className="yigin" style={{ gap: 'var(--b-3)' }}>
          <h2 id="defter-sehir-basligi" className="sr-only">
            {aktifSehir.ad} sayfaları
          </h2>
          <div
            className="ilerleme-cubugu defter-cubuk"
            role="progressbar"
            aria-label={`${aktifSehir.ad} defteri`}
            aria-valuemin={0}
            aria-valuemax={aktifSehir.eserler.length}
            aria-valuenow={aktifSehir.ogrenilen}
          >
            <div
              className="ilerleme-cubugu__dolgu"
              style={{
                width: `${aktifSehir.eserler.length ? (aktifSehir.ogrenilen / aktifSehir.eserler.length) * 100 : 0}%`,
              }}
            />
          </div>

          {aktifSehir.ogrenilen === 0 && (
            <p className="bildirim bildirim--bilgi" style={{ margin: 0 }}>
              Bu şehrin defteri henüz boş. Öğrenme yolundan bir ders bitir; eser burada renklenecek.
            </p>
          )}

          <ul className="defter-albumu">
            {aktifSehir.eserler.map((eser) => {
              const acik = ogrenilen.has(eser.id);
              return (
                <li key={eser.id}>
                  {acik ? (
                    <button
                      type="button"
                      className="defter-pul defter-pul--acik"
                      aria-expanded={acikSayfa === eser.id}
                      aria-controls="defter-sayfa-ayrinti"
                      onClick={() => setAcikSayfa(acikSayfa === eser.id ? null : eser.id)}
                    >
                      <span className="defter-pul__sarmal">
                        <span className="defter-pul__kagit">
                          <PulGorseli eserId={eser.id} tur={eser.tur} />
                        </span>
                        {muhurler[eser.id] ? (
                          <span className="muhur-damga" aria-hidden="true">
                            Orada bulundum
                          </span>
                        ) : null}
                      </span>
                      <span className="defter-pul__ad">
                        {kisaAd(eser.ad)}
                        {muhurler[eser.id] ? <span className="sr-only">, orada bulundun</span> : null}
                      </span>
                    </button>
                  ) : (
                    <div className="defter-pul defter-pul--kapali">
                      <span className="defter-pul__kagit" aria-hidden="true">
                        <span className="defter-pul__resim">
                          <IkonTur tur={eser.tur} boyut={24} />
                        </span>
                      </span>
                      <span className="defter-pul__ad">
                        <span aria-hidden="true">? </span>
                        {eser.tur}
                        <span className="sr-only">, henüz öğrenilmedi</span>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div id="defter-sayfa-ayrinti" aria-live="polite">
            {acikEser && (
              <article className="defter-sayfasi defter-sayfasi--acik">
                <div className="etiket">{acikEser.tur}</div>
                <h3 style={{ margin: 0, fontSize: 'var(--yazi-xl)' }}>{kisaAd(acikEser.ad)}</h3>
                {ozetler.get(acikEser.id) && <p style={{ margin: 0 }}>{ozetler.get(acikEser.id)}</p>}
                {/* Künye silinmedi, katlandı (YansimaAdimi ile aynı desen). */}
                <details className="ders-ayrinti">
                  <summary>Büyükler için: künye</summary>
                  <div className="ders-ayrinti__icerik">
                    <p>{acikEser.ad}</p>
                    {acikEser.bani && (
                      <p>
                        <strong>Yaptıran:</strong> {acikEser.bani}
                      </p>
                    )}
                    {acikEser.yapimYili && (
                      <p>
                        <strong>Yapım:</strong> {acikEser.yapimYili}
                      </p>
                    )}
                    {acikEser.vakfiyeAmaci && (
                      <p>
                        <strong>Neden yaptırıldı:</strong> {acikEser.vakfiyeAmaci}
                      </p>
                    )}
                    {arsivKaydiMetni(acikEser.arsivNo) && (
                      <p className="kaynak">Vakfiye/arşiv kaydı: {arsivKaydiMetni(acikEser.arsivNo)}</p>
                    )}
                    {acikEser.gelirDagilimiDurumu === 'belge-bulunamadi' && (
                      <p className="kaynak">Gelir dağılımı belgelenememiştir.</p>
                    )}
                  </div>
                </details>
              </article>
            )}
          </div>
        </section>
      )}

      {bagliBani.length > 0 && (
        <section aria-labelledby="defter-baglantilar" className="yigin" style={{ gap: 'var(--b-3)' }}>
          <h2 id="defter-baglantilar" className="bolum-basligi" style={{ marginBottom: 0 }}>
            Bağlantı bulundu
          </h2>
          {bagliBani.map(([bani, liste]) => (
            <div key={bani} className="kart defter-baglanti">
              <p style={{ margin: 0, fontWeight: 800 }}>{bani}</p>
              <p className="metin-ikincil" style={{ margin: 'var(--b-1) 0 0' }}>
                Aynı kişinin yaptırdığı {liste.length} eseri öğrendin:{' '}
                {liste.map((e) => kisaAd(e.ad)).join(', ')}.
              </p>
            </div>
          ))}
        </section>
      )}

    </div>
  );
}
