/**
 * 04 · GERİ ÇAĞIRMA adımının çalıştırıcısı.
 *
 * PDF: "Beş adımlık akış, KARIŞIK EGZERSİZ TİPLERİ" — bir derste birden çok
 * egzersiz tipi sırayla gelebilir. Bu bileşen sıradaki egzersizi tipine göre
 * doğru bileşene yönlendirir.
 */
import { useCallback, useRef } from 'react';
import type { Egzersiz } from '@shared/types';
import { EgzersizKabugu, IpucuBildirimi } from './EgzersizKabugu';
import { IkonTekrar } from '../../app/Ikonlar';
import type { TekrarGorevi } from './DersSayfasi';
import { EslestirEgzersizi } from './EslestirEgzersizi';
import { SiralaEgzersizi } from './SiralaEgzersizi';
import { BoslukDoldurEgzersizi } from './BoslukDoldurEgzersizi';
import { EserTaniEgzersizi } from './EserTaniEgzersizi';

/*
 * `Ders.egzersizler` dizisi `Egzersiz` (union alanlı) tipindedir; tip ile veri
 * alanı arasındaki bağ TS'te otomatik daralmadığı için dört küçük tip koruması
 * kullanılır. `any` yok, çalışma zamanında da güvenli.
 */
function eslestirMi(egzersiz: Egzersiz): egzersiz is Egzersiz<'eslestir'> {
  return egzersiz.tip === 'eslestir';
}

function siralaMi(egzersiz: Egzersiz): egzersiz is Egzersiz<'sirala'> {
  return egzersiz.tip === 'sirala';
}

function boslukMu(egzersiz: Egzersiz): egzersiz is Egzersiz<'bosluk-doldur'> {
  return egzersiz.tip === 'bosluk-doldur';
}

function eserTaniMi(egzersiz: Egzersiz): egzersiz is Egzersiz<'eser-tani'> {
  return egzersiz.tip === 'eser-tani';
}

interface Props {
  egzersiz: Egzersiz;
  onBitti: () => void;
}

export function EgzersizCalistirici({ egzersiz, onBitti }: Props) {
  // Not: her egzersiz kendi durumunu tutar; üst bileşen `key` ile değiştirir.

  const kaynak = egzersiz.kaynak;

  if (eslestirMi(egzersiz)) {
    return <EslestirEgzersizi veri={egzersiz.veri} kaynak={kaynak} onBitti={onBitti} />;
  }
  if (siralaMi(egzersiz)) {
    return <SiralaEgzersizi veri={egzersiz.veri} kaynak={kaynak} onBitti={onBitti} />;
  }
  if (boslukMu(egzersiz)) {
    return <BoslukDoldurEgzersizi veri={egzersiz.veri} kaynak={kaynak} onBitti={onBitti} />;
  }
  if (eserTaniMi(egzersiz)) {
    return <EserTaniEgzersizi veri={egzersiz.veri} kaynak={kaynak} onBitti={onBitti} />;
  }

  // Savunmacı dal: veritabanına yeni bir tip eklenirse akış kilitlenmesin.
  return (
    <EgzersizKabugu
      tip="Bilinmeyen"
      yonerge="Bu egzersiz türü bu sürümde gösterilemiyor."
      kaynak={kaynak}
      geriBildirim={null}
      onDevam={onBitti}
    >
      <p className="bildirim bildirim--bilgi">
        İlerlemek için “Devam” düğmesini kullanabilirsin.
      </p>
    </EgzersizKabugu>
  );
}

interface AdimProps {
  egzersizler: Egzersiz[];
  /** Sıradaki egzersizin indeksi (DersSayfasi yönetir). */
  sirasi: number;
  /** PDF: "sessiz mod" — ses olmadan da akışın tamamı bitirilebilir. */
  sessizMod: boolean;
  onIlerle: () => void;
  /** Aralıklı tekrar: varsa ilk egzersiz önceki bir dersten gelir. */
  tekrarGorevi?: TekrarGorevi | null;
  onTekrarBitti?: (ipucusuz: boolean) => void;
}

/**
 * Önceki dersten gelen tekrar sorusu. İpucu görülüp görülmediği
 * EgzersizKabugu'ndan bağlamla öğrenilir; sonuç Leitner takvimini günceller.
 */
function TekrarEgzersizi({
  gorev,
  onBitti,
}: {
  gorev: TekrarGorevi;
  onBitti: (ipucusuz: boolean) => void;
}) {
  const ipucuAlindi = useRef(false);
  const ipucuGoruldu = useCallback(() => {
    ipucuAlindi.current = true;
  }, []);
  const ad = gorev.kayit.eserAdi.split(' (')[0];

  return (
    <div className="yigin">
      <div className="ders-tekrar-bandi">
        <span className="ders-tekrar-bandi__ikon" aria-hidden="true">
          <IkonTekrar boyut={20} />
        </span>
        <p>
          <strong>Tekrar zamanı:</strong> {ad} dersinden hatırla
        </p>
      </div>
      <IpucuBildirimi.Provider value={ipucuGoruldu}>
        <EgzersizCalistirici
          key={`tekrar-${gorev.egzersiz.id}`}
          egzersiz={gorev.egzersiz}
          onBitti={() => onBitti(!ipucuAlindi.current)}
        />
      </IpucuBildirimi.Provider>
    </div>
  );
}

/** 04 · GERİ ÇAĞIRMA adımı: egzersizleri sırayla sunar. */
export function GeriCagirmaAdimi({
  egzersizler,
  sirasi,
  sessizMod,
  onIlerle,
  tekrarGorevi = null,
  onTekrarBitti,
}: AdimProps) {
  const ofset = tekrarGorevi ? 1 : 0;

  if (tekrarGorevi && sirasi === 0) {
    return (
      <div className="yigin">
        <TekrarEgzersizi
          gorev={tekrarGorevi}
          onBitti={(ipucusuz) => {
            onTekrarBitti?.(ipucusuz);
            onIlerle();
          }}
        />
      </div>
    );
  }

  const egzersiz = egzersizler[sirasi - ofset];

  // Savunmacı dal: ders egzersizsiz yayınlanmışsa akış kilitlenmez.
  if (!egzersiz) {
    return (
      <div className="yigin">
        <p className="bildirim bildirim--bilgi">
          Bu derste geri çağırma egzersizi yok. Yansıma adımına geçebilirsin.
        </p>
        <div className="satir">
          <button type="button" className="dugme" onClick={onIlerle}>
            Devam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="yigin">

      {sessizMod ? (
        <p className="bildirim bildirim--bilgi ders-sessiz-not">
          <span className="ders-isaret" aria-hidden="true">
            !
          </span>{' '}
          Sessiz mod açık: bu bölümdeki her şey yazıyla çözülür, ses gerekmez.
        </p>
      ) : null}

      {/* key: egzersiz değişince iç durum (seçim, sıralama) sıfırlanır. */}
      <EgzersizCalistirici key={egzersiz.id} egzersiz={egzersiz} onBitti={onIlerle} />
    </div>
  );
}
