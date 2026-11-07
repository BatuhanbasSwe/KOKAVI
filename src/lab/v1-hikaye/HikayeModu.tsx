import { useEffect, useRef, useState } from 'react';
import { LabKabuk, SecimSorusu, type Secim } from '../ortak/LabKabuk';

/**
 * V1 · Hikâye Modu (Duolingo Stories benzeri)
 * Perspektif diyaloğu balon balon akar. Araya giren sorular okumadan geçilemez.
 * İçerik: data/content/bursa-1.json → bursa-yesilcami-yesil-cami (bağlam + perspektif).
 */

type Satir =
  | { tur: 'konusma'; kim: string; metin: string; taraf: 'sol' | 'sag' }
  | { tur: 'soru'; soru: string; secenekler: Secim[] };

const SATIRLAR: Satir[] = [
  { tur: 'konusma', kim: 'ANLATICI', taraf: 'sol', metin: 'Yıl 1419. Bursa. Yeşilcami’nin büyük kapısının üstündeki yazı yeni bitti.' },
  {
    tur: 'konusma',
    kim: 'ÇELEBİ SULTAN MEHMED',
    taraf: 'sag',
    metin: 'Bursa’ya bir imaret ve bir cami yapılsın. Gariplere ve yoksullara da bir misafirhane açılsın.',
  },
  {
    tur: 'soru',
    soru: 'Padişah “imaret” dedi. İmaret ne demek?',
    secenekler: [
      { metin: 'Askerlerin kaldığı bir kale', dogru: false, geri: 'Padişah yoksullardan söz etti. İmarette büyük bir kazan kaynar.' },
      { metin: 'Yemek pişirilip dağıtılan yer', dogru: true, geri: 'İmarette her gün yemek pişti ve dağıtıldı.' },
      { metin: 'Kitapların saklandığı oda', dogru: false, geri: 'Kitaplar medresede okunur. İmarette büyük bir kazan kaynar.' },
    ],
  },
  { tur: 'konusma', kim: 'ANLATICI', taraf: 'sol', metin: 'Kâtip kalemini aldı. Şimdi en önemli soru geldi: Bütün bunların parasını ne ödeyecek?' },
  {
    tur: 'soru',
    soru: 'İmaretin kazanı her gün kaynayacak. Kâtip vakfiyeye ne yazmalı?',
    secenekler: [
      {
        metin: 'Yemek yiyen yoksullardan para toplansın.',
        dogru: false,
        geri: 'İmaret yoksullara yardım için kuruldu. Yemek yiyenlerden para alındığına dair kayıt yok.',
      },
      {
        metin: 'Hanların ve dükkânların kirası vakfa bağlansın.',
        dogru: true,
        geri: 'Gerçekte de böyle oldu. Han ve dükkân kiraları bu hizmetleri karşıladı.',
      },
      {
        metin: 'Her yıl padişahın hazinesinden para gelsin.',
        dogru: false,
        geri: 'Para hazineden gelmedi. Yapılar kendi parasını kazanıyordu. Kirası olan yapıları düşün.',
      },
    ],
  },
  {
    tur: 'konusma',
    kim: 'ANLATICI',
    taraf: 'sol',
    metin: 'Yapılar 1419’un sonunda bitti. Cami, medrese ve imaret için tek bir vakfiye yazıldı. Medresede otuz öğrenci okudu.',
  },
  {
    tur: 'soru',
    soru: 'Hikâyeyi dinledin. Medresede kaç öğrenci okudu?',
    secenekler: [
      { metin: 'Üç', dogru: false, geri: 'Son balonu bir daha oku. Sayı yazıyla yazılmış.' },
      { metin: 'Üç yüz', dogru: false, geri: 'Son balonu bir daha oku. Sayı yazıyla yazılmış.' },
      { metin: 'Otuz', dogru: true, geri: 'Medresede otuz öğrenci okudu. Onların masrafını da vakıf ödedi.' },
    ],
  },
];

export function HikayeModu({ baslangic = 1 }: { baslangic?: number }) {
  const [gorunen, setGorunen] = useState(Math.max(1, Math.min(baslangic, SATIRLAR.length)));
  const [denemeler, setDenemeler] = useState<Record<number, number[]>>(() => onizlemeDenemeleri(baslangic));
  const sonRef = useRef<HTMLLIElement>(null);

  const sonIndex = gorunen - 1;
  const sonSatir = SATIRLAR[sonIndex];
  const cozuldu = (i: number) => {
    const s = SATIRLAR[i];
    return s?.tur === 'soru' && (denemeler[i] ?? []).some((d) => s.secenekler[d]?.dogru);
  };
  const devamEdebilir = sonSatir?.tur === 'konusma' || cozuldu(sonIndex);
  const bitti = gorunen === SATIRLAR.length && devamEdebilir;

  useEffect(() => {
    sonRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [gorunen]);

  return (
    <LabKabuk
      kod="V1"
      ad="Hikâye Modu"
      eser="Yeşilcami’nin kazanı"
      adim={bitti ? SATIRLAR.length : sonIndex}
      toplamAdim={SATIRLAR.length}
      kaynak="Doğan Yavaş, 'Yeşilcami Külliyesi', TDV İslâm Ansiklopedisi, C. 43 (2013), s. 492-495"
    >
      <ol className="hikaye" aria-label="Hikâye" aria-live="polite">
        {SATIRLAR.slice(0, gorunen).map((s, i) => (
          <li key={i} ref={i === sonIndex ? sonRef : undefined} className={s.tur === 'konusma' ? `balon balon--${s.taraf}` : 'hikaye__soru'}>
            {s.tur === 'konusma' ? (
              <>
                <span className="balon__kim">
                  <span aria-hidden="true">{s.taraf === 'sag' ? '' : ''}</span> {s.kim}
                </span>
                <p className="balon__metin">{s.metin}</p>
              </>
            ) : (
              <SecimSorusu
                soru={s.soru}
                secenekler={s.secenekler}
                cozuldu={cozuldu(i)}
                denenen={denemeler[i] ?? []}
                onDene={(d) => setDenemeler((o) => ({ ...o, [i]: [...(o[i] ?? []), d] }))}
                onDogru={() => undefined}
              />
            )}
          </li>
        ))}
      </ol>

      {bitti ? (
        <div className="kart yigin lab__bitis">
          <p className="lab__bitis-baslik">Hikâyeyi bitirdin!</p>
          <p>Üç soruyu da hikâyeyi okuyarak buldun. Yeni kelime: <strong>imaret</strong>.</p>
          <p className="metin-ikincil">Hatırla: Yeşilcami kendi parasını kazanan bir kurumdu.</p>
        </div>
      ) : (
        <button type="button" className="dugme dugme--genis" disabled={!devamEdebilir} onClick={() => setGorunen((g) => g + 1)}>
          {devamEdebilir ? 'Devam' : 'Önce soruyu cevapla'}
        </button>
      )}
    </LabKabuk>
  );
}

/** Ekran görüntüsü için: baslangic'a kadar olan soruları çözülmüş göster. */
function onizlemeDenemeleri(baslangic: number): Record<number, number[]> {
  const sonuc: Record<number, number[]> = {};
  SATIRLAR.forEach((s, i) => {
    if (s.tur !== 'soru' || i >= baslangic - 1) return;
    sonuc[i] = [s.secenekler.findIndex((x) => x.dogru)];
  });
  return sonuc;
}
