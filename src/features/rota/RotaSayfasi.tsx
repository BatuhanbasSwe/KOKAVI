/**
 * Keşif rotası: okul gezisi ya da aile yürüyüşü için ilçedeki eserlerin sırası.
 *
 * Gerçek sokak haritası (MapLibre + OpenFreeMap) üzerinde numaralı duraklar.
 * Birbirinden uzak durak grupları ayrı yürüyüş bölümlerine ayrılır (arada
 * araçla geçilir); her bacak için OpenStreetMap yaya yol tarifi bağlantısı var.
 * "Gördüm" işaretleri yalnızca bu cihazda tutulur. Liste, haritanın
 * erişilebilir karşılığıdır: her bilgi metinle de yazılır.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Eser } from '@shared/types';
import { api } from '@/lib/api';
import { IkonOk, IkonTik, IkonTur } from '@/app/Ikonlar';
import { mesafe, mesafeMetni, rotaBol, rotaSirala, toplamMesafe, yolTarifiAdresi, yurumeDakika } from './rota';
import type { RotaHaritasi } from './rotaHaritasi';
import { BuradayimDugmesi } from '../muhur/BuradayimDugmesi';
import 'maplibre-gl/dist/maplibre-gl.css';
import './rota.css';

interface Durak {
  id: string;
  ad: string;
  tur: string;
  lat: number;
  lng: number;
  yaklasik: boolean;
}

const SEHIR_ADI: Record<string, string> = { bursa: 'Bursa', konya: 'Konya', hatay: 'Hatay' };
const GORULEN_ANAHTARI = 'kokavi-rota-gorulen';

function ilceAdi(ilce: string | null): string | null {
  const ad = ilce?.split('(')[0]?.trim();
  return ad ? ad : null;
}

function hashIlce(): string {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  return q.get('ilce') ?? '';
}

function gorulenOku(ilce: string): Set<string> {
  try {
    const kayit = JSON.parse(localStorage.getItem(GORULEN_ANAHTARI) ?? '{}') as Record<string, string[]>;
    return new Set(kayit[ilce] ?? []);
  } catch {
    return new Set();
  }
}

function gorulenYaz(ilce: string, g: Set<string>): void {
  try {
    const kayit = JSON.parse(localStorage.getItem(GORULEN_ANAHTARI) ?? '{}') as Record<string, string[]>;
    kayit[ilce] = [...g];
    localStorage.setItem(GORULEN_ANAHTARI, JSON.stringify(kayit));
  } catch {
    /* depolama kapalıysa işaretler yalnızca bu ziyarette kalır */
  }
}

function DurakFoto({ id, tur }: { id: string; tur: string }) {
  const [yok, setYok] = useState(false);
  return (
    <span className="rota-durak__foto" aria-hidden="true">
      {yok ? (
        <IkonTur tur={tur} boyut={22} />
      ) : (
        <img src={`/gorseller/${id}/k.webp`} alt="" loading="lazy" decoding="async" onError={() => setYok(true)} />
      )}
    </span>
  );
}

