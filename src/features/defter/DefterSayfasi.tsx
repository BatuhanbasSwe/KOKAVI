/**
 * Kâşif Defteri — albüm görünümü.
 *
 * PDF: "Kâşif Defteri: öğrenilenin biriktiği yer"
 * PDF: "Kazanç rozet değil, aidiyet. Çocuk '12 rozetim var' demez —
 *       'Bursa'yı biliyorum' der."
 *
 * Bu yüzden defter bir rozet vitrini değil, şehir şehir doldurulan bir
 * albümdür: öğrenilmemiş eserler baştan gri silüet olarak görünür (çocuk ne
 * kaldığını görür), öğrenilen eser renklenir ve dokununca sayfası açılır.
 * Aynı baninin eserleri tamamlandıkça "bağlantı" kartı belirir.
 *
 * Defter teması Vakıf Çarşısı'ndan elmasla seçilir (PDF s. 3: "Kâşif
 * Defteri teması") — yalnızca görünüm değişir, bilgi değişmez.
 *
 * Erişilebilirlik: şehir seçimi aria-pressed düğmeleri; öğrenilen sayfalar
 * gerçek <button>, öğrenilmeyenler metinle "henüz öğrenilmedi" diye okunur.
 */
import { RozetPanosu } from '../rozetler/Rozetler';
import { SertifikaBaglantilari } from '../sertifika/SertifikaBaglantilari';
import { useEffect, useMemo, useState } from 'react';
import type { Eser } from '@shared/types';
import { api } from '../../lib/api';
import { useDurum } from '../../app/DurumSaglayici';
import { IkonTur } from '../../app/Ikonlar';
import { kisaAd } from '../yol/kisaAd';
import '../ders/ders.css'; // .ders-ayrinti (Büyükler için)
import './defter.css';

