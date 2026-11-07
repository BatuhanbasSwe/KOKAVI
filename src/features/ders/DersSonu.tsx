/**
 * Ders sonu — kutlama ekranı.
 *
 * PDF: "Ödül puan değil, bilgi" ve "Kâşif Defteri dolar". Bu yüzden ekran
 * elmas/seri yanında asıl kazanımı söyler: deftere eklenen eser ve ilk
 * tekrarın ne zaman geleceği (aralıklı tekrar görünür olsun).
 *
 * Erişilebilirlik: başlık açılışta odak alır; kutlama hareketi
 * "hareketi azalt" ayarında kapanır (tokens.css).
 */
import { useEffect, useRef } from 'react';
import { ArtanSayi } from '../../app/ArtanSayi';
import { canlandirilabilir } from '../../app/hareket';
import type { EserFotograf } from '@shared/types';
import { IkonDefter, IkonElmas, IkonAlev, IkonTekrar, IkonTur } from '../../app/Ikonlar';
import { kucukKapak } from './EserGalerisi';
import { Konfeti } from '../../app/Konfeti';
import { useEfekt } from '../../app/useEfekt';
import { aktifGunEkle } from '../seri/seriTakvimi';
import { gunMetni } from '../../lib/tekrar';

const YILDIZ_UST =
  '60,6 75.8,21.8 98.2,21.8 98.2,44.2 114,60 98.2,75.8 98.2,98.2 75.8,98.2 60,114 44.2,98.2 21.8,98.2 21.8,75.8 6,60 21.8,44.2 21.8,21.8 44.2,21.8';
const YILDIZ_ALT =
  '60,12 75.8,27.8 98.2,27.8 98.2,50.2 114,66 98.2,81.8 98.2,104.2 75.8,104.2 60,120 44.2,104.2 21.8,104.2 21.8,81.8 6,66 21.8,50.2 21.8,27.8 44.2,27.8';
const YILDIZ_IC =
  '60,26 70,36 84,36 84,50 94,60 84,70 84,84 70,84 60,94 50,84 36,84 36,70 26,60 36,50 36,36 50,36';

interface Props {
  eserAdi: string;
  eserTur: string | null;
  eserSehir: string | null;
  kazanilanElmas: number;
  seriGun: number;
  tekrarSonucMetni: string | null;
  onDevam: () => void;
  /** Eserin kapak fotoğrafı; varsa defter kartında "pul" gibi görünür. */
  kapak?: EserFotograf | null;
  /** Tahta modu: çocuk ödülü yerine sınıf külliyesi mesajı gösterilir. */
  tahtaSinifKodu?: string;
}

