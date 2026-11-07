/**
 * Yönetim paneli → "Arşiv": Meraklısına arşivine eser ekleme.
 *
 *  · JSON'dan toplu ekle: dosya seçilir, önizleme görülür, tek tıkla aktarılır.
 *    Hatalı kayıtlar atlanır ve satır satır nedeniyle listelenir.
 *  · Tek eser ekle: form + fotoğraf dosyası (tarayıcıda küçültülür).
 *  · Panelden eklenenler: fotoğraf değiştir / kaldır, sil.
 *
 * Kaynak zorunludur (proje kuralı 5). Doğrulamanın asıl yeri sunucu
 * (server/arsiv/dogrula.ts); burada yalnızca önizleme için hafif kontrol var.
 */
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { arsivFotoUrl } from '../arsiv/arsivVeri';
import { arsivApi, type ArsivEkiSatiri, type IceAktarmaSonucu } from './arsivApi';
import { gorselHazirla, KABUL_EDILEN_GORSEL } from './gorselHazirla';
import { CokSatirliGirdi, MetinGirdisi } from './Alan';
import { OnayDiyalogu } from './OnayDiyalogu';
import { panelHataMesaji } from './yardimci';

const ORNEK_JSON = JSON.stringify(
  {
    sehir: 'Bursa',
    kaynak: "Vakıf Katılım, 'Bursa Vakıf Eserleri', III. Cilt (2026)",
    eserler: [
      {
        ad: 'Örnek Çeşmesi',
        ilce: 'Osmangazi',
        tur: 'Çeşme',
        paragraflar: ['Birinci paragraf (Türkçe).', 'Second paragraph (English).'],
        foto: 'https://ornek.org/cesme.jpg',
      },
    ],
  },
  null,
  2,
);

interface Onizleme {
  dosyaAdi: string;
  kayitlar: unknown[];
  varsayilan: { sehir?: string | null; kaynak?: string | null };
  eksikler: number;
}

/** Sunucuya göndermeden önce: kaç kayıt, kaçında zorunlu alan eksik. */
function onizle(dosyaAdi: string, veri: unknown): Onizleme {
  let kayitlar: unknown[];
  let varsayilan: Onizleme['varsayilan'] = {};
  if (Array.isArray(veri)) kayitlar = veri;
  else if (veri && typeof veri === 'object' && Array.isArray((veri as { eserler?: unknown }).eserler)) {
    const g = veri as { eserler: unknown[]; sehir?: unknown; kaynak?: unknown };
    kayitlar = g.eserler;
    varsayilan = {
      sehir: typeof g.sehir === 'string' ? g.sehir : null,
      kaynak: typeof g.kaynak === 'string' ? g.kaynak : null,
    };
  } else if (veri && typeof veri === 'object' && 'ad' in veri) kayitlar = [veri];
  else throw new Error('JSON bir dizi ya da "eserler" listesi içeren bir nesne olmalı.');

  const eksikler = kayitlar.filter((k) => {
    const g = (k ?? {}) as Record<string, unknown>;
    const var_ = (x: unknown) => typeof x === 'string' && x.trim() !== '';
    return !(
      var_(g.ad) &&
      (var_(g.il) || var_(g.sehir) || var_(varsayilan.sehir)) &&
      var_(g.tur) &&
      (var_(g.kaynak) || (Array.isArray(g.kaynaklar) && g.kaynaklar.length > 0) || var_(varsayilan.kaynak))
    );
  }).length;
  return { dosyaAdi, kayitlar, varsayilan, eksikler };
}

function adOku(k: unknown): string {
  const ad = (k as { ad?: unknown } | null)?.ad;
  return typeof ad === 'string' && ad.trim() ? ad : '(adsız kayıt)';
}

const BOS_FORM = { ad: '', il: '', ilce: '', tur: '', kaynak: '', metin: '' };

