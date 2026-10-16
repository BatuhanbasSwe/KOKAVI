/**
 * Bugün: uygulamanın ana ekranı (Mozaik).
 *
 * Tek bakışta bugün yapılabilecekler: büyük fotoğraflı "sıradaki ders"
 * kutucuğu, seri, Günün Eseri (bulanık fotoğrafla gizem), Hayrat mı Akar mı,
 * varsa Hatalarımı çalış, Canlı yarışma ve Sınıfım. Yeni kullanıcıya önce
 * Köstik'in tanıtım turu gösterilir.
 *
 * Erişilebilirlik: her kutucuk tek bir gerçek <a>; fotoğraflar süs (alt="")
 * çünkü eser adı bağlantı metninde yazılıdır. Durum metinle söylenir.
 */
import { useState } from 'react';
import { useDurum, useSeviye } from '../../app/DurumSaglayici';
import { gunAnahtari } from '../../lib/ilerleme';
import {
  IkonAlev,
  IkonDegistir,
  IkonOk,
  IkonSaat,
  IkonSinif,
  IkonTekrar,
  IkonYildiz,
} from '../../app/Ikonlar';
import { Maskot } from '../../app/Maskot';
import { gununEseriDurumu } from '../gunun-eseri/GununEseriDavet';
import { gununEseri, gunNumarasi } from '../gunun-eseri/oyun';
import { useHataSayisi } from '../hatalar/HatalarSayfasi';
import { useSeri } from '../seri/Seri';
import { GUN_KISA, haftaGunleri } from '../seri/seriTakvimi';
import { TanitimTuru, tanitimGorulduMu } from '../yol/TanitimTuru';
import { gorunumOku, gorunumYaz } from '../yol/yolGorunumu';
import { kisaAd } from '../yol/kisaAd';
import { Foto, Kutu } from './Mozaik';
import { siradakiDers } from './siradaki';

const GUNLUK_SOZLER = [
  'Bugün bir eser keşfedelim mi?',
  'Her eserin bir vakfı, her vakfın bir hikâyesi var!',
  'Bir han, uzak bir şehirdeki camiyi yaşatabilir. Merak ettin mi?',
  'Haritada yakınlaştır: ilçeler, sonra eserler çıkar!',
  'Yanlış cevap yok, sadece ipucu var. Hadi!',
];

/** Gün boyunca aynı kalan maskot sözü. */
function gunlukSoz(): string {
  return GUNLUK_SOZLER[Math.floor(Date.now() / 86_400_000) % GUNLUK_SOZLER.length]!;
}

