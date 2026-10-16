/**
 * Şehir sertifikası — bir şehrin bütün derslerini bitiren çocuğa "… Kâşifi" belgesi.
 *
 * 🔒 GİZLİLİK: Çocuğun adı yalnızca bu ekranda durur; KAYDEDİLMEZ, sunucuya
 * GİTMEZ. Ad boş bırakılabilir ("Genç Kâşif" yazar).
 *
 * Renkler: ekranda SVG jeton sınıflarıyla çizilir. İndirirken her öğenin o
 * anki hesaplanmış rengi dosyaya işlenir (kodda ham renk yok; tema neyse o).
 */
import { useRef, useState } from 'react';
import { useDurum } from '@/app/DurumSaglayici';
import { gunAnahtari } from '@/lib/ilerleme';
import './sertifika.css';

function tarihMetni(): string {
  const [y, a, g] = gunAnahtari().split('-');
  return `${g}.${a}.${y}`;
}

/** SVG'yi, hesaplanmış renkleri satır içine işleyerek bağımsız bir dosyaya çevirir. */
function svgDosyasi(svg: SVGSVGElement): string {
  const kopya = svg.cloneNode(true) as SVGSVGElement;
  const asil = svg.querySelectorAll<SVGElement>('*');
  const hedef = kopya.querySelectorAll<SVGElement>('*');
  asil.forEach((el, i) => {
    const s = getComputedStyle(el);
    const h = hedef[i]!;
    for (const ozellik of ['fill', 'stroke', 'stroke-width', 'font-family', 'font-weight', 'font-size'] as const) {
      const deger = s.getPropertyValue(ozellik);
      if (deger) h.setAttribute(ozellik, deger);
    }
    h.removeAttribute('class');
  });
  kopya.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(kopya);
}

export function SertifikaSayfasi({ sehirId }: { sehirId: string }) {
  const { yol } = useDurum();
  const [ad, setAd] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const sehir = yol?.sehirler.find((s) => s.sehirId === sehirId);

  if (!yol) return <p role="status">Yükleniyor…</p>;
  if (!sehir) {
    return (
      <div className="kart yigin">
        <h1>Böyle bir şehir yok</h1>
        <a className="dugme" href="#/defter">
          Kâşif Defteri'ne dön
        </a>
      </div>
    );
  }

  const tamam = sehir.toplamSayi > 0 && sehir.tamamlananSayi >= sehir.toplamSayi;
  if (!tamam) {
    return (
      <div className="kart yigin sertifika-kilit">
        <h1>{sehir.ad} Kâşifi sertifikası</h1>
        <p>
          Sertifika, {sehir.ad} şehrindeki bütün dersleri bitirince açılır. Şu an{' '}
          <strong>
            {sehir.tamamlananSayi}/{sehir.toplamSayi}
          </strong>{' '}
          derstesin.
        </p>
        <div
          className="sertifika-ilerleme"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={sehir.toplamSayi}
          aria-valuenow={sehir.tamamlananSayi}
          aria-label={`${sehir.ad} ilerlemesi`}
        >
          <span style={{ ['--oran' as string]: sehir.tamamlananSayi / sehir.toplamSayi }} />
        </div>
        <a className="dugme" href="#/yol">
          Derslere devam et
        </a>
      </div>
    );
  }

  const gorunenAd = ad.trim() || 'Genç Kâşif';

  function indir() {
    if (!svgRef.current) return;
    const blob = new Blob([svgDosyasi(svgRef.current)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kok-avi-${sehirId}-kasifi.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="yigin sertifika-sayfa">
      <div className="sertifika-ust">
        <h1>{sehir.ad} Kâşifi sertifikan hazır!</h1>
        <p className="metin-ikincil">
          İstersen adını yaz. Adın yalnızca bu ekranda durur; kaydedilmez, hiçbir yere gönderilmez.
        </p>
        <label className="sertifika-etiket" htmlFor="sertifika-ad">
          Sertifikadaki ad (isteğe bağlı)
        </label>
        <input
          id="sertifika-ad"
          className="sertifika-girdi"
          maxLength={40}
          autoComplete="off"
          value={ad}
          onChange={(o) => setAd(o.target.value)}
        />
      </div>

      <figure className="sertifika-cerceve">
        <svg
          ref={svgRef}
          className="sertifika"
          viewBox="0 0 1000 700"
          role="img"
          aria-label={`${gorunenAd} adına ${sehir.ad} Kâşifi sertifikası. ${sehir.toplamSayi} vakıf eseri keşfedildi. Tarih ${tarihMetni()}.`}
        >
          <rect className="sertifika__zemin" x="0" y="0" width="1000" height="700" />
          <rect className="sertifika__cerceve" x="28" y="28" width="944" height="644" rx="24" />
          <rect className="sertifika__ic-cerceve" x="48" y="48" width="904" height="604" rx="16" />
          {/* köşe yıldızları */}
          {[
            [90, 90],
            [910, 90],
            [90, 610],
            [910, 610],
          ].map(([x, y]) => (
            <path
              key={`${x}-${y}`}
              className="sertifika__kose"
              transform={`translate(${x! - 22} ${y! - 22}) scale(0.69)`}
              d="M32 2 40.6 11.2 53.2 10.8 52.8 23.4 62 32 52.8 40.6 53.2 53.2 40.6 52.8 32 62 23.4 52.8 10.8 53.2 11.2 40.6 2 32 11.2 23.4 10.8 10.8 23.4 11.2Z"
            />
          ))}
          <text className="sertifika__ust" x="500" y="140" textAnchor="middle">
            KÖK AVI · VAKIF ESERLERİ
          </text>
          <text className="sertifika__baslik" x="500" y="215" textAnchor="middle">
            {sehir.ad} Kâşifi
          </text>
          <text className="sertifika__metin" x="500" y="285" textAnchor="middle">
            Tebrikler,
          </text>
          <text className="sertifika__ad" x="500" y="365" textAnchor="middle">
            {gorunenAd}
          </text>
          <line className="sertifika__cizgi" x1="270" y1="390" x2="730" y2="390" />
          <text className="sertifika__metin" x="500" y="445" textAnchor="middle">
            {`${sehir.ad} şehrindeki ${sehir.toplamSayi} vakıf eserinin hepsini keşfettin!`}
          </text>
          <text className="sertifika__alt" x="500" y="580" textAnchor="middle">
            {tarihMetni()} · Takım TRİA · KÖK &amp; KOD
          </text>
          {/* mühür */}
          <g transform="translate(820 520)">
            <path
              className="sertifika__muhur"
              transform="translate(-48 -48) scale(1.5)"
              d="M32 2 40.6 11.2 53.2 10.8 52.8 23.4 62 32 52.8 40.6 53.2 53.2 40.6 52.8 32 62 23.4 52.8 10.8 53.2 11.2 40.6 2 32 11.2 23.4 10.8 10.8 23.4 11.2Z"
            />
            <circle className="sertifika__muhur-ic" r="26" />
            <text className="sertifika__muhur-yazi" y="8" textAnchor="middle">
              {sehir.ad.charAt(0)}
            </text>
          </g>
        </svg>
      </figure>

      <div className="satir sertifika-eylem">
        <button type="button" className="dugme" onClick={() => window.print()}>
          Yazdır
        </button>
        <button type="button" className="dugme dugme--ikincil" onClick={indir}>
          İndir (SVG)
        </button>
        <a className="dugme dugme--ikincil" href="#/defter">
          Deftere dön
        </a>
      </div>
    </div>
  );
}
