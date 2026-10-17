/**
 * VAKIF ÇARŞISI — elmasın harcandığı yer.
 *
 * Neden "çarşı": vakıf çarşıları birer AKAR'dır; dükkân kiraları caminin,
 * medresenin, imaretin masrafını öderdi. Çocuk elmasını çarşıda harcarken
 * dersin ana fikrini bir kez daha görür.
 *
 * PDF uyumu ve pedagojik kurallar için bkz. src/lib/carsi.ts başlığı.
 * Kısaca: elmas yalnızca ders bitirerek kazanılır, hiç kaybedilmez; elmasla
 * bilgi satın alınmaz; öğrenme yolu her zaman ücretsizdir.
 */
import { useState } from 'react';
import { useDurum } from '../../app/DurumSaglayici';
import { Avatar, IkonElmas, IkonIpucu, IkonKilit, IkonTik } from '../../app/Ikonlar';
import {
  AVATARLAR,
  CEVRIMDISI_FIYAT,
  DEFTER_TEMALARI,
  IPUCU_PAKETI,
  SEHIR_PAKETI_FIYAT,
  cevrimdisiIndir,
  sahipMi,
  type Urun,
} from '../../lib/carsi';
import { ELMAS_ODULU } from '@shared/types';
import { veliOnayiGerekli } from '../../lib/veliOnayi';
import { VeliKapisi } from './VeliKapisi';
import './carsi.css';

function FiyatDugmesi({
  fiyat,
  elmas,
  etiket,
  onAl,
}: {
  fiyat: number;
  elmas: number;
  etiket: string;
  onAl: () => void;
}) {
  const eksik = fiyat - elmas;
  if (eksik > 0) {
    const ders = Math.ceil(eksik / ELMAS_ODULU);
    return (
      <p className="carsi-eksik">
        {eksik} elmas daha gerek ({ders} ders)
      </p>
    );
  }
  return (
    <button type="button" className="dugme dugme--kucuk dugme--genis" onClick={onAl} aria-label={`${etiket}: ${fiyat} elmas`}>
      <IkonElmas boyut={18} /> {fiyat}
    </button>
  );
}

