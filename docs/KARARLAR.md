# Kararlar — başvuru PDF'indeki belirsizliklerin çözümü

Başvuru PDF'i (`../sunum/KokAvi_Sunum.pdf`) bağlayıcı spesifikasyondur; organizasyon
"PDF'te ne yazıyorsa aynısını yapın" dedi. Ancak PDF kendi içinde birkaç noktada
belirsiz veya çelişkili. Bu doküman her birini **nasıl yorumladığımızı ve neden**
kaydeder. Jüri "neden böyle yaptınız?" diye sorduğunda cevap buradadır.

---

## 1. "Her şehir bir ünite" ifadesi vs. yol görselindeki 3 Bursa ünitesi

**PDF'te:** Öğrenme Yolu başlığı *"her şehir bir ünite, her eser bir ders"* diyor.
Ama hemen altındaki görselde `Bursa Ünite 1`, `Bursa Ünite 2`, `Bursa Ünite 3`
ardından `Konya Ünite 1` sıralanıyor. Yol haritası da *"Bursa pilotu. 80 eser,
**3 ünite**"* diyor.

**Çelişki:** Bir şehir hem 1 ünite hem 3 ünite olamaz.

**Kararımız:** **Görsel ve yol haritası geçerlidir.** Şehir, ünite **grubudur**;
bir şehir birden fazla ünite içerir. Bursa = 3 ünite.

**Neden:** İki bağımsız kanıt (yol görseli + yol haritası) sayıyı gösteriyor;
başlıktaki ifade ise kısa bir özet. Ayrıca 80 eseri tek üniteye koymak pedagojik
olarak anlamsız olurdu — ünite, bitirilebilir bir hedeftir.

**Kodda:** `server/seed/run.ts` → `BURSA_UNITE_SAYISI = 3`; `src/lib/ilerleme.ts`
→ `yolHesapla` üniteleri düzleştirip sırayla kilitler.

---

## 2. "Kalp gitmez" — kalp mekaniği var mı?

**PDF'te:** Adım 04 açıklaması: *"Karışık egzersiz tipleri. Yanlış → ipucu + tekrar
turu, **kalp gitmez**."* Ama günlük alışkanlık katmanı listesinde (Seri, Elmas,
Seviye, Kâşif Defteri, Özerklik, İlişkisellik) **kalp geçmiyor.**

**Belirsizlik:** Kalp mekaniği var da kaybedilmiyor mu, yoksa hiç mi yok?

**Kararımız:** **Kalp mekaniği hiç yok.** "Kalp gitmez" ifadesi, Duolingo'nun
aksine ilerlemenin asla cezalandırılmadığını vurgulayan bir **kontrast cümlesidir**,
bir mekanik tarifi değil.

**Neden:** Listede yer almıyor; ayrıca `Akis_OnePage` çalışma dokümanındaki karar
*"Lig, kalp ve suçluluk mesajı yok"* diyor. Ürünün pedagojik çizgisi (Kirschner,
Kapur) da cezalandırmayan geri bildirim üzerine kurulu.

**Kodda:** Hiçbir yerde kalp durumu tutulmaz. Yanlış cevap yalnızca ipucu ve tekrar
turu üretir; ilerleme durmaz, elmas eksilmez.

---

## 3. Özerklik vs. kilitli öğrenme yolu

**PDF'te:** *"Özerklik: hangi eseri keşfedeceğini çocuk seçer"* diyor. Ama yol
görselinde `Konya Ünite 1 — kilitli` yazıyor; yani doğrusal bir kilit var.

**Belirsizlik:** Çocuk serbest mi seçiyor, yoksa sırayla mı ilerliyor?

**Kararımız:** **İki seviyeli.** Şehir ve ünite sırası kilitlidir (önceki
bitmeden sonraki açılmaz). **Ünite içinde** ders sırası serbesttir — çocuk o
ünitedeki eserlerden istediğinden başlayabilir.

**Neden:** Kilit görselde açıkça var; özerklik ise listede açıkça var. İkisini
birlikte karşılamanın tek yolu bu ayrımdır.

