/** Ders ve arşiv sayfasında "bugün hâlâ…" rozeti; Hâlâ yaşayan vakıflar listesine bağlanır. */
import { IkonTik } from '../../app/Ikonlar';
import { yasayanKaydi } from './YasayanSayfasi';
import './merkez.css';

export function YasiyorRozeti({ eserId }: { eserId: string | null | undefined }) {
  const kayit = yasayanKaydi(eserId);
  if (!kayit) return null;
  return (
    <a className="yasiyor-rozet" href="#/kesfet/yasayan">
      <IkonTik boyut={16} />
      {kayit.aciklama}
    </a>
  );
}
