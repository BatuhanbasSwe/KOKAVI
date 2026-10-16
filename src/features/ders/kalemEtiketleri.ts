/**
 * Vakıf Röntgeni kalemlerinin çocuk dilindeki etiketleri (10–12 yaş).
 *
 * Kalem adları araştırma verisinden (`data/research`) gelir ve vakfiye
 * dilindedir ("Kite kazası zemin-i bâğât mukataası…"). Veri `shared/` ve
 * `server/` sözleşmesi içinde olduğu için değiştirilmez; sadeleştirme burada,
 * UI tarafında yapılır. Yeni bilgi eklenmez; özgün ad "Büyükler için"
 * bölümünde kaynağıyla birlikte görünmeye devam eder.
 *
 * Anahtar, kalemin özgün metnidir (veritabanı id'si seed ile değişebilir).
 * Tabloda olmayan kalem özgün adıyla gösterilir.
 */
const ETIKETLER: Record<string, string> = {
  'Mahsûlât-ı kurâ: vakıf köylerinden buğday gelirleri (4.092 kile buğday = 70.615 kuruş)':
    'Köylerden gelen buğday (70.615 kuruş)',
  'Kite kazası zemin-i bâğât mukataası meyve öşrü (10.125 kuruş)':
    "Kite'deki meyvelerden alınan vergi (10.125 kuruş)",
  'Harir Hanı (İpek Hanı) rüsumu (2.500 kuruş)': "İpek Hanı'ndan gelen para (2.500 kuruş)",
  'Balıklı-i Sağîr mezraası çayır öşrü (722 kuruş)': 'Küçük bir çayırdan alınan vergi (722 kuruş)',
  'Geyve Hanı (Lonca Hanı) rüsumu (700 kuruş)': "Geyve Hanı'ndan gelen para (700 kuruş)",
  'Diğer kalemler (740 kuruş)': 'Diğer küçük gelirler (740 kuruş)',
  'Vakıf personeli maaşları (mütevelli, imam, hatip, müezzin, ikinci müezzin, cüzhan, murakkî, ferrâş, çırakçı, câbi)':
    'Çalışanların maaşları (imam, müezzin, yönetici ve diğerleri)',
  'Caminin yağ ve hasır ihtiyacı ile öngörülemeyen diğer masrafları':
    'Caminin yağı, hasırı ve beklenmedik masraflar',
  "Kuseyr'e bağlı Kozya köyü mahsul ve rüsûmunun tamamı": 'Kozya köyünün bütün ürünü ve vergisi',
  "Altunözü'ne bağlı Buhşîn köyü mahsulünün 3/24 kırat hissesi": "Buhşîn köyünün ürününden bir pay (24'te 3)",
  'Antakya surları içinde bağ ve bahçeye dönüştürülen arazi kirasının 12/24 kırat hissesi':
    'Antakya surları içindeki bağ ve bahçelerin kirasının yarısı',
  'Müderris (Hanefi mezhebinden)': 'Müderris (öğretmen)',
  'Mütevelli (vakıf yöneticisi)': 'Mütevelli (vakfın yöneticisi)',
  "Muid (müderris yardımcısı) — kaynakta çelişkili: bir pasajda muid, kapıcı ve ferrâşla birlikte 'yarımşar hisse', diğer pasajda muide tam bir hisse verildiği yazılıdır":
    'Muid (öğretmen yardımcısı)',
  'Bevvâb / kapıcı (vâkıfın kardeşinin oğullarından)': 'Kapıcı',
  'Ferrâş (vâkıfın kardeşinin oğullarından)': 'Ferrâş (temizlik görevlisi)',
  'İmam, fakih ve düzenli olarak dersleri takip edenler (müderris ve mütevellinin kararıyla dört mezhepten birine mensup olanlar)':
    'İmam ve derslere düzenli gelen öğrenciler',
  "Tevliyet ve nezaret hakkı (vakıf yöneticiliği ve denetimi) — sırasıyla vâkıfın kendisi, erkek evlâdı, azatlılarının oğulları, bunlar kalmadığında Konya Kadısı'nın re'yine":
    'Vakfı yönetme ve denetleme hakkı',
};

export function kalemEtiketi(kalem: string): string {
  return ETIKETLER[kalem] ?? kalem;
}
