/**
 * Yönetim paneli — içerik ekleme ve düzenleme.
 *
 * Şartname 5.1.1: "İçerik ekleme ve mevcut içerikleri düzenleme imkânı olmalı" ve
 * "Sistem yeni vakıf eserleri eklenmesine uygun kurgulanmalı." PDF (KATMAN 04):
 * "Yönetim paneli — eser ekleme/düzenleme, yeni şehir ünitesi tanımlama."
 *
 * Görünümler:
 *  - `eserId` yok → sekmeler: "İçerik" (liste + istatistik + filtreler + ünite
 *    yönetimi) ve "Kullanıcılar" (yönetici/öğretmen hesapları)
 *  - `eserId` dolu → eser ekleme/düzenleme formu
 *
 * Erişilebilirlik (WCAG 2.2 AA): tablo başlıkları `<th scope>`, silme işlemi
 * erişilebilir onay diyaloğuyla, sonuçlar canlı bölgede duyurulur. Sekmeler
 * WAI-ARIA "tabs" desenini izler: role=tablist/tab/tabpanel, ok tuşlarıyla
 * gezinme ve seçili sekmede `aria-selected`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Eser, Kulliye, Sehir } from '@shared/types';
import { api, yonetimApi } from '../../lib/api';
import { baslikAyarla, git } from '../../lib/yonlendirme';
import { MetinGirdisi, OnayKutusu } from './Alan';
import { EserFormu } from './EserFormu';
import { KullaniciYonetimi } from './KullaniciYonetimi';
import { OnayDiyalogu } from './OnayDiyalogu';
import { UniteYonetimi } from './UniteYonetimi';
import { VeriTablosu } from './VeriTablosu';
import { panelHataMesaji } from './yardimci';
import './panel.css';

/** Yeni kayıt formunu açan rota son eki. */
const YENI_KAYIT = 'yeni';

/** Panelin liste görünümündeki sekmeler. */
type PanelBolumu = 'icerik' | 'kullanicilar';

const SEKMELER: { anahtar: PanelBolumu; etiket: string }[] = [
  { anahtar: 'icerik', etiket: 'İçerik' },
  { anahtar: 'kullanicilar', etiket: 'Kullanıcılar' },
];

interface SekmeProps {
  aktif: PanelBolumu;
  onDegistir: (bolum: PanelBolumu) => void;
}

/**
 * Erişilebilir sekme şeridi.
 *
 * WAI-ARIA "Tabs" deseni: ok tuşları odağı taşır, Home/End uçlara gider.
 * Seçili sekme `tabIndex=0`, diğerleri `-1` — Tab tuşu şeritte tek durak olur.
 */
function PanelSekmeleri({ aktif, onDegistir }: SekmeProps) {
  const dugmeRefleri = useRef<(HTMLButtonElement | null)[]>([]);

  const odagaTasi = (indeks: number) => {
    const hedef = (indeks + SEKMELER.length) % SEKMELER.length;
    const secilen = SEKMELER[hedef];
    dugmeRefleri.current[hedef]?.focus();
    // Otomatik etkinleştirme: odaklanan sekmenin içeriği hemen görünür.
    if (secilen) onDegistir(secilen.anahtar);
  };

  return (
    <div className="panel__sekmeler" role="tablist" aria-label="Yönetim paneli bölümleri">
      {SEKMELER.map((sekme, indeks) => {
        const secili = sekme.anahtar === aktif;
        return (
          <button
            key={sekme.anahtar}
            ref={(dugme) => {
              dugmeRefleri.current[indeks] = dugme;
            }}
            type="button"
            role="tab"
            id={`panel-sekme-${sekme.anahtar}`}
            aria-selected={secili}
            aria-controls={`panel-bolum-${sekme.anahtar}`}
            tabIndex={secili ? 0 : -1}
            className={secili ? 'dugme dugme--ikincil panel__sekme panel__sekme--aktif' : 'dugme dugme--ikincil panel__sekme'}
            onClick={() => onDegistir(sekme.anahtar)}
            onKeyDown={(olay) => {
              if (olay.key === 'ArrowRight' || olay.key === 'ArrowDown') {
                olay.preventDefault();
                odagaTasi(indeks + 1);
              } else if (olay.key === 'ArrowLeft' || olay.key === 'ArrowUp') {
                olay.preventDefault();
                odagaTasi(indeks - 1);
              } else if (olay.key === 'Home') {
                olay.preventDefault();
                odagaTasi(0);
              } else if (olay.key === 'End') {
                olay.preventDefault();
                odagaTasi(SEKMELER.length - 1);
              }
            }}
          >
            {sekme.etiket}
          </button>
        );
      })}
    </div>
  );
}

