/**
 * Vakıf ağı — "Bu yapının kirası nereye gidiyordu?"
 *
 * YALNIZCA envanterde açıkça yazan bağlar (data/research → `vakfiyeAmaci`).
 * Çıkarım gerektiren bağlar (ör. külliye vakfiyesindeki "Yeni Bedesten"in hangi
 * yapı olduğu) bilerek ALINMADI.
 *
 * Hedef konumları: ders eseriyse kendi koordinatı; değilse OpenStreetMap
 * Nominatim (ODbL). Cami OSM'de bulunamadıysa semt/ilçe merkezi kullanıldı ve
 * `yaklasik: true` ile işaretlendi.
 */
export interface VakifBagi {
  /** Gelir getiren yapı (akar) — ders eseri. */
  akarId: string;
  hedef: {
    ad: string;
    yer: string;
    /** Hedef de bir ders eseriyse kimliği (konum ondan alınır). */
    eserId?: string;
    lng?: number;
    lat?: number;
    yaklasik?: boolean;
  };
  /** Çocuk diliyle tek cümle, envanterdeki vakfiye bilgisinden. */
  cumle: string;
}

const BAYEZID = { ad: 'II. Bayezid Külliyesi', yer: 'İstanbul', lng: 28.965386, lat: 41.0102779 };

export const VAKIF_BAGLARI: VakifBagi[] = [
  {
    akarId: 'bursa-koza-hani',
    hedef: BAYEZID,
    cumle: 'Koza Hanı’nın kirası İstanbul’daki II. Bayezid Külliyesi’ni yaşatıyordu.',
  },
  {
    akarId: 'bursa-pirinc-hani',
    hedef: BAYEZID,
    cumle: 'Pirinç Hanı, II. Bayezid’in İstanbul’daki camisine gelir sağlamak için yapıldı.',
  },
  {
    akarId: 'bursa-fidan-hani',
    hedef: { ad: 'Mahmutpaşa Külliyesi', yer: 'İstanbul', lng: 28.9713769, lat: 41.0111977 },
    cumle: 'Fidan Hanı’nın geliri İstanbul’daki Mahmutpaşa Külliyesi’ne gidiyordu.',
  },
  {
    akarId: 'bursa-ipek-hani-sultan-hani-han-i-harir',
    hedef: { ad: 'Yeşilcami Külliyesi', yer: 'Bursa', eserId: 'bursa-yesilcami-yesil-cami' },
    cumle: 'İpek Hanı, Yeşilcami Külliyesi’ne gelir sağlamak için yapıldı.',
  },
  {
    akarId: 'bursa-nasuh-pasa-hamami',
    hedef: { ad: 'Mesih Mehmed Paşa Camii', yer: 'Gelibolu', lng: 26.6722539, lat: 40.4054063, yaklasik: true },
    cumle: 'Nasuh Paşa Hamamı’nın geliri Mesih Mehmed Paşa’nın Gelibolu’daki camisine gidiyordu.',
  },
  {
    akarId: 'bursa-demirtas-timurtas-hamami',
    hedef: { ad: 'Demirtaş (Balıkpazarı) Camii', yer: 'Bursa', lng: 29.0713879, lat: 40.1888313, yaklasik: true },
    cumle: 'Demirtaş Hamamı’nın geliri Demirtaş Camii’nin masraflarına ayrılmıştı.',
  },
];
