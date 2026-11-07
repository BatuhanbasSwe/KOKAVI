/**
 * Başlangıç soruları (onboarding): 4 kısa soru + özet.
 * Cevaplar yalnızca cihazda tutulur (src/lib/tercihler.ts). Her soru atlanabilir.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IkonGeri, IkonPusula, IkonTik } from '../../app/Ikonlar';
import {
  hedefDersSayisi,
  tercihleriOku,
  tercihleriYaz,
  type GunlukHedef,
  type Ilgi,
  type OnBilgi,
  type Sinif,
  type Tercihler,
} from '../../lib/tercihler';
import './baslangic.css';

export const SINIF_ADLARI: Record<Sinif, string> = {
  '4': '4. sınıf',
  '5': '5. sınıf',
  '6': '6. sınıf',
  '7+': '7. sınıf ve üstü',
  yetiskin: 'Yetişkinim (öğretmen / aile)',
};

export const ILGI_ADLARI: Record<Ilgi, string> = {
  cami: 'Cami',
  han: 'Han',
  hamam: 'Hamam',
  medrese: 'Medrese',
  'cesme-kopru': 'Çeşme ve köprü',
  kulliye: 'Külliye',
};

const ON_BILGI_ADLARI: Record<OnBilgi, string> = {
  yeni: 'Hiç duymadım',
  biraz: 'Biraz biliyorum',
  cok: 'Çok şey biliyorum',
};

const HEDEF_ADLARI: Record<GunlukHedef, string> = {
  5: '5 dakika · 1 ders',
  10: '10 dakika · 2 ders',
  15: '15 dakika · 3 ders',
};

const SORU_SAYISI = 4;

interface SecenekProps {
  secili: boolean;
  onClick: () => void;
  children: string;
}

function Secenek({ secili, onClick, children }: SecenekProps) {
  return (
    <li>
      <button type="button" className="secenek" aria-pressed={secili} onClick={onClick}>
        <span className="baslangic__secenek-metin">{children}</span>
        {secili && <IkonTik boyut={20} className="baslangic__tik" />}
      </button>
    </li>
  );
}

/**
 * Dekoratif kahraman bandı: gerçek bir Bursa eseri fotoğrafı (Ulucami, akşam ışığı).
 * Fotoğraf CSS arka planı olarak verilir; yüklenemezse bandın token'lı zemin dokusu
 * görünür, kırık görsel simgesi oluşmaz. `aria-hidden`: bilgi taşımaz, başlık
 * hemen altındadır (SC 1.1.1 süs görsel kuralı).
 */
function Kahraman() {
  return (
    <figure className="baslangic__kahraman" aria-hidden="true">
      <span className="baslangic__kahraman-etiket">
        <IkonPusula boyut={18} />
        Kök Avı · Keşfe başla
      </span>
    </figure>
  );
}

function ozetMesaji(t: Tercihler): string {
  if (t.onBilgi === 'yeni') return 'Hiç sorun değil! En baştan, adım adım keşfedeceğiz.';
  if (t.onBilgi === 'cok') return 'Harika! Bildiklerini derslerde sınayabilirsin.';
  return 'Güzel! Bildiklerinin üstüne yenilerini ekleyeceğiz.';
}

