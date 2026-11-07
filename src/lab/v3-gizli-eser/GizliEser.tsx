import { useState } from 'react';
import { LabKabuk, SecimSorusu, type Secim } from '../ortak/LabKabuk';

/**
 * V3 · Gizli Eser (resim açma bulmacası)
 * Fotoğraf 9 parçayla örtülü. Her doğru cevap 3 parça açar. Sonunda çocuk eseri tanır.
 * Geri çağırma (Roediger & Karpicke 2006) + merak boşluğu. İçerik: bursa-1.json → Yeşilcami.
 */

const SORULAR: { soru: string; secenekler: Secim[] }[] = [
  {
    soru: 'İpucu 1: Yapımı 1414’te başladı, 1419’da bitti. Kaç yılda bitti?',
    secenekler: [
      { metin: '5 yılda', dogru: true, geri: '1419 − 1414 = 5. Beş yılda bitti.' },
      { metin: '14 yılda', dogru: false, geri: 'Büyük yıldan küçük yılı çıkar: 1419 − 1414.' },
      { metin: '50 yılda', dogru: false, geri: 'Büyük yıldan küçük yılı çıkar: 1419 − 1414.' },
    ],
  },
  {
    soru: 'İpucu 2: Yanında bir imaret vardı. İmarette ne yapılırdı?',
    secenekler: [
      { metin: 'Kitap okunurdu', dogru: false, geri: 'Kitap medresede okunur. İmarette büyük bir kazan kaynar.' },
      { metin: 'Yemek pişip dağıtılırdı', dogru: true, geri: 'İmarette her gün yemek pişti.' },
      { metin: 'At beslenirdi', dogru: false, geri: 'İmarette büyük bir kazan kaynar. Kazanda ne olur?' },
    ],
  },
  {
    soru: 'İpucu 3: Yanındaki medresede kaç öğrenci okudu?',
    secenekler: [
      { metin: 'Üç', dogru: false, geri: 'Bu sayı bir sınıf kadar büyük.' },
      { metin: 'Otuz', dogru: true, geri: 'Medresede otuz öğrenci okudu.' },
      { metin: 'Üç bin', dogru: false, geri: 'Bu kadar öğrenci küçük bir medreseye sığmaz. Bir sınıf kadar düşün.' },
    ],
  },
  {
    soru: 'Son soru: Bu gizli eser hangisi?',
    secenekler: [
      { metin: 'Ulucami', dogru: false, geri: 'Ulucami 1399’da açıldı. Bizim eserimiz 1414’te başladı.' },
      { metin: 'Yeşilcami', dogru: true, geri: 'Bu Bursa’daki Yeşilcami! Onu Çelebi Sultan Mehmed yaptırdı.' },
      { metin: 'Yeşil Türbe', dogru: false, geri: 'Türbe bir mezar yapısıdır. Bizim eserimizin yanında imaret ve medrese var.' },
    ],
  },
];

/** Parçaların açılma sırası: ortadan dağınık, ilk turda yapının bir köşesi görünsün. */
const ACILMA_SIRASI = [4, 0, 8, 1, 6, 5, 2, 3, 7];

export function GizliEser({ baslangic = 0 }: { baslangic?: number }) {
  const ilk = Math.max(0, Math.min(baslangic, SORULAR.length));
  const [denemeler, setDenemeler] = useState<number[][]>(() =>
    SORULAR.map((s, i) => (i < ilk ? [s.secenekler.findIndex((x) => x.dogru)] : [])),
  );
  const cozuldu = (i: number) => (denemeler[i] ?? []).some((d) => SORULAR[i]?.secenekler[d]?.dogru);
  const cozulenSayisi = SORULAR.filter((_, i) => cozuldu(i)).length;
  const [aktif, setAktif] = useState(ilk);
  const acik = new Set(ACILMA_SIRASI.slice(0, Math.min(cozulenSayisi, 3) * 3));
  const bitti = aktif >= SORULAR.length;

  return (
    <LabKabuk
      kod="V3"
      ad="Gizli Eser"
      eser={bitti ? 'Yeşilcami, Bursa' : 'Gizli eser: Bursa’da bir yapı'}
      adim={cozulenSayisi}
      toplamAdim={SORULAR.length}
      kaynak="Doğan Yavaş, 'Yeşilcami Külliyesi', TDV İslâm Ansiklopedisi, C. 43 (2013), s. 492-495"
    >
      <figure className="sakli">
        <div className="sakli__cerceve oranti-16-9">
          <img
            src="/gorseller/bursa-yesilcami-yesil-cami/1.webp"
            alt={bitti ? 'Bursa Yeşilcami’nin dıştan görünüşü' : 'Örtülü bir fotoğraf. Parçaları açmak için soruları cevapla.'}
          />
          <div className="sakli__izgara" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={`sakli__parca ${acik.has(i) ? 'sakli__parca--acik' : ''}`}>
                {acik.has(i) ? '' : '?'}
              </span>
            ))}
          </div>
        </div>
        <figcaption className="metin-ikincil">
          {acik.size} / 9 parça açık
        </figcaption>
      </figure>

      {bitti ? (
        <div className="kart yigin lab__bitis">
          <p className="lab__bitis-baslik">Eseri buldun: Yeşilcami!</p>
          <p>Üç ipucu ile tanıdın: 5 yılda bitti, yanında imaret vardı, medresede otuz öğrenci okudu.</p>
        </div>
      ) : (
        <>
        <SecimSorusu
          key={aktif}
          soru={SORULAR[aktif]!.soru}
          secenekler={SORULAR[aktif]!.secenekler}
          cozuldu={cozuldu(aktif)}
          denenen={denemeler[aktif] ?? []}
          onDene={(d) => setDenemeler((o) => o.map((x, i) => (i === aktif ? [...x, d] : x)))}
          onDogru={() => undefined}
        />
        {cozuldu(aktif) && (
          <button type="button" className="dugme dugme--genis" onClick={() => setAktif((a) => a + 1)}>
            {aktif === SORULAR.length - 1 ? 'Eseri gör' : 'Sonraki ipucu'}
          </button>
        )}
        </>
      )}
    </LabKabuk>
  );
}
