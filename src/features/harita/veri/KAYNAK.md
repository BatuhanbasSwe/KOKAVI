# turkiye-iller.json — kaynak ve lisans

- **Kaynak:** Natural Earth, *Admin 1 – States, Provinces* (1:10m), sürüm: GitHub `nvkelso/natural-earth-vector` ana dalı, Ekim 2026.
- **Lisans:** Kamu malı (public domain) — https://www.naturalearthdata.com/about/terms-of-use/ . Atıf zorunlu değildir; yine de burada belirtilir.
- **İşlem:** Türkiye'nin 81 ili süzüldü, sınırlar Ramer–Douglas–Peucker ile ~1 km toleransla sadeleştirildi, koordinatlar 3 ondalığa yuvarlandı (~72 KB).
- **Neden gömülü:** Harita dış karo sunucusuna bağlı değildir; uygulama internetsiz (mobil, çevrimdışı) de Türkiye'yi çizer.
- Not: Natural Earth il adlarında Türkçe karakterler eksik olabilir (örn. "Izmir"); adlar ekranda gösterilmez, yalnızca `anahtar` alanı eşleştirme için kullanılır.

# ilceler.json — kaynak ve lisans

- **Kaynak:** geoBoundaries, *Türkiye ADM2 (ilçeler), gbOpen, simplified* — https://www.geoboundaries.org (GitHub `wmgeolab/geoBoundaries`, Ekim 2026).
- **Lisans:** CC BY 4.0 (geoBoundaries gbOpen). Atıf: Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative boundaries. PLoS ONE 15(4): e0231866.
- **İşlem:** Yalnızca Bursa (17), Konya (31) ve Hatay (15) ilçeleri süzüldü (ilçenin iç noktası il poligonunun içinde mi?), sınırlar ~300 m toleransla sadeleştirildi, koordinatlar 4 ondalığa yuvarlandı (~69 KB). `etiketLng/etiketLat` ilçe adının ve eser sayısı balonunun konumudur.
- **Neden gömülü:** Harita yakınlaştırıldığında ilçe ilçe görünüm internetsiz de çalışsın diye.
