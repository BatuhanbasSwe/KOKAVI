/**
 * 04 · GERİ ÇAĞIRMA — "Eşleştir" egzersizi.
 *
 * PDF: "Eşleştir" görev tipi (örn. "Hayrat mı, akar mı?").
 *
 * ETKİLEŞİM KARARI: Sürükle-bırak YOK. "Öğeyi seç → kategorisine dokun" akışı
 * klavye, dokunmatik ve ekran okuyucu ile aynı şekilde çalışır.
 *
 * PDF: "Yanlış → ipucu + tekrar turu" — yanlış deneme ilerlemeyi durdurmaz,
 * öğe yerinde kalır ve çocuk hemen başka bir kategori deneyebilir.
 */
import { useMemo, useState } from 'react';
import type { EslestirVerisi } from '@shared/types';
import {
  EgzersizKabugu,
  type EgzersizOrtakProps,
  type GeriBildirimVerisi,
} from './EgzersizKabugu';
import { karistir } from './yardimci';

export function EslestirEgzersizi({ veri, kaynak, onBitti }: EgzersizOrtakProps<EslestirVerisi>) {
  const ogeler = useMemo(() => karistir(veri.ogeler), [veri.ogeler]);
  const [secili, setSecili] = useState<number | null>(null);
  const [yerlesen, setYerlesen] = useState<Record<number, string>>({});
  const [denemeler, setDenemeler] = useState<Record<number, number>>({});
  const [geriBildirim, setGeriBildirim] = useState<GeriBildirimVerisi | null>(null);

  const toplam = ogeler.length;
  const yerlesenSayi = Object.keys(yerlesen).length;
  const cozuldu = toplam > 0 && yerlesenSayi === toplam;

  function kategoriSec(kategoriId: string) {
    const kategori = veri.kategoriler.find((k) => k.id === kategoriId);
    if (!kategori || secili === null) {
      setGeriBildirim({
        tur: 'ipucu',
        baslik: 'Önce bir öğe seç',
        metin: 'Soldaki öğelerden birine dokun, sonra gitmesi gereken kategoriyi seç.',
      });
      return;
    }

    const oge = ogeler[secili];

    if (oge.kategoriId === kategoriId) {
      const yeniYerlesen = { ...yerlesen, [secili]: kategoriId };
      const kalan = toplam - Object.keys(yeniYerlesen).length;
      setYerlesen(yeniYerlesen);
      setSecili(null);
      setGeriBildirim(
        kalan === 0
          ? {
              tur: 'dogru',
              baslik: 'Hepsi yerleşti!',
              metin: `${toplam} öğenin tamamını doğru kategorilere koydun.`,
            }
          : {
              tur: 'dogru',
              baslik: 'Doğru!',
              metin: `«${oge.metin}» → ${kategori.ad}. Kalan öğe: ${kalan}.`,
            },
      );
      return;
    }

    // Yanlış deneme: öğe seçili kalır, ipucu gösterilir, tekrar denenebilir.
    const deneme = (denemeler[secili] ?? 0) + 1;
    setDenemeler({ ...denemeler, [secili]: deneme });

    const dogruKategori = veri.kategoriler.find((k) => k.id === oge.kategoriId);
    const aciklama = dogruKategori?.aciklama;

    setGeriBildirim({
      tur: 'ipucu',
      baslik: 'Bu kategori olmadı',
      metin:
        deneme >= 2 || !aciklama
          ? `İpucu: «${oge.metin}» aslında «${dogruKategori?.ad ?? 'başka bir kategori'}» kategorisine ait.`
          : `İpucu: ${aciklama}`,
    });
  }

  /** Bir kategoriye yerleşmiş öğelerin metinleri. */
  function kategoridekiler(kategoriId: string): string[] {
    return ogeler
      .map((oge, i) => ({ oge, i }))
      .filter((satir) => yerlesen[satir.i] === kategoriId)
      .map((satir) => satir.oge.metin);
  }

  return (
    <EgzersizKabugu
      tip="Eşleştir"
      yonerge={veri.yonerge}
      kaynak={kaynak}
      geriBildirim={geriBildirim}
      onDevam={cozuldu ? onBitti : null}
    >
      <p className="metin-soluk" id="ders-eslestir-yonlendirme">
        Bir öğeye dokun, sonra gitmesi gereken kategoriye dokun. Yerleşen öğe:{' '}
        <strong>
          {yerlesenSayi}/{toplam}
        </strong>
      </p>

      <div className="ders-eslestir">
        <div
          className="ders-eslestir__bolum"
          role="group"
          aria-label="Yerleştirilecek öğeler"
          aria-describedby="ders-eslestir-yonlendirme"
        >
          <h4 className="ders-bolum-baslik">Öğeler</h4>
          <div className="yigin">
            {ogeler.map((oge, i) => {
              const yerlesmis = yerlesen[i] !== undefined;
              const seciliMi = secili === i;
              const sinif = yerlesmis
                ? 'secenek secenek--dogru'
                : seciliMi
                  ? 'secenek secenek--secili'
                  : 'secenek';

              return (
                <button
                  key={oge.metin}
                  type="button"
                  className={sinif}
                  aria-pressed={seciliMi}
                  disabled={yerlesmis}
                  onClick={() => setSecili(seciliMi ? null : i)}
                >
                  <span className="ders-secenek-isaret" aria-hidden="true">
                    {yerlesmis ? '✓' : seciliMi ? '›' : ''}
                  </span>
                  <span>{oge.metin}</span>
                  {yerlesmis ? <span className="ders-secenek-rozet">yerleşti</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ders-eslestir__bolum" role="group" aria-label="Kategoriler">
          <h4 className="ders-bolum-baslik">Kategoriler</h4>
          <div className="yigin">
            {veri.kategoriler.map((kategori) => {
              const icindekiler = kategoridekiler(kategori.id);
              return (
                <div className="kart ders-eslestir__kategori" key={kategori.id}>
                  <button
                    type="button"
                    className="dugme dugme--ikincil ders-eslestir__kategori-dugme"
                    onClick={() => kategoriSec(kategori.id)}
                  >
                    {kategori.ad}
                  </button>
                  {kategori.aciklama ? (
                    <p className="metin-soluk ders-eslestir__aciklama">{kategori.aciklama}</p>
                  ) : null}
                  {icindekiler.length > 0 ? (
                    <ul className="ders-eslestir__yerlesen">
                      {icindekiler.map((metin) => (
                        <li key={metin}>
                          <span aria-hidden="true">✓</span> {metin}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </EgzersizKabugu>
  );
}