export function RotaSayfasi() {
  const [eserler, setEserler] = useState<Eser[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [secim, setSecim] = useState(hashIlce);
  const [gorulen, setGorulen] = useState<Set<string>>(() => gorulenOku(hashIlce()));
  const [bolumNo, setBolumNo] = useState<number | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  const haritaKabi = useRef<HTMLDivElement>(null);
  const haritaRef = useRef<RotaHaritasi | null>(null);

  useEffect(() => {
    let iptal = false;
    api
      .eserler()
      .then((l) => !iptal && setEserler(l))
      .catch((e: Error) => !iptal && setHata(e.message));
    return () => {
      iptal = true;
    };
  }, []);

  // İlçe → duraklar (konumu bilinen eserler). En az 2 eser olan ilçeler seçilebilir.
  const ilceler = useMemo(() => {
    const m = new Map<string, Durak[]>();
    for (const e of eserler ?? []) {
      const ilce = ilceAdi(e.ilce);
      if (!ilce || !e.koordinat) continue;
      const anahtar = `${e.sehirId}|${ilce}`;
      m.set(anahtar, [
        ...(m.get(anahtar) ?? []),
        {
          id: e.id,
          ad: e.ad.split(' (')[0] ?? e.ad,
          tur: e.tur,
          lat: e.koordinat.lat,
          lng: e.koordinat.lng,
          yaklasik: (e.kaynaklar ?? []).some((k) => k.kunye.includes('YAKLAŞIK')),
        },
      ]);
    }
    return [...m.entries()].filter(([, d]) => d.length >= 2).sort((a, b) => b[1].length - a[1].length);
  }, [eserler]);

  const seciliIlce = ilceler.find(([k]) => k === secim) ?? null;
  const rota = useMemo(() => (seciliIlce ? rotaSirala(seciliIlce[1]) : []), [seciliIlce]);
  const bolumler = useMemo(() => rotaBol(rota), [rota]);
  const toplam = toplamMesafe(rota);
  const yuruyus = bolumler.reduce((t, b) => t + b.mesafe, 0);
  const [sehirId, ilce] = secim.split('|');
  const gosterilen = bolumNo === null ? bolumler : bolumler.filter((_, i) => i === bolumNo);
  const siradaki = rota.find((d) => !gorulen.has(d.id)) ?? null;

  // Harita: ilçe değişince yeniden kurulur. WebGL yoksa (eski cihaz, test) liste yeter.
  useEffect(() => {
    if (rota.length < 2 || !haritaKabi.current) return;
    let iptal = false;
    let h: RotaHaritasi | null = null;
    void (async () => {
      try {
        const [maplibre, modul] = await Promise.all([import('maplibre-gl'), import('./rotaHaritasi')]);
        if (iptal || !haritaKabi.current) return;
        const stil = getComputedStyle(document.documentElement);
        h = modul.rotaHaritasiKur(
          maplibre,
          haritaKabi.current,
          rota,
          (ad, yedek) => stil.getPropertyValue(ad).trim() || yedek,
          (id) => {
            setSecili(id);
            document.getElementById(`durak-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          },
        );
        haritaRef.current = h;
      } catch {
        haritaRef.current = null;
      }
    })();
    return () => {
      iptal = true;
      h?.temizle();
      haritaRef.current = null;
    };
  }, [rota]);

  useEffect(() => {
    haritaRef.current?.guncelle({ gorulen, secili });
  }, [gorulen, secili]);

  function ilceSec(k: string) {
    setSecim(k);
    setGorulen(gorulenOku(k));
    setBolumNo(null);
    setSecili(null);
    try {
      window.history.replaceState(null, '', k ? `#/rota?ilce=${k}` : '#/rota');
    } catch {
      /* adres güncellenemezse seçim yine çalışır */
    }
  }

  function bolumSec(i: number | null) {
    setBolumNo(i);
    setSecili(null);
    haritaRef.current?.guncelle({ gorulen, secili: null, odak: i === null ? rota : bolumler[i]!.duraklar });
  }

  function haritadaGoster(d: Durak) {
    setSecili(d.id);
    haritaRef.current?.guncelle({ gorulen, secili: d.id, odak: [d] });
    haritaKabi.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function gordumDegistir(id: string) {
    setGorulen((g) => {
      const y = new Set(g);
      if (y.has(id)) y.delete(id);
      else y.add(id);
      gorulenYaz(secim, y);
      return y;
    });
  }

  return (
    <div className="yigin rota">
      <header className="rota-ust">
        <h1>Bir ilçeyi yürüyerek keşfet</h1>
        <p className="metin-ikincil">
          Okul gezisi ya da aile yürüyüşü için: ilçeyi seç, eserler gezi sırasına dizilsin.
        </p>
      </header>

      {hata && <p className="bildirim bildirim--uyari" role="status">{hata}</p>}
      {!eserler && !hata && <p role="status">Eserler yükleniyor…</p>}

      {ilceler.length > 0 && (
        <div className="rota-secim">
          <label className="rota-etiket" htmlFor="rota-ilce">
            İlçe
          </label>
          <select id="rota-ilce" className="rota-secim__kutu" value={secim} onChange={(o) => ilceSec(o.target.value)}>
            <option value="">İlçe seç…</option>
            {ilceler.map(([k, d]) => {
              const [s, i] = k.split('|');
              return (
                <option key={k} value={k}>
                  {i} ({SEHIR_ADI[s!] ?? s}) · {d.length} eser
                </option>
              );
            })}
          </select>
        </div>
      )}

      {seciliIlce && (
        <>
          <section className="rota-ozet" aria-labelledby="rota-baslik">
            <h2 id="rota-baslik" className="rota-ozet__baslik">
              {ilce}, {SEHIR_ADI[sehirId!] ?? sehirId}: {rota.length} durak
            </h2>
            <dl className="rota-sayilar">
              <div>
                <dt>Yürüyüş</dt>
                <dd>{mesafeMetni(yuruyus)}</dd>
              </div>
              <div>
                <dt>Süre</dt>
                <dd>~{yurumeDakika(yuruyus)} dk</dd>
              </div>
              <div>
                <dt>Görülen</dt>
                <dd>
                  {gorulen.size}/{rota.length}
                </dd>
              </div>
            </dl>
            <div
              className="rota-ilerleme"
              role="progressbar"
              aria-label="Görülen duraklar"
              aria-valuemin={0}
              aria-valuemax={rota.length}
              aria-valuenow={gorulen.size}
            >
              <span style={{ width: `${rota.length ? (gorulen.size / rota.length) * 100 : 0}%` }} />
            </div>
            <p className="rota-ozet__metin metin-ikincil">
              {siradaki ? (
                <>
                  Sıradaki durak: <strong>{rota.indexOf(siradaki) + 1}. {siradaki.ad}</strong>
                </>
              ) : (
                <>Bütün durakları gördün. Harika bir gezi!</>
              )}
              {bolumler.length > 1 &&
                ` · Rota ${bolumler.length} yürüyüş bölümüne ayrıldı; aralarda toplam ${mesafeMetni(toplam - yuruyus)} araçla geçilir.`}
            </p>
          </section>

          {bolumler.length > 1 && (
            <div className="rota-bolumler" role="group" aria-label="Bölüm seç">
              <button type="button" className="rota-bolum" aria-pressed={bolumNo === null} onClick={() => bolumSec(null)}>
                Hepsi
              </button>
              {bolumler.map((b, i) => (
                <button
                  key={b.bas}
                  type="button"
                  className="rota-bolum"
                  aria-pressed={bolumNo === i}
                  onClick={() => bolumSec(i)}
                >
                  Bölüm {i + 1}
                  <span className="rota-bolum__alt">
                    {b.duraklar.length === 1 ? `${b.bas + 1}. durak` : `${b.bas + 1}-${b.bas + b.duraklar.length}. duraklar`}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div
            ref={haritaKabi}
            className="rota-harita"
            role="region"
            aria-label={`${ilce} rota haritası; duraklar aşağıdaki listede de yazılı`}
          />

          {gosterilen.map((b) => {
            const i = bolumler.indexOf(b);
            return (
              <section key={b.bas} className="rota-bolum-govde" aria-labelledby={`rota-bolum-${i}`}>
                {i > 0 && (
                  <p className="rota-arac">
                    Önceki bölümden yaklaşık {mesafeMetni(b.oncekindenUzaklik)} uzakta: bu aralığı toplu taşıma ya da
                    araçla geç.
                  </p>
                )}
                {bolumler.length > 1 && (
                  <h3 id={`rota-bolum-${i}`} className="rota-bolum-govde__baslik">
                    Bölüm {i + 1}
                    <span className="metin-soluk">
                      {' '}
                      · {b.duraklar.length} durak
                      {b.duraklar.length > 1 ? ` · ${mesafeMetni(b.mesafe)} · ~${yurumeDakika(b.mesafe)} dk yürüyüş` : ''}
                    </span>
                  </h3>
                )}
                <ol className="rota-liste" start={b.bas + 1}>
                  {b.duraklar.map((d, j) => {
                    const no = b.bas + j + 1;
                    const sonraki = b.duraklar[j + 1];
                    const gordu = gorulen.has(d.id);
                    return (
                      <li
                        key={d.id}
                        id={`durak-${d.id}`}
                        className={`rota-durak${gordu ? ' rota-durak--goruldu' : ''}${secili === d.id ? ' rota-durak--secili' : ''}`}
                      >
                        <div className="rota-durak__kart">
                          <span className="rota-durak__no" aria-hidden="true">
                            {gordu ? <IkonTik boyut={16} /> : no}
                          </span>
                          <DurakFoto id={d.id} tur={d.tur} />
                          <div className="rota-durak__govde">
                            <span className="rota-durak__ad">
                              <span className="sr-only">{no}. durak: </span>
                              {d.ad}
                            </span>
                            <span className="rota-durak__alt">
                              {d.tur}
                              {d.yaklasik ? ' · konum yaklaşık' : ''}
                            </span>
                            <button type="button" className="rota-durak__goster" onClick={() => haritadaGoster(d)}>
                              Haritada göster<span className="sr-only">: {d.ad}</span>
                            </button>
                            <BuradayimDugmesi
                              eserId={d.id}
                              eserAd={d.ad}
                              koordinat={{ lat: d.lat, lng: d.lng }}
                              yaklasik={d.yaklasik}
                            />
                          </div>
                          <label className="rota-durak__gordum">
                            <input type="checkbox" checked={gordu} onChange={() => gordumDegistir(d.id)} />
                            <span>Gördüm</span>
                          </label>
                        </div>
                        {sonraki && (
                          <p className="rota-durak__ara">
                            <span>
                              Sonraki durağa {mesafeMetni(mesafe(d, sonraki))} (~{yurumeDakika(mesafe(d, sonraki))} dk)
                            </span>
                            <a
                              href={yolTarifiAdresi(d, sonraki)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rota-durak__tarif"
                            >
                              Yol tarifi
                              <IkonOk boyut={14} />
                              <span className="sr-only">
                                : {d.ad} → {sonraki.ad} (OpenStreetMap, yeni sekmede açılır)
                              </span>
                            </a>
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}

          <div className="satir rota-eylem">
            <button type="button" className="dugme" onClick={() => window.print()}>
              Rotayı yazdır
            </button>
            <a className="dugme dugme--ikincil" href="#/harita">
              Haritaya dön
            </a>
          </div>
          <p className="metin-soluk rota-not">
            Mesafeler kuş uçuşudur; gerçek yürüyüş yolu sokaklara göre daha uzun olabilir. Yürüme süresi
            sokak payıyla (×1,3) tahmindir; gerçek yol için "Yol tarifi" bağlantısını kullan. Gezide bir
            yetişkinle olun ve trafiğe dikkat edin. Harita ve konumlar: © OpenStreetMap katkıcıları.
          </p>
        </>
      )}
    </div>
  );
}
