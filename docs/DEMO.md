# Demo senaryosu ve jüri provası

Fiziki final: **7–8 Kasım 2026**, 48 saatlik maraton. Sunum takım üyeleri tarafından
yapılmalı (şartname md. 5.3) ve **her üye kendi geliştirdiği kısmın teknik ve
işlevsel yönüne hâkim olmalı** (şartname 5.2.3).

Şartname md. 5.1.1: *"Sunum, ekran görüntüsü veya statik tasarım çalışan ürün
demosu yerine geçmez."* → **Canlı, çalışan ürün gösterilecek.**

---

## 3 dakikalık canlı demo (dondurulmuş senaryo)

| Süre | Ne gösterilir | Kim anlatır |
|---|---|---|
| 0:00–0:20 | **Öğrenme yolu** açılır. Bursa Ünite 1/2 tamamlanmış, Ünite 3 "şu an burada", Konya/Kütahya/İzmir kilitli. Kuzey Yıldızı metriği gösterilir. | Ürün & Sistem Mimarisi |
| 0:20–0:50 | **Adım 01 Merak:** cezasız tahmin. Kasten "yanlış" bir seçenek işaretlenir → *"Hiçbir tahmin yanlış sayılmaz"* mesajı çıkar. | Ürün & Sistem Mimarisi |
| 0:50–1:10 | **Adım 02 Bağlam:** HAYRAT / AKAR kavram kartları. Ürünün çekirdek fikri burada anlatılır. | Kullanıcı Deneyimi & Anlatı |
| 1:10–1:30 | **Adım 03 Perspektif:** "Sen kervan tüccarısın" tek karar anı. | Kullanıcı Deneyimi & Anlatı |
| 1:30–1:55 | **Adım 04 Geri çağırma:** egzersiz tipleri — Eşleştir (hayrat/akar), sonra Sırala (vakfiye gelir dağılımı). Yanlış cevap verilir → **ipucu gelir, ilerleme durmaz, kalp gitmez.** | Veri & İçerik Mühendisliği |
| 1:55–2:25 | ⭐ **Adım 05 Yansıma — Vakıf Röntgeni.** Habib-i Neccar açılır: **"Vakfa para nereden geliyordu?"** (Kozya köyü %59 · Buhşîn köyü %21 · arazi kirası %20) ve **"Bu para nereye harcanıyordu?"** (personel maaşları %77 · cami masrafları %23). İki ayrı liste — *aynı paranın iki tarafı.* | Veri & İçerik Mühendisliği |
| 2:25–2:40 | Sonra **gelir dağılımı belgelenememiş bir eser** açılır ve uygulamanın *"belgelenememiştir"* dediği gösterilir. **Aradaki fark, ürünün dürüstlüğüdür.** | Veri & İçerik Mühendisliği |
| **2:40–2:55** | ⭐⭐ **HATAY ANI — duygusal zirve.** Habib-i Neccar'ın "bugün ne oldu" adımı: envanter fotoğrafları **depremden bir gün önce (5 Şubat 2023)** sergilenmişti; bir gün sonra bina yıkıldı. Uygulama, eserin **deprem öncesi son sistematik kaydını** gösterir. Sonra restorasyon ve **27 Aralık 2025'te yeniden ibadete açılış**. Cümle: *"Bu kayıt olmasaydı, o günü hatırlayan tek şey hafızamız olurdu."* | Kullanıcı Deneyimi & Anlatı |
| 2:55–3:10 | **Ders sonu kutlaması** (+10 elmas, seri, deftere eklendi) ve **aralıklı tekrar**: sonraki derste "Tekrar zamanı: Yeşilcami dersinden hatırla" sorusu açılır. *"İpucusuz bildikçe 1, 3, 7, 14 gün sonra yeniden sorulur — öğrenilen kalıcı olur."* | Kullanıcı Deneyimi & Anlatı |
| 3:10–3:25 | **Yönetim paneli:** giriş yapılır, yeni bir eser eklenir (**İngilizce ad + tarihçe dahil**), yayına alınır ve öğrenme yolunda belirdiği gösterilir (**CRUD** — şartname 5.1.1 zorunlu maddesi). | Ürün & Sistem Mimarisi |
| 3:25–3:35 | **Harita + filtreler:** Bilgi Notu'nun istediği *"şehir ya da eser türüne göre filtreleme"*. "Hatay" seçilir → 6 eser. | Ürün & Sistem Mimarisi |
| 3:35–3:45 | **Öğretmen paneli:** sınıf kodu oluşturulur, toplu ilerleme gösterilir. *"Bu sayılar kaç öğrenci olduğunu göstermez — kimlik toplamıyoruz."* | Kullanıcı Deneyimi & Anlatı |
| 3:45–3:55 | **Erişilebilirlik:** yüksek kontrast teması + yazı boyutu + klavye ile gezinme canlı açılır. axe-core ile 6 sayfada 0 ihlal olduğu belirtilir. | Kullanıcı Deneyimi & Anlatı |
| 3:55–4:05 | **Gizlilik:** "İlerleme sunucuya hiç gitmiyor" — tarayıcı ağ sekmesi gösterilir, hiçbir kullanıcı verisi gönderilmediği kanıtlanır. | Veri & İçerik Mühendisliği |

