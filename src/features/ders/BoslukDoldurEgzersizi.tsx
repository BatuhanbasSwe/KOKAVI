/**
 * 04 · GERİ ÇAĞIRMA — "Boşluğu doldur" egzersizi.
 *
 * PDF: "Boşluğu doldur" görev tipi. Seçenek varsa düğmelerle (klavye dostu),
 * yoksa serbest metin girdisiyle sunulur.
 *
 * KARŞILAŞTIRMA KURALI: Büyük/küçük harf ve Türkçe karakter duyarsız
 * (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c). Çocuğun yazım hatası yanlış cevap sayılmaz.
 *
 * PDF: "Yanlış → ipucu + tekrar turu" — ipucu harf sayısı ve ilk harfle verilir;
 * iki denemeden sonra cevap gösterilir ve akış devam eder (çıkmaz sokak yok).
 */
import { useId, useState } from 'react';
import type { BoslukVerisi } from '@shared/types';
import {
  EgzersizKabugu,
  type EgzersizOrtakProps,
  type GeriBildirimVerisi,
} from './EgzersizKabugu';
import { turkceNormalize } from './yardimci';

export function BoslukDoldurEgzersizi({
  veri,
  kaynak,
  onBitti,
}: EgzersizOrtakProps<BoslukVerisi>) {
  const girdiId = useId();
  const [girilen, setGirilen] = useState('');
  const [cozuldu, setCozuldu] = useState(false);
  const [cevapGosterildi, setCevapGosterildi] = useState(false);
  const [yanlisSayisi, setYanlisSayisi] = useState(0);
  const [yanlisSecenekler, setYanlisSecenekler] = useState<string[]>([]);
  const [geriBildirim, setGeriBildirim] = useState<GeriBildirimVerisi | null>(null);

  const secenekler = veri.secenekler ?? [];
  const secenekli = secenekler.length > 0;
  const bitti = cozuldu || cevapGosterildi;

  /** İki denemeden sonra verilen cevap ipucu. */
  function ipucuMetni(): string {
    const temiz = veri.cevap.trim();
    const ilkHarf = temiz.charAt(0).toLocaleUpperCase('tr-TR');
    return `İpucu: Cevap «${ilkHarf}» harfiyle başlıyor ve ${temiz.length} harfli. Bir daha dene.`;
  }

  function basarili(deger: string) {
    setGirilen(deger);
    setCozuldu(true);
    setGeriBildirim({
      tur: 'dogru',
      baslik: 'Doğru!',
      metin: `Boşluk «${veri.cevap}» ile tamamlandı.`,
    });
  }

  function cevabiGoster() {
    setCevapGosterildi(true);
    setGirilen(veri.cevap);
    setGeriBildirim({
      tur: 'ipucu',
      baslik: 'Doğru cevap',
      metin: `«${veri.cevap}» — şimdi devam edebilirsin.`,
    });
  }

  /** Serbest metin girişiyle kontrol. */
  function kontrolEt(deger: string) {
    const deneme = deger.trim();
    if (!deneme) {
      setGeriBildirim({
        tur: 'ipucu',
        baslik: 'Cevap bekliyorum',
        metin: 'Boşluğa gelecek kelimeyi yaz, sonra “Kontrol et” düğmesine bas.',
      });
      return;
    }
    if (turkceNormalize(deneme) === turkceNormalize(veri.cevap)) {
      basarili(deneme);
      return;
    }
    if (bitti) {
      setGeriBildirim({
        tur: 'ipucu',
        baslik: 'Bu boşluk tamamlandı',
        metin: `Doğru cevap: «${veri.cevap}».`,
      });
      return;
    }

    const yeniYanlis = yanlisSayisi + 1;
    setYanlisSayisi(yeniYanlis);
    if (yeniYanlis >= 2) {
      cevabiGoster();
      return;
    }
    setGeriBildirim({ tur: 'ipucu', baslik: 'Tam olmadı', metin: ipucuMetni() });
  }

  /** Seçenekli sürümde bir seçeneğe dokunulduğunda. */
  function secenekSec(secenek: string) {
    if (bitti) {
      setGeriBildirim({
        tur: 'ipucu',
        baslik: 'Bu boşluk tamamlandı',
        metin: `Doğru cevap: «${veri.cevap}».`,
      });
      return;
    }
    if (turkceNormalize(secenek) === turkceNormalize(veri.cevap)) {
      basarili(secenek);
      return;
    }
    if (yanlisSecenekler.includes(secenek)) {
      setGeriBildirim({ tur: 'ipucu', baslik: 'Bu seçenek olmadı', metin: ipucuMetni() });
      return;
    }

    setYanlisSecenekler((mevcut) => [...mevcut, secenek]);
    const yeniYanlis = yanlisSayisi + 1;
    setYanlisSayisi(yeniYanlis);
    if (yeniYanlis >= 2) {
      cevabiGoster();
      return;
    }
    setGeriBildirim({ tur: 'ipucu', baslik: 'Bu seçenek olmadı', metin: ipucuMetni() });
  }

  // Cümleyi boşluktan böl: ilk ___ yerine cevap kutusu yerleşir.
  const parcalar = veri.metin.split('___');
  const cumleBasI = parcalar[0];
  const cumleSonu = parcalar.slice(1).join('___');
  const boslukVar = parcalar.length > 1;
  const boslukMetni = bitti ? veri.cevap : girilen;

  return (
    <EgzersizKabugu
      tip="Boşluğu doldur"
      yonerge={veri.yonerge}
      kaynak={kaynak}
      geriBildirim={geriBildirim}
      onDevam={bitti ? onBitti : null}
    >
      <p className="ders-cumle">
        {boslukVar ? (
          <>
            {cumleBasI}
            <span className="ders-bosluk">
              <span className="sr-only">boşluk: </span>
              <span aria-hidden="true">{boslukMetni.trim() || '?'}</span>
            </span>
            {cumleSonu}
          </>
        ) : (
          veri.metin
        )}
      </p>

      {secenekli ? (
        <div className="yigin ders-secenekler" role="group" aria-label="Cevap seçenekleri">
          {secenekler.map((secenek) => {
            const yanlisMi = yanlisSecenekler.includes(secenek);
            const dogruMu = bitti && turkceNormalize(secenek) === turkceNormalize(veri.cevap);
            const sinif = dogruMu
              ? 'secenek secenek--dogru'
              : yanlisMi
                ? 'secenek secenek--yanlis'
                : 'secenek';

            return (
              <button
                key={secenek}
                type="button"
                className={sinif}
                onClick={() => secenekSec(secenek)}
              >
                <span className="ders-secenek-isaret" aria-hidden="true">
                  {dogruMu ? '✓' : yanlisMi ? '!' : ''}
                </span>
                <span>{secenek}</span>
                {dogruMu ? <span className="ders-secenek-rozet">doğru</span> : null}
                {yanlisMi ? <span className="ders-secenek-rozet">olmadı</span> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          className="ders-bosluk-form"
          onSubmit={(olay) => {
            olay.preventDefault();
            kontrolEt(girilen);
          }}
          noValidate
        >
          <label className="ders-bosluk-etiket" htmlFor={girdiId}>
            Boşluğa gelecek kelime
          </label>
          <div className="satir">
            <input
              id={girdiId}
              className="ders-bosluk-girdi"
              type="text"
              value={girilen}
              onChange={(olay) => setGirilen(olay.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
            />
            <button type="submit" className="dugme">
              Kontrol et
            </button>
          </div>
          <p className="metin-soluk">
            Yazarken büyük/küçük harfe ve Türkçe harflere dikkat etmene gerek yok.
          </p>
        </form>
      )}
    </EgzersizKabugu>
  );
}
