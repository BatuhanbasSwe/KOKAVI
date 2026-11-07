/**
 * Şehir ünitesi yönetimi — liste + tanımlama formu.
 *
 * PDF (KATMAN 04) açık taahhüdü: "Yönetim paneli — eser ekleme/düzenleme,
 * YENİ ŞEHİR ÜNİTESİ TANIMLAMA". Şartname 5.1.1 ise "sistem yeni vakıf eserleri
 * eklenmesine uygun kurgulanmalı" der; bu yüzden öğrenme yolunun iskeleti
 * (şehir → ünite) de panelden kurulabilir.
 *
 * Erişilebilirlik: her alan görünür etiketlidir, silme işlemi `OnayDiyalogu` ile
 * onaylanır, sonuçlar canlı bölgede duyurulur (şartname 5.1.4 / WCAG 2.2 AA).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Sehir, Unite } from '@shared/types';
import { api, yonetimApi } from '../../lib/api';
import { CokSatirliGirdi, MetinGirdisi, OnayKutusu, SecimGirdisi } from './Alan';
import { OnayDiyalogu } from './OnayDiyalogu';
import { VeriTablosu } from './VeriTablosu';
import { kimlikUret, metinVeyaNull, panelHataMesaji, sayiyaCevir, type AlanHatalari } from './yardimci';

interface UniteFormu {
  id: string;
  sehirId: string;
  ad: string;
  sira: string;
  aciklama: string;
}

interface SehirFormu {
  id: string;
  ad: string;
  sira: string;
  aktif: boolean;
}

const bosUniteFormu = (): UniteFormu => ({ id: '', sehirId: '', ad: '', sira: '', aciklama: '' });
const bosSehirFormu = (): SehirFormu => ({ id: '', ad: '', sira: '', aktif: true });

interface SehirGrubu {
  sehirId: string;
  ad: string;
  sira: number;
  uniteler: Unite[];
}

export interface UniteYonetimiProps {
  /**
   * Üst bileşendeki "Verileri yenile" sayacı. Değişince ünite listesi de
   * yeniden çekilir; aksi halde aynı ekranda iki farklı ünite sayısı görünür.
   */
  tazeleAnahtari?: number;
  /** Ünite/şehir eklendi-silindiğinde üstteki özet kartları tazelensin. */
  onVeriDegisti?: () => void;
}

