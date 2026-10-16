/**
 * Seri takvimi — Duolingo'daki alevli takvim.
 *
 * CEZA YOK: Seri kırılınca suçlayıcı dil yok ("Yeni bir seri için bir ders
 * yeter"). Bugün ders yapılmadıysa yalnızca olumlu bir davet gösterilir.
 * Durum her hücrede METİNLE de söylenir (renk + alev tek başına anlam taşımaz).
 */
import { useMemo, useState } from 'react';
import { useDurum } from '@/app/DurumSaglayici';
import { IkonAlev } from '@/app/Ikonlar';
import { gunMetni } from '@/lib/tekrar';
import { AYLAR, GUN_KISA, GUN_UZUN, aktifGunler, ayHaftalari, enUzunSeri, haftaGunleri } from './seriTakvimi';
import './seri.css';

function gunAdi(gun: string): string {
  const [, a, g] = gun.split('-').map(Number) as [number, number, number];
  return `${g} ${AYLAR[a - 1]}`;
}

function useSeri() {
  const { ilerleme } = useDurum();
  const bugun = gunMetni(new Date());
  // ilerleme değişince (ders bitince) yeniden okunur.
  const gunler = useMemo(() => aktifGunler(ilerleme.seri), [ilerleme]);
  return { bugun, gunler, seri: ilerleme.seri.gunSayisi, bugunYapildi: gunler.has(bugun) };
}

function davet(seri: number, bugunYapildi: boolean): string {
  if (bugunYapildi) return seri > 1 ? `Harika! ${seri} gündür her gün keşfediyorsun.` : 'Bugünün dersi tamam!';
  if (seri > 0) return `Bugün bir ders yaparsan serin ${seri + 1} gün olur!`;
  return 'Yeni bir seri başlatmak için bir ders yeter.';
}

/** Öğrenme yolundaki "bu hafta" şeridi. */
export function SeriSeridi() {
  const { bugun, gunler, seri, bugunYapildi } = useSeri();
  const hafta = haftaGunleri(bugun);
  return (
    <section className="kart seri-serit" aria-labelledby="seri-serit-baslik">
      <div className="seri-serit__ust">
        <h2 id="seri-serit-baslik" className="seri-serit__baslik">
          <IkonAlev boyut={20} className="seri-alev" />
          {seri} günlük seri
        </h2>
        <a className="seri-serit__bag" href="#/seri">
          Takvim
        </a>
      </div>
      <ol className="seri-hafta">
        {hafta.map((g, i) => {
          const aktif = gunler.has(g);
          const bugunMu = g === bugun;
          return (
            <li
              key={g}
              className={`seri-gun${aktif ? ' seri-gun--aktif' : ''}${bugunMu ? ' seri-gun--bugun' : ''}`}
              style={{ ['--sira' as string]: i }}
            >
              <span className="seri-gun__ad" aria-hidden="true">
                {GUN_KISA[i]}
              </span>
              <span className="seri-gun__isaret" aria-hidden="true">
                {aktif ? <IkonAlev boyut={18} className="seri-alev" /> : bugunMu ? '•' : ''}
              </span>
              <span className="sr-only">
                {GUN_UZUN[i]}
                {bugunMu ? ' (bugün)' : ''}: {aktif ? 'ders yapıldı' : 'ders yok'}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="seri-serit__davet">{davet(seri, bugunYapildi)}</p>
    </section>
  );
}

/** `#/seri`: iki aylık takvim + istatistik. */
export function SeriSayfasi() {
  const { bugun, gunler, seri, bugunYapildi } = useSeri();
  const [y, a] = bugun.split('-').map(Number) as [number, number];
  const [ofset, setOfset] = useState(0);
  const ay = (((a - 1 + ofset) % 12) + 12) % 12;
  const yil = y + Math.floor((a - 1 + ofset) / 12);
  const haftalar = ayHaftalari(yil, ay);
  const buAy = haftalar.flat().filter((g): g is string => !!g && gunler.has(g)).length;

  return (
    <div className="yigin seri-sayfa">
      <header>
        <p className="etiket">Keşif serisi</p>
        <h1 className="seri-sayfa__baslik">
          <IkonAlev boyut={28} className="seri-alev" />
          {seri} günlük seri
        </h1>
        <p className="metin-ikincil">{davet(seri, bugunYapildi)}</p>
      </header>

      <dl className="seri-istatistik">
        <div>
          <dt>Şu anki seri</dt>
          <dd>{seri}</dd>
        </div>
        <div>
          <dt>En uzun seri</dt>
          <dd>{Math.max(seri, enUzunSeri(gunler))}</dd>
        </div>
        <div>
          <dt>Ders yapılan gün</dt>
          <dd>{gunler.size}</dd>
        </div>
      </dl>

      <section className="kart seri-ay" aria-labelledby="seri-ay-baslik">
        <div className="seri-ay__ust">
          <button
            type="button"
            className="seri-ay__ok"
            aria-label="Önceki ay"
            onClick={() => setOfset((o) => o - 1)}
          >
            ‹
          </button>
          <h2 id="seri-ay-baslik" className="seri-ay__baslik" aria-live="polite">
            {AYLAR[ay]} {yil}
          </h2>
          <button
            type="button"
            className="seri-ay__ok"
            aria-label="Sonraki ay"
            onClick={() => setOfset((o) => o + 1)}
            disabled={ofset >= 0}
          >
            ›
          </button>
        </div>
        <table className="seri-tablo">
          <caption className="sr-only">
            {AYLAR[ay]} {yil}: {buAy} gün ders yapıldı
          </caption>
          <thead>
            <tr>
              {GUN_KISA.map((g, i) => (
                <th key={g} scope="col" abbr={GUN_UZUN[i]}>
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {haftalar.map((h, i) => (
              <tr key={i}>
                {h.map((g, j) =>
                  g ? (
                    <td
                      key={g}
                      className={`seri-hucre${gunler.has(g) ? ' seri-hucre--aktif' : ''}${g === bugun ? ' seri-hucre--bugun' : ''}`}
                    >
                      <span aria-hidden="true">
                        {gunler.has(g) ? <IkonAlev boyut={18} className="seri-alev" /> : Number(g.slice(-2))}
                      </span>
                      <span className="sr-only">
                        {gunAdi(g)}
                        {g === bugun ? ', bugün' : ''}: {gunler.has(g) ? 'ders yapıldı' : 'ders yok'}
                      </span>
                    </td>
                  ) : (
                    <td key={`b${j}`} aria-hidden="true" />
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="metin-soluk">
        Takvim yalnızca bu cihazda tutulur. Seri kırılırsa hiçbir şey kaybetmezsin; yeni bir seri
        bir dersle başlar.
      </p>
    </div>
  );
}