export function DefterSayfasi() {
  const { ilerleme, yol, carsi } = useDurum();
  const [eserler, setEserler] = useState<Eser[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [secilenSehir, setSecilenSehir] = useState<string | null>(null);
  const [acikSayfa, setAcikSayfa] = useState<string | null>(null);
  const [ozetler, setOzetler] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let iptal = false;
    // Ders özeti çocuğa gösterilir; dersler gelmezse defter yine açılır.
    api
      .dersler()
      .then((dersler) => {
        if (!iptal) setOzetler(new Map(dersler.map((d) => [d.eserId, d.yansima.ozet])));
      })
      .catch(() => undefined);
    api
      .eserler()
      .then((liste) => {
        if (!iptal) setEserler(liste);
      })
      .catch((e: unknown) => {
        if (!iptal) setHata(e instanceof Error ? e.message : 'Eserler yüklenemedi');
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, []);

  const ogrenilen = useMemo(() => new Set(ilerleme.defterSayfalari), [ilerleme.defterSayfalari]);

  // Şehir sırası öğrenme yolundan; eser sırası yoldaki ders sırasından.
  const sehirler = useMemo(() => {
    const sira = yol?.sehirler.map((s) => ({ id: s.sehirId, ad: s.ad })) ?? [];
    const yolSirasi = new Map<string, number>();
    yol?.sehirler.forEach((s) =>
      s.uniteler.forEach((u) => u.dersler.forEach((d) => yolSirasi.set(d.eserId, yolSirasi.size))),
    );
    return sira.map((s) => {
      const liste = eserler
        .filter((e) => e.sehirId === s.id)
        .sort((a, b) => (yolSirasi.get(a.id) ?? 999) - (yolSirasi.get(b.id) ?? 999));
      return { ...s, eserler: liste, ogrenilen: liste.filter((e) => ogrenilen.has(e.id)).length };
    });
  }, [yol, eserler, ogrenilen]);

  const aktifSehirId = secilenSehir ?? sehirler.find((s) => s.ogrenilen > 0)?.id ?? sehirler[0]?.id ?? null;
  const aktifSehir = sehirler.find((s) => s.id === aktifSehirId) ?? null;
  const toplamOgrenilen = eserler.filter((e) => ogrenilen.has(e.id)).length;
  const acikEser = eserler.find((e) => e.id === acikSayfa && ogrenilen.has(e.id)) ?? null;

  // Bağlantılar: aynı baninin en az iki eseri öğrenildiyse
  const bagliBani = useMemo(() => {
    const gruplar = new Map<string, Eser[]>();
    for (const e of eserler) {
      if (!e.bani || !ogrenilen.has(e.id)) continue;
      gruplar.set(e.bani, [...(gruplar.get(e.bani) ?? []), e]);
    }
    return [...gruplar.entries()].filter(([, liste]) => liste.length > 1);
  }, [eserler, ogrenilen]);

  return (
    <div className="defter-kok yigin" data-defter-tema={carsi.defterTemasi} style={{ gap: 'var(--b-4)' }}>
      <div className="defter-ust">
        <div>
          <h1>Kâşif Defteri</h1>
          <p className="metin-ikincil" style={{ margin: 0 }}>
            Öğrendiğin her eser deftere bir sayfa olur. Boş yerler seni bekliyor.
          </p>
        </div>
        <span className="defter-sayac">
          {toplamOgrenilen}/{eserler.length} sayfa
        </span>
      </div>

      {yukleniyor && (
        <p className="metin-soluk" role="status">
          Defter açılıyor…
        </p>
      )}

      {hata && (
        <div className="bildirim bildirim--uyari" role="status">
          {hata}
        </div>
      )}

      {sehirler.length > 0 && (
        <div className="defter-sehirler" role="group" aria-label="Şehir seç">
          {sehirler.map((s) => (
            <button
              key={s.id}
              type="button"
              className="defter-sehir"
              aria-pressed={s.id === aktifSehirId}
              onClick={() => {
                setSecilenSehir(s.id);
                setAcikSayfa(null);
              }}
            >
              {s.ad} {s.ogrenilen}/{s.eserler.length}
            </button>
          ))}
        </div>
      )}

      {aktifSehir && (
        <section aria-labelledby="defter-sehir-basligi" className="yigin" style={{ gap: 'var(--b-3)' }}>
          <h2 id="defter-sehir-basligi" className="sr-only">
            {aktifSehir.ad} sayfaları
          </h2>
          <div
            className="ilerleme-cubugu defter-cubuk"
            role="progressbar"
            aria-label={`${aktifSehir.ad} defteri`}
            aria-valuemin={0}
            aria-valuemax={aktifSehir.eserler.length}
            aria-valuenow={aktifSehir.ogrenilen}
          >
            <div
              className="ilerleme-cubugu__dolgu"
              style={{
                width: `${aktifSehir.eserler.length ? (aktifSehir.ogrenilen / aktifSehir.eserler.length) * 100 : 0}%`,
              }}
            />
          </div>

          {aktifSehir.ogrenilen === 0 && (
            <p className="bildirim bildirim--bilgi" style={{ margin: 0 }}>
              Bu şehrin defteri henüz boş. Öğrenme yolundan bir ders bitir; eser burada renklenecek.
            </p>
          )}

          <ul className="defter-albumu">
            {aktifSehir.eserler.map((eser) => {
              const acik = ogrenilen.has(eser.id);
              return (
                <li key={eser.id}>
                  {acik ? (
                    <button
                      type="button"
                      className="defter-karesi defter-karesi--acik"
                      aria-expanded={acikSayfa === eser.id}
                      aria-controls="defter-sayfa-ayrinti"
                      onClick={() => setAcikSayfa(acikSayfa === eser.id ? null : eser.id)}
                    >
                      <span className="defter-karesi__ikon" aria-hidden="true">
                        <IkonTur tur={eser.tur} boyut={26} kalinlik={1.9} />
                      </span>
                      <span className="defter-karesi__ad">{kisaAd(eser.ad)}</span>
                    </button>
                  ) : (
                    <div className="defter-karesi defter-karesi--kapali">
                      <span className="defter-karesi__ikon" aria-hidden="true">
                        <IkonTur tur={eser.tur} boyut={26} kalinlik={1.9} />
                      </span>
                      <span className="defter-karesi__ad">
                        <span aria-hidden="true">? </span>
                        {eser.tur}
                        <span className="sr-only">, henüz öğrenilmedi</span>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div id="defter-sayfa-ayrinti" aria-live="polite">
            {acikEser && (
              <article className="defter-sayfasi defter-sayfasi--acik">
                <div className="etiket">{acikEser.tur}</div>
                <h3 style={{ margin: 0, fontSize: 'var(--yazi-xl)' }}>{kisaAd(acikEser.ad)}</h3>
                {ozetler.get(acikEser.id) && <p style={{ margin: 0 }}>{ozetler.get(acikEser.id)}</p>}
                {/* Künye silinmedi, katlandı (YansimaAdimi ile aynı desen). */}
                <details className="ders-ayrinti">
                  <summary>Büyükler için: künye</summary>
                  <div className="ders-ayrinti__icerik">
                    <p>{acikEser.ad}</p>
                    {acikEser.bani && (
                      <p>
                        <strong>Yaptıran:</strong> {acikEser.bani}
                      </p>
                    )}
                    {acikEser.yapimYili && (
                      <p>
                        <strong>Yapım:</strong> {acikEser.yapimYili}
                      </p>
                    )}
                    {acikEser.vakfiyeAmaci && (
                      <p>
                        <strong>Neden yaptırıldı:</strong> {acikEser.vakfiyeAmaci}
                      </p>
                    )}
                    {acikEser.arsivNo && <p className="kaynak">Vakfiye arşiv no: {acikEser.arsivNo}</p>}
                    {acikEser.gelirDagilimiDurumu === 'belge-bulunamadi' && (
                      <p className="kaynak">Gelir dağılımı belgelenememiştir.</p>
                    )}
                  </div>
                </details>
              </article>
            )}
          </div>
        </section>
      )}

      {bagliBani.length > 0 && (
        <section aria-labelledby="defter-baglantilar" className="yigin" style={{ gap: 'var(--b-3)' }}>
          <h2 id="defter-baglantilar" className="bolum-basligi" style={{ marginBottom: 0 }}>
            Bağlantı bulundu
          </h2>
          {bagliBani.map(([bani, liste]) => (
            <div key={bani} className="kart defter-baglanti">
              <p style={{ margin: 0, fontWeight: 900 }}>{bani}</p>
              <p className="metin-ikincil" style={{ margin: 'var(--b-1) 0 0' }}>
                Aynı kişinin yaptırdığı {liste.length} eseri öğrendin:{' '}
                {liste.map((e) => kisaAd(e.ad)).join(', ')}.
              </p>
            </div>
          ))}
        </section>
      )}

      <SertifikaBaglantilari />

      <RozetPanosu />
    </div>
  );
}