export function DersSonu({
  eserAdi,
  eserTur,
  eserSehir,
  kapak = null,
  kazanilanElmas,
  seriGun,
  tekrarSonucMetni,
  onDevam,
  tahtaSinifKodu,
}: Props) {
  const baslik = useRef<HTMLHeadingElement>(null);
  const kok = useRef<HTMLDivElement>(null);
  const cal = useEfekt();

  // Elmas yağmuru: elmaslar yıldızdan fışkırıp "Elmas" kartına uçar; her
  // varışta kart zıplar ve kartın sayısı 0'dan yukarı sayar (ArtanSayi).
  const ELMAS_ADEDI = Math.min(8, Math.max(0, kazanilanElmas));
  useEffect(() => {
    const kap = kok.current;
    if (!ELMAS_ADEDI || !kap || !canlandirilabilir(kap)) return;
    const z = window.setTimeout(() => {
      const yildiz = kap.querySelector('.ders-sonu__yildiz')?.getBoundingClientRect();
      const kart = kap.querySelector<HTMLElement>('.ders-sonu__kazanc--elmas');
      const hedef = kart?.querySelector('svg')?.getBoundingClientRect();
      if (!yildiz || !kart || !hedef) return;
      const sx = yildiz.left + yildiz.width / 2;
      const sy = yildiz.top + yildiz.height / 2;
      const tx = hedef.left + hedef.width / 2;
      const ty = hedef.top + hedef.height / 2;
      kap.querySelectorAll<HTMLElement>('.elmas-yagmuru__tane').forEach((tane, i) => {
        const aci = (Math.PI * 2 * i) / ELMAS_ADEDI;
        const dx = Math.cos(aci) * 70;
        const dy = Math.sin(aci) * 50 - 30;
        const ucus = tane.animate(
          [
            { transform: `translate(${sx}px, ${sy}px) scale(0.3)`, opacity: 0 },
            { transform: `translate(${sx + dx}px, ${sy + dy}px) scale(1.15)`, opacity: 1, offset: 0.35 },
            { transform: `translate(${tx}px, ${ty}px) scale(0.6)`, opacity: 1, offset: 0.92 },
            { transform: `translate(${tx}px, ${ty}px) scale(0.4)`, opacity: 0 },
          ],
          { duration: 950, delay: i * 70, easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'both' },
        );
        ucus.onfinish = () =>
          kart.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], {
            duration: 220,
            easing: 'ease-out',
          });
      });
    }, 350);
    return () => window.clearTimeout(z);
  }, [ELMAS_ADEDI]);
  useEffect(() => {
    baslik.current?.focus();
    cal('kutlama');
    if (!tahtaSinifKodu) aktifGunEkle(gunMetni(new Date())); // seri takvimine bugünü işle (cihazda)
    // Yalnızca açılışta bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kisaAd = eserAdi.split(' (')[0];

  return (
    <div className="ders-sonu" ref={kok}>
      {!tahtaSinifKodu && <Konfeti />}
      {ELMAS_ADEDI > 0 && (
        <div className="elmas-yagmuru" aria-hidden="true">
          {Array.from({ length: ELMAS_ADEDI }, (_, i) => (
            <span key={i} className="elmas-yagmuru__tane">
              <IkonElmas boyut={22} />
            </span>
          ))}
        </div>
      )}
      <svg
        className="ders-sonu__yildiz"
        width="160"
        height="164"
        viewBox="0 0 120 124"
        aria-hidden="true"
        focusable="false"
      >
        <polygon points={YILDIZ_ALT} fill="var(--odul-golge)" />
        <polygon points={YILDIZ_UST} fill="var(--odul)" />
        <polygon points={YILDIZ_IC} fill="var(--vurgu)" />
        <path
          d="M48 60l8 8 16-16"
          fill="none"
          stroke="var(--vurgu-metin)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="ders-sonu__baslik">
        <h1 ref={baslik} tabIndex={-1}>
          {tahtaSinifKodu ? 'Sınıf dersi tamam!' : 'Ders tamam!'}
        </h1>
        <p className="metin-ikincil">
          {tahtaSinifKodu
            ? `${kisaAd} sınıf külliyesine işlendi. Sınıfla birlikte keşfettiniz.`
            : `${kisaAd} artık senin defterinde. Vakfın parasını nereden kazandığını biliyorsun.`}
        </p>
      </div>

      {tahtaSinifKodu ? (
        <div className="ders-sonu__tekrar" role="status">
          <div>
            <p>
              <strong>Sınıf külliyesi güncellendi.</strong> Öğretmen panelinden sınıfın ilerlemesini
              ve Vakıf Röntgeni&apos;ni birlikte açabilirsiniz.
            </p>
            <p>
              <a
                className="dugme dugme--ikincil"
                href={`#/tahta/${encodeURIComponent(tahtaSinifKodu)}/rontgen`}
              >
                Sınıf Röntgeni&apos;ni tahtada aç
              </a>
            </p>
          </div>
        </div>
      ) : (
        <>
      <ul className="ders-sonu__kazanclar" aria-label="Kazandıkların">
        <li className="ders-sonu__kazanc ders-sonu__kazanc--elmas">
          <span className="ders-sonu__kazanc-ust">Elmas</span>
          <span className="ders-sonu__kazanc-deger">
            <IkonElmas boyut={22} />
            {kazanilanElmas > 0 ? <ArtanSayi deger={kazanilanElmas} baslangic={0} onek="+" gecikme={900} sure={700} /> : '0'}
          </span>
        </li>
        <li className="ders-sonu__kazanc ders-sonu__kazanc--seri">
          <span className="ders-sonu__kazanc-ust">Seri</span>
          <span className="ders-sonu__kazanc-deger">
            <IkonAlev boyut={22} />
            {seriGun} gün
          </span>
        </li>
        <li className="ders-sonu__kazanc ders-sonu__kazanc--defter">
          <span className="ders-sonu__kazanc-ust">Defter</span>
          <span className="ders-sonu__kazanc-deger">
            <IkonDefter boyut={22} />
            +1
          </span>
        </li>
      </ul>

      <div className="ders-sonu__defter">
        {kapak ? (
          <img
            className="ders-sonu__pul"
            src={kucukKapak(kapak.url)}
            alt={kapak.altMetin}
            width={96}
            height={72}
          />
        ) : (
          <span className="ders-sonu__defter-ikon" aria-hidden="true">
            <IkonTur tur={eserTur} boyut={30} kalinlik={1.8} />
          </span>
        )}
        <div>
          <p className="ders-sonu__defter-ust">Defterine eklendi</p>
          <p className="ders-sonu__defter-ad">{kisaAd}</p>
          {eserSehir ? <p className="metin-soluk">{eserSehir}</p> : null}
        </div>
      </div>

      <div className="ders-sonu__tekrar" role="status">
        <span className="ders-tekrar-bandi__ikon" aria-hidden="true">
          <IkonTekrar boyut={20} />
        </span>
        <div>
          {tekrarSonucMetni ? <p>{tekrarSonucMetni}</p> : null}
          <p>
            <strong>Unutmamak için:</strong> {kisaAd} bir sonraki dersinde yeniden karşına
            çıkacak. İpucusuz bildikçe ara uzar: 1, 3, 7, 14 gün.
          </p>
        </div>
      </div>
        </>
      )}

      <div className="ders-eylem">
        <button type="button" className="dugme dugme--genis" onClick={onDevam}>
          {tahtaSinifKodu ? 'Öğretmen paneline dön' : 'Devam et'}
        </button>
      </div>
    </div>
  );
}
