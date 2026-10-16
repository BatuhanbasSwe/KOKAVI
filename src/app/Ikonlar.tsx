/**
 * Uygulama ikon seti: tek aile, Phosphor (@phosphor-icons/react, MIT).
 * Simgeler tek tek içe aktarılır (1500 simgelik toplu dosya yüklenmez).
 * Arayüzde `bold`, aktif durumda `fill` ağırlığı. Elle çizilmiş simge yok;
 * marka çizimi yalnızca maskot Köstik'tir (Maskot.tsx).
 *
 * Erişilebilirlik: ikonlar her zaman aria-hidden'dır; anlamı yanındaki metin
 * veya `aria-label` taşır (WCAG 1.1.1, 1.4.1). Emoji kullanılmaz: ekran
 * okuyucular emojiyi tutarsız okur ve temaya göre renklenmez.
 */
import type { Icon } from '@phosphor-icons/react';
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { ArrowsClockwise } from '@phosphor-icons/react/ArrowsClockwise';
import { ArrowsLeftRight } from '@phosphor-icons/react/ArrowsLeftRight';
import { Bathtub } from '@phosphor-icons/react/Bathtub';
import { BookOpenText } from '@phosphor-icons/react/BookOpenText';
import { Books } from '@phosphor-icons/react/Books';
import { Bridge } from '@phosphor-icons/react/Bridge';
import { Buildings } from '@phosphor-icons/react/Buildings';
import { CalendarCheck } from '@phosphor-icons/react/CalendarCheck';
import { CaretRight } from '@phosphor-icons/react/CaretRight';
import { Certificate } from '@phosphor-icons/react/Certificate';
import { Check } from '@phosphor-icons/react/Check';
import { Church } from '@phosphor-icons/react/Church';
import { Coin } from '@phosphor-icons/react/Coin';
import { Compass } from '@phosphor-icons/react/Compass';
import { CookingPot } from '@phosphor-icons/react/CookingPot';
import { DiceFive } from '@phosphor-icons/react/DiceFive';
import { Diamond } from '@phosphor-icons/react/Diamond';
import { Drop } from '@phosphor-icons/react/Drop';
import { FireSimple } from '@phosphor-icons/react/FireSimple';
import { Flame } from '@phosphor-icons/react/Flame';
import { FlowerTulip } from '@phosphor-icons/react/FlowerTulip';
import { Gear } from '@phosphor-icons/react/Gear';
import { Hourglass } from '@phosphor-icons/react/Hourglass';
import { House } from '@phosphor-icons/react/House';
import { Jar } from '@phosphor-icons/react/Jar';
import { Key } from '@phosphor-icons/react/Key';
import { Lightbulb } from '@phosphor-icons/react/Lightbulb';
import { Lock } from '@phosphor-icons/react/Lock';
import { MapTrifold } from '@phosphor-icons/react/MapTrifold';
import { Medal } from '@phosphor-icons/react/Medal';
import { Mosque } from '@phosphor-icons/react/Mosque';
import { Path } from '@phosphor-icons/react/Path';
import { Question } from '@phosphor-icons/react/Question';
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh';
import { Star } from '@phosphor-icons/react/Star';
import { StarFour } from '@phosphor-icons/react/StarFour';
import { Stop } from '@phosphor-icons/react/Stop';
import { Storefront } from '@phosphor-icons/react/Storefront';
import { Tent } from '@phosphor-icons/react/Tent';
import { Timer } from '@phosphor-icons/react/Timer';
import { UserCircle } from '@phosphor-icons/react/UserCircle';
import { UsersThree } from '@phosphor-icons/react/UsersThree';
import { Warehouse } from '@phosphor-icons/react/Warehouse';
import { Warning } from '@phosphor-icons/react/Warning';
import { X } from '@phosphor-icons/react/X';

interface IkonProps {
  boyut?: number;
  /** Eski çizim API'siyle uyum için kabul edilir; Phosphor ağırlıkla çalışır. */
  kalinlik?: number;
  className?: string;
  /** Dolu ağırlık (aktif sekme, seçili durum). */
  dolu?: boolean;
}

function sar(Bilesen: Icon, varsayilanBoyut = 24) {
  function Ikon({ boyut = varsayilanBoyut, className, dolu }: IkonProps) {
    return (
      <Bilesen
        size={boyut}
        weight={dolu ? 'fill' : 'bold'}
        className={className}
        aria-hidden="true"
        focusable="false"
      />
    );
  }
  return Ikon;
}

/* --- Gezinme ------------------------------------------------------------ */

