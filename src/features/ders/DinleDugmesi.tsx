/**
 * "Dinle" düğmesi — metni Türkçe sesle okur.
 *
 * Sessiz mod açıksa veya cihazda konuşma sentezi yoksa hiç çizilmez; ders
 * ses olmadan da baştan sona bitirilebilir (PDF: "Altyazı ve sessiz mod").
 * aria-pressed: okunurken "basılı" durumdadır; tekrar basınca durur.
 */
import { useEffect, useState } from 'react';
import { useDurum } from '../../app/DurumSaglayici';
import { IkonDur, IkonHoparlor } from '../../app/Ikonlar';
import { sesDestekleniyor, sesiDurdur, seslendir } from '../../lib/ses';

export function DinleDugmesi({
  metin,
  etiket = 'Dinle',
  kendiligindenBasla = false,
}: {
  metin: string;
  etiket?: string;
  /** Dinleme egzersizi: bileşen açılınca bir kez kendiliğinden okur. */
  kendiligindenBasla?: boolean;
}) {
  const { ayarlar } = useDurum();
  const [okuyor, setOkuyor] = useState(false);
  const sesli = !ayarlar.sessizMod && sesDestekleniyor();

  useEffect(() => {
    if (kendiligindenBasla && sesli && seslendir(metin, () => setOkuyor(false))) setOkuyor(true);
    // Bileşen kalkınca (adım değişince) konuşma da durur.
    return () => sesiDurdur();
    // Yalnızca açılışta: metin değişince yeniden başlamaz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sesli) return null;

  return (
    <button
      type="button"
      className="dugme dugme--mavi dugme--kucuk ders-dinle"
      aria-pressed={okuyor}
      onClick={() => {
        if (okuyor) {
          sesiDurdur();
          setOkuyor(false);
          return;
        }
        if (seslendir(metin, () => setOkuyor(false))) setOkuyor(true);
      }}
    >
      {okuyor ? <IkonDur boyut={18} /> : <IkonHoparlor boyut={18} />}
      {okuyor ? 'Durdur' : etiket}
    </button>
  );
}
