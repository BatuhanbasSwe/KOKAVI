/**
 * Harita — vakıf eserlerinin coğrafi görünümü, filtreler ve konum listesi.
 *
 * Ürün kararı (26 Ekim): harita "bu eser Türkiye'nin neresinde?" sorusunu
 * yanıtlar. Liste yalnızca ad + tür/ilçe/yıl taşır; tarihçe, İngilizce metin,
 * galeri ve sergiler burada gösterilmez (Meraklısına arşivinde durur).
 *
 * Bilgi Notu: "Mümkün olması hâlinde eserlerin harita üzerinde gösterilmesi ve
 * kullanıcıların şehir ya da eser türüne göre filtreleme yapabilmesi."
 * Filtre seçenekleri `GET /api/filtreler`'den gelir ve yalnızca eseri olan
 * seçenekleri içerir; her seçeneğin yanında eser sayısı gösterilir.
 *
 * Erişilebilirlik notu (WCAG 2.2 AA):
 *  - Harita tek başına erişilebilir bir arayüz değildir. Bu yüzden haritanın
 *    altında AYNI (filtrelenmiş) veriyi taşıyan bir liste sunulur; ekran
 *    okuyucu ve klavye kullanıcısı bilgiye listeden ulaşır (SC 1.1.1).
 *  - Filtrelerin görünür `<label htmlFor>` etiketi vardır; placeholder etiket
 *    yerine geçmez (SC 3.3.2).
 *  - Seçili filtrenin sonucu kalıcı bir `role="status"` bölgesinde duyurulur
 *    (SC 4.1.3): "Bursa, Cami: 3 eser bulundu."
 *  - Durum yalnızca renkle değil metinle bildirilir (SC 1.4.1).
 */
import type { FeatureCollection } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Eser } from '@shared/types';
import { api, type FiltreSecenekleri } from '@/lib/api';
import { kategoriBul, kategoriSayilari, type Kategori } from '../../lib/kategori';
import { useDurum } from '../../app/DurumSaglayici';
import { IkonTik } from '../../app/Ikonlar';
import { arsivListesi, ilceAdi, IL_ADLARI, type ArsivEseri } from '../arsiv/arsivVeri';
import { kucukKapak } from '../ders/EserGalerisi';
import {
  bolgeHaritasiKur,
  type BolgeSayisi,
  type HaritaEseri,
  type Seviye,
} from './bolgeHaritasi';
import { EserSatiri } from './EserSatiri';
import { BOS_FILTRELER, filtreleriCoz } from './filtreler';
import { SuzgecPaneli } from '../../app/SuzgecPaneli';
import './harita.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { maplibreYukle } from '../../lib/maplibreYukle';
import { altlikYukle } from './altlik';
import { HARITA_TEMALARI, haritaTemasiOku, haritaTemasiUygula, haritaTemasiYaz, type HaritaTemasiAdi } from './haritaTemasi';

const SEVIYELER: { ad: Seviye; etiket: string }[] = [
  { ad: 'il', etiket: 'İller' },
  { ad: 'ilce', etiket: 'İlçeler' },
  { ad: 'eser', etiket: 'Eserler' },
];

