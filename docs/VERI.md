# Veri Kaynakçası ve Kalite Raporu

> Jüri "bu bilgiler nereden geliyor?" diye sorduğunda bu belge cevaptır.
> Ölçüm tarihi: 12 Ekim 2026 · Kaynak dosyalar: `data/research/*.json`
>
> ⚠️ **Ölçüm 12 Ekim'deki 19 eserlik set içindir.** 24 Ekim itibarıyla güncel veri:
> **57 ders eseri** (Bursa 33 · Konya 12 · Hatay 12), 57 ders / 228 egzersiz, 303 fotoğraf,
> 633 arşiv eseri. Bursa ve Konya kitapları resmî PDF'ten; Hatay metinleri resmî Hatay
> envanter PDF'inden. Aşağıdaki sayılar tarihçe olarak duruyor.

---

## Resmî envanter kapsamı (Vakıf Katılım Bilgi Notu)

Organizasyonun paylaştığı **Vakıf Eserleri Envanter Projesi Bilgi Notu**'ndan
birebir:

| Şehir | Yıl | Eser | Fotoğraf |
|---|---|---|---|
| **Hatay** | 2022 | 117 | 2.600 |
| **Konya** | 2024 | 289 | 15.200 |
| **Kütahya** | 2025 | 141 | 11.871 |
| **Bursa** | 2025 | 385 | **34.952** |
| İzmir + Manisa | 2026 | çalışma başladı | — |

> **Önemli teyit:** Başvuru sunumundaki "Bursa'da 34.952 fotoğraf" rakamı
> doğrulanmıştır — kaynağı bu resmî Bilgi Notu'dur. İlk jüri
> değerlendirmesinde "klasörde kanıtı yok" diye işaretlenmişti; resmî belge
> rakamı doğruladı.

**Çalışma kapsamı (organizasyon duyurusu):** *"Çalışmalarınızı **Hatay, Konya ve
Bursa**'daki vakıf eserleri üzerinden yürütebilirsiniz."*
→ Hatay verisi ayrıca toplanmıştır; Kütahya ve İzmir eserleri de envanter
projesinin parçası olduğu için korunmuştur (2025 tamamlandı, 2026 başladı).

---

## Bilgi Notu'nun istediği veri alanları ve karşılığı

> *"Veri alanları: İl, eser adı, eser türü, konum, tarihçe, **Türkçe ve İngilizce
> metinler**, **fotoğraf galerileri** ve **sergi bilgileri**nin değerlendirilmesi."*

| Alan | Durum | Nerede |
|---|---|---|
| İl · Eser adı · Tür · Konum | ✅ | `work` tablosu + MapLibre haritası |
| Tarihçe | ✅ | `work.tarihce` / `work.tarihce_en` |
| Türkçe + İngilizce metinler | ✅ | `work.ad_en`, `tarihce` / `tarihce_en` |
| Fotoğraf galerileri | ⏳ **şema hazır** | `work_photo` tablosu — görseller Vakıf Katılım'dan bekleniyor |
| Sergi bilgileri | ✅ | `exhibition` + `exhibition_work` (3 gerçek sergi) |

**Keşif ve filtreleme:** *"kullanıcıların şehir ya da eser türüne göre
filtreleme yapabilmesi"* → `GET /api/filtreler` + harita filtreleri.

