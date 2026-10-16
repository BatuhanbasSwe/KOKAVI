/**
 * Sınıf modu.
 *
 * PDF Senaryo B: "Öğretmen sınıf kodunu açar. Sınıf birlikte bir külliyeyi
 * tamamlar; Vakıf Röntgeni'ni birlikte görür."
 * PDF gizlilik: "Kişisel veri toplanmaz, sınıf kodu anonim."
 *
 * Bu yüzden sınıf kodu bir KİMLİK değildir: öğretmen kod üretir, çocuk girer,
 * hiçbir isim/e-posta/e-posta saklanmaz. Kod yalnızca cihazda tutulur.
 */
import { useState } from 'react';
import { useDurum } from '../../app/DurumSaglayici';

/** Karışması kolay harfler (I, O, 0, 1) çıkarılmış alfabe. */
const ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function kodUret(): string {
  const parca = (uzunluk: number) =>
    Array.from({ length: uzunluk }, () => ALFABE[Math.floor(Math.random() * ALFABE.length)]).join('');
  return `${parca(3)}-${parca(4)}`;
}

function kodGecerliMi(kod: string): boolean {
  return /^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(kod.trim().toUpperCase());
}

export function SinifSayfasi() {
  const { ilerleme, sinifKoduAyarla } = useDurum();
  const [girdi, setGirdi] = useState('');
  const [uretilen, setUretilen] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<{ tip: 'basari' | 'hata'; metin: string } | null>(null);

  const katil = () => {
    const kod = girdi.trim().toUpperCase();
    if (!kodGecerliMi(kod)) {
      setMesaj({ tip: 'hata', metin: 'Kod XYZ-2345 biçiminde olmalı. Öğretmeninden tekrar iste.' });
      return;
    }
    sinifKoduAyarla(kod);
    setMesaj({ tip: 'basari', metin: `${kod} kodlu sınıfa bağlandın.` });
    setGirdi('');
  };

  return (
    <div className="yigin" style={{ gap: 'var(--b-5)' }}>
      <div>
        <h1>Sınıf</h1>
        <p className="metin-ikincil">
          Sınıfınla birlikte bir külliyeyi tamamlayın. Kod anonimdir — adın veya e-postan
          istenmez, hiçbir kişisel bilgi saklanmaz.
        </p>
      </div>

      {ilerleme.sinifKodu ? (
        <section className="kart" aria-labelledby="bagli-baslik">
          <h2 id="bagli-baslik" style={{ fontSize: 'var(--yazi-xl)' }}>
            Bağlı olduğun sınıf
          </h2>
          <p style={{ fontSize: 'var(--yazi-2xl)', fontWeight: 800, margin: 'var(--b-2) 0' }}>
            {ilerleme.sinifKodu}
          </p>
          <p className="metin-ikincil">
            Sınıfınla birlikte tamamladığınız dersler toplu olarak ilerler.
          </p>
          <button
            type="button"
            className="dugme dugme--ikincil"
            onClick={() => {
              sinifKoduAyarla(null);
              setMesaj({ tip: 'basari', metin: 'Sınıf bağlantın kesildi.' });
            }}
          >
            Bağlantıyı kes
          </button>
        </section>
      ) : (
        <section className="kart" aria-labelledby="katil-baslik">
          <h2 id="katil-baslik" style={{ fontSize: 'var(--yazi-xl)' }}>
            Sınıfa katıl
          </h2>
          <div style={{ marginTop: 'var(--b-3)', maxWidth: 320 }}>
            <label htmlFor="sinif-kodu" style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
              Sınıf kodu
            </label>
            <input
              id="sinif-kodu"
              type="text"
              value={girdi}
              onChange={(e) => setGirdi(e.target.value)}
              placeholder="XYZ-2345"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="sinif-kodu-aciklama"
              style={{
                width: '100%',
                minHeight: 48,
                padding: 'var(--b-2) var(--b-3)',
                font: 'inherit',
                fontSize: 'var(--yazi-lg)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: 'var(--kose-md)',
                border: '2px solid var(--cizgi)',
                background: 'var(--zemin-kart)',
                color: 'var(--metin)',
              }}
            />
            <p id="sinif-kodu-aciklama" className="metin-soluk" style={{ marginTop: 6 }}>
              Öğretmenin tahtaya yazdığı kodu gir.
            </p>
            <button type="button" className="dugme" style={{ marginTop: 'var(--b-3)' }} onClick={katil}>
              Katıl
            </button>
          </div>
        </section>
      )}

      {mesaj && (
        <div
          className={`bildirim bildirim--${mesaj.tip === 'hata' ? 'hata' : 'basari'}`}
          role={mesaj.tip === 'hata' ? 'alert' : 'status'}
        >
          {mesaj.metin}
        </div>
      )}

      <section className="kart" aria-labelledby="ogretmen-baslik">
        <h2 id="ogretmen-baslik" style={{ fontSize: 'var(--yazi-xl)' }}>
          Öğretmen misin?
        </h2>
        <p className="metin-ikincil">
          Sınıfın için bir kod oluştur ve tahtaya yaz. Çocuklar bu kodu girerek sınıfa katılır.
        </p>
        <button
          type="button"
          className="dugme"
          onClick={() => {
            const kod = kodUret();
            setUretilen(kod);
            setMesaj(null);
          }}
        >
          Sınıf kodu oluştur
        </button>

        {uretilen && (
          <div className="bildirim bildirim--bilgi" style={{ marginTop: 'var(--b-3)' }}>
            <div className="etiket">Sınıf kodun</div>
            <p
              style={{
                fontSize: 'var(--yazi-2xl)',
                fontWeight: 800,
                letterSpacing: '0.1em',
                margin: 'var(--b-2) 0',
              }}
            >
              {uretilen}
            </p>
            <p style={{ margin: 0 }}>
              Bu kodda hiçbir kişisel bilgi yoktur. Öğrenci isimleri toplanmaz; yalnızca toplu
              ilerleme görünür.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