> **Bu senaryo finalden 1 hafta önce donar.** Son 3 güne bırakılmaz.

---

## Önceden hazırlanmış durum (demo verisi)

Demoyu hızlı başlatmak için `npm run seed` sonrası:

- Bursa Ünite 1 ve 2 tamamlanmış olsun → `localStorage`'a örnek ilerleme yazılır.
- En az **1 eserde `gelir_dagilimi_durumu = 'belgeli'`** (çubuklar görünsün)
- En az **1 eserde `gelir_dagilimi_durumu = 'belge-bulunamadi'`** (dürüstlük ilkesi görünsün)

Bu ikisinin **birlikte** gösterilmesi kritik: jüri "veri eksikse ne yapıyorsunuz?"
sorusunun cevabını üründe görmeli.

---

## Jüri sorularına hazır cevaplar

| Soru | Cevap | Kanıt |
|---|---|---|
| "Bu bir Duolingo kopyası değil mi?" | Motor ödünç alındı, içerik ve veri modeli özgün. Vakıf Röntgeni ve vakfiye veri modeli kimsede yok. | `README.md` eşleme tablosu |
| "Sesli rehber zaten var, farkınız ne?" | Mevcut sistemler **biletli müze** odaklı; vakıf eserlerinin gişesi yok, model uygulanamaz. | `../Arastirma_Raporu.md` §5.4 |
| "Bu bir ChatGPT wrapper'ı mı?" | AI içerik uydurmak için değil, **dağınık veriyi yapılandırmak** için kullanıldı. Her çıktı kaynağa bağlı ve insan kontrolünden geçer. | `data/research/` kaynak künyeleri |
| "Gelir oranlarını nereden aldınız?" | Belgelendiği yerden; belgelenemeyenlerde uygulama açıkça "belgelenememiştir" der. Oran uydurulmaz. | `docs/KARARLAR.md` §8 |
| "Çocuk verisini nasıl koruyorsunuz?" | Hiç toplamıyoruz. Mimari olarak: ilerleme sunucuya gitmez, sınıf kodu anonim. | `tests/api.test.ts` gizlilik testi + `tests/guvenlik.test.ts` §10 |
| "Sınıf özelliği çocukları takip etmiyor mu?" | Hayır. Sunucu yalnızca sayaç tutar: "bu kodla bu ders kaç kez bitti". Kaç farklı öğrenci olduğu **bilinemez** — arayüz de iddia etmez. | `server/repo/sinif.ts` başlığı |
| "Yönetim paneli güvenli mi?" | Tüm uçlar korumalı, parolalar scrypt, oturumlar httpOnly çerezde, kaba kuvvet kilitli. | `tests/guvenlik.test.ts` (67 test) |
| "Erişilebilirlik gerçekten çalışıyor mu?" | axe-core ile 6 sayfada **0 ihlal**. | `tests/erisilebilirlik-denetim.test.tsx` |
| "Hangi teknolojiyle yazdınız?" | React+TS PWA, Fastify, PostgreSQL (PGlite), MapLibre. | `README.md` yığın tablosu |
| "Vakıf modelini anlatıyorsunuz, siz neden çocuktan elmas satıyorsunuz?" | Ana öğrenme yolu her zaman ücretsiz. Elmas harcaması yalnızca kozmetik/konfor; satın almalar veli onaylı. Gelirin yarısı kurumsal lisans ve hibe. | PDF sayfa 3 |
| "Yeni şehir eklemek ne kadar sürer?" | Yazılım maliyeti sıfır: şehir parametreli mimari. Panelden şehir + ünite tanımlanır, içerik eklenir. | Canlı gösterim |
| "Öğrenilen nasıl kalıcı oluyor?" | Aralıklı tekrar: ilk tekrar sonraki derste, ipucusuz bildikçe 1-3-7-14 gün. Takvim cihazda. | `tests/tekrar.test.ts` |
| "Bu 42 dışındaki kullanıcılar için de çalışır mı?" | Evet, PWA — kurulum gerektirmez, tarayıcıdan açılır. | Canlı gösterim |