export function UniteYonetimi({ tazeleAnahtari = 0, onVeriDegisti }: UniteYonetimiProps = {}) {
  const [uniteler, setUniteler] = useState<Unite[]>([]);
  const [sehirler, setSehirler] = useState<Sehir[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);

  const [form, setForm] = useState<UniteFormu>(bosUniteFormu);
  const [hatalar, setHatalar] = useState<AlanHatalari>({});
  const [sehirFormu, setSehirFormu] = useState<SehirFormu>(bosSehirFormu);
  const [sehirHatalari, setSehirHatalari] = useState<AlanHatalari>({});

  const [bildirim, setBildirim] = useState<string | null>(null);
  const [islemHatasi, setIslemHatasi] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const [silinecek, setSilinecek] = useState<Unite | null>(null);
  const [siliniyor, setSiliniyor] = useState(false);

  /** Kullanıcı sıra alanına dokunduysa otomatik öneri devre dışı kalır. */
  const [siraElle, setSiraElle] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [uniteListesi, sehirListesi] = await Promise.all([api.uniteler(), api.sehirler()]);
      setUniteler(uniteListesi);
      setSehirler(sehirListesi);
      setYuklemeHatasi(null);
    } catch (hata: unknown) {
      setYuklemeHatasi(panelHataMesaji(hata, 'Üniteler yüklenemedi.'));
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
    // `tazeleAnahtari` üstteki "Verileri yenile" düğmesiyle artar.
  }, [yukle, tazeleAnahtari]);

  /** Bir şehirdeki en büyük sıradan sonraki boş sıra önerilir. */
  const siraOnerisi = useCallback(
    (sehirId: string) =>
      uniteler
        .filter((unite) => unite.sehirId === sehirId)
        .reduce((enBuyuk, unite) => Math.max(enBuyuk, unite.sira), 0) + 1,
    [uniteler],
  );

  const sehirSecenekleri = useMemo(
    () => sehirler.map((sehir) => ({ deger: sehir.id, etiket: sehir.ad })),
    [sehirler],
  );

  // Şehre göre gruplama: her şehir kendi tablosunda listelenir.
  const gruplar = useMemo<SehirGrubu[]>(() => {
    const sirali = [...sehirler].sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, 'tr'));
    const sonuc: SehirGrubu[] = sirali.map((sehir) => ({
      sehirId: sehir.id,
      ad: sehir.ad,
      sira: sehir.sira,
      uniteler: [],
    }));

    const harita = new Map(sonuc.map((grup) => [grup.sehirId, grup]));
    const tanimsiz: Unite[] = [];

    for (const unite of uniteler) {
      const grup = harita.get(unite.sehirId);
      if (grup) grup.uniteler.push(unite);
      else tanimsiz.push(unite);
    }

    for (const grup of sonuc) {
      grup.uniteler.sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, 'tr'));
    }

    if (tanimsiz.length > 0) {
      sonuc.push({ sehirId: '', ad: 'Şehir kaydı bulunmayan üniteler', sira: 9999, uniteler: tanimsiz });
    }

    return sonuc;
  }, [sehirler, uniteler]);

  // --- Ünite kaydetme ------------------------------------------------------

  const uniteKaydet = async () => {
    const bulunanlar: AlanHatalari = {};
    const id = form.id.trim();

    if (id === '') bulunanlar['unite-id'] = 'Kimlik zorunludur; ünite adından otomatik üretilir.';
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      bulunanlar['unite-id'] = 'Kimlik yalnızca küçük harf, rakam ve tire içerebilir.';
    }
    if (form.sehirId === '') bulunanlar['unite-sehir'] = 'Şehir seçilmelidir.';
    if (form.ad.trim() === '') bulunanlar['unite-ad'] = 'Ünite adı zorunludur.';

    const siraHam = form.sira.trim();
    const sira = sayiyaCevir(siraHam);
    if (siraHam === '') bulunanlar['unite-sira'] = 'Sıra zorunludur (örn. 1).';
    else if (sira === null || !Number.isInteger(sira) || sira < 0) {
      bulunanlar['unite-sira'] = 'Sıra sıfır veya pozitif tam sayı olmalıdır.';
    }

    setHatalar(bulunanlar);
    setIslemHatasi(null);
    setBildirim(null);

    const ilkHataId = Object.keys(bulunanlar)[0];
    if (ilkHataId !== undefined) {
      document.getElementById(ilkHataId)?.focus();
      return;
    }

    setMesgul(true);
    try {
      await yonetimApi.uniteKaydet({
        id,
        sehirId: form.sehirId,
        ad: form.ad.trim(),
        sira: sira ?? 1,
        aciklama: metinVeyaNull(form.aciklama) ?? undefined,
      });
      setBildirim(`“${form.ad.trim()}” ünitesi kaydedildi.`);
      setForm(bosUniteFormu());
      setSiraElle(false);
      await yukle();
      onVeriDegisti?.();
    } catch (hata: unknown) {
      setIslemHatasi(panelHataMesaji(hata, 'Ünite kaydedilemedi.'));
    } finally {
      setMesgul(false);
    }
  };

  // --- Şehir kaydetme ------------------------------------------------------

  const sehirKaydet = async () => {
    const bulunanlar: AlanHatalari = {};
    const id = sehirFormu.id.trim();

    if (id === '') bulunanlar['sehir-id'] = 'Kimlik zorunludur; şehir adından otomatik üretilir.';
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      bulunanlar['sehir-id'] = 'Kimlik yalnızca küçük harf, rakam ve tire içerebilir.';
    }
    if (sehirFormu.ad.trim() === '') bulunanlar['sehir-ad'] = 'Şehir adı zorunludur.';

    const siraHam = sehirFormu.sira.trim();
    const sira = sayiyaCevir(siraHam);
    if (siraHam === '') bulunanlar['sehir-sira'] = 'Sıra zorunludur (örn. 1).';
    else if (sira === null || !Number.isInteger(sira) || sira < 0) {
      bulunanlar['sehir-sira'] = 'Sıra sıfır veya pozitif tam sayı olmalıdır.';
    }

    setSehirHatalari(bulunanlar);
    setIslemHatasi(null);
    setBildirim(null);

    const ilkHataId = Object.keys(bulunanlar)[0];
    if (ilkHataId !== undefined) {
      document.getElementById(ilkHataId)?.focus();
      return;
    }

    setMesgul(true);
    try {
      await yonetimApi.sehirKaydet({
        id,
        ad: sehirFormu.ad.trim(),
        sira: sira ?? 1,
        aktif: sehirFormu.aktif,
      });
      setBildirim(`“${sehirFormu.ad.trim()}” şehri eklendi. Şimdi ünite tanımlayabilirsiniz.`);
      setSehirFormu(bosSehirFormu());
      // Yeni şehir ünite formunda hazır seçili gelsin: içerik ekleme akışı kesilmez.
      setForm((mevcut) => ({ ...mevcut, sehirId: id, sira: String(siraOnerisi(id)) }));
      setSiraElle(false);
      await yukle();
      onVeriDegisti?.();
    } catch (hata: unknown) {
      setIslemHatasi(panelHataMesaji(hata, 'Şehir kaydedilemedi.'));
    } finally {
      setMesgul(false);
    }
  };

  // --- Ünite silme ---------------------------------------------------------

  const uniteSil = async () => {
    if (!silinecek) return;

    setSiliniyor(true);
    setIslemHatasi(null);
    setBildirim(null);
    try {
      await yonetimApi.uniteSil(silinecek.id);
      setBildirim(`“${silinecek.ad}” ünitesi silindi.`);
      setSilinecek(null);
      await yukle();
      onVeriDegisti?.();
      // Silinen satırın düğmesi kaybolduğu için odak bölüm başlığına taşınır (SC 2.4.3).
      window.setTimeout(() => document.getElementById('unite-baslik')?.focus(), 0);
    } catch (hata: unknown) {
      setIslemHatasi(panelHataMesaji(hata, 'Ünite silinemedi.'));
      setSilinecek(null);
    } finally {
      setSiliniyor(false);
    }
  };

  return (
    <section className="panel__bolum" aria-labelledby="unite-baslik">
      <div className="panel__bolum-basligi">
        <div>
          {/* tabIndex={-1}: silme sonrası odak buraya taşınır (SC 2.4.3). */}
          <h2 id="unite-baslik" tabIndex={-1}>
            Şehir üniteleri
          </h2>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            Öğrenme yolunda her şehir ünitelere, her ünite derslere ayrılır. Yeni içerik
            eklenebilmesi için şehir ve ünite tanımları buradan yönetilir.
          </p>
        </div>
        <span className="rozet">{uniteler.length} ünite · {sehirler.length} şehir</span>
      </div>

      {/* Sonuç bildirimi: kalıcı canlı bölge, ekran okuyucu duyurusu güvenilir olur. */}
      <div className="panel__bildirim-alani" role="status" aria-live="polite">
        {bildirim ? <p className="bildirim bildirim--basari">{bildirim}</p> : null}
      </div>

      {islemHatasi ? (
        <div className="bildirim bildirim--hata" role="alert">
          <p style={{ margin: 0 }}>
            <strong>İşlem tamamlanamadı.</strong> {islemHatasi}
          </p>
        </div>
      ) : null}

      {yuklemeHatasi ? (
        <div className="bildirim bildirim--hata" role="alert">
          <p style={{ margin: 0 }}>
            <strong>Üniteler yüklenemedi.</strong> {yuklemeHatasi}
          </p>
          <button
            type="button"
            className="dugme dugme--ikincil"
            onClick={() => void yukle()}
            style={{ marginTop: 'var(--b-3)' }}
          >
            Yeniden dene
          </button>
        </div>
      ) : null}

      {yukleniyor ? (
        <p className="metin-soluk" role="status">
          Üniteler yükleniyor…
        </p>
      ) : (
        <>
          {gruplar.length === 0 ? (
            <p className="bildirim bildirim--bilgi">
              Henüz şehir tanımlanmamış. Aşağıdaki “Yeni şehir ekle” bölümünden başlayın.
            </p>
          ) : null}

          {gruplar.map((grup) => (
            <div className="panel__sehir-grubu" key={grup.sehirId || 'tanimsiz'}>
              <h3 className="panel__sehir-baslik">
                {grup.ad} <span className="rozet">{grup.uniteler.length} ünite</span>
              </h3>
              <VeriTablosu
                baslik={`“${grup.ad}” üniteleri`}
                baslikGorunur
                bosMesaj={`${grup.ad} için henüz ünite tanımlanmadı.`}
                satirlar={grup.uniteler}
                satirAnahtari={(unite) => unite.id}
                sutunlar={[
                  {
                    anahtar: 'ad',
                    baslik: 'Ünite adı',
                    icerik: (unite) => (
                      <>
                        <strong>{unite.ad}</strong>
                        <br />
                        <span className="panel__kimlik">{unite.id}</span>
                      </>
                    ),
                  },
                  { anahtar: 'sira', baslik: 'Sıra', icerik: (unite) => unite.sira },
                  {
                    anahtar: 'aciklama',
                    baslik: 'Açıklama',
                    icerik: (unite) => unite.aciklama ?? <span className="metin-soluk">Yok</span>,
                  },
                  {
                    anahtar: 'islem',
                    baslik: 'İşlemler',
                    icerik: (unite) => (
                      <button
                        type="button"
                        className="dugme dugme--tehlike"
                        aria-label={`${unite.ad} ünitesini Sil`}
                        onClick={() => setSilinecek(unite)}
                      >
                        Sil
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          ))}
        </>
      )}

      {/* --- Yeni ünite formu ------------------------------------------------ */}
      <div className="kart panel__form-kart">
        <h3>Yeni şehir ünitesi tanımla</h3>
        <p className="metin-ikincil">
          Ünite, bir şehirdeki derslerin grubudur (örn. “Bursa Ünite 1”). Sıra, öğrenme
          yolundaki açılma sırasını belirler.
        </p>

        <form
          className="panel__form"
          noValidate
          aria-busy={mesgul}
          onSubmit={(olay) => {
            olay.preventDefault();
            void uniteKaydet();
          }}
        >
          <div className="izgara-2">
            <MetinGirdisi
              id="unite-id"
              etiket="Kimlik"
              deger={form.id}
              onDegistir={(deger) => setForm((mevcut) => ({ ...mevcut, id: deger }))}
              hata={hatalar['unite-id']}
              ipucu="Ünite adından otomatik üretilir (örn. bursa-unite-1)."
              zorunlu
              ornek="bursa-unite-1"
            />
            <MetinGirdisi
              id="unite-ad"
              etiket="Ünite adı"
              deger={form.ad}
              onDegistir={(deger) =>
                setForm((mevcut) => ({
                  ...mevcut,
                  ad: deger,
                  id: mevcut.id === '' || mevcut.id === kimlikUret(mevcut.ad) ? kimlikUret(deger) : mevcut.id,
                }))
              }
              hata={hatalar['unite-ad']}
              zorunlu
              ornek="Bursa Ünite 1"
            />
            <SecimGirdisi
              id="unite-sehir"
              etiket="Şehir"
              deger={form.sehirId}
              onDegistir={(deger) => {
                setForm((mevcut) => ({
                  ...mevcut,
                  sehirId: deger,
                  sira: siraElle ? mevcut.sira : String(siraOnerisi(deger)),
                }));
              }}
              secenekler={sehirSecenekleri}
              bosEtiket="Şehir seçin"
              hata={hatalar['unite-sehir']}
              ipucu={
                sehirSecenekleri.length === 0
                  ? 'Önce aşağıdan bir şehir ekleyin.'
                  : 'Ünite bu şehre bağlanır.'
              }
              zorunlu
            />
            <MetinGirdisi
              id="unite-sira"
              etiket="Sıra"
              deger={form.sira}
              onDegistir={(deger) => {
                setSiraElle(true);
                setForm((mevcut) => ({ ...mevcut, sira: deger }));
              }}
              hata={hatalar['unite-sira']}
              girdiModu="numeric"
              ipucu={
                form.sehirId !== '' && !siraElle
                  ? 'Seçilen şehirdeki son üniteden sonraki sıra önerildi.'
                  : 'Küçük sıra önce açılır.'
              }
              zorunlu
              ornek="1"
            />
          </div>

          <CokSatirliGirdi
            id="unite-aciklama"
            etiket="Açıklama"
            deger={form.aciklama}
            onDegistir={(deger) => setForm((mevcut) => ({ ...mevcut, aciklama: deger }))}
            ornek="Bu ünitede şehrin erken dönem vakıf eserleri işlenir."
          />

          <div className="panel__form-eylem">
            <button type="submit" className="dugme" disabled={mesgul}>
              {mesgul ? 'Kaydediliyor…' : 'Üniteyi kaydet'}
            </button>
          </div>
        </form>
      </div>

      {/* --- Yeni şehir (isteğe bağlı, katlanmış) ---------------------------- */}
      <details className="kart panel__katlanmis">
        <summary className="panel__ozet">Yeni şehir ekle (listede yok mu?)</summary>
        <p className="metin-ikincil">
          Ünite tanımlayabilmek için önce şehrin kayıtlı olması gerekir. “Aktif” olmayan
          şehirler öğrenme yolunda gösterilmez.
        </p>

        <form
          className="panel__form"
          noValidate
          onSubmit={(olay) => {
            olay.preventDefault();
            void sehirKaydet();
          }}
        >
          <div className="izgara-2">
            <MetinGirdisi
              id="sehir-id"
              etiket="Kimlik"
              deger={sehirFormu.id}
              onDegistir={(deger) => setSehirFormu((mevcut) => ({ ...mevcut, id: deger }))}
              hata={sehirHatalari['sehir-id']}
              ipucu="Şehir adından otomatik üretilir (örn. bursa)."
              zorunlu
              ornek="bursa"
            />
            <MetinGirdisi
              id="sehir-ad"
              etiket="Şehir adı"
              deger={sehirFormu.ad}
              onDegistir={(deger) =>
                setSehirFormu((mevcut) => ({
                  ...mevcut,
                  ad: deger,
                  id: mevcut.id === '' || mevcut.id === kimlikUret(mevcut.ad) ? kimlikUret(deger) : mevcut.id,
                }))
              }
              hata={sehirHatalari['sehir-ad']}
              zorunlu
              ornek="Bursa"
            />
            <MetinGirdisi
              id="sehir-sira"
              etiket="Sıra"
              deger={sehirFormu.sira}
              onDegistir={(deger) => setSehirFormu((mevcut) => ({ ...mevcut, sira: deger }))}
              hata={sehirHatalari['sehir-sira']}
              girdiModu="numeric"
              ipucu={`Önerilen sıra: ${sehirler.length + 1}`}
              zorunlu
              ornek="1"
            />
          </div>

          <OnayKutusu
            id="sehir-aktif"
            etiket="Aktif"
            isaretli={sehirFormu.aktif}
            onDegistir={(isaretli) => setSehirFormu((mevcut) => ({ ...mevcut, aktif: isaretli }))}
            ipucu="Kapalıysa şehir ve dersleri öğrenme yolunda görünmez."
          />

          <div className="panel__form-eylem">
            <button type="submit" className="dugme" disabled={mesgul}>
              {mesgul ? 'Kaydediliyor…' : 'Şehri kaydet'}
            </button>
          </div>
        </form>
      </details>

      <OnayDiyalogu
        acik={silinecek !== null}
        baslik="Üniteyi sil"
        aciklama={
          silinecek ? (
            <>
              <p>
                <strong>“{silinecek.ad}”</strong> ünitesi kalıcı olarak silinecek.
              </p>
              <p style={{ margin: 0 }}>
                Bu üniteye bağlı dersler de silinir. İşlem geri alınamaz.
              </p>
            </>
          ) : null
        }
        onayEtiketi="Üniteyi sil"
        tehlike
        mesgul={siliniyor}
        onOnay={() => void uniteSil()}
        onKapat={() => setSilinecek(null)}
      />
    </section>
  );
}
