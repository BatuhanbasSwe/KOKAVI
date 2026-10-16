/**
 * Öğrenme yolundaki "Bugün" şeridi: Günün Eseri ve kısa pratik oyunları.
 * Telefonda yana kaydırılır (scroll-snap), geniş ekranda ızgara. Kartlar gerçek
 * bağlantı (<a>); simgeler SVG ve süs (aria-hidden).
 */
import type { ReactNode } from 'react';

export interface PratikKarti {
  href: string;
  baslik: string;
  alt: string;
  simge: ReactNode;
  /** Vurgulu kart (Günün Eseri). */
  vurgu?: boolean;
}

export function PratikKartlari({ kartlar }: { kartlar: PratikKarti[] }) {
  if (kartlar.length === 0) return null;
  return (
    <section aria-labelledby="pratik-baslik" className="pratik">
      <h2 id="pratik-baslik" className="pratik__baslik">
        Bugün
      </h2>
      <ul className="pratik__liste">
        {kartlar.map((k) => (
          <li key={k.href}>
            <a className={`pratik__kart${k.vurgu ? ' pratik__kart--vurgu' : ''}`} href={k.href}>
              <span className="pratik__simge" aria-hidden="true">
                {k.simge}
              </span>
              <span className="pratik__metin">
                <span className="pratik__ad">{k.baslik}</span>
                <span className="pratik__alt">{k.alt}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
