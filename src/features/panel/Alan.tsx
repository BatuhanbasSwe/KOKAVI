/**
 * Etiketli form alanı ve hazır girdi bileşenleri.
 *
 * Şartname 5.1.4: arayüz WCAG 2.2 AA uyumlu olmalı. Bu bileşen şunları garanti eder:
 *  - Her girdinin GÖRÜNÜR `<label htmlFor>` etiketi vardır; placeholder etiket
 *    yerine geçmez (SC 3.3.2 Etiketler veya Talimatlar).
 *  - Hata mesajı yalnızca kırmızı kenarlıkla değil, METİNLE bildirilir ve
 *    `aria-describedby` ile girdiye bağlanır (SC 3.3.1 Hata Tanımlama).
 *  - Hatalı girdiye `aria-invalid="true"`, zorunlu alana `aria-required="true"`
 *    verilir (SC 3.3.2 / 4.1.2).
 *  - Zorunlu alan "(zorunlu)" metniyle duyurulur — renk tek başına anlam taşımaz.
 */
import type { ReactNode } from 'react';

export interface AlanGirdiOzellikleri {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  'aria-required': true | undefined;
}

export interface AlanProps {
  id: string;
  etiket: string;
  /** Dolu ise hata metni gösterilir ve aria ile bağlanır. */
  hata?: string | null;
  /** Alanın nasıl doldurulacağını anlatan kalıcı açıklama. */
  ipucu?: string | null;
  zorunlu?: boolean;
  sinif?: string;
  /** Girdiyi üreten işlev — aria öznitelikleri buradan alınır. */
  children: (ozellikler: AlanGirdiOzellikleri) => ReactNode;
}

