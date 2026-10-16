/**
 * ÇOCUK TARAFI — canlı yarışmaya katılma ve oynama.
 *
 * 🔒 GİZLİLİK: Çocuktan ad istenmez. Sunucu "Turkuaz Kubbe" gibi bir takma ad
 * verir; cihazda yalnızca bu sekmenin oturum deposunda durur.
 *
 * CEZA YOK: Yanlış cevapta puan düşmez; doğru cevap ve kısa açıklaması
 * kaynağıyla gösterilir — yarışma da bir öğrenme anıdır.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useEfekt } from '@/app/useEfekt';
import { git } from '@/lib/yonlendirme';
import { Konfeti } from '@/app/Konfeti';
import { Maskot } from '@/app/Maskot';
import type { CanliOyuncuDurumu } from '@shared/canli';
import { CanliApiHatasi, PIN_BICIMI, canliApi, canliDepo } from './canliApi';
import { Duyuru, GeriSayim, Podyum, SEKILLER, SekilRozeti, useYoklama } from './parcalar';
import './canli.css';

/** `#/canli?pin=123456` bağlantısından PIN'i okur (öğretmen tahtaya bağlantı yazabilir). */
function hashPini(): string {
  const sorgu = window.location.hash.split('?')[1] ?? '';
  const pin = new URLSearchParams(sorgu).get('pin') ?? '';
  return PIN_BICIMI.test(pin) ? pin : '';
}

