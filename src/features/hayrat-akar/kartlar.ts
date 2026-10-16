/**
 * "Hayrat mı Akar mı?" kartları.
 *
 * Sınıflandırma YALNIZCA envanterdeki vakfiye bilgisinden (data/research/*.json
 * → `vakfiyeAmaci`, `hizmet`) yapıldı. Belirsiz olanlar (hem hayrat hem akar
 * içeren külliyeler, Irgandı Köprüsü gibi karma yapılar, vakfiye metni olmayan
 * eserler) oyuna ALINMADI. Uydurma yok.
 *
 *   hayrat → doğrudan insanlara hizmet eden yapı (cami, medrese, çeşme…)
 *   akar   → kirasıyla bir hayratı yaşatan, gelir getiren yapı (han, hamam, bedesten…)
 */
export type HayratAkar = 'hayrat' | 'akar';

export interface Kart {
  eserId: string;
  dogru: HayratAkar;
  /** Cevaptan sonra gösterilen tek cümle; envanterdeki vakfiye bilgisinden. */
  neden: string;
}

export const KARTLAR: Kart[] = [
  // --- AKAR: geliri başka bir hayrata gidiyordu ---------------------------------
  { eserId: 'bursa-koza-hani', dogru: 'akar', neden: 'Kirası İstanbul’daki II. Bayezid Külliyesi’ne gidiyordu.' },
  { eserId: 'bursa-pirinc-hani', dogru: 'akar', neden: 'II. Bayezid’in İstanbul’daki camisine gelir sağlamak için yapıldı.' },
  { eserId: 'bursa-fidan-hani', dogru: 'akar', neden: 'Geliri İstanbul’daki Mahmutpaşa Külliyesi’ne gidiyordu.' },
  { eserId: 'bursa-ipek-hani-sultan-hani-han-i-harir', dogru: 'akar', neden: 'Yeşilcami Külliyesi’ne gelir sağlamak için yapıldı.' },
  { eserId: 'bursa-yildirim-bayezid-bedesteni', dogru: 'akar', neden: 'Dükkânlarının kirası vakfa gelir sağlıyordu.' },
  { eserId: 'bursa-nasuh-pasa-hamami', dogru: 'akar', neden: 'Geliri Mesih Mehmed Paşa’nın Gelibolu’daki camisine gidiyordu.' },
  { eserId: 'bursa-demirtas-timurtas-hamami', dogru: 'akar', neden: 'Geliri Demirtaş Camii’nin masraflarına ayrılmıştı.' },

  // --- HAYRAT: doğrudan insanlara hizmet ---------------------------------------
  { eserId: 'bursa-issiz-susuz-han', dogru: 'hayrat', neden: 'Bir han ama hayrat! Kervan yolundaki yolculara hizmet için yapıldı.' },
  { eserId: 'hatay-kanuni-sultan-suleyman-kervansarayi', dogru: 'hayrat', neden: 'Bir kervansaray ama hayrat: kervan yolunu güvenli kılıp yolculara hizmet etti.' },
  { eserId: 'bursa-ulucami', dogru: 'hayrat', neden: 'Şehrin büyük cuma camisi olarak halka hizmet etti.' },
  { eserId: 'bursa-yesilcami-yesil-cami', dogru: 'hayrat', neden: 'İbadet yeri; vakfının imaretinde yemek dağıtılırdı.' },
  { eserId: 'bursa-yesil-medrese-sultaniye-medresesi-bugun-bursa-tu', dogru: 'hayrat', neden: 'Öğrencilerin okuduğu bir medrese.' },
  { eserId: 'bursa-haraccioglu-darulkurra-mektebi', dogru: 'hayrat', neden: 'Kur’an eğitimi vermek için yapıldı.' },
  { eserId: 'bursa-molla-yegan-medresesi', dogru: 'hayrat', neden: 'Medrese eğitimini sürdürmek için kuruldu.' },
  { eserId: 'bursa-gokdere-medresesi-pasa-celebi-medresesi', dogru: 'hayrat', neden: 'Bir eğitim vakfıydı.' },
  { eserId: 'bursa-veled-i-yanic-mescidi-veled-i-yanic-camii', dogru: 'hayrat', neden: 'Mahalle halkının ibadet ettiği mescit.' },
  { eserId: 'bursa-gazi-hudavendigar-kaplica-imareti', dogru: 'hayrat', neden: 'Âlimler ve yoksullar burada üç gün misafir edilirdi.' },
  { eserId: 'bursa-nilufer-hatun-imareti', dogru: 'hayrat', neden: 'Konuk odaları olan bir imaret (misafirhane).' },
  { eserId: 'bursa-dullar-evi', dogru: 'hayrat', neden: 'Şehit eşlerine ve kimsesiz kadınlara barınak oldu.' },
  { eserId: 'bursa-besir-aga-cesmesi', dogru: 'hayrat', neden: '“Hayır kazanmak” için herkesin su içsin diye yapıldı.' },
  { eserId: 'bursa-muradiye-medresesi-cesmesi', dogru: 'hayrat', neden: 'Mahallenin su ihtiyacını karşılayan çeşme.' },
  { eserId: 'karatay-medresesi', dogru: 'hayrat', neden: 'Selçuklu döneminde öğrencilerin okuduğu medrese.' },
  { eserId: 'konya-ince-minareli-medrese', dogru: 'hayrat', neden: 'Hadis öğretilen bir medrese.' },
  { eserId: 'konya-sultan-alaeddin-camii', dogru: 'hayrat', neden: 'Konya halkının cuma camisi.' },
  { eserId: 'hatay-habib-i-neccar-camii-ve-kulliyesi', dogru: 'hayrat', neden: 'Cami; imaretinde fakirlere yemek verilirdi.' },
  { eserId: 'hatay-ulu-camii-ve-kulliyesi', dogru: 'hayrat', neden: 'Antakya’nın cuma camisi.' },
  { eserId: 'hatay-kursunlu-han-cesmesi', dogru: 'hayrat', neden: 'Çarşının ve han çevresinin su ihtiyacını karşıladı.' },
  { eserId: 'hatay-beyazid-i-bestami-turbesi-ve-tekkesi', dogru: 'hayrat', neden: 'Dervişlerin ve ziyaretçilerin tekkesi.' },
];

export const TUR_BOYU = 10;

/** Tur için kartları karıştırır; en az 3 akar olsun (akar az, oyun dengesiz kalmasın). */
export function turKartlari(rastgele: () => number = Math.random): Kart[] {
  const karistir = <T,>(d: T[]) => {
    const k = [...d];
    for (let i = k.length - 1; i > 0; i--) {
      const j = Math.floor(rastgele() * (i + 1));
      [k[i], k[j]] = [k[j]!, k[i]!];
    }
    return k;
  };
  const akar = karistir(KARTLAR.filter((k) => k.dogru === 'akar')).slice(0, 4);
  const hayrat = karistir(KARTLAR.filter((k) => k.dogru === 'hayrat')).slice(0, TUR_BOYU - akar.length);
  return karistir([...akar, ...hayrat]);
}