export function BugunSayfasi() {
  const { yol, yukleniyor, hata, ilerleme } = useDurum();
  const seviye = useSeviye();
  const hataSayisi = useHataSayisi();
  const seri = useSeri();
  const gunEseri = gununEseriDurumu();
  const gunEseriFoto = gununEseri(gunNumarasi(gunAnahtari())).eserId;
  const [gorunum] = useState(gorunumOku);
  const [tanitim, setTanitim] = useState(
    () => ilerleme.tamamlananDersler.length === 0 && !tanitimGorulduMu(),
  );

  const toplamDers = yol?.sehirler.reduce((t, s) => t + s.toplamSayi, 0) ?? 0;
  const tamamlanan = ilerleme.tamamlananDersler.length;
  const siradaki = siradakiDers(yol, gorunum);
  const hafta = haftaGunleri(seri.bugun);

  let sira = 0;

  return (
    <div className="bugun">
      <header className="bugun__ust">
        <Maskot boyut={56} mutlu={toplamDers > 0 && tamamlanan === toplamDers} />
        <div className="bugun__selam">
          <h1 className="bugun__baslik">Merhaba, kâşif!</h1>
          <p className="bugun__soz">
            {tamamlanan === 0
              ? 'Ben Köstik. İlk eserimizi birlikte keşfedelim mi?'
              : toplamDers > 0 && tamamlanan === toplamDers
                ? 'Bütün eserleri keşfettin! Arşivde daha yüzlercesi var.'
                : gunlukSoz()}
          </p>
        </div>
      </header>

      {tanitim && (
        <TanitimTuru
          onBitti={(secim) => {
            if (secim) gorunumYaz(secim);
            setTanitim(false);
          }}
        />
      )}

      {yukleniyor && !yol && (
        <p className="metin-soluk" role="status">
          Dersler yükleniyor…
        </p>
      )}
      {!yukleniyor && !yol && hata && (
        <div className="bildirim bildirim--uyari" role="status">
          İçerik sunucusuna ulaşılamadı. Oyunlar ve arşiv yine de açık.
        </div>
      )}

      <ul className="mozaik" aria-label="Bugün yapabileceklerin">
        {siradaki ? (
          <Kutu href={`#/ders/${encodeURIComponent(siradaki.dersId)}`} sira={sira++} sinif="mozaik__oge--buyuk">
            <Foto className="mozaik__foto" src={`/gorseller/${siradaki.eserId}/1.webp`} />
            <span className="mozaik__karartma" aria-hidden="true" />
            <span className="mozaik__icerik">
              <span className="mozaik__ust">
                Sıradaki ders · {siradaki.sehirAdi}
              </span>
              <span className="mozaik__eser">{kisaAd(siradaki.eserAdi)}</span>
              <span className="mozaik__eylem">
                {tamamlanan === 0 ? 'Başla' : 'Derse devam'}
                <IkonOk boyut={18} />
              </span>
            </span>
          </Kutu>
        ) : yol ? (
          <Kutu href="#/arsiv" sira={sira++} sinif="mozaik__oge--buyuk mozaik__oge--duz">
            <span className="mozaik__icerik">
              <span className="mozaik__ust">Yol tamam</span>
              <span className="mozaik__eser">Bütün dersleri bitirdin</span>
              <span className="mozaik__eylem">
                Arşivi keşfet
                <IkonOk boyut={18} />
              </span>
            </span>
          </Kutu>
        ) : null}

        <Kutu href="#/seri" sira={sira++} sinif="mozaik__oge--seri">
          <span className="mozaik__sayi">
            <IkonAlev boyut={28} />
            {seri.seri}
          </span>
          <span className="mozaik__ad">günlük seri</span>
          <span className="mozaik__hafta" aria-hidden="true">
            {hafta.map((g, i) => (
              <span
                key={g}
                className={`mozaik__gun${seri.gunler.has(g) ? ' mozaik__gun--aktif' : ''}${g === seri.bugun ? ' mozaik__gun--bugun' : ''}`}
                title={GUN_KISA[i]}
              />
            ))}
          </span>
          <span className="sr-only">
            {seri.bugunYapildi ? 'Bugünün dersi yapıldı.' : 'Bugün henüz ders yok.'} Takvimi aç.
          </span>
        </Kutu>

        <Kutu href="#/gunun-eseri" sira={sira++} sinif="mozaik__oge--gizem">
          <Foto className="mozaik__foto mozaik__foto--bulanik" src={`/gorseller/${gunEseriFoto}/k.webp`} />
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__simge" aria-hidden="true">
              <IkonYildiz boyut={20} dolu={!gunEseri.bitti} />
            </span>
            <span className="mozaik__ad">Günün Eseri #{gunEseri.no}</span>
            <span className="mozaik__alt">{gunEseri.durum}</span>
          </span>
        </Kutu>

        <Kutu href="#/hayrat-akar" sira={sira++} sinif="mozaik__oge--foto">
          <Foto className="mozaik__foto" src="/gorseller/bursa-koza-hani/k.webp" />
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__simge" aria-hidden="true">
              <IkonDegistir boyut={22} />
            </span>
            <span className="mozaik__ad">Hayrat mı Akar mı?</span>
            <span className="mozaik__alt">Hizmet mi, gelir mi?</span>
          </span>
        </Kutu>

        {hataSayisi > 0 && (
          <Kutu href="#/hatalar" sira={sira++} sinif="mozaik__oge--foto">
            <Foto className="mozaik__foto" src="/gorseller/konya-ince-minareli-medrese/k.webp" />
            <span className="mozaik__karartma" aria-hidden="true" />
            <span className="mozaik__icerik">
              <span className="mozaik__simge" aria-hidden="true">
                <IkonTekrar boyut={22} />
              </span>
              <span className="mozaik__ad">Hatalarımı çalış</span>
              <span className="mozaik__alt">{hataSayisi} soru seni bekliyor</span>
            </span>
          </Kutu>
        )}

        <Kutu href="#/canli" sira={sira++} sinif="mozaik__oge--foto">
          <Foto className="mozaik__foto" src="/gorseller/hatay-kanuni-sultan-suleyman-kervansarayi/k.webp" />
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__simge" aria-hidden="true">
              <IkonSaat boyut={22} />
            </span>
            <span className="mozaik__ad">Canlı yarışma</span>
            <span className="mozaik__alt">Sınıfınla aynı anda</span>
          </span>
        </Kutu>

        <Kutu href="#/sinif" sira={sira++} sinif="mozaik__oge--foto">
          <Foto className="mozaik__foto" src="/gorseller/karatay-medresesi/k.webp" />
          <span className="mozaik__karartma" aria-hidden="true" />
          <span className="mozaik__icerik">
            <span className="mozaik__simge" aria-hidden="true">
              <IkonSinif boyut={22} />
            </span>
            <span className="mozaik__ad">Sınıfım</span>
            <span className="mozaik__alt">{ilerleme.sinifKodu ? `Kod ${ilerleme.sinifKodu}` : 'Sınıf koduyla katıl'}</span>
          </span>
        </Kutu>
      </ul>

      {toplamDers > 0 && (
        <p className="bugun__ozet">
          {tamamlanan}/{toplamDers} ders · {seviye.ad}
          {seviye.kalanDers !== null ? ` · ${seviye.kalanDers} ders sonra bir üst seviye` : ''}
        </p>
      )}
    </div>
  );
}
