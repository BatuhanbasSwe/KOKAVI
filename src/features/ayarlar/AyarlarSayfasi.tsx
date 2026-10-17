/**
 * Ayarlar — erişilebilirlik ve gizlilik.
 *
 * PDF: "Yüksek kontrast teması, renk körlüğü uyumlu palet, ölçeklenebilir yazı
 * boyutu." + "Altyazı ve sessiz mod" + "Kişisel veri toplanmaz."
 *
 * Şartname 5.1.4: erişilebilirlik özellikleri "çalışan ürüne entegre" olmalı.
 * Bu ekrandaki her ayar anında tüm ürüne uygulanır.
 */
import { useState } from 'react';
import { useDurum } from '../../app/DurumSaglayici';
import { veliOnayiAcikMi, veliOnayiniAyarla } from '../../lib/veliOnayi';
import { VeliKapisi } from '../carsi/VeliKapisi';
import { YuklemeKarti } from './YuklemeKarti';
import {
  RENK_KORLUGU_ETIKETLERI,
  TEMA_ETIKETLERI,
  yaziBoyutuArtir,
  yaziBoyutuAzalt,
} from '../../lib/erisilebilirlik';
import type { Ayarlar } from '@shared/types';

function AyarSatiri({
  etiket,
  aciklama,
  children,
}: {
  etiket: string;
  aciklama?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ayar-satiri">
      <div>
        <span className="ayar-satiri__etiket">{etiket}</span>
        {aciklama && <span className="ayar-satiri__aciklama">{aciklama}</span>}
      </div>
      <div className="secim-grubu">{children}</div>
    </div>
  );
}