export const IkonEv = sar(House);
export const IkonYol = sar(Path);
export const IkonPusula = sar(Compass);
export const IkonDefter = sar(BookOpenText);
export const IkonHarita = sar(MapTrifold);
export const IkonSinif = sar(UsersThree);
export const IkonAyarlar = sar(Gear);
export const IkonProfil = sar(UserCircle);
export const IkonGeri = sar(ArrowLeft);
export const IkonSagOk = sar(CaretRight, 20);
export const IkonCarsi = sar(Storefront);
export const IkonTakvim = sar(CalendarCheck);
export const IkonMadalya = sar(Medal);
export const IkonBelge = sar(Certificate);

/* --- Göstergeler (renkli: seri safran, elmas mavi) ---------------------- */

export const IkonAlev = ({ boyut = 22, className }: IkonProps) => (
  <Flame
    size={boyut}
    weight="fill"
    color="var(--odul)"
    className={className}
    aria-hidden="true"
    focusable="false"
  />
);

export const IkonElmas = ({ boyut = 22, className }: IkonProps) => (
  <Diamond
    size={boyut}
    weight="fill"
    color="var(--ikincil)"
    className={className}
    aria-hidden="true"
    focusable="false"
  />
);

export const IkonKilit = sar(Lock);
export const IkonTik = sar(Check);
export const IkonKapat = sar(X);
export const IkonHoparlor = sar(SpeakerHigh);
export const IkonDur = sar(Stop);
export const IkonIpucu = sar(Lightbulb);
export const IkonTekrar = sar(ArrowsClockwise);

/* --- Pratik ve oyunlar --------------------------------------------------- */

export const IkonSoru = sar(Question);
/** Hayrat ve Akar: iki yönlü ok. */
export const IkonDegistir = sar(ArrowsLeftRight);
export const IkonKumSaati = sar(Hourglass);
/** Vakıf geliri: sikke. */
export const IkonSikke = sar(Coin);
export const IkonSaat = sar(Timer);
export const IkonYildiz = sar(Star);
/** Şans: zar. */
export const IkonZar = sar(DiceFive);
/** Uyarı üçgeni (form hataları). */
export const IkonUyari = sar(Warning);
export const IkonOk = sar(ArrowRight);

/* --- Eser türleri ------------------------------------------------------- */

const TUR_SIMGELERI: Record<string, Icon> = {
  cami: Mosque,
  mescit: Mosque,
  kulliye: Buildings,
  medrese: Books,
  mektep: Books,
  hamam: Bathtub,
  han: Warehouse,
  kervansaray: Warehouse,
  bedesten: Storefront,
  cesme: Drop,
  turbe: Tent,
  kopru: Bridge,
  imaret: CookingPot,
  kilise: Church,
};

/** Türkçe tür adını anahtar kelimeye indirger: "Çeşme (han-cami...)" → "cesme". */
export function turAnahtari(tur: string | undefined | null): string {
  const harita: Record<string, string> = { ç: 'c', ş: 's', ğ: 'g', ı: 'i', ö: 'o', ü: 'u', İ: 'i' };
  const sade = (tur ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çşğıöüİ]/g, (h) => harita[h] ?? h)
    .trim();
  const ilk = sade.split(/[\s/(,]/)[0] ?? '';
  return ilk in TUR_SIMGELERI ? ilk : sade;
}

function turSimgesi(tur: string | undefined | null): Icon {
  return TUR_SIMGELERI[turAnahtari(tur)] ?? Buildings;
}

export function IkonTur({ tur, boyut = 24, className, dolu }: IkonProps & { tur: string | undefined | null }) {
  const Bilesen = turSimgesi(tur);
  return (
    <Bilesen
      size={boyut}
      weight={dolu ? 'fill' : 'bold'}
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  );
}

/* --- Kâşif avatarları (Vakıf Çarşısı) ------------------------------------ */

const AVATAR_SIMGELERI: Record<string, Icon> = {
  'avatar-yildiz': StarFour,
  'avatar-kubbe': Mosque,
  'avatar-lale': FlowerTulip,
  'avatar-kandil': FireSimple,
  'avatar-ibrik': Jar,
  'avatar-anahtar': Key,
};

export function Avatar({ id, boyut = 32 }: { id: string; boyut?: number }) {
  const Bilesen = AVATAR_SIMGELERI[id] ?? StarFour;
  return (
    <span className="avatar" style={{ width: boyut, height: boyut }} aria-hidden="true">
      <Bilesen size={Math.round(boyut * 0.62)} weight="bold" focusable="false" />
    </span>
  );
}
