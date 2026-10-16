/**
 * Günün Eseri — her gün bir vakıf eseri, 6 tahmin hakkı, sırayla açılan ipuçları.
 *
 * Wordle'dan farkı: amaç bulmaca değil ÖĞRENMEK. Bu yüzden
 *  · her yanlış tahmin yeni bir bilgi açar (şehir → kullanım → fotoğraf → …),
 *  · tahmin edilen eser de şehir/tür/dönem olarak karşılaştırılır (kıyas öğretir),
 *  · hak bitse de eser tanıtılır, derse bağlantı verilir (ceza yok).
 *
 * Erişilebilirlik: öneriler gerçek düğmeler; karşılaştırma rozetleri simge +
 * METİN taşır; sonuçlar tek kalıcı canlı bölgeden duyurulur.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useDurum } from '@/app/DurumSaglayici';
import { Konfeti } from '@/app/Konfeti';
import { Maskot } from '@/app/Maskot';
import { useEfekt } from '@/app/useEfekt';
import { ROZET_OLAYI } from '../rozetler/rozetMantigi';
import { DinleDugmesi } from '../ders/DinleDugmesi';
import { gunAnahtari } from '@/lib/ilerleme';
import {
  HAK,
  degerlendir,
  depo,
  eserBul,
  gunNumarasi,
  gununEseri,
  ipuclari,
  istatistikGuncelle,
  oner,
  paylasimMetni,
  type Donem,
  type TahminSonucu,
} from './oyun';
import './gunun-eseri.css';

const DONEM_METNI: Record<Donem, { simge: string; metin: string }> = {
  ayni: { simge: '✓', metin: 'Aynı dönem' },
  'yakin-eski': { simge: '↓', metin: 'Biraz daha eski' },
  'yakin-yeni': { simge: '↑', metin: 'Biraz daha yeni' },
  eski: { simge: '⇊', metin: 'Çok daha eski' },
  yeni: { simge: '⇈', metin: 'Çok daha yeni' },
};

function gecerGun(): string {
  const yarin = new Date();
  yarin.setHours(24, 0, 0, 0);
  const dk = Math.max(0, Math.round((yarin.getTime() - Date.now()) / 60_000));
  return dk >= 60 ? `${Math.floor(dk / 60)} saat ${dk % 60} dakika` : `${dk} dakika`;
}

export function GununEseriSayfasi() {
  const { yol } = useDurum();
  const gun = useMemo(() => gunNumarasi(gunAnahtari()), []);
  const hedef = useMemo(() => gununEseri(gun), [gun]);
  const [tahminler, setTahminler] = useState<string[]>(() => depo.gunKaydi(gun).tahminler);
  const [istatistik, setIstatistik] = useState(() => depo.istatistik());
  const [girdi, setGirdi] = useState('');
  const [duyuru, setDuyuru] = useState('');
  const [kopyalandi, setKopyalandi] = useState(false);
  const cal = useEfekt();

  const sonuclar: TahminSonucu[] = useMemo(
    () => tahminler.filter((t) => eserBul(t)).map((t) => degerlendir(t, hedef)),
    [tahminler, hedef],
  );
  const kazandi = sonuclar.some((s) => s.dogru);
  const bitti = kazandi || sonuclar.length >= HAK;
  const acikIpucu = bitti ? HAK : Math.min(HAK, sonuclar.length + 1);
  const tumIpuclari = ipuclari(hedef);
  const oneriler = useMemo(() => oner(girdi, new Set(tahminler)), [girdi, tahminler]);

  const dersId = useMemo(() => {
    for (const s of yol?.sehirler ?? [])
      for (const u of s.uniteler)
        for (const d of u.dersler) if (d.eserId === hedef.eserId) return d.dersId;
    return null;
  }, [yol, hedef]);

  function tahminEt(eserId: string) {
    if (bitti || tahminler.includes(eserId)) return;
    const yeni = [...tahminler, eserId];
    setTahminler(yeni);
    setGirdi('');
    depo.gunKaydiYaz({ gun, tahminler: yeni });
    const s = degerlendir(eserId, hedef);
    const kalan = HAK - yeni.length;
    if (s.dogru || kalan === 0) {
      const ist = istatistikGuncelle(istatistik, gun, s.dogru, yeni.length);
      setIstatistik(ist);
      depo.istatistikYaz(ist);
      window.dispatchEvent(new Event(ROZET_OLAYI)); // rozet bildirimi yeniden hesaplasın
    }
    const e = eserBul(eserId)!;
    cal(s.dogru ? 'kutlama' : 'ipucu');
    setDuyuru(
      s.dogru
        ? `Bildin! Günün eseri ${hedef.ad}.`
        : kalan === 0
          ? `Hakların bitti. Günün eseri ${hedef.ad}.`
          : `${e.kisaAd} değil. Şehir ${s.sehirAyni ? 'aynı' : 'farklı'}, tür ${s.turAyni ? 'aynı' : 'farklı'}, ${DONEM_METNI[s.donem].metin.toLocaleLowerCase('tr')}. Yeni ipucu açıldı. ${kalan} hakkın kaldı.`,
    );
  }

  function gonder(olay: FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    const ilk = oneriler[0];
    if (ilk) tahminEt(ilk.eserId);
  }

  async function paylas() {
    const metin = paylasimMetni(gun, sonuclar, kazandi);
    try {
      if (navigator.share) await navigator.share({ text: metin });
      else {
        await navigator.clipboard.writeText(metin);
        setKopyalandi(true);
      }
    } catch {
      /* kullanıcı paylaşımı kapattı */
    }
  }

  return (
    <div className="yigin ge">
      <div className="sr-only" role="status" aria-live="polite">
        {duyuru}
      </div>

      <header className="ge-ust">
        <Maskot boyut={64} mutlu={kazandi} />
        <div>
          <p className="etiket">Günün Eseri #{gun + 1}</p>
          <h1 className="ge-ust__baslik">Bugünün eserini bul!</h1>
          <p className="metin-ikincil ge-ust__aciklama">
            Her yanlış tahminde yeni bir ipucu açılır. {HAK} hakkın var.
          </p>
        </div>
      </header>

      <ol className="ge-ipuclari" aria-label="İpuçları">
        {tumIpuclari.map((ip, i) => {
          const acik = i < acikIpucu;
          return (
            <li key={ip.baslik} className={`ge-ipucu${acik ? ' ge-ipucu--acik' : ''}`}>
              <span className="ge-ipucu__no" aria-hidden="true">
                {i + 1}
              </span>
              <div className="ge-ipucu__govde">
                <span className="ge-ipucu__baslik">{ip.baslik}</span>
                {!acik ? (
                  <span className="ge-ipucu__kilit">
                    <span aria-hidden="true">🔒 </span>
                    {i}. yanlış tahminden sonra açılır
                  </span>
                ) : ip.tur === 'foto' ? (
                  <img
                    className="ge-ipucu__foto"
                    src={ip.url}
                    alt={bitti ? `${hedef.ad} fotoğrafı` : 'Aradığın eserin fotoğrafı'}
                  />
                ) : (
                  <span className="ge-ipucu__metin">{ip.metin}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {sonuclar.length > 0 && (
        <section aria-labelledby="ge-tahminler">
          <h2 id="ge-tahminler" className="ge-alt-baslik">
            Tahminlerin ({sonuclar.length}/{HAK})
          </h2>
          <ol className="ge-tahminler">
            {sonuclar.map((s) => {
              const e = eserBul(s.eserId)!;
              const d = DONEM_METNI[s.donem];
              return (
                <li key={s.eserId} className={`ge-tahmin${s.dogru ? ' ge-tahmin--dogru' : ''}`}>
                  <span className="ge-tahmin__ad">{e.kisaAd}</span>
                  {s.dogru ? (
                    <span className="ge-rozet ge-rozet--evet">✓ Doğru!</span>
                  ) : (
                    <span className="ge-rozetler">
                      <span className={`ge-rozet ${s.sehirAyni ? 'ge-rozet--evet' : 'ge-rozet--hayir'}`}>
                        <span aria-hidden="true">{s.sehirAyni ? '✓' : '✗'} </span>
                        {s.sehirAyni ? 'Şehir aynı' : `Şehir farklı (${e.sehir} değil)`}
                      </span>
                      <span className={`ge-rozet ${s.turAyni ? 'ge-rozet--evet' : 'ge-rozet--hayir'}`}>
                        <span aria-hidden="true">{s.turAyni ? '✓' : '✗'} </span>
                        {s.turAyni ? `Tür aynı (${e.kategori})` : `${e.kategori} değil`}
                      </span>
                      <span
                        className={`ge-rozet ${s.donem === 'ayni' ? 'ge-rozet--evet' : s.donem.startsWith('yakin') ? 'ge-rozet--yakin' : 'ge-rozet--hayir'}`}
                      >
                        <span aria-hidden="true">{d.simge} </span>
                        {d.metin}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {!bitti ? (
        <form className="kart ge-form" onSubmit={gonder}>
          <label className="ge-etiket" htmlFor="ge-girdi">
            Eserin adını yaz
          </label>
          <input
            id="ge-girdi"
            className="ge-girdi"
            autoComplete="off"
            value={girdi}
            onChange={(o) => setGirdi(o.target.value)}
            aria-describedby="ge-oneri-bilgi"
          />
          <p id="ge-oneri-bilgi" className="metin-soluk ge-oneri-bilgi">
            Yazdıkça aşağıda eserler çıkar; birine dokunarak tahmin et.
          </p>
          {oneriler.length > 0 && (
            <ul className="ge-oneriler" aria-label="Önerilen eserler">
              {oneriler.map((e) => (
                <li key={e.eserId}>
                  <button type="button" className="ge-oneri" onClick={() => tahminEt(e.eserId)}>
                    <span>{e.ad}</span>
                    <span className="ge-oneri__sehir">{e.sehir}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {girdi.trim() !== '' && oneriler.length === 0 && (
            <p className="metin-soluk">Bu adla bir ders eseri yok. Başka türlü yazmayı dene.</p>
          )}
        </form>
      ) : (
        <section className={`kart yigin ge-son${kazandi ? ' ge-son--kazandi' : ''}`} aria-labelledby="ge-son-baslik">
          {kazandi && <Konfeti />}
          <h2 id="ge-son-baslik" className="ge-son__baslik">
            {kazandi
              ? sonuclar.length === 1
                ? 'İlk tahminde! Gerçek bir kâşifsin!'
                : `Bildin! ${sonuclar.length}. tahminde buldun.`
              : 'Bu sefer olmadı, ama artık tanıyorsun:'}
          </h2>
          <img className="ge-son__foto" src={`/gorseller/${hedef.eserId}/1.webp`} alt={`${hedef.ad} fotoğrafı`} />
          <p className="ge-son__ad">
            {hedef.ad} <span className="metin-soluk">· {hedef.sehir}</span>
          </p>
          <DinleDugmesi
            metin={`${hedef.ad}, ${hedef.sehir}. ${hedef.kullanim} ${hedef.zaman} ${hedef.yaptiran}`}
            etiket="Eseri dinle"
          />
          <p className="kaynak">Kaynak: {hedef.kaynak}</p>
          <div className="satir">
            {dersId && (
              <a className="dugme" href={`#/ders/${dersId}`}>
                Bu eserin dersine git
              </a>
            )}
            <button type="button" className="dugme dugme--ikincil" onClick={() => void paylas()}>
              Sonucu paylaş
            </button>
          </div>
          <p className="metin-soluk" role="status">
            {kopyalandi ? 'Sonuç panoya kopyalandı. ' : ''}Yeni eser {gecerGun()} sonra.
          </p>

          <dl className="ge-istatistik">
            <div>
              <dt>Oynanan</dt>
              <dd>{istatistik.oynanan}</dd>
            </div>
            <div>
              <dt>Bilinen</dt>
              <dd>{istatistik.kazanilan}</dd>
            </div>
            <div>
              <dt>Seri</dt>
              <dd>{istatistik.seri}</dd>
            </div>
            <div>
              <dt>En iyi seri</dt>
              <dd>{istatistik.enIyiSeri}</dd>
            </div>
          </dl>
          <h3 className="ge-alt-baslik">Kaçıncı tahminde buldun?</h3>
          <ol className="ge-dagilim">
            {istatistik.dagilim.map((n, i) => {
              const enCok = Math.max(1, ...istatistik.dagilim);
              const bugun = kazandi && sonuclar.length === i + 1;
              return (
                <li key={i} className={bugun ? 'ge-dagilim--bugun' : undefined}>
                  <span className="ge-dagilim__no">{i + 1}</span>
                  <span className="ge-dagilim__cubuk" style={{ ['--oran' as string]: n / enCok }} aria-hidden="true" />
                  <span className="ge-dagilim__sayi">
                    {n}
                    <span className="sr-only"> gün{bugun ? ' (bugün dahil)' : ''}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
