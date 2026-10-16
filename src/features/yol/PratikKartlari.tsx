/**
 * Öğrenme yolundaki "Pratik" köşesi: derslerin dışındaki kısa oyunlar.
 * Kartlar gerçek bağlantı (<a>), simgeler süs.
 */
export interface PratikKarti {
  href: string;
  baslik: string;
  alt: string;
  simge: string;
}

export function PratikKartlari({ kartlar }: { kartlar: PratikKarti[] }) {
  if (kartlar.length === 0) return null;
  return (
    <section aria-labelledby="pratik-baslik" className="pratik">
      <h2 id="pratik-baslik" className="pratik__baslik">
        Pratik
      </h2>
      <ul className="pratik__liste">
        {kartlar.map((k) => (
          <li key={k.href}>
            <a className="pratik__kart" href={k.href}>
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
