/**
 * "Geçmişten bugüne": eserin tarihî fotoğrafı ile bugünkü görünümünün yan yana
 * karşılaştırıldığı veri. Yalnızca kaynağı ve lisansı belli fotoğraflar girer.
 *
 * Ulucami'nin 1862 ve 1865–75 tarihli fotoğrafları kamu malıdır (CC0);
 * bugünkü görünümler Vakıf Eserleri Envanteri fotoğraf arşivindendir.
 */
export interface GecmisFotografCifti {
  eski: {
    src: string;
    yil: string;
    alt: string;
  };
  bugun: {
    src: string;
    alt: string;
  };
}

export const GECMIS_FOTOGRAFLARI: Record<string, GecmisFotografCifti[]> = {
  'bursa-ulucami': [
    {
      eski: {
        src: '/gecmis/bursa-ulucami-1862.webp',
        yil: '1862',
        alt: "Bursa Ulu Cami ve çevresinin 1862'deki genel görünümü",
      },
      bugun: {
        src: '/gorseller/bursa-ulucami/1.webp',
        alt: "Bursa Ulu Cami'nin bugünkü genel görünümü",
      },
    },
    {
      eski: {
        src: '/gecmis/bursa-ulucami-1865-1875.webp',
        yil: '1865–75',
        alt: "Bursa Ulu Cami'nin 1865–1875 arasındaki iç görünümü",
      },
      bugun: {
        src: '/gorseller/bursa-ulucami/5.webp',
        alt: "Bursa Ulu Cami'nin bugünkü iç görünümü",
      },
    },
  ],
};

export const GECMIS_KAYNAK_METNI =
  'Eski fotoğraflar kamu malıdır (CC0). Bugünkü fotoğraflar Vakıf Eserleri Envanteri fotoğraf arşivindendir.';