**Kodda:** `yolHesapla` üniteleri sırayla kilitler; ünite içindeki derslerin
tamamı erişilebilir kalır. Arayüzde ünite içi dersler bağımsız bağlantılardır.

---

## 4. Elmas harcamasında geçen "ek seferler"

**PDF'te:** *"Elmas: ders bitirince kazanılır; yeni şehir paketleri ve **ek
seferler** için kullanılır."*

**Sorun:** "Sefer" (temalı rota) kavramı PDF'in başka hiçbir yerinde geçmiyor.
Bu terim, ürünün daha eski bir sürümünden (harita + rota modeli) kalmadır.

**Kararımız:** **Yeni özellik uydurulmaz.** "Ek seferler" ifadesi "ek ünite
paketleri" olarak yorumlanır; MVP'de elmas harcaması yalnızca kozmetik ve
konfordur (tema, avatar, ek ipucu, çevrimdışı paket) — PDF'in kendi listesi bu.

**Neden:** Organizasyon "PDF'te ne yazıyorsa onu yapın" dedi; PDF'te olmayan bir
rota özelliği inşa etmek kapsam sapması olurdu.

---

## 5. MapLibre ve PostGIS taahhüdü — ama üründe harita özelliği yok

**PDF'te:** Yığın satırı *"React + TypeScript (PWA) · Node/Fastify API ·
PostgreSQL + **PostGIS** · **MapLibre** · toplu Türkçe TTS"* diyor. Ancak PDF'in
özellik listesinde konum tabanlı hiçbir şey yok — ne "yakınımdaki eserler", ne
rota, ne mesafe hesabı.

**Kararımız:**
- **MapLibre kullanılır:** Kâşif Defteri ve eser listesi için bir harita sekmesi
  eklendi. Böylece yığın taahhüdü dürüst kalır ve "Kâşif" çerçevesine hizmet eder.
- **PostGIS kullanılmaz:** Konum tabanlı **sorgu** olmadığı için mekânsal indeks
  işlevsiz olurdu. Koordinatlar düz `lat`/`lng` kolonlarında tutulur; PostGIS'e
  geçiş tek migration'dır.

**Neden:** Kullanılmayan bir teknolojiyi "kullandık" demek dürüst olmazdı;
tamamen çıkarmak da taahhütle çelişirdi. Haritayı gerçekten işe yarar bir yere
koymak, iki taahhüdü de karşılayan en temiz çözüm.

---

## 6. Sınıf kodu var, ama kişisel veri toplanmıyor — nasıl?

**PDF'te:** *"Öğretmen sınıf kodu açar"* + *"Kişisel veri toplanmaz, sınıf kodu
anonim."*

**Belirsizlik:** Sınıf takibi normalde öğrenci kimliği gerektirir.

**Kararımız:** Sınıf kodu **rastgele üretilmiş, kimlikle eşleşmeyen** bir
anahtardır (örn. `KTM-4829`). Öğrenci adı, e-postası, numarası **istenmez**.
Kod yalnızca cihazda saklanır. Öğretmen yalnızca **toplu** ilerleme görür
("sınıfın %60'ı bu üniteyi bitirdi"), bireysel değil.

**Neden:** Ürünün hedef kitlesi 10-12 yaş çocuklar; herhangi bir kişisel veri
toplamak KVKK açısından en yüksek riskli tasarım olurdu. Anonim kod, sınıf
özelliğini korurken bu riski sıfırlar.

**Kodda:** `src/features/sinif/SinifSayfasi.tsx`; karışması kolay harfler
(I, O, 0, 1) alfabeden çıkarılmıştır.

---

## 7. "Dinle ve seç" egzersizi — ses altyapısı yokken

**PDF'te:** Dört egzersiz tipi sayılıyor: Eşleştir, **Dinle ve seç**, Sırala,
Boşluğu doldur. Ayrıca erişilebilirlik bölümünde: *"Altyazı ve sessiz mod: ses
olmadan da akışın tamamı bitirilebilir."*

