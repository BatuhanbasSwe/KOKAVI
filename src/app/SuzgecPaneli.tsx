/**
 * Açılır kapanır süzgeç paneli (Arşiv ve Harita). Telefonda dört alt alta form
 * alanı ilk ekranı kaplıyordu; seçimler artık "Süz" düğmesinin arkasında.
 * Kapalıyken düğme kaç süzgecin seçili olduğunu söyler.
 *
 * Erişilebilirlik: düğme aria-expanded + aria-controls; sayı metinle de yazılır
 * (renk/rozet tek başına anlam taşımaz). Panel kapalıyken `hidden`.
 */
import { useId, useState, type ReactNode } from 'react';
import { IkonSuzgec } from './Ikonlar';

export function SuzgecPaneli({
  etkinSayisi,
  onTemizle,
  baslangictaAcik = false,
  children,
}: {
  /** Seçili (boş olmayan) süzgeç sayısı. */
  etkinSayisi: number;
  onTemizle: () => void;
  baslangictaAcik?: boolean;
  children: ReactNode;
}) {
  const [acik, setAcik] = useState(baslangictaAcik || etkinSayisi > 0);
  const panelId = useId();

  return (
    <div className="suzgec">
      <button
        type="button"
        className="dugme dugme--ikincil suzgec__dugme"
        aria-expanded={acik}
        aria-controls={panelId}
        onClick={() => setAcik((a) => !a)}
      >
        <IkonSuzgec boyut={18} />
        Süz
        {etkinSayisi > 0 ? (
          <span className="suzgec__sayi">
            {etkinSayisi}
            <span className="sr-only"> süzgeç seçili</span>
          </span>
        ) : null}
      </button>
      <div id={panelId} className="suzgec__panel" hidden={!acik}>
        {children}
        <button type="button" className="dugme dugme--ikincil dugme--kucuk" disabled={etkinSayisi === 0} onClick={onTemizle}>
          Temizle
        </button>
      </div>
    </div>
  );
}
