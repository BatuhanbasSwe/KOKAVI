/**
 * Egzersizlerin ortak kabuğu.
 *
 * Her egzersizde PDF'in istediği üç şey birlikte verilir:
 *  1. yönerge, 2. kaynak künyesi, 3. doğru/yanlış geri bildirimi.
 *
 * Dil ve erişilebilirlik kuralları:
 *  - Doğru/yanlış ASLA yalnızca renkle belirtilmez: simge (✓ / !) + metin +
 *    role="status" ile duyuru birlikte kullanılır (WCAG 1.4.1 / 4.1.3).
 *  - Yanlışta suçlayıcı dil yok; "ipucu" tonunda bilgilendirme yapılır.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { KavramKarti } from '@shared/types';
import { IkonIpucu, IkonTik } from '../../app/Ikonlar';
import { useEfekt } from '../../app/useEfekt';

/**
 * Ek ipucu (Vakıf Çarşısı, PDF s. 3: "ek ipucu"). Yalnızca bir yanlıştan
 * SONRA görünür (önce dene, sonra destek); dersin kavram kartlarını yeniden
 * açar. Ücretsiz ipucu her yanlışta zaten gelir; bu onun üstüne bir destektir.
 */
export interface EkIpucuDegeri {
  kavramlar: KavramKarti[];
  hak: number;
  kullan: () => boolean;
}
export const EkIpucuBaglami = createContext<EkIpucuDegeri | null>(null);

function EkIpucu() {
  const ek = useContext(EkIpucuBaglami);
  const [acik, setAcik] = useState(false);
  if (!ek || ek.kavramlar.length === 0) return null;

  if (acik) {
    return (
      <div className="ders-ek-ipucu" role="region" aria-label="Ek ipucu: kavram kartları">
        {ek.kavramlar.map((k) => (
          <p key={k.ad}>
            <strong>{k.ad}:</strong> {k.aciklama}
          </p>
        ))}
      </div>
    );
  }
  if (ek.hak <= 0) {
    return (
      <p className="ders-ek-ipucu__yok">
        Ek ipucu hakkın yok. Vakıf Çarşısı'nda 3 ipucu 15 elmas.
      </p>
    );
  }
  return (
    <button
      type="button"
      className="dugme dugme--ikincil dugme--kucuk"
      onClick={() => {
        if (ek.kullan()) setAcik(true);
      }}
    >
      <IkonIpucu boyut={18} /> Ek ipucu: kavram kartları ({ek.hak} hak)
    </button>
  );
}

/**
 * Aralıklı tekrar için: egzersiz bitmeden önce bir "ipucu" geri bildirimi
 * gösterildiyse haber verir. Böylece dört egzersiz bileşenine dokunmadan
 * "ilk denemede, ipucusuz çözdü mü?" bilgisi elde edilir.
 */
export const IpucuBildirimi = createContext<(() => void) | null>(null);

export interface GeriBildirimVerisi {
  /** 'dogru' = başarı; 'ipucu' = bilgilendirici yönlendirme (asla suçlayıcı değil). */
  tur: 'dogru' | 'ipucu';
  baslik: string;
  metin: string;
}

/** Dört egzersiz bileşeninin ortak props sözleşmesi. */
export interface EgzersizOrtakProps<V> {
  veri: V;
  kaynak: string | null;
  onBitti: () => void;
}

interface Props {
  /** Egzersiz tipinin insan okunur adı: "Eşleştir", "Sırala"… */
  tip: string;
  yonerge: string;
  kaynak: string | null;
  geriBildirim: GeriBildirimVerisi | null;
  /** null ise "Devam" düğmesi çizilmez (egzersiz henüz bitmemiştir). */
  onDevam: (() => void) | null;
  /** Egzersize özel ek düğmeler (örn. "Sıralamayı kontrol et"). */
  ekEylem?: ReactNode;
  children: ReactNode;
}

/** PDF: "Yanlış → ipucu + tekrar turu" — geri bildirim her zaman metinlidir. */
export function GeriBildirim({ tur, baslik, metin }: GeriBildirimVerisi) {
  const dogru = tur === 'dogru';
  return (
    <div className={`ders-geri ders-geri--${dogru ? 'dogru' : 'ipucu'}`} role="status">
      <span className="ders-geri__ikon" aria-hidden="true">
        {dogru ? <IkonTik boyut={22} /> : <IkonIpucu boyut={22} />}
      </span>
      <div className="ders-geri__govde">
        <p className="ders-geri__baslik">{baslik}</p>
        <p className="ders-geri__metin">{metin}</p>
      </div>
    </div>
  );
}

export function EgzersizKabugu({
  tip,
  yonerge,
  kaynak,
  geriBildirim,
  onDevam,
  ekEylem,
  children,
}: Props) {
  const ipucuGoruldu = useContext(IpucuBildirimi);
  const ipucuMu = geriBildirim?.tur === 'ipucu';
  useEffect(() => {
    if (ipucuMu) ipucuGoruldu?.();
  }, [ipucuMu, geriBildirim, ipucuGoruldu]);

  // Her yeni geri bildirimde bir kez: doğruya "ding", ipucuna yumuşak ton.
  const cal = useEfekt();
  useEffect(() => {
    if (geriBildirim) cal(geriBildirim.tur === 'dogru' ? 'dogru' : 'ipucu');
  }, [geriBildirim, cal]);

  return (
    <section className="ders-egzersiz" aria-label={`${tip} egzersizi`}>
      <p className="etiket">Egzersiz · {tip}</p>
      <h3 className="ders-soru">{yonerge}</h3>

      <div className="ders-egzersiz__govde">{children}</div>

      {kaynak ? <p className="kaynak ders-egzersiz__kaynak">Kaynak: {kaynak}</p> : null}

      {ekEylem ? <div className="satir ders-egzersiz__eylem">{ekEylem}</div> : null}

      {/* Duolingo tarzı alt panel: geri bildirim + Devam birlikte, ekranın altında. */}
      {geriBildirim || onDevam ? (
        <div
          className={`ders-eylem${
            geriBildirim ? ` ders-eylem--${geriBildirim.tur === 'dogru' ? 'dogru' : 'ipucu'}` : ''
          }`}
        >
          {geriBildirim ? <GeriBildirim {...geriBildirim} /> : null}
          {geriBildirim?.tur === 'ipucu' ? <EkIpucu /> : null}
          {onDevam ? (
            <button type="button" className="dugme dugme--genis" onClick={onDevam}>
              Devam
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