**Durum:** TTS bu MVP kapsamı dışı bırakıldı.

**Kararımız:** "Dinle ve seç"in **ses gerektirmeyen eşdeğeri** uygulandı:
`eser-tani` tipi — bir betimleme okunur, doğru eser işaretlenir. Egzersizin
pedagojik işlevi (tanıma, geri çağırma) aynıdır.

**Neden:** PDF'in kendi erişilebilirlik taahhüdü zaten ses olmadan tam akış
gerektiriyor. Yani bu bir eksiklik değil, taahhüdün **öncelikli** karşılığıdır.
TTS eklendiğinde aynı egzersiz sesli ipucuyla da sunulabilir — veri şeması
değişmez.

**Güncelleme (2026-10-17):** Cihazda Türkçe ses varsa egzersiz gerçek bir
"Dinle ve seç"tir: betimleme açılışta bir kez okunur, metni "Altyazıyı göster"
düğmesinin arkasındadır (PDF: "Altyazı ve sessiz mod"). Sessiz modda ya da ses
olmayan cihazda yazılı "Eseri tanı" olarak kalır. Toplu üretilmiş ses dosyaları
(PDF: "toplu Türkçe TTS") için ses motoru kararı bekliyor; geldiğinde yalnızca
ses kaynağı değişir (`src/lib/ses.ts`). Test: `tests/dinle-sec.test.tsx`.

---

## 8. `work.gelir_dagilimi_durumu` neden var?

**PDF'te:** *"Bina künyesi ve oranlar örnektir; gerçek üründe her değer vakfiye
belgesinden alınır ve arşiv numarasıyla gösterilir."* + *"Doğrulanmamış hiçbir
bilgi kesin bilgi olarak sunulmaz."*

**Gerçek:** Araştırmada çoğu eser için vakfiyedeki **gelir dağılımı oranları
belgelenemedi**. Yalnızca eserin hangi külliyeye/hizmete gelir sağladığı
belgelenebildi.

**Kararımız:** İki alan ayrıldı:
- `gelir_dagilimi_durumu = 'belgeli'` → oranlar var, çubuklar çizilir, kaynak gösterilir
- `gelir_dagilimi_durumu = 'belge-bulunamadi'` → **çubuk çizilmez**, arayüz açıkça
  *"Bu eserin vakfiyesindeki gelir dağılımı belgelenememiştir"* der

**Neden:** Oran uydurmak, ürünün varlık sebebi olan dürüstlük ilkesini çürütürdü.
Jüriye "veri yoksa ne yaparsınız?" sorusunun cevabı **çalışan üründe** görünür
olmalı — bu yüzden ayrı bir durum alanı ve ayrı bir arayüz hali var.

---

## 10. Kullanıcı hesapları — kimler hesap açar, kimler açmaz?

**Durum:** Ürün ilk sürümde hiç hesap sistemi içermiyordu; yönetim paneli de
kimlik doğrulamasız çalışıyordu (herkes `/api/yonetim/*` uçlarına erişebiliyordu).
Bu **kritik bir güvenlik açığıydı** ve kapatıldı.

**Kararımız — üç ayrı katman:**

| Kim | Hesap | Neden |
|---|---|---|
| **Yönetici** | ✅ Var (`admin`) | İçerik CRUD'u kimliksiz olamaz. Şartname 5.1.5 güvenlik önlemi istiyor |
| **Öğretmen** | ✅ Var (`ogretmen`) | Yetişkin; sınıf yönetimi PDF'te var ("toplu sınıf yönetimi", "çoklu çocuk profili") |
| **Çocuk** | ❌ **Yok — bilinçli** | Aşağıya bakın |

**Çocuk hesabı neden yok:**

1. **PDF bunu yasaklıyor.** Başvuru sunumunda birebir şu yazıyor: *"Çocuk
   gizliliği: **kişisel veri toplanmaz**, sınıf kodu anonim; reklam ve
   profilleme yok, tüm satın almalar veli onaylı."* Organizasyon "PDF'te ne
   yazıyorsa aynısını yapın" dedi. Çocuk hesabı açmak, seçildiğimiz metne
   aykırı olurdu.