export function CanliKatilFormu({ baslikDuzeyi = 1 }: { baslikDuzeyi?: 1 | 2 }) {
  const [girdi, setGirdi] = useState(hashPini);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const Baslik = baslikDuzeyi === 1 ? 'h1' : 'h2';

  async function gonder(olay: FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    const pin = girdi.replace(/\s/g, '');
    if (!PIN_BICIMI.test(pin)) {
      setHata('PIN 6 rakamdan oluşur. Öğretmeninin ekranındaki sayıyı yaz.');
      return;
    }
    // Bu sekmede zaten katıldıysa aynı takma adla geri döner.
    if (canliDepo.oyuncu(pin)) return git(`canli/oyna/${pin}`);

    setHata(null);
    setBekliyor(true);
    try {
      canliDepo.oyuncuYaz(pin, await canliApi.katil(pin));
      git(`canli/oyna/${pin}`);
    } catch (e) {
      setHata(
        e instanceof CanliApiHatasi && e.kod === 'ODA_YOK'
          ? 'Bu PIN ile bir oyun bulunamadı. Sayıları kontrol et.'
          : (e as Error).message,
      );
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <form className="kart canli-katil" onSubmit={(o) => void gonder(o)} noValidate>
      <Baslik className="canli-katil__baslik">Canlı yarışmaya katıl</Baslik>
      <p className="metin-ikincil">
        Öğretmeninin ekranındaki 6 rakamlı PIN'i yaz. Adın sorulmaz; sana eğlenceli bir takma ad
        verilir.
      </p>
      <label className="canli-etiket" htmlFor="canli-pin">
        Oyun PIN'i
      </label>
      <input
        id="canli-pin"
        className="canli-katil__girdi"
        inputMode="numeric"
        autoComplete="off"
        maxLength={7}
        value={girdi}
        onChange={(o) => setGirdi(o.target.value.replace(/[^\d\s]/g, ''))}
        aria-invalid={hata ? true : undefined}
        aria-describedby={hata ? 'canli-pin-hata' : undefined}
      />
      <div role="alert">
        {hata && (
          <p id="canli-pin-hata" className="bildirim bildirim--hata">
            {hata}
          </p>
        )}
      </div>
      <button type="submit" className="dugme dugme--genis" disabled={bekliyor}>
        {bekliyor ? 'Katılıyorsun…' : 'Katıl'}
      </button>
    </form>
  );
}

export function CanliGirisSayfasi() {
  return (
    <div className="yigin canli">
      <CanliKatilFormu />
      <p className="metin-soluk">
        Öğretmen misin? <a href="#/canli/kur">Sınıfın için bir yarışma kur</a>.
      </p>
    </div>
  );
}

export function CanliOynaSayfasi({ pin }: { pin: string }) {
  const [kimlik] = useState(() => canliDepo.oyuncu(pin));
  const { veri, hata, ayarla } = useYoklama(
    kimlik ? () => canliApi.oyuncuDurumu(pin, kimlik.oyuncuAnahtari) : null,
  );
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [cevapHatasi, setCevapHatasi] = useState<string | null>(null);
  const cal = useEfekt();
  // Aşama değişince bir kez ses: sonuç açıldı / oyun bitti.
  const anAnahtari = veri ? `${veri.asama}-${veri.soru?.no ?? ''}` : '';
  useEffect(() => {
    if (!veri) return;
    if (veri.asama === 'cevap' && veri.sonuc) cal(veri.sonuc.dogruMu ? 'dogru' : 'ipucu');
    if (veri.asama === 'bitti') cal(veri.sira !== null && veri.sira <= 3 ? 'kutlama' : 'rozet');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anAnahtari]);

  if (!kimlik) {
    return (
      <div className="kart yigin canli">
        <h1>Bu oyuna henüz katılmadın</h1>
        <p>PIN'i girerek katılabilirsin.</p>
        <a className="dugme" href={`#/canli?pin=${pin}`}>
          Katıl
        </a>
      </div>
    );
  }

  const oyunYok = hata instanceof CanliApiHatasi && (hata.durum === 404 || hata.durum === 403);
  if (oyunYok) {
    return (
      <div className="kart yigin canli">
        <h1>Oyun bulunamadı</h1>
        <p>Bu oyun bitmiş ya da kapanmış olabilir. Öğretmeninden yeni PIN iste.</p>
        <a className="dugme" href="#/canli">
          Yeni PIN gir
        </a>
      </div>
    );
  }

  async function cevapla(d: CanliOyuncuDurumu, secim: number) {
    if (!d.soru || gonderiliyor) return;
    setGonderiliyor(true);
    setCevapHatasi(null);
    cal('tik');
    try {
      await canliApi.cevapla(pin, kimlik!.oyuncuAnahtari, d.soru.no, secim);
      ayarla({ ...d, cevabim: secim });
    } catch (e) {
      setCevapHatasi((e as Error).message);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="yigin canli canli--oyuncu">
      <div className="canli-ust">
        <span className="canli-takma-ad">
          <span className="sr-only">Takma adın: </span>
          {kimlik.takmaAd}
        </span>
        {veri && veri.asama !== 'lobi' && (
          <span className="canli-puan">
            {veri.puan} puan{veri.sira ? ` · ${veri.sira}.` : ''}
          </span>
        )}
      </div>

      {hata && !oyunYok && (
        <p className="bildirim bildirim--uyari" role="status">
          Bağlantı koptu, yeniden deneniyor…
        </p>
      )}

      <Duyuru mesaj={veri ? oyuncuDuyurusu(veri) : ''} />
      {!veri ? (
        <p role="status">Oyuna bağlanılıyor…</p>
      ) : (
        <OyuncuAsamasi
          d={veri}
          gonderiliyor={gonderiliyor}
          cevapHatasi={cevapHatasi}
          onCevap={(i) => void cevapla(veri, i)}
        />
      )}
    </div>
  );
}

/** Ekran okuyucuya aşama değişince söylenecek tek cümle. */
function oyuncuDuyurusu(d: CanliOyuncuDurumu): string {
  if (d.asama === 'lobi') return `Hazırsın. Takma adın ${d.takmaAd}.`;
  if (d.asama === 'bitti') return `Oyun bitti. ${d.sira}. oldun, ${d.puan} puan topladın.`;
  const soru = d.soru!;
  if (d.asama === 'soru') {
    return d.cevabim === null
      ? `Soru ${soru.no + 1}: ${soru.soru}`
      : 'Cevabın alındı. Sonuç birazdan.';
  }
  const s = d.sonuc!;
  return s.dogruMu
    ? `Doğru! ${s.kazanilan} puan kazandın.`
    : `Doğru cevap: ${soru.secenekler[s.dogruIndex]}. Puanın düşmedi.`;
}

function OyuncuAsamasi({
  d,
  gonderiliyor,
  cevapHatasi,
  onCevap,
}: {
  d: CanliOyuncuDurumu;
  gonderiliyor: boolean;
  cevapHatasi: string | null;
  onCevap: (i: number) => void;
}) {
  if (d.asama === 'lobi') {
    return (
      <section className="kart canli-bekle" aria-labelledby="canli-baslik">
        <Maskot boyut={96} />
        <h1 id="canli-baslik">Hazırsın!</h1>
        <p>
          Senin takma adın <strong>{d.takmaAd}</strong>. Öğretmenin oyunu başlatınca sorular burada
          görünecek.
        </p>
        <p className="metin-soluk">
          Şu ana kadar {d.oyuncuSayisi} kişi katıldı.
        </p>
      </section>
    );
  }

  if (d.asama === 'bitti') {
    const ilkUcte = d.sira !== null && d.sira <= 3;
    return (
      <section className="yigin canli-son" aria-labelledby="canli-baslik">
        {ilkUcte && <Konfeti />}
        <h1 id="canli-baslik" className="canli-son__baslik">
          {ilkUcte ? 'Harikasın, podyumdasın!' : 'Oyun bitti, aferin!'}
        </h1>
        <p className="canli-son__ozet">
          {d.oyuncuSayisi} kişi içinde <strong>{d.sira}.</strong> oldun ve{' '}
          <strong>{d.puan} puan</strong> topladın.
        </p>
        <Podyum siralama={d.podyum} ben={d.takmaAd} />
        <p className="metin-ikincil">
          Bu eserleri derslerde daha yakından tanıyabilirsin.
        </p>
        <a className="dugme dugme--genis" href="#/yol">
          Öğrenme yoluna dön
        </a>
      </section>
    );
  }

  const soru = d.soru!;
  const ust = (
    <div className="canli-soru-ust">
      <span className="rozet">
        Soru {soru.no + 1} / {soru.toplam}
      </span>
      {d.asama === 'soru' && (
        <GeriSayim kalanMs={soru.kalanMs} sureSn={soru.sureSn} anahtar={`${soru.no}`} />
      )}
    </div>
  );

  if (d.asama === 'soru' && d.cevabim === null) {
    return (
      <section className="yigin canli-soru" aria-labelledby="canli-soru-metni" key={soru.no}>
        {ust}
        <h1 id="canli-soru-metni" className="canli-soru__metin">
          {soru.soru}
        </h1>
        {soru.foto && <img className="canli-soru__foto" src={soru.foto.url} alt={soru.foto.alt} />}
        <div className="canli-secenekler" role="group" aria-label="Seçenekler">
          {soru.secenekler.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`canli-secenek canli-secenek--${SEKILLER[i]!.sinif}`}
              style={{ ['--sira' as string]: i }}
              disabled={gonderiliyor}
              onClick={() => onCevap(i)}
            >
              <SekilRozeti i={i} />
              <span>
                <span className="sr-only">{SEKILLER[i]!.ad}: </span>
                {s}
              </span>
            </button>
          ))}
        </div>
        <div role="alert">{cevapHatasi && <p className="bildirim bildirim--hata">{cevapHatasi}</p>}</div>
      </section>
    );
  }

  if (d.asama === 'soru') {
    return (
      <section className="kart canli-bekle" aria-labelledby="canli-baslik">
        {ust}
        <span className="canli-bekle__sekil">
          <SekilRozeti i={d.cevabim!} />
        </span>
        <h1 id="canli-baslik">
          Cevabın alındı!
        </h1>
        <p className="metin-ikincil">Diğerleri cevaplarken bekle… Sonuç birazdan.</p>
      </section>
    );
  }

  // asama === 'cevap'
  const s = d.sonuc!;
  const dogruMetin = soru.secenekler[s.dogruIndex]!;
  return (
    <section
      className={`kart yigin canli-sonuc ${s.dogruMu ? 'canli-sonuc--dogru' : 'canli-sonuc--yanlis'}`}
      aria-labelledby="canli-baslik"
      key={`sonuc-${soru.no}`}
    >
      {ust}
      <div className="canli-sonuc__rozet" aria-hidden="true">
        {s.dogruMu ? '✓' : d.cevabim === null ? '⏱' : '↻'}
      </div>
      <h1 id="canli-baslik" className="canli-sonuc__baslik">
        {s.dogruMu
          ? `Doğru! +${s.kazanilan} puan`
          : d.cevabim === null
            ? 'Süre doldu'
            : 'Bu sefer olmadı'}
      </h1>
      {!s.dogruMu && (
        <p>
          Doğru cevap:{' '}
          <span className="canli-dogru-cevap">
            <SekilRozeti i={s.dogruIndex} />
            <span className="sr-only">{SEKILLER[s.dogruIndex]!.ad}: </span>
            <strong>{dogruMetin}</strong>
          </span>
          <br />
          <span className="metin-soluk">Puanın düşmedi; bir sonraki soruda yeniden dene.</span>
        </p>
      )}
      <p className="canli-sonuc__aciklama">{s.aciklama}</p>
      {s.kaynak && <p className="kaynak">Kaynak: {s.kaynak}</p>}
    </section>
  );
}
