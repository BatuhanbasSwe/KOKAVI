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

export function DinleDugmesi({ metin, etiket = 'Dinle' }: { metin: string; etiket?: string }) {
  const { ayarlar } = useDurum();
  const [okuyor, setOkuyor] = useState(false);

  // Bileşen kalkınca (adım değişince) konuşma da durur.
  useEffect(() => () => sesiDurdur(), []);

  if (ayarlar.sessizMod || !sesDestekleniyor()) return null;

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
