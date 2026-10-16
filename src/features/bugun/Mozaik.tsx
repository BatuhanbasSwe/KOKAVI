/**
 * Mozaik kutucukları (Bugün ve Keşfet ekranları). Her kutucuk tek bir gerçek
 * <a>; fotoğraf süs (alt=""), anlamı bağlantı metni taşır.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import './bugun.css';

/** Fotoğraf yoksa kutucuk düz yüzeyde kalır (kırık görsel simgesi görünmez). */
export function Foto({ src, className }: { src: string; className: string }) {
  const [yok, setYok] = useState(false);
  if (yok) return null;
  return (
    <img className={className} src={src} alt="" loading="lazy" decoding="async" onError={() => setYok(true)} />
  );
}

export function Kutu({
  href,
  sira,
  sinif = '',
  children,
}: {
  href: string;
  sira: number;
  sinif?: string;
  children: ReactNode;
}) {
  return (
    <li className={`mozaik__oge ${sinif}`} style={{ '--sira': sira } as CSSProperties}>
      <a className="mozaik__kutu" href={href}>
        {children}
      </a>
    </li>
  );
}
