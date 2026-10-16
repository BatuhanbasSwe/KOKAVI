/**
 * Erişilebilir onay diyaloğu.
 *
 * `window.confirm` yerine bu bileşen kullanılır; çünkü tarayıcı onay penceresi
 * odak yönetimine izin vermez, sayfa bağlamını koparır ve tema/ölçek ayarlarına
 * uymaz. Şartname 5.1.4 (WCAG 2.2 AA) gereği:
 *  - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`
 *  - Açılışta odak diyaloğa taşınır, kapanışta tetikleyen düğmeye geri döner
 *  - Escape ile kapanır, Tab/Shift+Tab odak tuzağı içinde döner
 *  - Perdeye tıklamak da iptal sayılır
 */
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

/** Odak tuzağında dolaşılacak öğeler. */
const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OnayDiyaloguProps {
  acik: boolean;
  baslik: string;
  aciklama: ReactNode;
  onayEtiketi?: string;
  iptalEtiketi?: string;
  /** Yıkıcı işlem (silme) için tehlike renkli onay düğmesi. */
  tehlike?: boolean;
  /** İstek sürerken diyalog kapanmasın ve düğmeler ikinci kez çalışmasın. */
  mesgul?: boolean;
  onOnay: () => void;
  onKapat: () => void;
}

export function OnayDiyalogu({
  acik,
  baslik,
  aciklama,
  onayEtiketi = 'Onayla',
  iptalEtiketi = 'Vazgeç',
  tehlike = false,
  mesgul = false,
  onOnay,
  onKapat,
}: OnayDiyaloguProps) {
  const diyalogRef = useRef<HTMLDivElement>(null);
  const oncekiOdakRef = useRef<HTMLElement | null>(null);
  const baslikId = useId();
  const aciklamaId = useId();

  // Açılış/kapanış: odak taşıma, gövde kaydırma kilidi, odak geri verme
  useEffect(() => {
    if (!acik) return;

    const oncekiOdak = document.activeElement;
    oncekiOdakRef.current = oncekiOdak instanceof HTMLElement ? oncekiOdak : null;

    diyalogRef.current?.focus();

    const oncekiTasma = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = oncekiTasma;
      oncekiOdakRef.current?.focus();
    };
  }, [acik]);

  // Escape her yerden çalışsın (odak diyaloğun dışına kaçsa bile)
  useEffect(() => {
    if (!acik || mesgul) return;

    const tusla = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') {
        olay.preventDefault();
        onKapat();
      }
    };

    document.addEventListener('keydown', tusla);
    return () => document.removeEventListener('keydown', tusla);
  }, [acik, mesgul, onKapat]);

  if (!acik) return null;

  // Odak tuzağı: Tab ilk öğeden geriye, son öğeden ileriye kaçmaz.
  const tusYakala = (olay: ReactKeyboardEvent<HTMLDivElement>) => {
    if (olay.key !== 'Tab') return;

    const odaklanabilirler = diyalogRef.current?.querySelectorAll<HTMLElement>(ODAKLANABILIR);
    if (!odaklanabilirler || odaklanabilirler.length === 0) {
      olay.preventDefault();
      return;
    }

    const ilk = odaklanabilirler[0];
    const son = odaklanabilirler[odaklanabilirler.length - 1];
    if (!ilk || !son) return;

    const aktif = document.activeElement;

    if (olay.shiftKey && (aktif === ilk || aktif === diyalogRef.current)) {
      olay.preventDefault();
      son.focus();
    } else if (!olay.shiftKey && aktif === son) {
      olay.preventDefault();
      ilk.focus();
    }
  };

  return createPortal(
    <div
      className="onay-perde"
      // Perdeye tıklama iptal sayılır; diyaloğun içine yapılan tıklama kapatmaz.
      onClick={(olay) => {
        if (olay.target === olay.currentTarget && !mesgul) onKapat();
      }}
    >
      <div
        ref={diyalogRef}
        className="onay"
        role="dialog"
        aria-modal="true"
        aria-labelledby={baslikId}
        aria-describedby={aciklamaId}
        tabIndex={-1}
        onKeyDown={tusYakala}
      >
        <h2 className="onay__baslik" id={baslikId}>
          {baslik}
        </h2>
        <div className="onay__aciklama" id={aciklamaId}>
          {aciklama}
        </div>
        <div className="onay__eylemler">
          <button
            type="button"
            className="dugme dugme--ikincil"
            onClick={onKapat}
            disabled={mesgul}
          >
            {iptalEtiketi}
          </button>
          <button
            type="button"
            className={tehlike ? 'dugme dugme--tehlike' : 'dugme'}
            onClick={onOnay}
            disabled={mesgul}
          >
            {mesgul ? 'İşleniyor…' : onayEtiketi}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
