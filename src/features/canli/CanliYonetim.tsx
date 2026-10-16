/**
 * ÖĞRETMEN TARAFI — canlı yarışma kurma ve tahtaya yansıtılan yönetim ekranı.
 *
 * Giriş gerekmez: oyun bellekte yaşar, hiçbir şey kaydedilmez. Oyunu yönetme
 * yetkisi, kurulumda bu sekmeye verilen gizli anahtardadır.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { git } from '@/lib/yonlendirme';
import { useDurum } from '@/app/DurumSaglayici';
import { Konfeti } from '@/app/Konfeti';
import {
  CANLI_SORU_SAYISI,
  CANLI_SURELER,
  type CanliKapsam,
  type CanliSunucuDurumu,
} from '@shared/canli';
import { CanliApiHatasi, canliApi, canliDepo } from './canliApi';
import {
  Duyuru,
  GeriSayim,
  Podyum,
  QrKod,
  SEKILLER,
  SekilRozeti,
  SiraListesi,
  useYoklama,
} from './parcalar';
import './canli.css';

const SORU_SAYILARI = [5, CANLI_SORU_SAYISI.varsayilan, 10, CANLI_SORU_SAYISI.en_cok];

export function CanliKurSayfasi() {
  const { yol } = useDurum();
  const [kapsam, setKapsam] = useState<CanliKapsam>('hepsi');
  const [soruSayisi, setSoruSayisi] = useState<number>(CANLI_SORU_SAYISI.varsayilan);
  const [sureSn, setSureSn] = useState<number>(CANLI_SURELER[0]);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  async function kur(olay: FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    setHata(null);
    setBekliyor(true);
    try {
      const oda = await canliApi.odaKur({ kapsam, soruSayisi, sureSn });
      canliDepo.yonetimAnahtariYaz(oda.pin, oda.sunucuAnahtari);
      git(`canli/yonet/${oda.pin}`);
    } catch (e) {
      setHata((e as Error).message);
      setBekliyor(false);
    }
  }

  return (
    <div className="yigin canli">
      <div>
        <p className="etiket">Öğretmenler için</p>
        <h1>Canlı sınıf yarışması</h1>
        <p className="metin-ikincil">
          Bu ekranı tahtaya yansıt. Öğrenciler kendi cihazlarında PIN'i girip katılır, sorular
          derslerdeki eserlerden gelir. Kimseden ad istenmez, hiçbir sonuç kaydedilmez.
        </p>
      </div>

      <form className="kart yigin canli-kur" onSubmit={(o) => void kur(o)}>
        <div className="canli-alan">
          <label className="canli-etiket" htmlFor="canli-kapsam">
            Hangi derslerden?
          </label>
          <select
            id="canli-kapsam"
            className="canli-secim"
            value={kapsam}
            onChange={(o) => setKapsam(o.target.value as CanliKapsam)}
          >
            <option value="hepsi">Bütün dersler (karışık)</option>
            {yol?.sehirler.map((s) => (
              <optgroup key={s.sehirId} label={s.ad}>
                <option value={`sehir:${s.sehirId}`}>{s.ad}: bütün üniteler</option>
                {s.uniteler.map((u) => (
                  <option key={u.uniteId} value={`unite:${u.uniteId}`}>
                    {s.ad}: {u.ad}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <fieldset className="canli-alan">
          <legend className="canli-etiket">Kaç soru?</legend>
          <div className="canli-cipler">
            {SORU_SAYILARI.map((n) => (
              <label key={n} className="canli-cip">
                <input
                  type="radio"
                  name="soru-sayisi"
                  value={n}
                  checked={soruSayisi === n}
                  onChange={() => setSoruSayisi(n)}
                />
                <span>{n} soru</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="canli-alan">
          <legend className="canli-etiket">Soru başına süre</legend>
          <div className="canli-cipler">
            {CANLI_SURELER.map((n) => (
              <label key={n} className="canli-cip">
                <input
                  type="radio"
                  name="sure"
                  value={n}
                  checked={sureSn === n}
                  onChange={() => setSureSn(n)}
                />
                <span>
                  {n} sn{n === 60 ? ' (rahat mod)' : ''}
                </span>
              </label>
            ))}
          </div>
          <p className="metin-soluk canli-ipucu">
            Rahat mod, okumaya daha çok zaman isteyen öğrenciler içindir.
          </p>
        </fieldset>

        <div role="alert">{hata && <p className="bildirim bildirim--hata">{hata}</p>}</div>
        <button type="submit" className="dugme dugme--genis" disabled={bekliyor}>
          {bekliyor ? 'Oyun kuruluyor…' : 'Oyunu kur'}
        </button>
      </form>
    </div>
  );
}

export function CanliYonetSayfasi({ pin }: { pin: string }) {
  const [anahtar] = useState(() => canliDepo.yonetimAnahtari(pin));
  const { veri, hata, ayarla } = useYoklama(
    anahtar ? () => canliApi.yonetimDurumu(pin, anahtar) : null,
  );
  const [eylemHatasi, setEylemHatasi] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  if (!anahtar) {
    return (
      <div className="kart yigin canli">
        <h1>Bu oyunu yönetemezsin</h1>
        <p>Oyunu yalnızca onu kuran sekme yönetebilir. Yeni bir oyun kurabilirsin.</p>
        <a className="dugme" href="#/canli/kur">
          Yeni oyun kur
        </a>
      </div>
    );
  }
  if (hata instanceof CanliApiHatasi && (hata.durum === 404 || hata.durum === 403)) {
    return (
      <div className="kart yigin canli">
        <h1>Oyun bulunamadı</h1>
        <p>Oyun süresi dolmuş ya da sunucu yeniden başlamış olabilir.</p>
        <a className="dugme" href="#/canli/kur">
          Yeni oyun kur
        </a>
      </div>
    );
  }

  async function eylem(ad: 'basla' | 'sonraki' | 'bitir') {
    setBekliyor(true);
    setEylemHatasi(null);
    try {
      ayarla(await canliApi.eylem(pin, anahtar!, ad));
    } catch (e) {
      setEylemHatasi((e as Error).message);
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <div className="yigin canli canli--yonetim">
      {hata && (
        <p className="bildirim bildirim--uyari" role="status">
          Sunucuyla bağlantı koptu, yeniden deneniyor…
        </p>
      )}
      <div role="alert">{eylemHatasi && <p className="bildirim bildirim--hata">{eylemHatasi}</p>}</div>
      <Duyuru mesaj={veri ? yonetimDuyurusu(veri) : ''} />
      {!veri ? (
        <p role="status">Oyun yükleniyor…</p>
      ) : (
        <YonetimAsamasi d={veri} bekliyor={bekliyor} onEylem={(a) => void eylem(a)} />
      )}
    </div>
  );
}

function yonetimDuyurusu(d: CanliSunucuDurumu): string {
  if (d.asama === 'lobi') return `${d.oyuncular.length} oyuncu katıldı.`;
  if (d.asama === 'bitti') return `Yarışma bitti. Birinci: ${d.siralama[0]?.takmaAd ?? 'yok'}.`;
  const soru = d.soru!;
  return d.asama === 'soru'
    ? `Soru ${soru.no + 1}: ${soru.soru}`
    : `Süre bitti. Doğru cevap: ${soru.secenekler[d.sonuc!.dogruIndex]}.`;
}

function YonetimAsamasi({
  d,
  bekliyor,
  onEylem,
}: {
  d: CanliSunucuDurumu;
  bekliyor: boolean;
  onEylem: (a: 'basla' | 'sonraki' | 'bitir') => void;
}) {
  const katilimAdresi = useMemo(
    () => `${window.location.origin}${window.location.pathname}#/canli?pin=${d.pin}`,
    [d.pin],
  );

  if (d.asama === 'lobi') {
    return (
      <section className="yigin canli-lobi" aria-labelledby="canli-baslik">
        <div className="kart canli-pin">
          <h1 id="canli-baslik" className="canli-pin__baslik">
            Katılmak için PIN
          </h1>
          <p className="canli-pin__sayi" aria-label={`PIN: ${d.pin.split('').join(' ')}`}>
            {d.pin.slice(0, 3)} {d.pin.slice(3)}
          </p>
          <div className="canli-pin__yollar">
            <QrKod metin={katilimAdresi} etiket="Katılım bağlantısının QR kodu" />
            <p className="metin-ikincil">
              Telefon kamerasıyla QR kodu okut
              <br />
              ya da Kök Avı → <strong>Sınıfım</strong> → <strong>Canlı yarışmaya katıl</strong>
              <br />
              <span className="canli-adres">{katilimAdresi}</span>
            </p>
          </div>
        </div>

        <div className="canli-lobi__alt">
          <h2 className="canli-lobi__sayi">
            {d.oyuncular.length === 0
              ? 'Oyuncular bekleniyor…'
              : `${d.oyuncular.length} oyuncu katıldı`}
          </h2>
          <button
            type="button"
            className="dugme"
            disabled={bekliyor || d.oyuncular.length === 0}
            onClick={() => onEylem('basla')}
          >
            Başlat
          </button>
        </div>
        <ul className="canli-oyuncular" aria-label="Katılan oyuncular">
          {d.oyuncular.map((ad) => (
            <li key={ad} className="canli-oyuncular__ad">
              {ad}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (d.asama === 'bitti') {
    return (
      <section className="yigin canli-son" aria-labelledby="canli-baslik">
        <Konfeti adet={60} />
        <h1 id="canli-baslik" className="canli-son__baslik">
          Yarışma bitti!
        </h1>
        <Podyum siralama={d.siralama} />
        <SiraListesi siralama={d.siralama} baslik="Bütün sıralama" />
        <div className="satir">
          <a className="dugme" href="#/canli/kur">
            Yeni oyun kur
          </a>
        </div>
      </section>
    );
  }

  const soru = d.soru!;
  const sonuc = d.sonuc;
  const enCok = sonuc ? Math.max(1, ...sonuc.dagilim) : 1;
  const sonSoru = soru.no + 1 >= soru.toplam;

  return (
    <section className="yigin canli-soru canli-soru--yonetim" aria-labelledby="canli-soru-metni" key={`${soru.no}-${d.asama}`}>
      <div className="canli-soru-ust">
        <span className="rozet">
          Soru {soru.no + 1} / {soru.toplam}
        </span>
        {d.asama === 'soru' ? (
          <>
            <GeriSayim kalanMs={soru.kalanMs} sureSn={soru.sureSn} anahtar={`${soru.no}`} />
            <span className="canli-cevaplayan">
              {d.cevaplayan} / {d.oyuncular.length} cevapladı
            </span>
          </>
        ) : (
          <span className="canli-cevaplayan">{d.cevaplayan} kişi cevapladı</span>
        )}
      </div>

      <h1 id="canli-soru-metni" className="canli-soru__metin">
        {soru.soru}
      </h1>
      {soru.foto && <img className="canli-soru__foto" src={soru.foto.url} alt={soru.foto.alt} />}

      <ul className="canli-secenekler" aria-label="Seçenekler">
        {soru.secenekler.map((s, i) => {
          const dogru = sonuc?.dogruIndex === i;
          return (
            <li
              key={s}
              className={`canli-secenek canli-secenek--${SEKILLER[i]!.sinif}${sonuc ? (dogru ? ' canli-secenek--dogru' : ' canli-secenek--soluk') : ''}`}
              style={{ ['--sira' as string]: i }}
            >
              <SekilRozeti i={i} />
              <span className="canli-secenek__metin">
                <span className="sr-only">{SEKILLER[i]!.ad}: </span>
                {s}
                {dogru && <span className="canli-secenek__isaret"> ✓ Doğru cevap</span>}
              </span>
              {sonuc && (
                <span className="canli-secenek__dagilim">
                  <span
                    className="canli-secenek__cubuk"
                    style={{ ['--oran' as string]: sonuc.dagilim[i]! / enCok }}
                    aria-hidden="true"
                  />
                  <span>{sonuc.dagilim[i]} kişi</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {sonuc && (
        <div className="kart canli-aciklama">
          <p className="canli-sonuc__aciklama">{sonuc.aciklama}</p>
          {sonuc.kaynak && <p className="kaynak">Kaynak: {sonuc.kaynak}</p>}
        </div>
      )}
      {sonuc && <SiraListesi siralama={d.siralama} baslik="İlk beş" />}

      <div className="satir canli-eylemler">
        <button type="button" className="dugme" disabled={bekliyor} onClick={() => onEylem('sonraki')}>
          {d.asama === 'soru' ? 'Süreyi bitir' : sonSoru ? 'Sonuçları göster' : 'Sonraki soru'}
        </button>
        <button
          type="button"
          className="dugme dugme--ikincil"
          disabled={bekliyor}
          onClick={() => onEylem('bitir')}
        >
          Oyunu bitir
        </button>
      </div>
    </section>
  );
}