**Sergi kayıtları** (Bilgi Notu'ndan birebir):
- **5 Şubat Hatay** — Mimar Sinan Sanat Galerisi (Hatay envanteri)
- **Ayna** — 24 Ocak 2025, Üsküdar Mimar Sinan Galerisi (Konya envanteri)
- **Bursa'nın Fethinin 700. Yılı Fotoğraf Sergisi**

---

## Özet

| Ölçüt | Değer |
|---|---|
| Eser | **19** |
| Şehir | 4 (Bursa 12 · Konya 3 · Kütahya 2 · İzmir 2) |
| Eser türü çeşidi | **11** (Cami, Medrese, Türbe, Han, Hamam, Çeşme, Köprü, İmaret, Mescit, Külliye, Kervansaray) |
| Atıf sayısı | **65** — eser başına ortalama **3,4** bağımsız kaynak |
| Doğrulama notu yazılmış | **19 / 19** (her eserde hangi bilginin şüpheli olduğu yazılı) |
| Gelir dağılımı **belgeli** | **3 / 19** |
| Vakfiye arşiv numarası bulunmuş | **6 / 19** |

---

## Kaynak hiyerarşisi

Araştırmada şu sıra izlendi (güvenilirlikten düşüğe):

1. **TDV İslâm Ansiklopedisi** — hakemli, maddeler genelde bani/tarih/vakıf amacı verir
2. **Vakıflar Genel Müdürlüğü** yayınları
3. **Kültür Portalı** (Kültür ve Turizm Bakanlığı) — envanter kayıt numaralarıyla
4. **Hakemli akademik yayınlar** — sempozyum kitapları, doktora/yüksek lisans tezleri
5. **Belediye yayınları** (örn. Kepecioğlu, *Bursa Kütüğü*)
6. Kültür Envanteri (kulturenvanteri.com) — yalnızca koordinat/konum teyidi için

**Vikipedi hiçbir alanda tek başına kaynak olarak kullanılmadı.**

---

## Gelir dağılımı: 4 eser belgeli

Ürünün ayırt edici özelliği Vakıf Röntgeni'dir. PDF şöyle diyor:
*"her değer vakfiye belgesinden alınır ve arşiv numarasıyla gösterilir."*

### ⚠️ Gelir/gider ayrımı — bu ürünün en ince veri kararı

Vakfiye belgeleri **iki farklı şeyi** kaydeder:

| Tip | Anlamı | Örnek |
|---|---|---|
| `gelir` | Vakfa para **nereden** geliyor | köy mahsulü, han kirası, öşür, rüsûm |
| `gider` | Vakıf geliri **nereye** harcanıyor | personel maaşı, bakım, burs, yakacak |

İkisi **aynı paranın iki tarafıdır** ve **ayrı ayrı %100** eder. Tek listede
karıştırılırsa toplam **%200** çıkar ve Röntgeni çubukları anlamsızlaşır.

> **Bu hata gerçekten yaşandı.** Habib-i Neccar verisi ilk turda 5 kalem ve
> %200 toplam veriyordu. Yakalandı, veri modeline `tip` alanı eklendi ve
> arayüz iki grubu ayrı başlıklarla gösteriyor:
> *"Vakfa para nereden geliyordu?"* / *"Bu para nereye harcanıyordu?"*

| Eser | Durum | Kaynak | Not |
|---|---|---|---|
| **Yeşilcami** (Bursa) | `belgeli` — 6 kalem | 19. yy vakıf muhasebe defteri (R. 1257), Sultan Çelebi Mehmed ve Devri Sempozyumu (Bursa 2022) | ⚠️ Bu, **1419 vakfiyesinde şart koşulan dağılım DEĞİL**, fiilî gelir kompozisyonudur. Arayüz bunu açıkça yazar |
| **Karatay Medresesi** (Konya) | `belgeli` — hisse listesi | VGMA Defter No. 608/1, s. 148 · KTO Karatay Üniv. Yay. 2020 | ⚠️ Kaynak metnin kendi çelişkisi: hisseler toplamı **%110**. Seed oranları `null`'ladı; arayüz çubuk çizmez, hisse listesi gösterir |
| **Sâhib Ata Külliyesi** (Konya) | `belgeli` — tek kalem | Bayram–Karabacak, *Vakıflar Dergisi* 13 (1981), s. 40 | Mahsulün **tam üçtebiri (%33)** tevliyet+nezaret hakkı. Bu bir dağılım değil, **tek bir şart** |
| **Habib-i Neccar Camii** (Hatay) | `belgeli` — **iki grup** | Enver Çakar, *16. Yüzyılda Antakya Vakıfları* (1550 Evkaf Defteri) · TKA Evkaf 556 · Vakıf Katılım *Hatay Vakıf Eserleri* s. 55-72 | **Gelir:** Kozya köyü %59 · Buhşîn köyü %21 · arazi kirası %20. **Gider:** personel maaşları %77 · cami masrafları %23. 7 kaynak — en zengin künye |

**Kalan 21 eserde oran belgelenememiştir.** Uydurulmadı. Arayüz bu eserlerde
çubuk çizmez ve şu cümleyi gösterir:

> *"Bu eserin vakfiyesindeki gelir dağılımı oranları belgelenememiştir. Doğrulanmamış bilgi kesin bilgi olarak sunulmaz."*

---

## Belgelenen ama oranı olmayan zengin içerik

Oran bulunamasa da **vakfiye şartları** birçok eserde belgeli. Ders içerikleri
bunları kullanır:

- **Gazi Hüdavendigar İmareti** (Bursa): Vakfiye imareti âlim/şeyh/seyyid/hafız/vâiz
  ile fakir ve miskin misafirlere tahsis etmiş. **Misafirler üç gün kalabilir**;
  süre mütevellinin inisiyatifinde; fâsık ve namaz kılmayanların süresi uzatılmaz.
  Mütevelli-nâzır: Çandarlı Hayreddin Paşa.
- **Veled-i Yaniç Mescidi** (Bursa): Doğu duvarında **H.900/1494 vakıf kitâbesi** —
  Hacı Ayşe 6 ev + 6.000 dirhem vakfetmiş; şart: yapının banisinin ruhuna imam ve
  müezzinin Kur'an cüzü okuması.
- **Gökdere Medresesi** (Bursa): Vakfiye, mütevelli olacakların **medresede tahsil
  yapmış olması** şartını koyar.
- **Irgandı Köprüsü** (Bursa): Baninin torununun 1559 (H.966) vakfiyesi;
  Bursa Kadı Sicilleri Defter nr. 72, s. 114.

---

## Dürüst negatif bulgular

Araştırma sırasında bulunamayan şeyler de kayda geçti — bunlar **eksiklik değil,
bilgi**:

- **Bursa'da belgelenmiş müstakil sebil yapısı yok.** TDV "SEBİL" maddesi:
  *"Osmanlı sebillerinin hemen tamamı İstanbul, Kahire ve Kudüs'te bulunmaktadır"* —
  Bursa'yı anmaz. Bu yüzden altıncı tür olarak sebil değil **mescit** seçildi.
- **Kızlarağası Hanı'nın vakfiyesi bulunamadı.** Hacı Beşir Ağa üzerine doktora tezi
  açıkça *"vakfiyelerinde İzmir Kızlar Ağası Hanı'yla ilgili bilgiye ulaşılamamıştır"*
  diyor. Aramada çıkan "VGMA defter 638" kaydı İstanbul vakıflarına ait olduğu için
  `arsivNo` alanına **yazılmadı**.
- **Hisar Camii'nin banisi belirsiz.** Tüm kaynaklarda yalnızca "Yakup Bey" geçiyor;
  hangi Yakup Bey olduğu hiçbir kaynakta yok. Kimlik çıkarımı yapılmadı.
- **İpek Hanı'nın gelir oranları hiçbir kaynakta yok** — başvuru sunumundaki uyarı
  doğrulandı.

---

## Çelişkiler — düzeltilmedi, kaydedildi

Araştırma, kaynaklar arası çelişkileri **sessizce "düzeltmedi"**; her eserin
`dogrulamaNotu` alanına yazdı ve içerikte kesin bilgi gibi sunmadı:

| Eser | Çelişki |
|---|---|
| Irgandı Köprüsü | Banisi üç kaynakta üç farklı kişi; tarih 1442 ↔ 1492 |
| Demirtaş Hamamı | Banisi Oruç Bey ↔ Umur Bey; tarih 1390 ↔ "1420'den önce" |
| Beşir Ağa Çeşmesi | Aynı semtte **iki ayrı** Beşir Ağa Çeşmesi (1743 ve 1840) |
| Hisar Camii | 1592 ↔ 1598; banisi belirsiz |
| Sâhib Ata Külliyesi | İlçe üç kaynakta üç farklı (Meram/Karatay/Selçuklu) |
| Veled-i Yaniç | Bahçedeki 1336 tarihli mezar taşı ↔ 1440 yapım tarihi |
| Yeşilcami | TDV son cemaat yerinden vazgeçildiğini, Kültür Portalı 1424'te tamamlandığını yazar |

**Bazı çelişkiler doğrudan merak sorusu yapıldı** — belirsizliği öğretmek,
uydurmaktan iyidir:
- *"Köprüyü kim yaptırdı? Kaynaklar üç ayrı isim veriyor."*
- *"Kitâbe baninin saray hazinedarı olduğunu söylüyor — hangi Beşir Ağa?"*
- *"Mezar taşı 1336, mescit 1440 — bu nasıl olabilir?"*

---

## Düzeltilen hata (vaka kaydı)

Başvuru prototipinde **İpek Hanı** için şunlar yazılıydı ve **hepsi yanlıştı**:
bani "Hacı Mehmed bin Ali", yıl "1490", oda sayısı "12", *"ilk üç gün ücretsiz
kalma vakfiye şartıydı"*.

TDV İslâm Ansiklopedisi'nin "İpek Hanı" maddesine göre gerçek:

| Prototipte | Gerçek |
|---|---|
| Bani: Hacı Mehmed bin Ali | **Çelebi Sultan Mehmed (I. Mehmed)** |
| Yıl: 1490 | **XV. yüzyılın ilk yarısı** |
| Oda: 12 | **Alt kat 39 + üst kat 42 = 81** |
| Amaç: tüccar konaklaması | **Yeşilcami Külliyesi'ne gelir sağlamak** (akar) |

Bu hata, araştırma ajanlarına **örnek olarak verildi** ve "bu standardı yakala"
denildi. 19 eserin tamamı bu titizlikle doğrulandı.

---

## Doğrulama yöntemi

- Her eser için `web_search` + `web_fetch` ile **kaynak sayfası açılıp okundu**
  (arama özetine güvenilmedi).
- Koordinatlar mümkün olduğunca **birden fazla bağımsız kaynakla** çaprazlandı
  (Kültür Envanteri kayıt no, OpenStreetMap, Wikidata).
- **İlçe düzeltmesi örneği:** Yeşilcami/Medrese/Türbe Osmangazi'de değil
  **Yıldırım**'da (3 bağımsız kaynak). Hanlar Osmangazi'de.
- Ham kaynaklar `data/research/_pdfs/` altında metne çevrilmiş olarak duruyor
  (Bursa Kütüğü, Hızlı imaret makalesi, Karatay sempozyum kitabı vb.).

---

## Ölçeklenme planı

Şu anki 19 eser pilot kapsamdır. PDF hedefi: **Yıl 1'de 1 şehir / 80 eser**,
3 yılda 7 şehir / 560 eser.

Yeni eser eklemek **kod değişikliği gerektirmez** — `tests/akis.test.ts` bunu
kanıtlar: yeni şehir → ünite → eser → ders zinciri API üzerinden kurulur ve
öğrenme yolunda belirir.

**İçerik üretim hattı** (PDF KATMAN 03): sponsor içeriği → AI ile yapılandırma →
ders metni → AI ile soru üretimi → TTS → **insan kontrolü** → yayın.
`data/research/*.json` şeması bu hattın ara çıktısıdır.
