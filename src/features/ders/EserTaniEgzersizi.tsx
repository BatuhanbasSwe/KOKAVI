/**
 * 04 · GERİ ÇAĞIRMA — "Eseri tanı" egzersizi.
 *
 * PDF: "Dinle ve seç" görev tipinin SESSİZ eşdeğeri. PDF ayrıca "Altyazı ve
 * sessiz mod: ses olmadan da akışın tamamı bitirilebilir" diyor; bu egzersiz
 * betimlemeyi yazıyla verir, ses gerektirmez.
 *
 * PDF: "Yanlış → ipucu + tekrar turu" — yanlış seçenek ! ile işaretlenir,
 * ipucu verilir ve tekrar denenebilir. İki yanlıştan sonra cevap gösterilir.
 */
import { useId, useState } from 'react';
import type { EserTaniVerisi } from '@shared/types';
import { useDurum } from '../../app/DurumSaglayici';
import { sesDestekleniyor } from '../../lib/ses';
import { DinleDugmesi } from './DinleDugmesi';
import { karistir } from './yardimci';
import {
  EgzersizKabugu,
  type EgzersizOrtakProps,
  type GeriBildirimVerisi,
} from './EgzersizKabugu';

export function EserTaniEgzersizi({
  veri,
  kaynak,
  onBitti,
}: EgzersizOrtakProps<EserTaniVerisi>) {
  const { ayarlar } = useDurum();
  const [secili, setSecili] = useState<number | null>(null);
  const [yanlislar, setYanlislar] = useState<number[]>([]);
  const [geriBildirim, setGeriBildirim] = useState<GeriBildirimVerisi | null>(null);
  const [altyazi, setAltyazi] = useState(false);
  const altyaziId = useId();
  // İçerikte doğru eser çoğunlukla ilk şık (57 dersin 51'i). Görüntü sırası
  // karıştırılır; kontrol yine gerçek index (veri.dogruIndex) üzerinden yapılır.
  const [gorunumSirasi] = useState(() => karistir(veri.secenekler.map((_, i) => i)));

  const cozuldu = secili !== null && secili === veri.dogruIndex;
  const dogruCevap = veri.secenekler[veri.dogruIndex];

  function secenekSec(indeks: number) {
    if (cozuldu) {
      setGeriBildirim({
        tur: 'dogru',
        baslik: 'Bu eseri buldun',
        metin: `Doğru cevap: «${dogruCevap}».`,
      });
      return;
    }

    if (indeks === veri.dogruIndex) {
      setSecili(indeks);
      setGeriBildirim({
        tur: 'dogru',
        baslik: 'Doğru eser!',
        metin: `Betimlenen eser «${dogruCevap}».`,
      });
      return;
    }

    const yeniYanlislar = yanlislar.includes(indeks) ? yanlislar : [...yanlislar, indeks];
    setYanlislar(yeniYanlislar);

    if (yeniYanlislar.length >= 2) {
      // Çıkmaz sokak yok: iki denemeden sonra cevap gösterilir ve devam edilir.
      setSecili(veri.dogruIndex);
      setGeriBildirim({
        tur: 'ipucu',
        baslik: 'Doğru cevap',
        metin: `«${dogruCevap}». Betimlemedeki ayrıntılar bu esere ait. Şimdi devam edebilirsin.`,
      });
      return;
    }

    setGeriBildirim({
      tur: 'ipucu',
      baslik: 'Bu eser değil',
      metin: `İpucu: Doğru seçeneğin adı ${dogruCevap.trim().length} harfli. Betimlemeyi bir daha oku.`,
    });
  }

  /*
   * PDF egzersiz tipi "Dinle ve seç: sesli anlatımı dinle, doğru eseri işaretle".
   * Ses varsa betimleme açılışta bir kez okunur; metni "Altyazıyı göster"
   * düğmesinin arkasındadır (PDF: "Altyazı ve sessiz mod"), böylece egzersiz
   * gerçekten dinleyerek çözülür ama işitemeyen biri tek dokunuşla okuyabilir.
   * Sessiz modda veya ses olmayan cihazda aynı egzersiz "Eseri tanı" olarak
   * yazıyla çözülür (PDF: "ses olmadan da akışın tamamı bitirilebilir").
   */
  const sesli = !ayarlar.sessizMod && sesDestekleniyor();

  return (
    <EgzersizKabugu
      tip={sesli ? 'Dinle ve seç' : 'Eseri tanı'}
      yonerge={sesli ? 'Betimlemeyi dinle ve anlatılan eseri seç.' : veri.yonerge}
      kaynak={kaynak}
      geriBildirim={geriBildirim}
      onDevam={cozuldu ? onBitti : null}
    >
      {sesli ? (
        <div className="satir ders-dinle-sec">
          <DinleDugmesi metin={veri.betimleme} etiket="Betimlemeyi dinle" kendiligindenBasla />
          <button
            type="button"
            className="dugme dugme--ikincil dugme--kucuk"
            aria-expanded={altyazi}
            aria-controls={altyaziId}
            onClick={() => setAltyazi((a) => !a)}
          >
            {altyazi ? 'Altyazıyı gizle' : 'Altyazıyı göster'}
          </button>
        </div>
      ) : null}
      {!sesli || altyazi ? (
        <blockquote className="kart ders-betimleme" id={altyaziId}>
          <p className="etiket">{sesli ? 'Altyazı' : 'Betimleme'}</p>
          <p className="ders-betimleme__metin">{veri.betimleme}</p>
        </blockquote>
      ) : (
        <p className="metin-ikincil ders-dinle-sec__not" id={altyaziId}>
          Önce dinle; işitemiyorsan altyazıyı açabilirsin.
        </p>
      )}

      <div className="yigin ders-secenekler" role="group" aria-label="Eser seçenekleri">
        {gorunumSirasi.map((i) => {
          const secenek = veri.secenekler[i];
          const dogruMu = secili === veri.dogruIndex && i === veri.dogruIndex;
          const yanlisMi = yanlislar.includes(i) && i !== veri.dogruIndex;
          const sinif = dogruMu
            ? 'secenek secenek--dogru'
            : yanlisMi
              ? 'secenek secenek--yanlis'
              : 'secenek';

          return (
            <button
              key={secenek}
              type="button"
              className={sinif}
              aria-pressed={secili === i}
              onClick={() => secenekSec(i)}
            >
              <span className="ders-secenek-isaret" aria-hidden="true">
                {dogruMu ? '✓' : yanlisMi ? '!' : ''}
              </span>
              <span>{secenek}</span>
              {dogruMu ? <span className="ders-secenek-rozet">doğru</span> : null}
              {yanlisMi ? <span className="ders-secenek-rozet">olmadı</span> : null}
            </button>
          );
        })}
      </div>
    </EgzersizKabugu>
  );
}
