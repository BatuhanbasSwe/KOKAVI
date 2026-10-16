/**
 * Zaman tüneli — 57 ders eseri yapılış yılına göre, yüzyıl yüzyıl.
 *
 * Dönemler hanedan adıyla DEĞİL yüzyılla etiketlenir: "Selçuklu/Memlük" gibi
 * etiketler her eser için kaynakla doğrulanmadığından uydurma olurdu.
 * Kesin olmayan yıllar "~" ile ve metinle ("yaklaşık") işaretlenir.
 *
 * Keşfedilen (dersi bitmiş) eserler renkli ve derse bağlı; diğerleri silik.
 */
import { useMemo } from 'react';
import { useDurum } from '@/app/DurumSaglayici';
import { ESERLER, type GununEseri } from '../gunun-eseri/oyun';
import './zaman.css';

function yuzyil(yil: number): number {
  return Math.floor(yil / 100) * 100;
}

export function ZamanTuneliSayfasi() {
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

  const gruplar = useMemo(() => {
    const sirali = [...ESERLER].sort((a, b) => a.yil - b.yil || a.kisaAd.localeCompare(b.kisaAd, 'tr'));
    const m = new Map<number, GununEseri[]>();
    for (const e of sirali) {
      const y = yuzyil(e.yil);
      m.set(y, [...(m.get(y) ?? []), e]);
    }
    return [...m.entries()];
  }, []);

  const ilk = ESERLER.reduce((a, b) => (b.yil < a.yil ? b : a));
  const son = ESERLER.reduce((a, b) => (b.yil > a.yil ? b : a));
  let sayac = 0;

  return (
    <div className="yigin zt">
      <header>
        <p className="etiket">Pratik · Zaman tüneli</p>
        <h1 className="zt__baslik">Yüzyıllar boyunca vakıf eserleri</h1>
        <p className="metin-ikincil">
          {ilk.yil} ile {son.yil} arası: {ESERLER.length} eser, yapıldıkları sırayla. Keşfettiğin{' '}
          {kesfedilen.size} eser renkli. “~” işareti yılın yaklaşık olduğunu gösterir.
        </p>
      </header>

      {gruplar.map(([yy, eserler]) => (
        <section key={yy} className="zt-yuzyil" aria-labelledby={`zt-${yy}`}>
          <h2 id={`zt-${yy}`} className="zt-yuzyil__baslik">
            {yy}'ler
          </h2>
          <ol className="zt-liste">
            {eserler.map((e) => {
              const acik = kesfedilen.has(e.eserId);
              const dersId = dersler.get(e.eserId);
              const yon = sayac++ % 2 === 0 ? 'sol' : 'sag';
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
                      {!acik && <span className="zt-kart__kilit"> · keşfedilmedi</span>}
                    </span>
                  </span>
                </>
              );
              return (
                <li
                  key={e.eserId}
                  className={`zt-oge zt-oge--${yon}${acik ? ' zt-oge--acik' : ''}`}
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