export function AyarlarSayfasi() {
  const { ayarlar, ayarGuncelle, ilerleme, sinifKoduAyarla, sifirla } = useDurum();

  const temaSec = (tema: Ayarlar['tema']) => ayarGuncelle({ tema });
  const renkSec = (renk: Ayarlar['renkKorlugu']) => ayarGuncelle({ renkKorlugu: renk });
  const yaziYuzde = Math.round(ayarlar.yaziBoyutu * 100);
  const [veliOnayi, setVeliOnayi] = useState(veliOnayiAcikMi);
  const [kapatmaOnayi, setKapatmaOnayi] = useState(false);

  return (
    <div className="yigin" style={{ gap: 'var(--b-5)' }}>
      <div>
        <h1>Ayarlar</h1>
        <p className="metin-ikincil">
          Bu ayarlar yalnızca bu cihazda saklanır. Hiçbir bilgi sunucuya gönderilmez.
        </p>
      </div>

      <section className="kart" aria-labelledby="erisilebilirlik-basligi">
        <h2 id="erisilebilirlik-basligi" style={{ fontSize: 'var(--yazi-xl)' }}>
          Görünüm ve erişilebilirlik
        </h2>

        <AyarSatiri
          etiket="Tema"
          aciklama="Yüksek kontrast, güçlü renk ayrımı gerektiren kullanıcılar içindir."
        >
          {(Object.keys(TEMA_ETIKETLERI) as Ayarlar['tema'][]).map((tema) => (
            <button
              key={tema}
              type="button"
              className="secim-dugmesi"
              aria-pressed={ayarlar.tema === tema}
              onClick={() => temaSec(tema)}
            >
              {TEMA_ETIKETLERI[tema]}
            </button>
          ))}
        </AyarSatiri>

        <AyarSatiri
          etiket="Yazı boyutu"
          aciklama="Tüm uygulamada geçerlidir. Tarayıcı yakınlaştırmasına gerek kalmaz."
        >
          <button
            type="button"
            className="secim-dugmesi"
            onClick={() => ayarGuncelle({ yaziBoyutu: yaziBoyutuAzalt(ayarlar.yaziBoyutu) })}
          >
            A− Küçült
          </button>
          <span
            className="secim-dugmesi"
            style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
            aria-live="polite"
          >
            %{yaziYuzde}
          </span>
          <button
            type="button"
            className="secim-dugmesi"
            onClick={() => ayarGuncelle({ yaziBoyutu: yaziBoyutuArtir(ayarlar.yaziBoyutu) })}
          >
            A+ Büyüt
          </button>
        </AyarSatiri>

        <AyarSatiri
          etiket="Renk körlüğü paleti"
          aciklama="Grafik ve çubuklarda ayrımı güçlendirir. Renkler zaten tek başına anlam taşımaz."
        >
          <label className="sr-only" htmlFor="renk-korlugu-secim">
            Renk körlüğü paleti seç
          </label>
          <select
            id="renk-korlugu-secim"
            className="secim-dugmesi"
            value={ayarlar.renkKorlugu}
            onChange={(e) => renkSec(e.target.value as Ayarlar['renkKorlugu'])}
          >
            {(Object.keys(RENK_KORLUGU_ETIKETLERI) as Ayarlar['renkKorlugu'][]).map((anahtar) => (
              <option key={anahtar} value={anahtar}>
                {RENK_KORLUGU_ETIKETLERI[anahtar]}
              </option>
            ))}
          </select>
        </AyarSatiri>

        <AyarSatiri
          etiket="Hareketi azalt"
          aciklama="Animasyonları ve geçişleri kapatır."
        >
          <button
            type="button"
            className="secim-dugmesi"
            aria-pressed={ayarlar.hareketAzalt}
            onClick={() => ayarGuncelle({ hareketAzalt: !ayarlar.hareketAzalt })}
          >
            {ayarlar.hareketAzalt ? 'Açık' : 'Kapalı'}
          </button>
        </AyarSatiri>

        <AyarSatiri
          etiket="Sessiz mod"
          aciklama="Sesli anlatımı, doğru/yanlış seslerini ve titreşimi kapatır. Derslerin tamamı ses olmadan bitirilebilir."
        >
          <button
            type="button"
            className="secim-dugmesi"
            aria-pressed={ayarlar.sessizMod}
            onClick={() => ayarGuncelle({ sessizMod: !ayarlar.sessizMod })}
          >
            {ayarlar.sessizMod ? 'Açık' : 'Kapalı'}
          </button>
        </AyarSatiri>
      </section>

      <YuklemeKarti />

      <section className="kart" aria-labelledby="gizlilik-basligi">
        <h2 id="gizlilik-basligi" style={{ fontSize: 'var(--yazi-xl)' }}>
          Gizlilik
        </h2>
        <ul style={{ margin: 0, paddingLeft: '1.2em', lineHeight: 1.7 }}>
          <li>Kişisel veri toplanmaz. Ad, e-posta, telefon veya konum istenmez.</li>
          <li>İlerlemen yalnızca bu cihazda saklanır; sunucuya gönderilmez.</li>
          <li>Reklam ve profilleme yoktur.</li>
          <li>Sınıf kodu anonimdir — kimliğini göstermez, yalnızca toplu ilerleme paylaşılır.</li>
        </ul>

        <div className="ayar-satiri" style={{ marginTop: 'var(--b-3)' }}>
          <div>
            <span className="ayar-satiri__etiket">Sınıf kodu</span>
            <span className="ayar-satiri__aciklama">
              {ilerleme.sinifKodu ? `Bağlısın: ${ilerleme.sinifKodu}` : 'Bağlı değilsin'}
            </span>
          </div>
          {ilerleme.sinifKodu && (
            <button type="button" className="dugme dugme--ikincil" onClick={() => sinifKoduAyarla(null)}>
              Bağlantıyı kes
            </button>
          )}
        </div>
      </section>

      <section className="kart" aria-labelledby="veri-basligi">
        <h2 id="veri-basligi" style={{ fontSize: 'var(--yazi-xl)' }}>
          İlerleme verisi
        </h2>
        <p className="metin-ikincil">
          {ilerleme.tamamlananDersler.length} ders tamamlandı · {ilerleme.defterSayfalari.length}{' '}
          defter sayfası · {ilerleme.elmas} elmas
        </p>
        <button
          type="button"
          className="dugme dugme--tehlike"
          onClick={() => {
            if (window.confirm('Tüm ilerlemen silinecek. Emin misin?')) sifirla();
          }}
        >
          İlerlemeyi sıfırla
        </button>
      </section>

      {/* Öğretmen ve yönetici girişleri çocuğun ana gezinmesinde değil, burada. */}
      <section className="kart" aria-labelledby="yetiskin-basligi">
        <h2 id="yetiskin-basligi" style={{ fontSize: 'var(--yazi-xl)' }}>
          Yetişkinler için
        </h2>
        <p className="metin-ikincil">
          Öğretmen sınıf kodu açar ve toplu ilerlemeyi görür; içerik ekibi eser ve ders ekler.
        </p>
        <AyarSatiri
          etiket="Harcamalarda veli onayı"
          aciklama="Vakıf Çarşısı'nda elmas harcamadan önce bir yetişkin onaylar. Gerçek para yoktur. Kapatmak da onay ister."
        >
          <button
            type="button"
            className="secim-dugmesi"
            aria-pressed={veliOnayi}
            onClick={() => {
              if (veliOnayi) setKapatmaOnayi(true);
              else {
                veliOnayiniAyarla(true);
                setVeliOnayi(true);
              }
            }}
          >
            {veliOnayi ? 'Açık' : 'Kapalı'}
          </button>
        </AyarSatiri>
        {kapatmaOnayi && (
          <VeliKapisi
            amac="Harcamalarda veli onayını kapatmak"
            onOnay={() => {
              veliOnayiniAyarla(false);
              setVeliOnayi(false);
              setKapatmaOnayi(false);
            }}
            onVazgec={() => setKapatmaOnayi(false)}
          />
        )}
        <div className="satir">
          <a className="dugme dugme--ikincil dugme--kucuk" href="#/ogretmen">
            Öğretmen paneli
          </a>
          <a className="dugme dugme--ikincil dugme--kucuk" href="#/panel">
            İçerik yönetimi
          </a>
        </div>
      </section>
    </div>
  );
}