interface Istatistik {
  sehir: number;
  unite: number;
  eser: number;
  ders: number;
  yayinda: number;
  belgeli: number;
}

export interface PanelSayfasiProps {
  /** Düzenlenecek eserin kimliği. Verilmezse liste görünümü açılır. */
  eserId?: string;
}

export function PanelSayfasi({ eserId }: PanelSayfasiProps) {
  /**
   * Panel kendi içinde de rota tutar: yönlendirme katmanı olmadan da (test,
   * gömülü kullanım) "yeni eser" ve "listeye dön" akışları çalışır.
   */
  const [icEserId, setIcEserId] = useState<string | null>(null);

  const aktifId = eserId ?? icEserId;
  const formAcik = aktifId !== null;
  const duzenlemeId = aktifId !== null && aktifId !== YENI_KAYIT ? aktifId : null;

  /** Liste görünümündeki aktif sekme: içerik veya kullanıcı yönetimi. */
  const [bolum, setBolum] = useState<PanelBolumu>('icerik');

  /** "Verileri yenile" ünite bölümünü de tazeler (aynı ekranda iki sayı kalmasın). */
  const [uniteTazele, setUniteTazele] = useState(0);

  // --- Veri -----------------------------------------------------------------
  const [istatistik, setIstatistik] = useState<Istatistik | null>(null);
  const [eserler, setEserler] = useState<Eser[]>([]);
  const [sehirler, setSehirler] = useState<Sehir[]>([]);
  const [kulliyeler, setKulliyeler] = useState<Kulliye[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);

  // --- Filtreler ------------------------------------------------------------
  const [arama, setArama] = useState('');
  const [sadeceYayinda, setSadeceYayinda] = useState(false);
  const [sadeceBelgeli, setSadeceBelgeli] = useState(false);

  // --- İşlem durumu ---------------------------------------------------------
  const [bildirim, setBildirim] = useState<{ tur: 'basari' | 'hata'; metin: string } | null>(null);
  const [silinecek, setSilinecek] = useState<Eser | null>(null);
  const [siliniyor, setSiliniyor] = useState(false);

  const yukle = useCallback(async (sessiz = false) => {
    if (!sessiz) setYukleniyor(true);
    try {
      const [istatistikSonuc, eserSonuc, sehirSonuc, kulliyeSonuc] = await Promise.all([
        yonetimApi.istatistik(),
        // Yönetim paneli YAYINDA OLMAYAN eserleri de görmeli.
        api.eserler({ hepsi: true }),
        api.sehirler(),
        api.kulliyeler(),
      ]);
      setIstatistik(istatistikSonuc);
      setEserler(eserSonuc);
      setSehirler(sehirSonuc);
      setKulliyeler(kulliyeSonuc);
      setYuklemeHatasi(null);
    } catch (hata: unknown) {
      setYuklemeHatasi(panelHataMesaji(hata, 'Panel verileri yüklenemedi.'));
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  // Sayfa başlığı: sekme ve ekran okuyucu için (WCAG 2.4.2).
  useEffect(() => {
    const baslik = duzenlemeId
      ? 'Eseri düzenle'
      : aktifId === YENI_KAYIT
        ? 'Yeni eser ekle'
        : bolum === 'kullanicilar'
          ? 'Kullanıcı yönetimi'
          : 'Yönetim paneli';
    baslikAyarla(baslik);
    // Uygulama kabuğu rota değişiminde genel başlığı ("Yönetim Paneli") yazar;
    // panelin daha açıklayıcı başlığı bir mikro görev sonra son sözü söyler.
    queueMicrotask(() => baslikAyarla(baslik));
  }, [aktifId, duzenlemeId, bolum]);

  /** Görünüm değişimi hem iç durumu hem adres çubuğunu günceller. */
  const gorunumeGit = useCallback((id: string | null) => {
    setIcEserId(id);
    git(id === null ? 'panel' : `panel/${id}`);
  }, []);

  // --- Liste türetmeleri ----------------------------------------------------
  const sehirHaritasi = useMemo(() => new Map(sehirler.map((sehir) => [sehir.id, sehir])), [sehirler]);

  const sehirAdi = useCallback(
    (sehirId: string) => sehirHaritasi.get(sehirId)?.ad ?? sehirId,
    [sehirHaritasi],
  );

  const suzulmus = useMemo(() => {
    const terim = arama.trim().toLocaleLowerCase('tr-TR');
    return eserler
      .filter((eser) => {
        if (sadeceYayinda && !eser.yayinda) return false;
        if (sadeceBelgeli && eser.gelirDagilimiDurumu !== 'belgeli') return false;
        if (terim !== '' && !eser.ad.toLocaleLowerCase('tr-TR').includes(terim)) return false;
        return true;
      })
      .sort((a, b) => {
        const siraA = sehirHaritasi.get(a.sehirId)?.sira ?? Number.MAX_SAFE_INTEGER;
        const siraB = sehirHaritasi.get(b.sehirId)?.sira ?? Number.MAX_SAFE_INTEGER;
        if (siraA !== siraB) return siraA - siraB;
        const sehirKarsilastirma = sehirAdi(a.sehirId).localeCompare(sehirAdi(b.sehirId), 'tr');
        return sehirKarsilastirma !== 0 ? sehirKarsilastirma : a.ad.localeCompare(b.ad, 'tr');
      });
  }, [eserler, arama, sadeceYayinda, sadeceBelgeli, sehirHaritasi, sehirAdi]);

  const filtreVar = arama.trim() !== '' || sadeceYayinda || sadeceBelgeli;

  const filtreTemizle = () => {
    setArama('');
    setSadeceYayinda(false);
    setSadeceBelgeli(false);
  };

  // --- Silme ----------------------------------------------------------------
  const eserSil = async () => {
    if (!silinecek) return;

    setSiliniyor(true);
    setBildirim(null);
    try {
      await yonetimApi.eserSil(silinecek.id);
      setBildirim({ tur: 'basari', metin: `“${silinecek.ad}” eseri silindi.` });
      setSilinecek(null);
      await yukle(true);
      // Silinen satırın düğmesi kaybolduğu için odak liste başlığına taşınır (SC 2.4.3).
      window.setTimeout(() => document.getElementById('panel-eser-baslik')?.focus(), 0);
    } catch (hata: unknown) {
      setBildirim({
        tur: 'hata',
        metin: panelHataMesaji(hata, 'Eser silinemedi.'),
      });
      setSilinecek(null);
    } finally {
      setSiliniyor(false);
    }
  };

  // --- Form görünümü --------------------------------------------------------
  /** Yükleme hatası iki görünümde de görünür ve yeniden denemeye izin verir. */
  const yuklemeHatasiKutusu = yuklemeHatasi ? (
    <div className="bildirim bildirim--hata" role="alert">
      <p style={{ margin: 0 }}>
        <strong>Panel verileri yüklenemedi.</strong> {yuklemeHatasi}{' '}
        {formAcik ? 'Şehir ve külliye listeleri eksik olabilir.' : null}
      </p>
      <button
        type="button"
        className="dugme dugme--ikincil"
        style={{ marginTop: 'var(--b-3)' }}
        onClick={() => void yukle()}
      >
        Yeniden dene
      </button>
    </div>
  ) : null;

  if (formAcik) {
    return (
      <div className="panel">
        {yuklemeHatasiKutusu}
        <EserFormu
          /* Kimlik değişince form sıfırdan kurulur; yarım kalan kayıt karışmaz. */
          key={duzenlemeId ?? YENI_KAYIT}
          eserId={duzenlemeId}
          sehirler={sehirler}
          kulliyeler={kulliyeler}
          onListeyeDon={() => gorunumeGit(null)}
        />
      </div>
    );
  }

  // --- Liste görünümü -------------------------------------------------------
  const istatistikKartlari = istatistik
    ? [
        { etiket: 'Şehir', deger: istatistik.sehir, not: null as string | null },
        { etiket: 'Ünite', deger: istatistik.unite, not: null },
        { etiket: 'Eser', deger: istatistik.eser, not: null },
        { etiket: 'Ders', deger: istatistik.ders, not: null },
        {
          etiket: 'Yayında',
          deger: istatistik.yayinda,
          not: `${istatistik.eser - istatistik.yayinda} taslak`,
        },
        {
          etiket: 'Gelir dağılımı belgeli',
          deger: istatistik.belgeli,
          not: `Belge bulunamadı: ${istatistik.eser - istatistik.belgeli}`,
        },
      ]
    : [];

  return (
    <div className="panel">
      <div className="panel__baslik-satiri">
        <div>
          <p className="etiket">KATMAN 04 · Yönetim</p>
          <h1>Yönetim paneli</h1>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            {bolum === 'kullanicilar'
              ? 'Yönetici ve öğretmen hesaplarını yönetin. Çocuklar için hesap açılmaz; öğrenciler cihaz-yerel anonim profille ilerler.'
              : 'Vakıf eserlerini ekleyin, düzenleyin ve yayın durumunu yönetin. Her kayıt kaynağıyla birlikte saklanır; oran belgelenmemişse uygulama bunu açıkça söyler.'}
          </p>
        </div>
      </div>

      {/* Sekme şeridi: içerik yönetimi ↔ kullanıcı yönetimi. */}
      <PanelSekmeleri aktif={bolum} onDegistir={setBolum} />

      {/*
        Sekme panelleri. Etkin olmayan panel `hidden` ile hem görselden hem
        erişilebilirlik ağacından çıkarılır; her sekme `aria-controls` ile
        kendi panelini gösterir (WAI-ARIA Tabs deseni).
      */}
      <div
        className="panel__sekme-icerik"
        id="panel-bolum-icerik"
        role="tabpanel"
        aria-labelledby="panel-sekme-icerik"
        hidden={bolum !== 'icerik'}
      >
        <div className="satir" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="dugme"
            onClick={() => {
              setBildirim(null);
              gorunumeGit(YENI_KAYIT);
            }}
          >
            + Yeni eser ekle
          </button>
          <button
            type="button"
            className="dugme dugme--ikincil"
            onClick={() => {
              void yukle(true);
              setUniteTazele((sayi) => sayi + 1);
            }}
            disabled={yukleniyor}
          >
            Verileri yenile
          </button>
        </div>

        {/* Sonuç bildirimi: kalıcı canlı bölge, duyuru güvenilir olur (SC 4.1.3). */}
        <div className="panel__bildirim-alani" role="status" aria-live="polite">
          {bildirim ? (
            <p
              className={
                bildirim.tur === 'basari' ? 'bildirim bildirim--basari' : 'bildirim bildirim--hata'
              }
            >
              {bildirim.metin}
            </p>
          ) : null}
        </div>

        {yuklemeHatasiKutusu}

        {/* --- İstatistikler ------------------------------------------------- */}
        <section aria-labelledby="panel-ozet-baslik">
          <h2 id="panel-ozet-baslik">İçerik özeti</h2>
          {yukleniyor && !istatistik ? (
            <p className="metin-soluk" role="status">
              İstatistikler yükleniyor…
            </p>
          ) : (
            <dl className="panel__istatistik">
              {istatistikKartlari.map((kart) => (
                <div className="panel__ist-kart" key={kart.etiket}>
                  <dt className="panel__ist-etiket">{kart.etiket}</dt>
                  <dd className="panel__ist-sayi">
                    {kart.deger}
                    {kart.not ? <span className="panel__ist-not">{kart.not}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* --- Eser listesi -------------------------------------------------- */}
        <section aria-labelledby="panel-eser-baslik">
          <div className="panel__bolum-basligi">
            {/* tabIndex={-1}: silme sonrası odak buraya taşınır (SC 2.4.3). */}
            <h2 id="panel-eser-baslik" tabIndex={-1}>
              Vakıf eserleri
            </h2>
            <p className="panel__sonuc" role="status">
              {suzulmus.length} / {eserler.length} eser gösteriliyor
            </p>
          </div>

          <div className="kart panel__filtreler">
            <MetinGirdisi
              id="panel-arama"
              etiket="Eser adında ara"
              deger={arama}
              onDegistir={setArama}
              tur="search"
              ornek="Ulu Cami"
            />
            <OnayKutusu
              id="panel-filtre-yayinda"
              etiket="Sadece yayında olanlar"
              isaretli={sadeceYayinda}
              onDegistir={setSadeceYayinda}
            />
            <OnayKutusu
              id="panel-filtre-belgeli"
              etiket="Sadece gelir dağılımı belgeli olanlar"
              isaretli={sadeceBelgeli}
              onDegistir={setSadeceBelgeli}
            />
            {filtreVar ? (
              <div className="panel__filtre-temizle">
                <button type="button" className="dugme dugme--ikincil" onClick={filtreTemizle}>
                  Filtreleri temizle
                </button>
              </div>
            ) : null}
          </div>

          {yukleniyor && eserler.length === 0 ? (
            <p className="metin-soluk" role="status">
              Eserler yükleniyor…
            </p>
          ) : (
            <VeriTablosu
              baslik="Vakıf eserleri listesi"
              bosMesaj={
                eserler.length === 0
                  ? 'Henüz eser kaydı yok. “Yeni eser ekle” düğmesiyle ilk vakıf eserini tanımlayın.'
                  : 'Bu filtrelerle eşleşen eser yok. Aramayı veya filtreleri değiştirin.'
              }
              satirlar={suzulmus}
              satirAnahtari={(eser) => eser.id}
              sutunlar={[
                {
                  anahtar: 'ad',
                  baslik: 'Eser',
                  icerik: (eser) => (
                    <>
                      <strong>{eser.ad}</strong>
                      <br />
                      <span className="panel__kimlik">{eser.id}</span>
                    </>
                  ),
                },
                { anahtar: 'sehir', baslik: 'Şehir', icerik: (eser) => sehirAdi(eser.sehirId) },
                { anahtar: 'tur', baslik: 'Tür', icerik: (eser) => eser.tur },
                {
                  anahtar: 'yayinda',
                  baslik: 'Yayın durumu',
                  icerik: (eser) =>
                    eser.yayinda ? (
                      <span className="rozet rozet--yayinda">Yayında</span>
                    ) : (
                      <span className="rozet rozet--taslak">Taslak: yayında değil</span>
                    ),
                },
                {
                  anahtar: 'gelir',
                  baslik: 'Gelir dağılımı',
                  icerik: (eser) =>
                    eser.gelirDagilimiDurumu === 'belgeli' ? (
                      <span className="rozet rozet--belgeli">
                        Belgeli · {eser.gelirKalemleri.length} kalem
                      </span>
                    ) : (
                      <span className="rozet rozet--belgesiz">Belge bulunamadı</span>
                    ),
                },
                {
                  anahtar: 'islem',
                  baslik: 'İşlemler',
                  icerik: (eser) => (
                    <div className="panel__satir-eylemler">
                      <button
                        type="button"
                        className="dugme dugme--ikincil"
                        aria-label={`${eser.ad} kaydını Düzenle`}
                        onClick={() => {
                          setBildirim(null);
                          gorunumeGit(eser.id);
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        className="dugme dugme--tehlike"
                        aria-label={`${eser.ad} kaydını Sil`}
                        onClick={() => setSilinecek(eser)}
                      >
                        Sil
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </section>

        {/* --- Üniteler (PDF KATMAN 04 taahhüdü) ----------------------------- */}
        <UniteYonetimi
          tazeleAnahtari={uniteTazele}
          onVeriDegisti={() => void yukle(true)}
        />

        <OnayDiyalogu
          acik={silinecek !== null}
          baslik="Eseri sil"
          aciklama={
            silinecek ? (
              <>
                <p>
                  <strong>“{silinecek.ad}”</strong> eseri kalıcı olarak silinecek.
                </p>
                <p style={{ margin: 0 }}>
                  Bu esere bağlı dersler ve gelir kalemleri de silinir. İşlem geri alınamaz.
                </p>
              </>
            ) : null
          }
          onayEtiketi="Eseri sil"
          tehlike
          mesgul={siliniyor}
          onOnay={() => void eserSil()}
          onKapat={() => setSilinecek(null)}
        />
      </div>

      {/* --- Kullanıcı yönetimi (yönetici) ----------------------------------- */}
      <div
        className="panel__sekme-icerik"
        id="panel-bolum-kullanicilar"
        role="tabpanel"
        aria-labelledby="panel-sekme-kullanicilar"
        hidden={bolum !== 'kullanicilar'}
      >
        <KullaniciYonetimi />
      </div>
    </div>
  );
}

export default PanelSayfasi;
