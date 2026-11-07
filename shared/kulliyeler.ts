/**
 * Belgelenmiş külliye grupları — "sınıf birlikte bir külliyeyi tamamlar" akışı.
 *
 * PDF Senaryo B: "Öğretmen sınıf kodunu açar. Sınıf birlikte bir külliyeyi
 * tamamlar; Vakıf Röntgeni'ni birlikte görür."
 *
 * NEDEN BURADA, VERİTABANINDA DEĞİL?
 * `work.kulliye_id` alanı ve `kulliye` tablosu şemada var; ancak üretim
 * verisinde şu an yalnızca 57 ders eseri yayınlanıyor ve bu eserlerin külliye
 * bağları resmî envanter künyelerindeki "külliye" alanında metin olarak
 * duruyor. Şemayı ve seed'i değiştirmeden, yalnızca KAYNAKTA AÇIKÇA
 * BELGELENMİŞ bağları burada tutuyoruz. Uydurma külliye bağı eklenmez.
 *
 * Her grup için `kaynak` alanı zorunludur: bağın hangi künyeye dayandığı
 * görünür olmalıdır. Yeni grup eklerken de aynı kural geçerlidir.
 *
 * Not: Bir eser birden fazla grupta olamaz; test bunu denetler.
 */

export interface KulliyeGrubu {
  /** Kararlı kimlik (URL'de kullanılmaz, yalnız veri). */
  id: string;
  ad: string;
  sehirId: string;
  /** Bu külliyeye bağlı eserlerin `work.id` değerleri. */
  eserIdler: readonly string[];
  /** Külliye bağının dayandığı kaynak künyesi — uydurma bağ yasak. */
  kaynak: string;
}

export const KULLIYE_GRUPLARI: readonly KulliyeGrubu[] = [
  {
    id: 'yesil-kulliyesi',
    ad: 'Yeşilcami (Yeşil) Külliyesi',
    sehirId: 'bursa',
    eserIdler: [
      'bursa-yesilcami-yesil-cami',
      'bursa-yesil-medrese-sultaniye-medresesi-bugun-bursa-tu',
      'bursa-yesil-turbe-celebi-sultan-mehmed-turbesi',
      // Harir/İpek Hanı, Yeşil Külliye'nin vakıf gelirleri arasında sayılır.
      'bursa-ipek-hani-sultan-hani-han-i-harir',
    ],
    kaynak:
      "Vakıf Katılım, 'Bursa Vakıf Eserleri', I. Cilt (Nisan 2026) — Yeşilcami, Yeşil Medrese, Yeşil Türbe; II. Cilt (Nisan 2026) — İpek (Harir) Hanı. Külliye bağı bu kayıtların 'külliye' alanında ve TDV İA 'Yeşilcami Külliyesi' (C. 43) maddesinde belgelenmiştir.",
  },
  {
    id: 'muradiye-kulliyesi',
    ad: 'Muradiye (II. Murad) Külliyesi',
    sehirId: 'bursa',
    eserIdler: [
      'bursa-ii-murad-kulliyesi',
      'bursa-muradiye-hamami-ii-murad-hamami-bekciyan-hamami',
      'bursa-muradiye-medresesi-cesmesi',
    ],
    kaynak:
      "Vakıf Katılım, 'Bursa Vakıf Eserleri', II. Cilt (Nisan 2026) — II. Murad (Muradiye) Külliyesi ve Muradiye Hamamı; III. Cilt (Nisan 2026) — Muradiye Medresesi Çeşmesi. Külliye bağı kayıtların 'külliye' alanında ve TDV İA 'Muradiye Külliyesi' maddesinde belgelenmiştir.",
  },
] as const;

/** Eser kimliğinden külliye grubunu bulur; bağ yoksa `null`. */
export function eserinKulliyesi(eserId: string): KulliyeGrubu | null {
  return KULLIYE_GRUPLARI.find((grup) => grup.eserIdler.includes(eserId)) ?? null;
}