export function ArsivYonetimi() {
  const [ekler, setEkler] = useState<ArsivEkiSatiri[] | null>(null);
  const [listeHatasi, setListeHatasi] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const [onizleme, setOnizleme] = useState<Onizleme | null>(null);
  const [aktariliyor, setAktariliyor] = useState<number | null>(null);
  const [sonuc, setSonuc] = useState<IceAktarmaSonucu | null>(null);
  const jsonGirdi = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(BOS_FORM);
  const [formFoto, setFormFoto] = useState<string | null>(null);
  const [formHatalari, setFormHatalari] = useState<Record<string, string>>({});
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const formFotoGirdi = useRef<HTMLInputElement>(null);

  const [silinecek, setSilinecek] = useState<ArsivEkiSatiri | null>(null);
  const [mesgulId, setMesgulId] = useState<string | null>(null);
  const kimlik = useId();

  const yenile = useCallback(() => {
    arsivApi
      .listele()
      .then((l) => {
        setEkler(l);
        setListeHatasi(null);
      })
      .catch((e: unknown) => setListeHatasi(panelHataMesaji(e, 'Arşiv ekleri yüklenemedi.')));
  }, []);
  useEffect(yenile, [yenile]);

  const duyur = (mesaj: string) => {
    setHata(null);
    setBildirim(mesaj);
  };
  const hataGoster = (e: unknown, varsayilan: string) => {
    setBildirim(null);
    setHata(e instanceof Error ? panelHataMesaji(e, varsayilan) : varsayilan);
  };

  // --- JSON ------------------------------------------------------------------
  const jsonSecildi = async (dosya: File | undefined) => {
    setSonuc(null);
    setOnizleme(null);
    if (!dosya) return;
    try {
      const metin = await dosya.text();
      let veri: unknown;
      try {
        veri = JSON.parse(metin);
      } catch {
        throw new Error(`"${dosya.name}" geçerli bir JSON değil. Virgül ve tırnakları kontrol edin.`);
      }
      setOnizleme(onizle(dosya.name, veri));
      setHata(null);
    } catch (e) {
      hataGoster(e, 'Dosya okunamadı.');
    }
  };

  const aktar = async () => {
    if (!onizleme) return;
    setAktariliyor(0);
    try {
      const r = await arsivApi.iceAktar(onizleme.kayitlar, onizleme.varsayilan, setAktariliyor);
      setSonuc(r);
      setOnizleme(null);
      if (jsonGirdi.current) jsonGirdi.current.value = '';
      duyur(
        `${r.eklenen} eser eklendi, ${r.guncellenen} eser güncellendi` +
          (r.hatali ? `, ${r.hatali} kayıt atlandı (nedenleri aşağıda).` : '.'),
      );
      yenile();
    } catch (e) {
      hataGoster(e, 'İçe aktarma başarısız.');
    } finally {
      setAktariliyor(null);
    }
  };

  // --- Tek eser formu --------------------------------------------------------
  const formFotoSecildi = async (dosya: File | undefined) => {
    if (!dosya) return;
    try {
      setFormFoto(await gorselHazirla(dosya));
      setFormHatalari((h) => ({ ...h, foto: '' }));
    } catch (e) {
      setFormHatalari((h) => ({ ...h, foto: e instanceof Error ? e.message : 'Fotoğraf okunamadı.' }));
      if (formFotoGirdi.current) formFotoGirdi.current.value = '';
    }
  };

  const formGonder = async (olay: FormEvent) => {
    olay.preventDefault();
    const h: Record<string, string> = {};
    if (!form.ad.trim()) h.ad = 'Eserin adını yazın.';
    if (!form.il.trim()) h.il = 'İli yazın (ör. Bursa).';
    if (!form.tur.trim()) h.tur = 'Türü yazın (ör. Cami, Han, Çeşme).';
    if (!form.kaynak.trim()) h.kaynak = 'Bilginin geldiği yayını yazın.';
    setFormHatalari(h);
    if (Object.keys(h).length) return;
    setKaydediliyor(true);
    try {
      const r = await arsivApi.iceAktar(
        [
          {
            ad: form.ad,
            il: form.il,
            ilce: form.ilce || null,
            tur: form.tur,
            kaynak: form.kaynak,
            metin: form.metin,
            ...(formFoto ? { foto: formFoto } : {}),
          },
        ],
        {},
      );
      const s = r.sonuclar[0];
      if (!s || s.durum === 'hata') throw new Error(s?.hata ?? 'Kaydedilemedi.');
      duyur(`"${s.ad}" arşive ${s.durum === 'eklendi' ? 'eklendi' : 'kaydedildi (güncellendi)'}.`);
      setForm(BOS_FORM);
      setFormFoto(null);
      if (formFotoGirdi.current) formFotoGirdi.current.value = '';
      yenile();
    } catch (e) {
      hataGoster(e, 'Eser kaydedilemedi.');
    } finally {
      setKaydediliyor(false);
    }
  };

  // --- Liste eylemleri ---------------------------------------------------------
  const fotoDegistir = async (eser: ArsivEkiSatiri, dosya: File | undefined) => {
    if (!dosya) return;
    setMesgulId(eser.id);
    try {
      await arsivApi.fotoDegistir(eser.id, await gorselHazirla(dosya));
      duyur(`"${eser.ad}" fotoğrafı güncellendi.`);
      yenile();
    } catch (e) {
      hataGoster(e, 'Fotoğraf yüklenemedi.');
    } finally {
      setMesgulId(null);
    }
  };

  const fotoKaldir = async (eser: ArsivEkiSatiri) => {
    setMesgulId(eser.id);
    try {
      await arsivApi.fotoDegistir(eser.id, null);
      duyur(`"${eser.ad}" fotoğrafı kaldırıldı.`);
      yenile();
    } catch (e) {
      hataGoster(e, 'Fotoğraf kaldırılamadı.');
    } finally {
      setMesgulId(null);
    }
  };

  const sil = async () => {
    if (!silinecek) return;
    setMesgulId(silinecek.id);
    try {
      await arsivApi.sil(silinecek.id);
      duyur(`"${silinecek.ad}" arşivden silindi.`);
      setSilinecek(null);
      yenile();
    } catch (e) {
      hataGoster(e, 'Silinemedi.');
    } finally {
      setMesgulId(null);
    }
  };

  const hataliSatirlar = sonuc?.sonuclar.filter((s) => s.durum === 'hata') ?? [];

  return (
    <section className="panel__bolum arsiv-yonetimi" aria-labelledby={`${kimlik}-baslik`}>
      <div className="panel__bolum-basligi">
        <h2 id={`${kimlik}-baslik`}>Meraklısına arşivi</h2>
        <p className="metin-ikincil" style={{ margin: 0 }}>
          Vakıf Katılım'dan gelen yeni eserleri ekleyin. Eklenenler arşiv sayfasında hemen görünür.
        </p>
      </div>

      <div className="panel__bildirim-alani" role="status" aria-live="polite">
        {bildirim ? <p className="bildirim bildirim--basari">{bildirim}</p> : null}
      </div>
      {hata ? (
        <p className="bildirim bildirim--hata" role="alert">
          {hata}
        </p>
      ) : null}

      {/* --- 1. JSON'dan toplu ekle ------------------------------------------ */}
      <div className="kart yigin arsiv-yonetimi__kart">
        <h3 className="arsiv-yonetimi__baslik">JSON dosyasından toplu ekle</h3>
        <p className="metin-ikincil" style={{ margin: 0 }}>
          Dosyayı seçin, kontrol edin ve tek tıkla arşive ekleyin. Aynı kimlikteki eser varsa güncellenir.
        </p>
        <div className="satir">
          <label className="dugme dugme--ikincil arsiv-yonetimi__dosya">
            JSON dosyası seç
            <input
              ref={jsonGirdi}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => void jsonSecildi(e.target.files?.[0])}
            />
          </label>
          <a
            className="dugme dugme--ikincil dugme--kucuk"
            download="arsiv-ornek.json"
            href={`data:application/json;charset=utf-8,${encodeURIComponent(ORNEK_JSON)}`}
          >
            Örnek dosyayı indir
          </a>
        </div>

        {onizleme ? (
          <div className="arsiv-yonetimi__onizleme yigin">
            <p style={{ margin: 0 }}>
              <strong>{onizleme.dosyaAdi}</strong>: {onizleme.kayitlar.length} kayıt
              {onizleme.varsayilan.sehir ? ` · şehir: ${onizleme.varsayilan.sehir}` : ''}
            </p>
            <ul className="arsiv-yonetimi__adlar">
              {onizleme.kayitlar.slice(0, 6).map((k, i) => (
                <li key={i}>{adOku(k)}</li>
              ))}
              {onizleme.kayitlar.length > 6 ? <li>… ve {onizleme.kayitlar.length - 6} kayıt daha</li> : null}
            </ul>
            {onizleme.eksikler > 0 ? (
              <p className="bildirim bildirim--uyari" style={{ margin: 0 }}>
                {onizleme.eksikler} kayıtta zorunlu alan (ad, il, tür veya kaynak) eksik görünüyor. Bunlar atlanır,
                diğerleri eklenir.
              </p>
            ) : null}
            <div className="satir">
              <button type="button" className="dugme" disabled={aktariliyor !== null} onClick={() => void aktar()}>
                {aktariliyor !== null
                  ? `Aktarılıyor… ${aktariliyor}/${onizleme.kayitlar.length}`
                  : `${onizleme.kayitlar.length} kaydı arşive ekle`}
              </button>
              <button
                type="button"
                className="dugme dugme--ikincil"
                disabled={aktariliyor !== null}
                onClick={() => {
                  setOnizleme(null);
                  if (jsonGirdi.current) jsonGirdi.current.value = '';
                }}
              >
                Vazgeç
              </button>
            </div>
          </div>
        ) : null}

        {hataliSatirlar.length > 0 ? (
          <div className="panel__tablo-kaydirma" role="region" aria-label="Atlanan kayıtlar" tabIndex={0}>
            <table className="panel__tablo">
              <caption className="sr-only">Atlanan kayıtlar ve nedenleri</caption>
              <thead>
                <tr>
                  <th scope="col">Sıra</th>
                  <th scope="col">Ad</th>
                  <th scope="col">Neden</th>
                </tr>
              </thead>
              <tbody>
                {hataliSatirlar.map((s) => (
                  <tr key={s.sira}>
                    <td>{s.sira}</td>
                    <th scope="row">{s.ad ?? '(adsız)'}</th>
                    <td>{s.hata}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <details className="arsiv-yonetimi__bicim">
          <summary>Dosya biçimi</summary>
          <p className="metin-ikincil">
            Zorunlu: <code>ad</code>, <code>il</code> (ya da dosyada <code>sehir</code>), <code>tur</code>,{' '}
            <code>kaynak</code> (ya da dosyada ortak <code>kaynak</code>). İsteğe bağlı: <code>ilce</code>,{' '}
            <code>paragraflar</code> veya <code>metin</code>, <code>foto</code> (https adresi), <code>id</code>,{' '}
            <code>ders</code>. <code>data/research</code> dosyaları da olduğu gibi yüklenebilir.
          </p>
          <pre className="arsiv-yonetimi__ornek">{ORNEK_JSON}</pre>
        </details>
      </div>

      {/* --- 2. Tek eser -------------------------------------------------- */}
      <form className="kart panel__form arsiv-yonetimi__kart" onSubmit={(e) => void formGonder(e)} noValidate>
        <h3 className="arsiv-yonetimi__baslik">Tek eser ekle</h3>
        <div className="izgara-2">
          <MetinGirdisi id={`${kimlik}-ad`} etiket="Eser adı" deger={form.ad} zorunlu hata={formHatalari.ad}
            onDegistir={(v) => setForm((f) => ({ ...f, ad: v }))} ornek="Koza Han" />
          <MetinGirdisi id={`${kimlik}-tur`} etiket="Tür" deger={form.tur} zorunlu hata={formHatalari.tur}
            onDegistir={(v) => setForm((f) => ({ ...f, tur: v }))} ornek="Han" />
          <MetinGirdisi id={`${kimlik}-il`} etiket="İl" deger={form.il} zorunlu hata={formHatalari.il}
            onDegistir={(v) => setForm((f) => ({ ...f, il: v }))} ornek="Bursa" />
          <MetinGirdisi id={`${kimlik}-ilce`} etiket="İlçe" deger={form.ilce}
            onDegistir={(v) => setForm((f) => ({ ...f, ilce: v }))} ornek="Osmangazi" />
        </div>
        <MetinGirdisi id={`${kimlik}-kaynak`} etiket="Kaynak" deger={form.kaynak} zorunlu hata={formHatalari.kaynak}
          ipucu="Bilginin geldiği yayın: kitap, cilt, sayfa."
          onDegistir={(v) => setForm((f) => ({ ...f, kaynak: v }))} ornek="Vakıf Katılım, 'Bursa Vakıf Eserleri', I. Cilt, s. 80" />
        <CokSatirliGirdi id={`${kimlik}-metin`} etiket="Metin" deger={form.metin}
          ipucu="Paragrafları boş bir satırla ayırın."
          onDegistir={(v) => setForm((f) => ({ ...f, metin: v }))} />

        <div className="panel__alan">
          <span className="panel__etiket" id={`${kimlik}-foto-etiket`}>Fotoğraf</span>
          <div className="arsiv-yonetimi__foto-sec">
            {formFoto ? <img className="arsiv-yonetimi__onizleme-resim" src={formFoto} alt="Seçilen fotoğrafın önizlemesi" /> : null}
            <div className="yigin" style={{ gap: 'var(--b-2)' }}>
              <label className="dugme dugme--ikincil arsiv-yonetimi__dosya">
                {formFoto ? 'Başka fotoğraf seç' : 'Bilgisayardan fotoğraf seç'}
                <input
                  ref={formFotoGirdi}
                  type="file"
                  accept={KABUL_EDILEN_GORSEL}
                  className="sr-only"
                  aria-describedby={`${kimlik}-foto-ipucu`}
                  onChange={(e) => void formFotoSecildi(e.target.files?.[0])}
                />
              </label>
              {formFoto ? (
                <button type="button" className="dugme dugme--ikincil dugme--kucuk" onClick={() => {
                  setFormFoto(null);
                  if (formFotoGirdi.current) formFotoGirdi.current.value = '';
                }}>
                  Fotoğrafı çıkar
                </button>
              ) : null}
            </div>
          </div>
          <p className="panel__ipucu metin-soluk" id={`${kimlik}-foto-ipucu`}>
            JPEG, PNG veya WebP. Yüklemeden önce küçültülür; konum bilgisi silinir.
          </p>
          {formHatalari.foto ? <p className="bildirim bildirim--hata" role="alert">{formHatalari.foto}</p> : null}
        </div>

        <div className="panel__form-eylem">
          <button type="submit" className="dugme" disabled={kaydediliyor}>
            {kaydediliyor ? 'Kaydediliyor…' : 'Arşive ekle'}
          </button>
        </div>
      </form>

      {/* --- 3. Eklenenler -------------------------------------------------- */}
      <div className="yigin">
        <h3 className="arsiv-yonetimi__baslik">Panelden eklenenler {ekler ? `(${ekler.length})` : ''}</h3>
        {listeHatasi ? <p className="bildirim bildirim--hata" role="alert">{listeHatasi}</p> : null}
        {!ekler && !listeHatasi ? <p className="metin-soluk" role="status">Yükleniyor…</p> : null}
        {ekler && ekler.length === 0 ? (
          <p className="kart metin-ikincil">Henüz panelden eklenen eser yok. Statik arşivdeki 633 eser yerinde duruyor.</p>
        ) : null}
        {ekler && ekler.length > 0 ? (
          <ul className="arsiv-yonetimi__liste">
            {ekler.map((e) => (
              <li key={e.id} className="kart arsiv-yonetimi__oge">
                {e.foto ? (
                  <img className="arsiv-yonetimi__kucuk-resim" src={arsivFotoUrl(e)} alt="" loading="lazy" />
                ) : (
                  <span className="arsiv-yonetimi__kucuk-resim arsiv-yonetimi__kucuk-resim--bos" aria-hidden="true" />
                )}
                <div className="arsiv-yonetimi__oge-metin">
                  <a href={`#/arsiv/${encodeURIComponent(e.id)}`} className="arsiv-yonetimi__oge-ad">{e.ad}</a>
                  <span className="metin-soluk">
                    {[e.ilAd, e.ilce, e.tur, `${e.paragrafSayisi} paragraf`, e.foto ? 'fotoğraflı' : 'fotoğrafsız']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <div className="panel__satir-eylemler">
                  <label className="dugme dugme--ikincil dugme--kucuk arsiv-yonetimi__dosya" aria-disabled={mesgulId === e.id}>
                    {e.foto ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
                    <span className="sr-only">: {e.ad}</span>
                    <input
                      type="file"
                      accept={KABUL_EDILEN_GORSEL}
                      className="sr-only"
                      disabled={mesgulId === e.id}
                      onChange={(olay) => {
                        void fotoDegistir(e, olay.target.files?.[0]);
                        olay.target.value = '';
                      }}
                    />
                  </label>
                  {e.foto ? (
                    <button type="button" className="dugme dugme--ikincil dugme--kucuk" disabled={mesgulId === e.id}
                      onClick={() => void fotoKaldir(e)}>
                      Fotoğrafı kaldır<span className="sr-only">: {e.ad}</span>
                    </button>
                  ) : null}
                  <button type="button" className="dugme dugme--tehlike dugme--kucuk" disabled={mesgulId === e.id}
                    onClick={() => setSilinecek(e)}>
                    Sil<span className="sr-only">: {e.ad}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <OnayDiyalogu
        acik={!!silinecek}
        baslik="Arşiv kaydını sil"
        aciklama={silinecek ? `"${silinecek.ad}" arşivden kaldırılacak. Statik arşivde aynı kimlikli eser varsa o yeniden görünür.` : ''}
        onayEtiketi="Sil"
        tehlike
        mesgul={!!silinecek && mesgulId === silinecek.id}
        onOnay={() => void sil()}
        onKapat={() => setSilinecek(null)}
      />
    </section>
  );
}
