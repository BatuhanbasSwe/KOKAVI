/**
 * Harita — vakıf eserlerinin coğrafi görünümü, filtreler ve zengin liste.
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
import { useDurum } from '../../app/DurumSaglayici';
import { arsivListesi, ilceAdi, IL_ADLARI, type ArsivEseri } from '../arsiv/arsivVeri';
import { kucukKapak } from '../ders/EserGalerisi';
import {
  bolgeHaritasiKur,
  type AgCizgisi,
  type BolgeHaritasi,
  type BolgeSayisi,
  type HaritaEseri,
  type Seviye,
} from './bolgeHaritasi';
import { VAKIF_BAGLARI } from './vakifAgi';
import { eserBul } from '../gunun-eseri/oyun';
import { IkonOk, IkonSikke } from '../../app/Ikonlar';
import { EserSatiri } from './EserSatiri';
import { BOS_FILTRELER, filtreleriCoz } from './filtreler';
import { SuzgecPaneli } from '../../app/SuzgecPaneli';
import './harita.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { maplibreYukle } from '../../lib/maplibreYukle';

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
  const [eserler, setEserler] = useState<Eser[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [filtreHatasi, setFiltreHatasi] = useState<string | null>(null);
  const [arsiv, setArsiv] = useState<ArsivEseri[]>([]);
  const [seviye, setSeviye] = useState<Seviye>('il');
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
      .catch((e: unknown) => {
        if (!iptal) {
          setSecenekler(BOS_FILTRELER);
          setFiltreHatasi(e instanceof Error ? e.message : 'Filtre seçenekleri yüklenemedi.');
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
      .catch((e: unknown) => {
        if (!iptal) {
          setEserler([]);
          setHata(e instanceof Error ? e.message : 'Eserler yüklenemedi');
        }
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });

    return () => {
      iptal = true;
    };
  }, [secilenSehir, secilenTur]);

  const filtreVar = secilenSehir !== '' || secilenTur !== '';

  const secilenSehirAdi = useMemo(() => {
    if (secilenSehir === '') return '';
    return secenekler.sehirler.find((s) => s.id === secilenSehir)?.ad ?? secilenSehir;
  }, [secenekler.sehirler, secilenSehir]);

  /** Canlı bölge metni — SC 4.1.3. Örn. "Bursa, Cami: 3 eser bulundu." */
  const durumMetni = useMemo(() => {
    if (hata) return 'Eserler yüklenemedi.';
    if (yukleniyor) return 'Eserler yükleniyor…';

    const secimler = [secilenSehirAdi, secilenTur].filter((secim) => secim !== '');
    if (secimler.length === 0) return `Tüm eserler: ${eserler.length} eser listelendi.`;
    return `${secimler.join(', ')}: ${eserler.length} eser bulundu.`;
  }, [hata, yukleniyor, secilenSehirAdi, secilenTur, eserler.length]);

  const konumlular = useMemo(() => eserler.filter((e) => e.koordinat !== null), [eserler]);

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
    for (const e of eserler) ekle(e.sehirId, ilceAdi(e.ilce), 'ders');
    // Arşiv yüklenemezse toplam en az ders sayısı kadar olsun
    for (const v of [...il.values(), ...ilce.values()]) v.toplam = Math.max(v.toplam, v.ders);
    return { ilSayilari: il, ilceSayilari: ilce };
  }, [arsiv, eserler]);

  // Vakıf ağı: akar → hayrat çizgileri (konumu bilinen bağlar).
  const [agAcik, setAgAcik] = useState(false);
  const haritaRef = useRef<BolgeHaritasi | null>(null);
  const agCizgileri = useMemo<AgCizgisi[]>(() => {
    const konum = new Map(haritaEserleri.map((e) => [e.id, [e.lng, e.lat] as [number, number]]));
    return VAKIF_BAGLARI.flatMap((b) => {
      const kaynak = konum.get(b.akarId);
      const hedef = b.hedef.eserId
        ? konum.get(b.hedef.eserId)
        : b.hedef.lng !== undefined && b.hedef.lat !== undefined
          ? ([b.hedef.lng, b.hedef.lat] as [number, number])
          : undefined;
      return kaynak && hedef
        ? [{ id: b.akarId, kaynak, hedef, hedefAd: b.hedef.ad, yaklasik: !!b.hedef.yaklasik }]
        : [];
    });
  }, [haritaEserleri]);
  const agAcikRef = useRef(agAcik);
  agAcikRef.current = agAcik;
  useEffect(() => {
    haritaRef.current?.agGoster(agAcik);
  }, [agAcik]);

  useEffect(() => {
    if (!haritaKabi.current || konumlular.length === 0) return;
    let temizle: (() => void) | undefined;
    let iptal = false;

    void (async () => {
      // Altlık harita (il + ilçe sınırları) uygulamaya gömülüdür: dış karo
      // sunucusu yok, internetsiz de çalışır (mobil/çevrimdışı demo).
      const [maplibre, illerModulu, ilcelerModulu] = await Promise.all([
        maplibreYukle(),
        import('./veri/turkiye-iller.json'),
        import('./veri/ilceler.json'),
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
          ag: agCizgileri,
        });
        haritaRef.current = h;
        temizle = h.temizle;
        if (agAcikRef.current) h.agGoster(true);
      } catch {
        // Harita çizilemezse (WebGL yok vb.) sayfa ve liste çalışmaya devam eder.
      }
    })();

    return () => {
      iptal = true;
      haritaRef.current = null;
      temizle?.();
    };
  }, [konumlular.length, haritaEserleri, ilSayilari, ilceSayilari, agCizgileri]);

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
          etkinSayisi={[secilenSehir, secilenTur].filter(Boolean).length}
          onTemizle={() => {
            setSecilenSehir('');
            setSecilenTur('');
          }}
        >
        <p className="harita-filtreler__aciklama metin-soluk">
          Yalnızca eseri olan şehir ve türler listelenir; parantez içindeki sayı o seçenekteki
          eser sayısıdır.
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

      {konumlular.length > 0 && (
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
          {agCizgileri.length > 0 && (
            <div className="harita-ag-dugme">
              <button
                type="button"
                className={`dugme${agAcik ? '' : ' dugme--ikincil'}`}
                aria-pressed={agAcik}
                aria-describedby="vakif-agi-aciklama"
                onClick={() => setAgAcik((a) => !a)}
              >
                <span aria-hidden="true">⇢ </span>
                {agAcik ? 'Vakıf ağını gizle' : 'Vakıf ağını göster'}
              </button>
              <span id="vakif-agi-aciklama" className="metin-soluk harita-ag-dugme__not">
                Hanların ve hamamların kirası hangi camiyi, külliyeyi yaşatıyordu?
              </span>
              <a className="harita-rota-bag" href="#/rota">
                Keşif rotası oluştur →
              </a>
            </div>
          )}
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

      {/* Vakıf ağının metin eşdeğeri (harita çizgileri yalnızca görsel özet) */}
      <section aria-labelledby="vakif-agi-baslik" className="kart vakif-agi">
        <h2 id="vakif-agi-baslik" className="vakif-agi__baslik">
          Para nereye akıyordu?
        </h2>
        <p className="metin-ikincil vakif-agi__giris">
          Vakıfta bir yapı kira getirir (<strong>akar</strong>), o kira başka bir yapıyı yaşatır
          (<strong>hayrat</strong>). Bazen yüzlerce kilometre öteyi!
        </p>
        <ul className="vakif-agi__liste">
          {VAKIF_BAGLARI.map((b) => (
            <li key={b.akarId} className="vakif-agi__bag">
              <span className="vakif-agi__akar">{eserBul(b.akarId)?.kisaAd ?? b.akarId}</span>
              <span className="vakif-agi__ok" aria-hidden="true">
                <IkonSikke boyut={18} />
                <IkonOk boyut={18} />
              </span>
              <span className="vakif-agi__hayrat">
                {b.hedef.ad} <span className="metin-soluk">({b.hedef.yer})</span>
              </span>
              <span className="vakif-agi__cumle">{b.cumle}</span>
            </li>
          ))}
        </ul>
        <p className="metin-soluk vakif-agi__kaynak">
          Kaynak: Vakıf Katılım envanterleri (eserlerin vakfiye bilgisi). Hedef konumları: ©
          OpenStreetMap katkıcıları; Gelibolu ve Demirtaş Camii yaklaşık.
        </p>
      </section>

      {/* Haritanın erişilebilir eşdeğeri — zorunlu (WCAG 1.1.1) */}
      <section aria-labelledby="harita-liste-basligi" aria-busy={yukleniyor}>
        <h2 id="harita-liste-basligi" className="bolum-basligi">
          Eserler
          <span className="metin-soluk" style={{ fontWeight: 400 }}>
            {eserler.length} kayıt
          </span>
        </h2>

        <ul className="harita-listesi">
          {eserler.map((eser) => (
            <EserSatiri
              key={eser.id}
              eser={eser}
              defterinde={ilerleme.defterSayfalari.includes(eser.id)}
            />
          ))}
        </ul>

        {!yukleniyor && !hata && eserler.length === 0 ? (
          <div className="bildirim bildirim--bilgi">
            {filtreVar ? (
              <>
                <strong>Bu filtreyle eser bulunamadı.</strong> Farklı bir şehir veya eser türü
                seçin ya da filtreleri temizleyin.
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