---

## Bilinen riskler ve önlemler

| Risk | Önlem |
|---|---|
| Demo makinesinde internet yok | PWA çevrimdışı önbellek + `npm start` yerel sunucu. **Demo öncesi çevrimdışı prova yapılmalı.** |
| Veri seti gelir dağılımı içermiyor | Kendi araştırmamızla belgelenen eserler kullanılır; belgelenemeyenler dürüstçe işaretlenir |
| "Sadece 3 şehir var" eleştirisi | Panelden yeni şehir eklenerek gösterilir; şehir başına yazılım maliyeti 0 TL |
| İpek Hanı verisi | **Düzeltildi:** banisi Çelebi Sultan Mehmed, XV. yy ilk yarısı, Yeşilcami Külliyesi'ne akar (TDV İA) |
| Sunum süresi aşımı | Senaryo 3:20; süre sınırı açıklanınca kırpılacak bölümler: 2:55–3:20 arası |

---

## Demo öncesi kontrol listesi

- [ ] `npm run seed` çalıştı, `npm start` ayakta
- [ ] En az 1 eser "belgeli" gelir dağılımına sahip
- [ ] En az 1 eser "belge-bulunamadi" durumunda
- [ ] Örnek ilerleme yüklü (Ünite 1-2 tamamlanmış görünsün)
- [ ] Yeşilcami dersi demo cihazında bitirilmiş (tekrar sorusu Yeşil Medrese'de çıksın)
- [ ] Türkçe konuşma sesi kurulu ("Dinle" düğmesi görünüyor mu?)
- [ ] Palet kararı `index.html`'e yazıldı
- [ ] Yüksek kontrast teması test edildi
- [ ] Klavye ile tüm akış gezildi (Tab/Enter)
- [ ] Çevrimdışı mod provası yapıldı
- [ ] Ekran okuyucu ile bir ders baştan sona dinlendi
- [ ] Yönetim panelinden eser ekleme provası yapıldı
- [ ] Üç üye de kendi bölümünü anlatabildiğini teyit etti

---

## EK (öneri, 16 Ekim gece çalışması): yeni özellikler için demo dilimleri

> Ana senaryo **değiştirilmedi**. Aşağıdakiler süre kalırsa eklenebilecek ya da
> mevcut dilimlerle değiştirilebilecek öneriler. Takım karar verir.
> Not: ana senaryodaki "Konya/Kütahya/İzmir kilitli" ifadesi eski; Kütahya ve İzmir
> içerikten çıkarıldı (yalnızca PDF'teki eserler). Senaryo donmadan güncellenmeli.

| Süre | Ne gösterilir | Neden etkili |
|---|---|---|
| 0:40 | ⭐ **Canlı sınıf yarışması.** Laptop tahtaya yansıtılır (`#/canli/kur` → Bursa, 5 soru). Jüri üyelerine **QR kod** okutulur, telefonlarından "Turkuaz Kubbe" gibi takma adla katılırlar. 2 soru oynanır, podyum + konfeti. | Jüri **kendisi oynar**. "Ad sorulmadı, hiçbir şey kaydedilmedi" cümlesi gizlilik ilkesini canlı kanıtlar. |
| 0:20 | **Günün Eseri.** Yol ekranındaki sarı kart → bir yanlış tahmin (şehir/tür/dönem karşılaştırması görünür) → yeni ipucu açılır. | Wordle tanıdık; "her yanlış yeni bir bilgi açar" = ceza yok ilkesi. |
| 0:15 | **Kombo + ses.** Egzersizlerde üst üste doğru → "🔥 2 egzersiz üst üste" + "ding". | Duolingo hissi; Ayarlar → Sessiz mod ile hepsinin kapandığı gösterilir. |
| 0:15 | **Rozet + sertifika.** Kâşif Defteri → Rozetlerim; tamamlanmış şehirde "sertifikanı al" → ad yazılır → Yazdır. | Somut çıktı: öğretmen/aile için. "Ad kaydedilmiyor." |

### Canlı yarışma kurulumu (finalde)

1. Laptop ve telefonlar **aynı Wi-Fi**'da olmalı (salon Wi-Fi'ı istemciler arası trafiği
   engelliyorsa telefonun **kişisel erişim noktası** kullanılır).
2. `npm run dev:lan` → konsolda `Network: http://192.168.x.x:5173` adresi çıkar.
3. Tahta ekranı bu adresle açılır (`localhost` ile değil!), böylece QR kod doğru adresi verir.
4. Windows güvenlik duvarı ilk açılışta Node için izin sorar → "Özel ağ" işaretlenir.
5. ⚠ Vercel'deki canlı sürümde odalar örnekler arasında bölünebilir; yarışmayı **laptoptan** göster.

### Yeni jüri soruları

| Soru | Cevap | Kanıt |
|---|---|---|
| "Kahoot'ta çocuk adı/puanı saklanıyor mu?" | Hayır. Takma ad sunucudan gelir, oda yalnızca bellekte yaşar ve silinir. | `docs/KARARLAR.md` §15, `tests/canli.test.ts` |
| "Yarışma 'ceza yok' ilkesine aykırı değil mi?" | Yanlış puan düşürmez; doğru cevap + açıklama + kaynak gösterilir. | `server/canli/oda.ts` |
| "30 kişilik sınıf aynı ağdan bağlanınca ne olur?" | Hız sınırı IP+oyuncu başına; 30 cihazın saniyede bir yoklaması test edildi. | `tests/canli.test.ts` |
| "Günün Eseri ipuçlarını kim yazdı?" | Envanterden çocuk diline biz çevirdik; test ilk ipuçlarının cevabı ele vermediğini denetler. | `scripts/gunun-eseri.py`, `tests/gunun-eseri.test.tsx` |
| "Rozetler bağımlılık yaratmaz mı?" | Kaybedilmez, süre baskısı ve sıralama yok; yalnızca cihazda. | `src/features/rozetler/rozetMantigi.ts` |

### Ek kontrol listesi

- [ ] `npm run dev:lan` provası: en az 3 telefonla QR'dan katılım
- [ ] Demo cihazında Günün Eseri o gün oynanmamış olsun (ya da `localStorage`'dan `kokavi-gunun-eseri-v1` silinsin)
- [ ] Ses açık / kapalı (Sessiz mod) iki durumda da prova
- [ ] Bir şehir tamamlanmış demo ilerlemesi (sertifika için)