2. **KVKK açısından en yüksek risk.** Hedef kitle 10-12 yaş; çocuklardan
   ad, e-posta, doğum tarihi toplamak özel nitelikli bir yükümlülük doğurur.
3. **Gizlilik iddiası mimari olarak kanıtlanabilir kalıyor.** Çocuk ilerlemesi
   `localStorage`'da tutulur; sunucuya hiç gitmez. Bu iddia test edilebilir
   (`tests/api.test.ts` → `/api/yol` yanıtında ilerleme alanı yoktur).

**Öğretmen hesabı neden var ama çocuk hesabı yok:** PDF'in gizlilik cümlesi
*"Çocuk gizliliği"* başlığı altındadır — kapsamı çocuklardır. Öğretmen bir
yetişkindir ve PDF zaten öğretmen araçlarından söz eder. Yine de veri
minimizasyonu uygulanır: öğretmen hesabında yalnızca e-posta, ad, rol ve
parola özeti tutulur — başka hiçbir alan yok.

**Sınıf kodu neden hâlâ anonim:** Öğretmen kod üretir, çocuk girer. Kod
rastgele üretilmiş bir anahtardır; hiçbir çocuk kimliğiyle eşleşmez ve
sunucuya çocuk kaydı yazılmaz.

**Kodda:** `server/db/auth-schema.sql` (yetki tablosu yorumu),
`server/auth/`, `src/features/panel/KorumaliPanel.tsx`.

---

## 9. Vakfiye arşiv numarası

**PDF'te:** *"her değer vakfiye belgesinden alınır ve **arşiv numarasıyla**
gösterilir."*

**Kararımız:** `work.arsiv_no` alanı şemada ve yönetim panelinde mevcut. Araştırma
sırasında arşiv numarası bulunabilen eserler için doldurulur; bulunamayanlarda
`null` kalır ve arayüz alanı hiç göstermez (boş etiket göstermek yanıltıcı olurdu).

**Açık iş:** Sponsorun vereceği veri setinde arşiv numaraları varsa toplu içe
aktarma yapılmalıdır. `docs/` içindeki programa talepler listesinde bu madde var.

---

## 11. Hangi şehirler? — Bilgi Notu geldikten sonra kapsam kararı

**Organizasyon duyurusu:** *"Çalışmalarınızı **Hatay, Konya ve Bursa**'daki
vakıf eserleri üzerinden yürütebilirsiniz. Geliştireceğiniz çözümün, ilerleyen
dönemlerde eklenecek yeni şehirlerdeki vakıf eserlerini de kapsayabilecek
**esnek ve genişletilebilir** bir yapıda olması beklenmektedir."*

**İlk durumumuz:** Bursa (12), Konya (3), Kütahya (2), İzmir (2) — **Hatay yoktu.**

**Kararımız:**
1. **Hatay eklendi.** Envanter projesinin başlangıç şehri (2022, 117 eser,
   2.600 fotoğraf) ve izin verilen üç şehirden biri. Ayrıca 6 Şubat 2023
   depreminden **hemen önce** belgelenmiş olması bu veriyi kültürel olarak
   çok değerli kılıyor.
2. **Kütahya ve İzmir korundu.** Duyuru bir **izin** cümlesidir
   ("yürütebilirsiniz"), yasak değil. Her iki şehir de envanter projesinin
   parçasıdır (Kütahya 2025'te tamamlandı, İzmir 2026'da başladı) ve şartname
   mimarinin "yeni şehir eklenebilir" olmasını istiyor. Çok şehirli yapı,
   ölçeklenebilirliği **gösteren** bir kanıttır.

**Neden:** Kapsamı daraltmak ürünün en güçlü iddiasını (şehir parametreli
mimari, şehir başına yazılım maliyeti 0 TL) zayıflatırdı. Hatay'ı eklemek
zorunluydu.

---