export function BaslangicSorulari() {
  const [adim, setAdim] = useState(0);
  const [t, setT] = useState<Tercihler>(() => tercihleriOku());
  const baslikRef = useRef<HTMLHeadingElement>(null);
  const ilkCizim = useRef(true);

  useEffect(() => {
    if (ilkCizim.current) {
      ilkCizim.current = false;
      return;
    }
    baslikRef.current?.focus();
  }, [adim]);

  const ileri = (yeni: Tercihler = t) => {
    if (adim === SORU_SAYISI - 1) tercihleriYaz(yeni);
    setAdim((a) => a + 1);
  };

  const atla = () => {
    const yeni: Tercihler =
      adim === 0
        ? { ...t, sinif: null }
        : adim === 1
          ? { ...t, ilgiler: [] }
          : adim === 2
            ? { ...t, onBilgi: null }
            : { ...t, gunlukHedef: null };
    setT(yeni);
    ileri(yeni);
  };

  const ilgiDegistir = (i: Ilgi) =>
    setT((o) => ({
      ...o,
      ilgiler: o.ilgiler.includes(i) ? o.ilgiler.filter((x) => x !== i) : [...o.ilgiler, i],
    }));

  if (adim >= SORU_SAYISI) {
    const ders = t.gunlukHedef ? hedefDersSayisi(t.gunlukHedef) : null;
    return (
      <div className="baslangic-sahne">
        <div className="baslangic">
          <Kahraman />
          <div className="baslangic__govde">
            <h1 className="baslangic__baslik" ref={baslikRef} tabIndex={-1}>
              Hazırsın!
            </h1>
            <p className="baslangic__aciklama">{ozetMesaji(t)}</p>
            <dl className="baslangic__ozet">
              <div>
                <dt>Sınıf</dt>
                <dd>{t.sinif ? SINIF_ADLARI[t.sinif] : 'Belirtilmedi'}</dd>
              </div>
              <div>
                <dt>Merak ettiklerin</dt>
                <dd>
                  {t.ilgiler.length ? t.ilgiler.map((i) => ILGI_ADLARI[i]).join(', ') : 'Hepsi'}
                </dd>
              </div>
              <div>
                <dt>Günlük hedef</dt>
                <dd>{ders ? `${t.gunlukHedef} dakika · ${ders} ders` : 'Serbest'}</dd>
              </div>
            </dl>
            <p className="baslangic__not">Cevapların yalnızca bu cihazda kalır.</p>
            <p className="baslangic__ipucu">
              Seçtiğin ilgi alanları yolda öncelikli olur. Değiştirmek için “Cevaplarımı değiştir”
              düğmesini kullan.
            </p>
            <div className="baslangic__eylemler">
              <a className="dugme dugme--genis" href="#/bugun">
                Yola başla
              </a>
              <button
                type="button"
                className="dugme dugme--ikincil dugme--genis"
                onClick={() => setAdim(0)}
              >
                Cevaplarımı değiştir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let soru: string;
  let ipucu: string | null = null;
  let secenekler: ReactNode;

  if (adim === 0) {
    soru = 'Kaçıncı sınıftasın?';
    secenekler = (Object.keys(SINIF_ADLARI) as Sinif[]).map((s) => (
      <Secenek key={s} secili={t.sinif === s} onClick={() => setT({ ...t, sinif: s })}>
        {SINIF_ADLARI[s]}
      </Secenek>
    ));
  } else if (adim === 1) {
    soru = 'En çok hangi eserleri merak ediyorsun?';
    ipucu = 'Birden çok seçebilirsin.';
    secenekler = (Object.keys(ILGI_ADLARI) as Ilgi[]).map((i) => (
      <Secenek key={i} secili={t.ilgiler.includes(i)} onClick={() => ilgiDegistir(i)}>
        {ILGI_ADLARI[i]}
      </Secenek>
    ));
  } else if (adim === 2) {
    soru = 'Vakıflar hakkında ne biliyorsun?';
    secenekler = (Object.keys(ON_BILGI_ADLARI) as OnBilgi[]).map((b) => (
      <Secenek key={b} secili={t.onBilgi === b} onClick={() => setT({ ...t, onBilgi: b })}>
        {ON_BILGI_ADLARI[b]}
      </Secenek>
    ));
  } else {
    soru = 'Günde ne kadar keşfetmek istersin?';
    ipucu = 'Bir ders yaklaşık 5 dakika sürer.';
    secenekler = ([5, 10, 15] as GunlukHedef[]).map((h) => (
      <Secenek key={h} secili={t.gunlukHedef === h} onClick={() => setT({ ...t, gunlukHedef: h })}>
        {HEDEF_ADLARI[h]}
      </Secenek>
    ));
  }

  return (
    <div className="baslangic-sahne">
      <div className="baslangic">
        <Kahraman />
        <div className="baslangic__govde">
          <p className="baslangic__ilerleme">
            Soru {adim + 1} / {SORU_SAYISI}
          </p>
          <div
            className="baslangic__cubuk"
            role="progressbar"
            aria-label="Sorular"
            aria-valuemin={0}
            aria-valuemax={SORU_SAYISI}
            aria-valuenow={adim + 1}
          >
            <span style={{ width: `${((adim + 1) / SORU_SAYISI) * 100}%` }} />
          </div>
          <h1 className="baslangic__baslik" ref={baslikRef} tabIndex={-1}>
            {soru}
          </h1>
          {ipucu && <p className="baslangic__aciklama">{ipucu}</p>}
          <ul className="baslangic__secenekler" aria-label={soru}>
            {secenekler}
          </ul>
          <div className="baslangic__gezinme">
            {adim > 0 && (
              <button type="button" className="dugme dugme--ikincil" onClick={() => setAdim(adim - 1)}>
                <IkonGeri boyut={20} />
                Geri
              </button>
            )}
            <button type="button" className="dugme dugme--ikincil" onClick={atla}>
              Atla
            </button>
            <button type="button" className="dugme" onClick={() => ileri()}>
              {adim === SORU_SAYISI - 1 ? 'Bitir' : 'Devam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