export function CarsiSayfasi() {
  const { ilerleme, carsi, satinAl, sec, yol, yolIskeleti } = useDurum();
  const [mesaj, setMesaj] = useState<string>('');
  const [indiriliyor, setIndiriliyor] = useState<string | null>(null);
  // Veli kapısı bekleyen harcama (PDF: "Satın almalar veli onaylıdır").
  const [bekleyen, setBekleyen] = useState<{ amac: string; eylem: () => void } | null>(null);

  const elmas = ilerleme.elmas;

  /** Harcama isteği: veli onayı gerekiyorsa önce kapı açılır, onaydan sonra yapılır. */
  function iste(amac: string, eylem: () => void) {
    if (veliOnayiGerekli()) setBekleyen({ amac, eylem });
    else eylem();
  }

  function al(urun: Urun, sehirId?: string, basari?: string) {
    const sonuc = satinAl(urun, sehirId);
    if (sonuc.tamam) setMesaj(basari ?? `${urun.ad} senin!`);
    else if (sonuc.neden === 'yetersiz-elmas') setMesaj('Bunun için biraz daha elmas lazım. Bir ders bitir, 10 elmas kazan.');
    else if (sonuc.neden === 'zaten-sahip') setMesaj('Bu zaten sende.');
  }

  async function cevrimdisiAl(sehirId: string, sehirAdi: string) {
    const sehir = yolIskeleti.find((s) => s.sehirId === sehirId);
    if (!sehir) return;
    const dersler = sehir.uniteler.flatMap((u) => u.dersler);
    setIndiriliyor(sehirId);
    setMesaj(`${sehirAdi} indiriliyor…`);
    try {
      await cevrimdisiIndir(
        dersler.map((d) => d.dersId),
        dersler.map((d) => d.eserId),
        (bitti, toplam) => setMesaj(`${sehirAdi} indiriliyor: ${bitti}/${toplam}`),
      );
      al(
        { id: `cevrimdisi-${sehirId}`, tur: 'cevrimdisi', ad: `${sehirAdi} çevrimdışı paketi`, aciklama: '', fiyat: CEVRIMDISI_FIYAT },
        sehirId,
        `${sehirAdi} artık internetsiz de açılır.`,
      );
    } catch {
      setMesaj('İndirme tamamlanamadı; internet bağlantını kontrol et. Elmasın harcanmadı.');
    } finally {
      setIndiriliyor(null);
    }
  }

  const kilitliSehirler = yol?.sehirler.filter((s) => s.kilitli) ?? [];

  return (
    <div className="yigin carsi" style={{ gap: 'var(--b-5)' }}>
      <div className="carsi-ust">
        <div>
          <h1>Vakıf Çarşısı</h1>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            Eskiden çarşının dükkân kiraları camiyi ve medreseyi yaşatırdı. Burada da elmasların bir
            işe yarar.
          </p>
        </div>
        <span className="carsi-bakiye" aria-label={`${elmas} elmasın var`}>
          <IkonElmas boyut={26} /> {elmas}
        </span>
      </div>

      <div className="kart carsi-kurallar">
        <p style={{ margin: 0 }}>
          <strong>Elmaslar nasıl çalışır?</strong> Her bitirdiğin ders için {ELMAS_ODULU} elmas
          kazanırsın. Elmas hiç kaybolmaz, ceza olarak düşmez. Öğrenme yolu her zaman ücretsizdir;
          elmasla süs ve kolaylık alırsın.
        </p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {mesaj}
      </p>
      {mesaj ? (
        <p className="bildirim bildirim--bilgi carsi-mesaj" aria-hidden="true">
          {mesaj}
        </p>
      ) : null}

      {bekleyen ? (
        <VeliKapisi
          amac={bekleyen.amac}
          onOnay={() => {
            const { eylem } = bekleyen;
            setBekleyen(null);
            eylem();
          }}
          onVazgec={() => {
            setBekleyen(null);
            setMesaj('Harcama yapılmadı; elmasların yerinde.');
          }}
        />
      ) : null}

      {/* --- Avatar ------------------------------------------------------- */}
      <section aria-labelledby="carsi-avatar" className="yigin" style={{ gap: 'var(--b-3)' }}>
        <h2 id="carsi-avatar" className="carsi-baslik">Kâşif avatarın</h2>
        <ul className="carsi-izgara">
          {AVATARLAR.map((urun) => {
            const sahip = sahipMi(carsi, urun);
            const secili = carsi.avatar === urun.id;
            return (
              <li key={urun.id} className={`carsi-urun${secili ? ' carsi-urun--secili' : ''}`}>
                <Avatar id={urun.id} boyut={56} />
                <span className="carsi-urun__ad">{urun.ad}</span>
                <span className="carsi-urun__aciklama">{urun.aciklama}</span>
                {secili ? (
                  <span className="carsi-urun__durum">
                    <IkonTik boyut={16} /> Kullanılıyor
                  </span>
                ) : sahip ? (
                  <button type="button" className="dugme dugme--ikincil dugme--kucuk dugme--genis" onClick={() => sec(urun)}>
                    Seç
                  </button>
                ) : (
                  <FiyatDugmesi fiyat={urun.fiyat} elmas={elmas} etiket={urun.ad} onAl={() => iste(`${urun.ad} avatarı · ${urun.fiyat} elmas`, () => al(urun))} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* --- Defter teması ------------------------------------------------ */}
      <section aria-labelledby="carsi-tema" className="yigin" style={{ gap: 'var(--b-3)' }}>
        <h2 id="carsi-tema" className="carsi-baslik">Kâşif Defteri teması</h2>
        <ul className="carsi-izgara">
          {DEFTER_TEMALARI.map((urun) => {
            const sahip = sahipMi(carsi, urun);
            const secili = carsi.defterTemasi === urun.id;
            return (
              <li key={urun.id} className={`carsi-urun${secili ? ' carsi-urun--secili' : ''}`}>
                <span className={`carsi-tema-onizleme carsi-tema-onizleme--${urun.id}`} aria-hidden="true" />
                <span className="carsi-urun__ad">{urun.ad}</span>
                <span className="carsi-urun__aciklama">{urun.aciklama}</span>
                {secili ? (
                  <span className="carsi-urun__durum">
                    <IkonTik boyut={16} /> Kullanılıyor
                  </span>
                ) : sahip ? (
                  <button type="button" className="dugme dugme--ikincil dugme--kucuk dugme--genis" onClick={() => sec(urun)}>
                    Seç
                  </button>
                ) : (
                  <FiyatDugmesi fiyat={urun.fiyat} elmas={elmas} etiket={`${urun.ad} teması`} onAl={() => iste(`${urun.ad} defter teması · ${urun.fiyat} elmas`, () => al(urun))} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* --- Ek ipucu ------------------------------------------------------ */}
      <section aria-labelledby="carsi-ipucu" className="kart carsi-satir">
        <span className="carsi-satir__ikon" aria-hidden="true">
          <IkonIpucu boyut={24} />
        </span>
        <div style={{ flex: 1 }}>
          <h2 id="carsi-ipucu" className="carsi-baslik" style={{ margin: 0 }}>
            Ek ipucu
          </h2>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            Bir soruda yanlış yaptıktan sonra dersin kavram kartlarını yeniden açar. Şu an{' '}
            <strong>{carsi.ipucuHakki}</strong> hakkın var.
          </p>
        </div>
        <div style={{ minWidth: 120 }}>
          <FiyatDugmesi fiyat={IPUCU_PAKETI.fiyat} elmas={elmas} etiket={IPUCU_PAKETI.ad} onAl={() => iste(`${IPUCU_PAKETI.ad} · ${IPUCU_PAKETI.fiyat} elmas`, () => al(IPUCU_PAKETI, undefined, '3 ek ipucu hakkın eklendi.'))} />
        </div>
      </section>

      {/* --- Çevrimdışı paket -------------------------------------------- */}
      <section aria-labelledby="carsi-cevrimdisi" className="yigin" style={{ gap: 'var(--b-3)' }}>
        <h2 id="carsi-cevrimdisi" className="carsi-baslik">Çevrimdışı paket</h2>
        <p className="metin-ikincil" style={{ margin: 0 }}>
          Bir şehrin bütün derslerini telefona indir; internet olmadan da çalış.
        </p>
        <ul className="carsi-liste">
          {(yol?.sehirler ?? []).map((s) => {
            const indirildi = carsi.cevrimdisiSehirler.includes(s.sehirId);
            return (
              <li key={s.sehirId} className="carsi-liste__satir">
                <span style={{ fontWeight: 900 }}>{s.ad}</span>
                <span className="metin-soluk">{s.toplamSayi} ders</span>
                <span style={{ marginLeft: 'auto', minWidth: 120 }}>
                  {indirildi ? (
                    <span className="carsi-urun__durum">
                      <IkonTik boyut={16} /> İndirildi
                    </span>
                  ) : indiriliyor === s.sehirId ? (
                    <span className="metin-soluk">İndiriliyor…</span>
                  ) : (
                    <FiyatDugmesi
                      fiyat={CEVRIMDISI_FIYAT}
                      elmas={elmas}
                      etiket={`${s.ad} çevrimdışı paketi`}
                      onAl={() => iste(`${s.ad} çevrimdışı paketi · ${CEVRIMDISI_FIYAT} elmas`, () => void cevrimdisiAl(s.sehirId, s.ad))}
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* --- Şehir paketi (erken açma) ------------------------------------ */}
      <section aria-labelledby="carsi-sehir" className="yigin" style={{ gap: 'var(--b-3)' }}>
        <h2 id="carsi-sehir" className="carsi-baslik">Yeni şehir paketi</h2>
        <p className="metin-ikincil" style={{ margin: 0 }}>
          Şehirler sırayla, ücretsiz açılır. Beklemek istemezsen bir şehri erken açabilirsin.
        </p>
        {kilitliSehirler.length === 0 ? (
          <p className="metin-soluk" style={{ margin: 0 }}>
            Bütün şehirler zaten açık.
          </p>
        ) : (
          <ul className="carsi-liste">
            {kilitliSehirler.map((s) => (
              <li key={s.sehirId} className="carsi-liste__satir">
                <IkonKilit boyut={18} />
                <span style={{ fontWeight: 900 }}>{s.ad}</span>
                <span className="metin-soluk">{s.toplamSayi} eser</span>
                <span style={{ marginLeft: 'auto', minWidth: 120 }}>
                  <FiyatDugmesi
                    fiyat={SEHIR_PAKETI_FIYAT}
                    elmas={elmas}
                    etiket={`${s.ad} şehrini aç`}
                    onAl={() =>
                      iste(`${s.ad} şehir paketi · ${SEHIR_PAKETI_FIYAT} elmas`, () =>
                        al(
                          { id: `sehir-${s.sehirId}`, tur: 'sehir', ad: `${s.ad} paketi`, aciklama: '', fiyat: SEHIR_PAKETI_FIYAT },
                          s.sehirId,
                          `${s.ad} açıldı! Öğrenme yolunda seni bekliyor.`,
                        ),
                      )
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