## 12. Fotoğraf galerileri — şema var, görsel yok

**Bilgi Notu:** *"fotoğraf galerileri ... değerlendirilmesi"* + *"Envanter
dokümanları ve **yüksek çözünürlüklü fotoğrafların paylaşımı için Vakıf
Katılım'dan dönüş bekliyoruz.**"*

**Kararımız:** `work_photo` tablosu ve `EserFotograf` tipi **şimdi** kuruldu;
arayüz fotoğraf varsa galeriyi gösterir, yoksa hiç göstermez. Görseller
geldiğinde **kod değişikliği gerekmez** — yalnızca veri eklenir.

**Erişilebilirlik şartı:** `alt_metin` alanı **NOT NULL**'dur. Her fotoğrafın
metin karşılığı olmak zorundadır (WCAG 1.1.1). Alt metin atlamak şema
düzeyinde imkânsızdır.

---

## 13. Türkçe + İngilizce metinler

**Bilgi Notu:** *"eserlerin tarihçeleri **Türkçe ve İngilizce** olarak
hazırlanmakta"*; veri alanları arasında *"tarihçe, Türkçe ve İngilizce
metinler"* sayılıyor. Envanter kitapları iki dilli basılıyor.

**Kararımız:** `work.ad_en`, `work.tarihce` (TR), `work.tarihce_en` (EN)
alanları eklendi. Tarihçeler yalnızca doğrulanmış araştırma künyelerinden
yazıldı — **uydurma yok**.

**Neden ayrı bir `tarihce` alanı:** Mevcut `bani` / `vakfiyeAmaci` / `hizmet` /
`bugunNeOldu` alanları **yapılandırılmış** veridir; envanter kitaplarındaki
tarihçe ise **anlatı** metnidir. İkisi farklı işler için kullanılır:
yapılandırılmış alanlar ders üretimini besler, tarihçe ansiklopedik okuma sağlar.

---

## 14. Hedef kitle: "geniş kamuoyu" vs. "10-12 yaş çocuklar"

**Bilgi Notu:** *"Projenin ana hedef kitlesi **geniş kamuoyudur**. Kültür-sanat
takipçileri, tarih ve şehir hafızasına ilgi duyanlar, akademisyenler,
öğrenciler, araştırmacılar..."* — ama aynı belge şöyle bitiyor: *"Dijital
çalışma, vakıf mirasını bugünün insanıyla ve **özellikle gençlerle** buluşturan
bir kültürel platform olarak konumlandırılmalıdır."*

**Değerlendirmemiz:** Ürünümüz 10-12 yaş odaklıdır; Bilgi Notu'nun "geniş
kamuoyu" ifadesinden **daha dar** bir kapsamdır. Ancak:

- Bilgi Notu açıkça **"özellikle gençlerle"** diyor — çocuk katmanı bu hedefin
  merkezindedir, dışında değil.
- Ürün yalnızca çocuklara **özel** değildir: tarihçeler, kaynak künyeleri,
  harita, filtreler ve iki dilli metinler yetişkinin de kullanacağı katmanlardır.
  Bir araştırmacı uygulamayı başvuru kaynağı olarak kullanabilir.
- Bilgi Notu "sade, anlaşılır ve **erişilebilir**" bir yapı istiyor; çocuk
  diliyle yazılmış içerik bu şartı fazlasıyla karşılar.

**Açık risk:** Jüri "hedef kitleniz Bilgi Notu'ndaki geniş kamuoyundan dar"
diyebilir. Cevap: *gençler Bilgi Notu'nda açıkça önceliklendirilmiştir ve ürün
yetişkin kullanımını dışlamaz.*

---

## 15. Canlı sınıf yarışması (Kahoot tarzı) — kimlik yok, ceza yok

**İhtiyaç:** İş listesinde "Kahoot tarzı canlı sınıf yarışması" var. Yarışma
normalde oyuncu adı ister ve puan tablosu tutar.

**Kararlarımız:**