export function HaritaSayfasi() {
  const haritaKabi = useRef<HTMLDivElement>(null);
  const [secenekler, setSecenekler] = useState<FiltreSecenekleri>(BOS_FILTRELER);
  const [secilenSehir, setSecilenSehir] = useState('');
  const [secilenTur, setSecilenTur] = useState('');
  const [secilenKategori, setSecilenKategori] = useState<Kategori | ''>('');
  const [eserler, setEserler] = useState<Eser[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [filtreHatasi, setFiltreHatasi] = useState<string | null>(null);
  const [arsiv, setArsiv] = useState<ArsivEseri[]>([]);
  const [seviye, setSeviye] = useState<Seviye>('il');
  const [haritaTemasi, setHaritaTemasi] = useState<HaritaTemasiAdi>(haritaTemasiOku);
  const { ilerleme, yol } = useDurum();

  // --- Arşiv (tüm envanter eserleri): il/ilçe sayıları için ------------------
  useEffect(() => {
    let iptal = false;
    arsivListesi()
      .then((liste) => {
        if (!iptal) setArsiv(liste);
      })
      .catch(() => {
        /* arşiv yoksa sayılar yalnızca derslerden hesaplanır */
      });
    return () => {
      iptal = true;
    };
  }, []);

  /** eserId → dersId ve sıradaki dersin eseri (öğrenme yolundan) */
  const { dersler, siradakiEser } = useMemo(() => {
    const harita = new Map<string, string>();
    let siradaki: string | null = null;
    for (const sehir of yol?.sehirler ?? []) {
      for (const unite of sehir.uniteler) {
        for (const d of unite.dersler) {
          harita.set(d.eserId, d.dersId);
          if (d.dersId === yol?.guncelDersId) siradaki = d.eserId;
        }
      }
    }
    return { dersler: harita, siradakiEser: siradaki };
  }, [yol]);

  // --- Filtre seçenekleri ------------------------------------------------
  useEffect(() => {
    let iptal = false;
    api
      .filtreler()
      .then((ham) => {
        // Sunucu beklenmedik gövde dönerse arayüz çökmesin: şekil doğrulanır.
        if (!iptal) setSecenekler(filtreleriCoz(ham));
      })
      .catch(() => {
        if (!iptal) {
          setSecenekler(BOS_FILTRELER);
          // Ham `fetch` hatası ("FetchEvent.respondWith...") çocuğa gösterilmez.
          setFiltreHatasi('Filtre seçenekleri şu an yüklenemedi.');
        }
      });
    return () => {
      iptal = true;
    };
  }, []);

  // --- Eser listesi: filtre değişince yeniden yüklenir -------------------
  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    setHata(null);

    api
      .eserler({ sehir: secilenSehir || undefined, tur: secilenTur || undefined })
      .then((liste) => {
        if (!iptal) setEserler(Array.isArray(liste) ? liste : []);
      })
      .catch(() => {
        if (!iptal) {
          setEserler([]);
          setHata(
            typeof navigator !== 'undefined' && navigator.onLine === false
              ? 'İnternet yok. Harita gömülü sınırlarla açıldı; eser listesi bağlanınca gelir.'
              : 'Eser listesi şu an yüklenemedi. Biraz sonra yeniden dene.',
          );
        }
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });

    return () => {
      iptal = true;
    };
  }, [secilenSehir, secilenTur]);

  const filtreVar = secilenSehir !== '' || secilenTur !== '' || secilenKategori !== '';

  /**
   * Kategori rozetleri: sunucudan gelen ham tür sayıları kategoriye toplanır.
   * Filtre seçenekleri yüklenemezse eldeki eser listesinden sayılır; böylece
   * kategori seçimi bozuk/eksik filtre cevabında da kullanılabilir.
   */
  const kategoriSecenekleri = useMemo(() => {
    const kaynak = secenekler.turler.length
      ? secenekler.turler
      : eserler.map((eser) => ({ tur: eser.tur, sayi: 1 }));
    return kategoriSayilari(kaynak);
  }, [secenekler.turler, eserler]);

  /**
   * Kategori süzgeci TAMAMEN istemcide uygulanır: seçim değişince sunucuya
   * yeni istek gitmez. Şehir ve ham tür süzgeçleriyle birlikte çalışır.
   */
  const filtreliEserler = useMemo(
    () =>
      secilenKategori === ''
        ? eserler
        : eserler.filter((eser) => kategoriBul(eser.tur) === secilenKategori),
    [eserler, secilenKategori],
  );

  const secilenSehirAdi = useMemo(() => {
    if (secilenSehir === '') return '';
    return secenekler.sehirler.find((s) => s.id === secilenSehir)?.ad ?? secilenSehir;
  }, [secenekler.sehirler, secilenSehir]);

  /** Canlı bölge metni — SC 4.1.3. Örn. "Bursa, Cami: 3 eser bulundu." */
  const durumMetni = useMemo(() => {
    if (hata) return 'Eser listesi yüklenemedi.';
    if (yukleniyor) return 'Eserler yükleniyor…';

    const secimler = [secilenSehirAdi, secilenKategori, secilenTur].filter((secim) => secim !== '');
    // Kategori adı ham tür adıyla aynı olabilir ("Cami"); aynı söz tekrarlanmasın.
    const tekilSecimler = [...new Set(secimler)];
    if (tekilSecimler.length === 0) return `Tüm eserler: ${filtreliEserler.length} eser listelendi.`;
    return `${tekilSecimler.join(', ')}: ${filtreliEserler.length} eser bulundu.`;
  }, [hata, yukleniyor, secilenSehirAdi, secilenKategori, secilenTur, filtreliEserler.length]);

  const konumlular = useMemo(() => filtreliEserler.filter((e) => e.koordinat !== null), [filtreliEserler]);

  /** Haritaya gidecek eserler: fotoğraf, ders ve ilerleme bilgisiyle. */
  const haritaEserleri = useMemo<HaritaEseri[]>(
    () =>
      konumlular.map((e) => ({
        id: e.id,
        ad: e.ad,
        tur: e.tur,
        ilce: ilceAdi(e.ilce),
        sehirId: e.sehirId,
        lng: e.koordinat!.lng,
        lat: e.koordinat!.lat,
        kapak: e.fotograflar?.[0] ? kucukKapak(e.fotograflar[0].url) : null,
        dersId: dersler.get(e.id) ?? null,
        ogrenildi: ilerleme.defterSayfalari.includes(e.id),
        siradaki: e.id === siradakiEser,
        yaklasik: (e.kaynaklar ?? []).some((k) => k.kunye.includes('YAKLAŞIK')),
      })),
    [konumlular, dersler, siradakiEser, ilerleme.defterSayfalari],
  );

  /** İl ve ilçe sayıları: toplam = envanterdeki tüm eserler, ders = uygulamadaki dersler. */
  const { ilSayilari, ilceSayilari } = useMemo(() => {
    const il = new Map<string, BolgeSayisi & { ad: string }>();
    const ilce = new Map<string, BolgeSayisi>();
    const ekle = (ilKimligi: string, ilceKimligi: string | null, alan: 'ders' | 'toplam') => {
      if (!IL_ADLARI[ilKimligi]) return;
      const i = il.get(ilKimligi) ?? { ad: IL_ADLARI[ilKimligi]!, ders: 0, toplam: 0 };
      i[alan] += 1;
      il.set(ilKimligi, i);
      if (ilceKimligi) {
        const anahtar = `${ilKimligi}|${ilceKimligi}`;
        const c = ilce.get(anahtar) ?? { ders: 0, toplam: 0 };
        c[alan] += 1;
        ilce.set(anahtar, c);
      }
    };
    for (const a of arsiv) ekle(a.il, ilceAdi(a.ilce), 'toplam');
    for (const e of filtreliEserler) ekle(e.sehirId, ilceAdi(e.ilce), 'ders');
    // Arşiv yüklenemezse toplam en az ders sayısı kadar olsun
    for (const v of [...il.values(), ...ilce.values()]) v.toplam = Math.max(v.toplam, v.ders);
    return { ilSayilari: il, ilceSayilari: ilce };
  }, [arsiv, filtreliEserler]);

  // Eser listesi gelmese de (çevrimdışı) gömülü sınırlarla harita açılır.
  const haritaVar = konumlular.length > 0 || ilSayilari.size > 0;

  useEffect(() => {
    if (!haritaKabi.current || !haritaVar) return;
    let temizle: (() => void) | undefined;
    let iptal = false;

    void (async () => {
      // İl ve ilçe sınırları uygulamaya gömülüdür (internetsiz de çalışır).
      // Ayrıntılı altlık (sokak ve yer adları, altlik.ts) gelmezse yalnızca
      // gömülü sınırlarla çizilir.
      const [maplibre, illerModulu, ilcelerModulu, altlik] = await Promise.all([
        maplibreYukle(),
        import('./veri/turkiye-iller.json'),
        import('./veri/ilceler.json'),
        altlikYukle(),
      ]);
      if (iptal || !haritaKabi.current) return;

      // Renkler tema jetonlarından okunur (açık / koyu / yüksek kontrast + palet).
      const stil = getComputedStyle(document.documentElement);
      try {
        const h = bolgeHaritasiKur(maplibre, haritaKabi.current, {
          iller: (illerModulu as { default: unknown }).default as FeatureCollection,
          ilceler: (ilcelerModulu as { default: unknown }).default as FeatureCollection,
          eserler: haritaEserleri,
          ilSayilari,
          ilceSayilari,
          renk: (ad, yedek) => stil.getPropertyValue(ad).trim() || yedek,
          onSeviye: setSeviye,
          altlik: haritaTemasiUygula(altlik, haritaTemasi),
        });
        temizle = h.temizle;
      } catch {
        // Harita çizilemezse (WebGL yok vb.) sayfa ve liste çalışmaya devam eder.
      }
    })();

    return () => {
      iptal = true;
      temizle?.();
    };
  }, [haritaVar, haritaEserleri, ilSayilari, ilceSayilari, haritaTemasi]);

  return (
    <div className="yigin" style={{ gap: 'var(--b-5)' }}>
      <div>
        <h1>Harita</h1>
        <p className="metin-ikincil">
          Vakıf eserleri çoğunlukla müze değil; sokağın içinde ve biletisiz. Onları haritada gör.
        </p>
      </div>

      {/* --- Filtreler: şehir ve eser türü --------------------------------- */}
      <section className="harita-filtreler" aria-labelledby="harita-filtre-basligi">
        <h2 id="harita-filtre-basligi" className="sr-only">
          Filtreler
        </h2>
        <SuzgecPaneli
          etkinSayisi={[secilenSehir, secilenTur, secilenKategori].filter(Boolean).length}
          onTemizle={() => {
            setSecilenSehir('');
            setSecilenTur('');
            setSecilenKategori('');
          }}
        >
        <p className="harita-filtreler__aciklama metin-soluk">
          Yalnızca eseri olan şehir ve türler listelenir; parantez içindeki sayı o seçenekteki
          eser sayısıdır. Süzgeçler birlikte çalışır.
        </p>

        <div className="harita-filtreler__izgara">
          <div className="harita-filtre">
            <label className="harita-filtre__etiket" htmlFor="harita-filtre-sehir">
              Şehir
            </label>
            <select
              id="harita-filtre-sehir"
              className="harita-filtre__secim"
              value={secilenSehir}
              onChange={(olay) => setSecilenSehir(olay.target.value)}
            >
              <option value="">Tümü</option>
              {secenekler.sehirler.map((sehir) => (
                <option key={sehir.id} value={sehir.id}>
                  {sehir.ad} ({sehir.sayi})
                </option>
              ))}
            </select>
          </div>

          <div className="harita-filtre">
            <label className="harita-filtre__etiket" htmlFor="harita-filtre-tur">
              Eser türü
            </label>
            <select
              id="harita-filtre-tur"
              className="harita-filtre__secim"
              value={secilenTur}
              onChange={(olay) => setSecilenTur(olay.target.value)}
            >
              <option value="">Tümü</option>
              {secenekler.turler.map((tur) => (
                <option key={tur.tur} value={tur.tur}>
                  {tur.tur} ({tur.sayi})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/*
          Kategori (çocuk diliyle "Ne arıyorsun?"): ham tür metinleri
          (ör. "Cami ve külliye (cami, medrese, şadırvan...)") 11 sabit
          kategoriye indirgenir. Süzgeç TAMAMEN istemcide çalışır; seçim
          değişince yeni istek gitmez. Seçim sayısı Süz düğmesinde ve canlı
          bölgede metinle de söylenir (renk tek başına anlam taşımaz).
        */}
        {kategoriSecenekleri.length > 0 ? (
          <div className="harita-filtre__kategori">
            <p className="harita-filtre__grup-basligi" id="harita-kategori-basligi">
              Ne arıyorsun?
            </p>
            <div
              className="harita-filtre__cipler"
              role="group"
              aria-labelledby="harita-kategori-basligi"
            >
              {kategoriSecenekleri.map(({ kategori, sayi }) => {
                const secili = secilenKategori === kategori;
                return (
                  <button
                    key={kategori}
                    type="button"
                    className="harita-filtre__cip"
                    aria-pressed={secili}
                    onClick={() => setSecilenKategori(secili ? '' : kategori)}
                  >
                    {secili ? <IkonTik boyut={16} /> : null}
                    {kategori}
                    {' '}
                    <span className="harita-filtre__cip-sayi">
                      {sayi}
                      <span className="sr-only"> eser</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        </SuzgecPaneli>

        {/*
          Sonuç sayısı kalıcı bir canlı bölgede duyurulur: bölge önceden var
          olduğu için ekran okuyucular değişimi güvenilir biçimde okur.
        */}
        <p className="harita-filtreler__durum" role="status" aria-live="polite">
          {durumMetni}
        </p>

        {filtreHatasi ? (
          <p className="bildirim bildirim--uyari" role="status">
            {filtreHatasi} Liste filtresiz gösteriliyor.
          </p>
        ) : null}
      </section>

      {hata && (
        <div className="bildirim bildirim--uyari" role="status">
          {hata}
        </div>
      )}

      {haritaVar && (
        <div className="yigin" style={{ gap: 'var(--b-2)' }}>
          {/* Yakınlaştırma seviyesi: görsel ipucu (harita gibi süs; liste eşdeğer) */}
          <ol className="harita-seviye" aria-hidden="true">
            {SEVIYELER.map((s, i) => (
              <li
                key={s.ad}
                className={`harita-seviye__adim${s.ad === seviye ? ' harita-seviye__adim--aktif' : ''}`}
              >
                <span className="harita-seviye__no">{i + 1}</span>
                {s.etiket}
              </li>
            ))}
          </ol>
          {/* DENEYSEL: harita arka planı denemeleri (haritaTemasi.ts) */}
          <div className="harita-tema" role="group" aria-label="Harita görünümü (deneysel)">
            <span className="harita-tema__etiket">Harita görünümü <span className="etiket">deneysel</span></span>
            <div className="secim-grubu">
              {(Object.keys(HARITA_TEMALARI) as HaritaTemasiAdi[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="secim-dugmesi"
                  aria-pressed={haritaTemasi === t}
                  title={HARITA_TEMALARI[t].aciklama}
                  onClick={() => {
                    haritaTemasiYaz(t);
                    setHaritaTemasi(t);
                  }}
                >
                  {HARITA_TEMALARI[t].ad}
                </button>
              ))}
            </div>
          </div>
          <div
            className="harita-kap harita-kap--bolge"
            ref={haritaKabi}
            data-seviye={seviye}
            role="region"
            aria-label={`Harita: ${konumlular.length} vakıf eserinin konumu. Yakınlaştırdıkça önce ilçeler, sonra eserler görünür. Aynı bilgiler aşağıdaki listede metin olarak da yer alır.`}
          />
          <p className="metin-soluk harita-kaynak">
            Sınırlar: Natural Earth, geoBoundaries (CC BY 4.0). Konumlar: © OpenStreetMap katkıcıları
            (ODbL). Fotoğraflar: Vakıf Katılım envanterleri.{' '}
            <a href="#/arsiv">Tüm eserler için Meraklısına arşivi →</a>
          </p>
        </div>
      )}

      {/* Haritanın erişilebilir eşdeğeri — zorunlu (WCAG 1.1.1) */}
      <section aria-labelledby="harita-liste-basligi" aria-busy={yukleniyor}>
        <h2 id="harita-liste-basligi" className="bolum-basligi">
          Eserler
          <span className="metin-soluk" style={{ fontWeight: 400 }}>
            {filtreliEserler.length} kayıt
          </span>
        </h2>

        <ul className="harita-listesi">
          {filtreliEserler.map((eser) => (
            <EserSatiri
              key={eser.id}
              eser={eser}
              defterinde={ilerleme.defterSayfalari.includes(eser.id)}
            />
          ))}
        </ul>

        {!yukleniyor && !hata && filtreliEserler.length === 0 ? (
          <div className="bildirim bildirim--bilgi">
            {filtreVar ? (
              <>
                <strong>Bu süzgeçle eser bulunamadı.</strong> Farklı bir şehir, eser türü veya
                "Ne arıyorsun?" seçin; ya da süzgeçleri temizleyin.
              </>
            ) : (
              <>
                Henüz yayınlanmış eser yok. İçeriği yüklemek için: <code>npm run seed</code>
              </>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