export function Alan({ id, etiket, hata, ipucu, zorunlu, sinif, children }: AlanProps) {
  const ipucuId = ipucu ? `${id}-ipucu` : null;
  const hataId = hata ? `${id}-hata` : null;
  const aciklama = [ipucuId, hataId].filter((x): x is string => x !== null).join(' ');

  return (
    <div className={sinif ? `panel__alan ${sinif}` : 'panel__alan'}>
      <label className="panel__etiket" htmlFor={id}>
        {etiket}
        {zorunlu ? <span className="panel__zorunlu"> (zorunlu)</span> : null}
      </label>

      {ipucu ? (
        <p className="panel__ipucu" id={ipucuId ?? undefined}>
          {ipucu}
        </p>
      ) : null}

      {children({
        id,
        'aria-describedby': aciklama === '' ? undefined : aciklama,
        'aria-invalid': hata ? true : undefined,
        'aria-required': zorunlu ? true : undefined,
      })}

      {hata ? (
        // role="alert": alan hatası DOM'a girdiği anda duyurulur (SC 4.1.3).
        <p className="panel__hata" id={hataId ?? undefined} role="alert">
          <span aria-hidden="true">⚠ </span>
          {hata}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hazır girdiler
// ---------------------------------------------------------------------------

export interface GirdiOrtakProps {
  id: string;
  etiket: string;
  deger: string;
  onDegistir: (yeniDeger: string) => void;
  hata?: string | null;
  ipucu?: string | null;
  zorunlu?: boolean;
  /** Yalnızca ÖRNEK değer gösterir; etiketin yerini almaz. */
  ornek?: string;
  girdiModu?: 'text' | 'decimal' | 'numeric' | 'url';
  /** `search`, tarayıcıya arama kutusu olarak bildirilir. */
  tur?: 'text' | 'search';
  saltOkunur?: boolean;
}

/** Tek satırlık metin/sayı girdisi. */
export function MetinGirdisi({
  id,
  etiket,
  deger,
  onDegistir,
  hata,
  ipucu,
  zorunlu,
  ornek,
  girdiModu,
  tur = 'text',
  saltOkunur,
}: GirdiOrtakProps) {
  return (
    <Alan id={id} etiket={etiket} hata={hata} ipucu={ipucu} zorunlu={zorunlu}>
      {(o) => (
        <input
          {...o}
          className="panel__girdi"
          type={tur}
          inputMode={girdiModu}
          value={deger}
          placeholder={ornek}
          readOnly={saltOkunur}
          onChange={(olay) => onDegistir(olay.target.value)}
        />
      )}
    </Alan>
  );
}

export interface ParolaGirdisiProps extends GirdiOrtakProps {
  /**
   * Tarayıcı parola yöneticisine bağlam bilgisi.
   * `new-password`: hesap oluşturma alanı (WCAG 2.2 SC 3.3.8 — parola
   * yöneticisiyle doldurulabilir olmalı, kullanıcı ezberlemek zorunda değil).
   */
  otomatikDoldurma?: 'new-password' | 'current-password';
}

/** Parola girdisi — değer maskelenir, etiket ve hata bağı aynen korunur. */
export function ParolaGirdisi({
  id,
  etiket,
  deger,
  onDegistir,
  hata,
  ipucu,
  zorunlu,
  ornek,
  saltOkunur,
  otomatikDoldurma = 'new-password',
}: ParolaGirdisiProps) {
  return (
    <Alan id={id} etiket={etiket} hata={hata} ipucu={ipucu} zorunlu={zorunlu}>
      {(o) => (
        <input
          {...o}
          className="panel__girdi"
          type="password"
          autoComplete={otomatikDoldurma}
          // Parola alanında tarayıcı yazım denetimi ve otomatik büyük harf kapalı:
          // parola kuralına uygun yazımı tarayıcı bozmamalı.
          spellCheck={false}
          autoCapitalize="none"
          value={deger}
          placeholder={ornek}
          readOnly={saltOkunur}
          onChange={(olay) => onDegistir(olay.target.value)}
        />
      )}
    </Alan>
  );
}

/** Çok satırlı serbest metin (vakfiye amacı, doğrulama notu vb.). */
export function CokSatirliGirdi({
  id,
  etiket,
  deger,
  onDegistir,
  hata,
  ipucu,
  zorunlu,
  ornek,
  saltOkunur,
  satirSayisi = 3,
}: GirdiOrtakProps & { satirSayisi?: number }) {
  return (
    <Alan id={id} etiket={etiket} hata={hata} ipucu={ipucu} zorunlu={zorunlu}>
      {(o) => (
        <textarea
          {...o}
          className="panel__girdi panel__girdi--cok-satir"
          rows={satirSayisi}
          value={deger}
          placeholder={ornek}
          readOnly={saltOkunur}
          onChange={(olay) => onDegistir(olay.target.value)}
        />
      )}
    </Alan>
  );
}

export interface Secenek {
  deger: string;
  etiket: string;
}

export interface SecimGirdisiProps {
  id: string;
  etiket: string;
  deger: string;
  onDegistir: (yeniDeger: string) => void;
  secenekler: Secenek[];
  /** Seçim yapılmadığında gösterilen ilk seçenek metni. */
  bosEtiket: string;
  hata?: string | null;
  ipucu?: string | null;
  zorunlu?: boolean;
}

/** Açılır liste — seçenekler veriliş sırasında gösterilir. */
export function SecimGirdisi({
  id,
  etiket,
  deger,
  onDegistir,
  secenekler,
  bosEtiket,
  hata,
  ipucu,
  zorunlu,
}: SecimGirdisiProps) {
  return (
    <Alan id={id} etiket={etiket} hata={hata} ipucu={ipucu} zorunlu={zorunlu}>
      {(o) => (
        <select
          {...o}
          className="panel__girdi"
          value={deger}
          onChange={(olay) => onDegistir(olay.target.value)}
        >
          <option value="">{bosEtiket}</option>
          {secenekler.map((s) => (
            <option key={s.deger} value={s.deger}>
              {s.etiket}
            </option>
          ))}
        </select>
      )}
    </Alan>
  );
}

export interface OnayKutusuProps {
  id: string;
  etiket: string;
  isaretli: boolean;
  onDegistir: (isaretli: boolean) => void;
  ipucu?: string | null;
  hata?: string | null;
}

/** Onay kutusu — etiket girdinin hemen yanında görünür ve tıklanabilir. */
export function OnayKutusu({ id, etiket, isaretli, onDegistir, ipucu, hata }: OnayKutusuProps) {
  const ipucuId = ipucu ? `${id}-ipucu` : null;
  const hataId = hata ? `${id}-hata` : null;
  const aciklama = [ipucuId, hataId].filter((x): x is string => x !== null).join(' ');

  return (
    <div className="panel__alan panel__alan--onay">
      <div className="panel__onay-satiri">
        <input
          id={id}
          className="panel__onay-kutusu"
          type="checkbox"
          checked={isaretli}
          aria-describedby={aciklama === '' ? undefined : aciklama}
          aria-invalid={hata ? true : undefined}
          onChange={(olay) => onDegistir(olay.target.checked)}
        />
        <label className="panel__etiket" htmlFor={id}>
          {etiket}
        </label>
      </div>

      {ipucu ? (
        <p className="panel__ipucu" id={ipucuId ?? undefined}>
          {ipucu}
        </p>
      ) : null}

      {hata ? (
        // role="alert": alan hatası DOM'a girdiği anda duyurulur (SC 4.1.3).
        <p className="panel__hata" id={hataId ?? undefined} role="alert">
          <span aria-hidden="true">⚠ </span>
          {hata}
        </p>
      ) : null}
    </div>
  );
}