- **Ad sorulmaz.** Sunucu "Turkuaz Kubbe", "Altın Minare" gibi takma ad verir
  (renk + vakıf mimarisinden bir parça). Serbest metin olmadığı için kişisel
  veri de, uygunsuz ad denetimi derdi de yoktur; çocuk bir mimari terim de öğrenir.
- **Hiçbir şey kaydedilmez.** Odalar yalnızca sunucu belleğinde yaşar; oyun
  bitince 30 dk, dokunulmazsa 2 saat sonra silinir. Veritabanına yazılmaz.
- **Öğretmen girişi gerekmez.** Yetki, odayı kuran sekmeye verilen gizli
  anahtardadır (`x-canli-anahtar` başlığı, URL'de değil). Oyun yalnızca bizim
  kaynaklı ders içeriğimizi sorar; kötüye kullanım yüzeyi dardır. Oda sayısı
  (200), oyuncu sayısı (80) ve kurulum sıklığı sınırlıdır.
- **Ceza yok (bkz. Karar: kalp mekaniği yok).** Yanlış cevap puan düşürmez;
  doğru cevap hıza göre 500–1000 puan getirir. Yanlışta doğru cevap, açıklaması
  ve kaynak künyesi gösterilir — yarışma da bir öğrenme anıdır.
- **Sorular uydurulmaz.** Dersin kendi "boşluk doldur" ve "eseri tanı"
  egzersizlerinden, bir de envanter fotoğrafından ("Bu fotoğraftaki eser
  hangisi?") üretilir. Doğru cevap süre bitmeden oyuncuya gönderilmez.
- **Erişilebilirlik:** Her seçeneğin rengi VE şekli var (▲ ◆ ● ■); şeklin adı
  ekran okuyucuya söylenir. 60 sn'lik "rahat mod" okuma güçlüğü olan çocuklar
  içindir. Aşama değişimleri tek bir kalıcı canlı bölgeden duyurulur.
- **Sınıf ağı:** Bir sınıftaki cihazlar genelde aynı IP'den çıkar. Yoklama uçları
  IP başına değil "IP + oyuncu anahtarı" başına sınırlanır (30 kişilik sınıf
  testi: `tests/canli.test.ts`).

**Açık risk — Vercel:** Odalar süreç belleğinde olduğu için sunucusuz ortamda
istekler farklı örneklere düşerse oda bölünebilir. **Finalde yarışma, laptop +
aynı Wi-Fi ile gösterilir:** `npm run dev:lan` (telefonlar laptopun IP'sine
bağlanır; öğretmen ekranındaki QR kod bu adresi verir). Kalıcı çözüm gerekirse
oda durumu tek bir paylaşılan depoya (ör. Redis) taşınır.

---

## 16. Günün Eseri, rozetler, kombo — oyunlaştırma nereye kadar?

**Risk:** Oyunlaştırma çocukta kaygı, kıyas ve bağımlılık üretebilir; bu da
"ceza yok" (§ kalp mekaniği) ilkesine ters düşer.

**Kararlarımız:**

- **Kaybetmek yok.** Rozet geri alınmaz; kombo ipucu alınca *sessizce* sıfırlanır,
  hiçbir şey eksilmez; Günün Eseri'nde haklar bitse de eser tanıtılır ve derse
  bağlantı verilir.
- **Kıyas yok.** Rozet, seri ve Günün Eseri istatistiği yalnızca cihazda; sınıf
  ya da arkadaş sıralaması yok. Tek sıralama canlı yarışmadadır ve takma adlarla,
  oyun bitince silinir.
- **Bilgi uydurulmaz.** Günün Eseri ipuçları envanterdeki bilginin çocuk diline
  çevrilmiş hâlidir; yazım sırasında envanterde olmayan 9 ayrıntı çıkarıldı. Test,
  ilk dört ipucunun eserin adını ele vermediğini denetler.
- **Sessiz mod ve hareketi azalt** her yeni efekte uyar (ses, titreşim, animasyon).
- **Kişisel veri yok.** Sertifikadaki ad isteğe bağlıdır, yalnızca ekranda durur.
