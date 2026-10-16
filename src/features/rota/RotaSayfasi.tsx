/**
 * Keşif rotası — okul gezisi ya da aile yürüyüşü için ilçedeki eserlerin sırası.
 *
 * Ekranda bir şema (gerçek harita değil: noktaların birbirine göre konumu) +
 * yazdırılabilir liste. "Gördüm" işaretleri yalnızca bu ekranda tutulur.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Eser } from '@shared/types';
import { api } from '@/lib/api';
import { mesafe, mesafeMetni, rotaSirala, toplamMesafe, yurumeDakika } from './rota';
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

function ilceAdi(ilce: string | null): string | null {
  const ad = ilce?.split('(')[0]?.trim();
  return ad ? ad : null;
}

function hashIlce(): string {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  return q.get('ilce') ?? '';
}

export function RotaSayfasi() {
  const [eserler, setEserler] = useState<Eser[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [secim, setSecim] = useState(hashIlce);
  const [gorulen, setGorulen] = useState<Set<string>>(new Set());

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

  const secili = ilceler.find(([k]) => k === secim) ?? null;
  const rota = useMemo(() => (secili ? rotaSirala(secili[1]) : []), [secili]);
  const toplam = toplamMesafe(rota);
  const [sehirId, ilce] = secim.split('|');

  return (
    <div className="yigin rota">
      <header className="rota-ust">
        <p className="etiket">Keşif rotası</p>
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
          <select
            id="rota-ilce"
            className="rota-secim__kutu"
            value={secim}
            onChange={(o) => {
              setSecim(o.target.value);
              setGorulen(new Set());
            }}
          >
            <option value="">İlçe seç…</option>
            {ilceler.map(([k, d]) => {
              const [s, i] = k.split('|');
              return (
                <option key={k} value={k}>
                  {i} ({SEHIR_ADI[s!] ?? s}) — {d.length} eser
                </option>
              );
            })}
          </select>
        </div>
      )}

      {secili && (
        <>
          <section className="kart rota-ozet" aria-labelledby="rota-baslik">
            <h2 id="rota-baslik" className="rota-ozet__baslik">
              {ilce}, {SEHIR_ADI[sehirId!] ?? sehirId}: {rota.length} durak
            </h2>
            <p className="rota-ozet__metin">
              Toplam yaklaşık <strong>{mesafeMetni(toplam)}</strong> kuş uçuşu · yürüyerek ~
              {yurumeDakika(toplam)} dakika (duraklarda geçen süre hariç)
            </p>
            {yurumeDakika(toplam) > 90 && (
              <p className="bildirim bildirim--bilgi rota-ozet__uzun">
                Uzun bir rota! İki güne bölebilirsin: 1–{Math.ceil(rota.length / 2)}. duraklar bir gün,{' '}
                {Math.ceil(rota.length / 2) + 1}–{rota.length}. duraklar başka bir gün.
              </p>
            )}
            <RotaSemasi rota={rota} gorulen={gorulen} />
          </section>

          <ol className="rota-liste">
            {rota.map((d, i) => {
              const sonraki = rota[i + 1];
              const gordu = gorulen.has(d.id);
              return (
                <li key={d.id} className={`rota-durak${gordu ? ' rota-durak--goruldu' : ''}`}>
                  <span className="rota-durak__no" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="rota-durak__govde">
                    <span className="rota-durak__ad">
                      <span className="sr-only">{i + 1}. durak: </span>
                      {d.ad}
                    </span>
                    <span className="rota-durak__alt">
                      {d.tur}
                      {d.yaklasik ? ' · konum yaklaşık' : ''}
                    </span>
                    {sonraki && (
                      <span className="rota-durak__ara">
                        <span aria-hidden="true">↓ </span>
                        Sonraki durağa {mesafeMetni(mesafe(d, sonraki))} (~{yurumeDakika(mesafe(d, sonraki))} dk)
                      </span>
                    )}
                  </div>
                  <label className="rota-durak__gordum">
                    <input
                      type="checkbox"
                      checked={gordu}
                      onChange={() =>
                        setGorulen((g) => {
                          const y = new Set(g);
                          if (y.has(d.id)) y.delete(d.id);
                          else y.add(d.id);
                          return y;
                        })
                      }
                    />
                    <span>Gördüm</span>
                  </label>
                </li>
              );
            })}
          </ol>

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
            sokak payıyla (×1,3) tahmindir. Gezide bir yetişkinle olun ve trafiğe dikkat edin.
            Konumlar: © OpenStreetMap katkıcıları.
          </p>
        </>
      )}
    </div>
  );
}

/** Noktaların birbirine göre konumunu gösteren şema (harita değil). */
function RotaSemasi({ rota, gorulen }: { rota: Durak[]; gorulen: Set<string> }) {
  if (rota.length < 2) return null;
  const G = 320;
  const H = 200;
  const P = 22;
  const xs = rota.map((d) => d.lng);
  const ys = rota.map((d) => d.lat);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // Enlemde boylam daralır: oranı koru.
  const kx = Math.cos(((y0 + y1) / 2) * (Math.PI / 180));
  const gen = Math.max((x1 - x0) * kx, 1e-6);
  const yuk = Math.max(y1 - y0, 1e-6);
  const olcek = Math.min((G - 2 * P) / gen, (H - 2 * P) / yuk);
  const nokta = (d: Durak) => [
    P + ((d.lng - x0) * kx * olcek) + ((G - 2 * P) - gen * olcek) / 2,
    H - P - (d.lat - y0) * olcek - ((H - 2 * P) - yuk * olcek) / 2,
  ];
  const yol = rota.map((d, i) => `${i ? 'L' : 'M'}${nokta(d).join(' ')}`).join(' ');
  return (
    <svg className="rota-sema" viewBox={`0 0 ${G} ${H}`} aria-hidden="true" focusable="false">
      <path className="rota-sema__yol" d={yol} />
      {rota.map((d, i) => {
        const [x, y] = nokta(d);
        return (
          <g key={d.id} className={gorulen.has(d.id) ? 'rota-sema__nokta rota-sema__nokta--goruldu' : 'rota-sema__nokta'}>
            <circle cx={x} cy={y} r="10" />
            <text x={x} y={y! + 4} textAnchor="middle">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
