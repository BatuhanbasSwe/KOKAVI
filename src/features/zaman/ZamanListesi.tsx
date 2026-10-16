/**
 * Eserlerin yıl sırasıyla listesi — iki yerde kullanılır:
 *   · `tunel`: Pratik → Zaman tüneli (gezinme)
 *   · `yol`:   Öğrenme Yolu → "Zamana göre" sekmesi (dersler tarih sırasıyla;
 *              sıradaki ders "BAŞLA" ile işaretli)
 *
 * İlerleme ortaktır: hangi sırayla öğrenilirse öğrenilsin, biten ders iki
 * görünümde de bitmiş görünür. Zaman görünümünde kilit yoktur; yalnızca
 * önerilen sıradaki ders vurgulanır.
 *
 * Dönemler hanedan adıyla DEĞİL yüzyılla etiketlenir (kaynakla doğrulanmayan
 * "Selçuklu/Memlük" etiketi uydurma olurdu). Yaklaşık yıllar "~" + metin.
 */
import { useMemo } from 'react';
import { useDurum } from '@/app/DurumSaglayici';
import { ESERLER, type GununEseri } from '../gunun-eseri/oyun';
import './zaman.css';

export function ZamanListesi({ mod }: { mod: 'tunel' | 'yol' }) {
  const { yol } = useDurum();

  const { dersler, kesfedilen } = useMemo(() => {
    const d = new Map<string, string>();
    const k = new Set<string>();
    for (const s of yol?.sehirler ?? [])
      for (const u of s.uniteler)
        for (const ders of u.dersler) {
          d.set(ders.eserId, ders.dersId);
          if (ders.tamamlandi) k.add(ders.eserId);
        }
    return { dersler: d, kesfedilen: k };
  }, [yol]);

  const sirali = useMemo(
    () => [...ESERLER].sort((a, b) => a.yil - b.yil || a.kisaAd.localeCompare(b.kisaAd, 'tr')),
    [],
  );
  const gruplar = useMemo(() => {
    const m = new Map<number, GununEseri[]>();
    for (const e of sirali) {
      const y = Math.floor(e.yil / 100) * 100;
      m.set(y, [...(m.get(y) ?? []), e]);
    }
    return [...m.entries()];
  }, [sirali]);

  // Zaman sırasında ilk bitmemiş (ve dersi olan) eser: önerilen sıradaki ders.
  const siradaki = mod === 'yol' ? sirali.find((e) => dersler.has(e.eserId) && !kesfedilen.has(e.eserId)) : undefined;
  let sayac = 0;

  return (
    <div className="yigin zt">
      {mod === 'yol' && (
        <div className="kart zt-siradaki" role="status">
          {siradaki ? (
            <>
              <span className="zt-siradaki__etiket">Zamanda sıradaki durak</span>
              <span className="zt-siradaki__ad">
                {siradaki.yaklasik ? '~' : ''}
                {siradaki.yil} · {siradaki.kisaAd}
              </span>
              <a className="dugme" href={`#/ders/${dersler.get(siradaki.eserId)}`}>
                Derse başla
              </a>
            </>
          ) : (
            <span className="zt-siradaki__ad">Zaman yolculuğunu tamamladın! Bütün yüzyılları gezdin.</span>
          )}
        </div>
      )}

      {gruplar.map(([yy, eserler]) => (
        <section key={yy} className="zt-yuzyil" aria-labelledby={`zt-${mod}-${yy}`}>
          <h2 id={`zt-${mod}-${yy}`} className="zt-yuzyil__baslik">
            {yy}'ler
          </h2>
          <ol className="zt-liste">
            {eserler.map((e) => {
              const acik = kesfedilen.has(e.eserId);
              const dersId = dersler.get(e.eserId);
              const yon = sayac++ % 2 === 0 ? 'sol' : 'sag';
              const siradakiMi = siradaki?.eserId === e.eserId;
              const icerik = (
                <>
                  <img className="zt-kart__foto" src={`/gorseller/${e.eserId}/k.webp`} alt="" loading="lazy" />
                  <span className="zt-kart__metin">
                    <span className="zt-kart__yil">
                      {e.yaklasik ? '~' : ''}
                      {e.yil}
                      {e.yaklasik && <span className="sr-only"> (yaklaşık)</span>}
                    </span>
                    <span className="zt-kart__ad">{e.kisaAd}</span>
                    <span className="zt-kart__alt">
                      {e.sehir} · {e.kategori}
                      {siradakiMi ? (
                        <span className="zt-kart__siradaki"> · sıradaki ders</span>
                      ) : !acik ? (
                        <span className="zt-kart__kilit"> · {mod === 'yol' ? 'henüz öğrenilmedi' : 'keşfedilmedi'}</span>
                      ) : (
                        <span className="sr-only"> · öğrenildi</span>
                      )}
                    </span>
                  </span>
                  {siradakiMi && (
                    <span className="zt-kart__basla" aria-hidden="true">
                      BAŞLA
                    </span>
                  )}
                </>
              );
              return (
                <li
                  key={e.eserId}
                  className={`zt-oge zt-oge--${yon}${acik ? ' zt-oge--acik' : ''}${siradakiMi ? ' zt-oge--siradaki' : ''}`}
                  style={{ ['--sira' as string]: sayac % 8 }}
                >
                  <span className="zt-oge__nokta" aria-hidden="true" />
                  {dersId ? (
                    <a className="zt-kart" href={`#/ders/${dersId}`}>
                      {icerik}
                    </a>
                  ) : (
                    <span className="zt-kart">{icerik}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
