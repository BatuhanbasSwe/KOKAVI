# Ders ve Egzersiz Analizi — Kök Avı

> Tarih: 6 Kasım 2026 · Kapsam: 57 ders × 4 egzersiz = 228 egzersiz (`data/content/*.json`)
> Etiketler: `[ÖLÇÜLDÜ]` veriden sayıldı · `[KAYNAK]` yayımlanmış araştırma · `[VARSAYIM]` doğrulanmadı

## 0. Özet (3 satır)

1. **En büyük sorun içerik değil, sunumdu.** Çocuk okumadan dersi bitirebiliyordu. Doğru şık neredeyse hep ilk sıradaydı, "sırala"da da cevabı yıllar veriyordu.
2. **İlk düzeltme yapıldı (UI, 🟢 alan):** Şıklar artık karışık geliyor, sırala'da tarihler ilk denemede gizli. 707/707 test yeşil.
3. **Tip çeşitliliği (Duolingo gibi):** Finalden önce yeni tip eklenmiyor; PDF kısıtı ve feature freeze var. Mevcut 4 tipin içinde 2 düşük riskli varyant önerildi (§4, yalnız içerik değişikliği). Yeni tipler yol haritasında.

## 1. Bulgular

| # | Bulgu | Ölçüm | Etki |
|---|---|---|---|
| B1 | Eseri tanı: doğru şık 1. sırada | **51/57** `[ÖLÇÜLDÜ]` | Çocuk hep ilk şıkka basarak geçer; okuma gerekmez |
| B2 | Boşluk doldur: doğru şık 1. sırada | **57/57** `[ÖLÇÜLDÜ]` | Aynı sorun, %100 |
| B3 | Arayüz B1–B2'de şıkları karıştırmıyordu | `EserTaniEgzersizi.tsx`, `BoslukDoldurEgzersizi.tsx` | B1 ve B2'yi oyuna dönüştürür |
| B4 | Sırala: öğelerin başında yıl yazıyor ("1339: …") | **48/57** (37'sinde tüm öğeler tarihli) `[ÖLÇÜLDÜ]` | Görev sayı sıralamaya iner; tarih bilgisi sıfır |
| B5 | Sırala: para/sayı büyüklüğü sıralama ("70.615 kuruş", "öğrenci: 30") | 3 ders (Yeşil Cami, Yeşil Medrese, Habib-i Neccar) | Kullanıcının "akçe sıralama saçma" eleştirisi. Yalnızca sayı karşılaştırması yapılıyor |
| B6 | Her ders aynı kalıp: 5 adım + aynı 4 egzersiz, aynı sırada | 57/57 | Tekdüzelik. 5. dersten sonra çocuk kalıbı ezberler |
| B7 | İyi örnekler zaten var | Karatay (vakfiyedeki harcama sırası), Sâhib Ata (yönetim kime geçer), Sultan II. Selim (sebep→sonuç), Rum Ortodoks (tarihçi gibi düşün) | Doğru model bunlar: sıra **anlamdan** çıkıyor, sayıdan değil |

**Neden önemli:** B1–B4 bir arada olunca egzersiz bölümü ölçme değil, tıklama oluyor. Bir jüri üyesinin demoda hep ilk şıkka basıp geçmesi bu iddiayı tek başına çürütür.

## 2. Yapılan düzeltme (bu commit)

| Dosya | Değişiklik |
|---|---|
| `src/features/ders/EserTaniEgzersizi.tsx` | Şık görüntü sırası ilk çizimde karıştırılıyor. Kontrol yine `dogruIndex` üzerinden |
| `src/features/ders/BoslukDoldurEgzersizi.tsx` | Şıklar karıştırılıyor (kontrol zaten metin tabanlı) |
| `src/features/ders/SiralaEgzersizi.tsx` | **Tarih gizleme:** ilk denemede yıl önekleri gizli. İlk kontrolden sonra ipucu olarak açılıyor. İlk denemede doğruysa ayrı bir övgü cümlesi çıkıyor |
| `src/features/ders/yardimci.ts` | `tarihAyir()`: yıl, "1400'ler", "XIV. yüzyıl", "Bugün" öneklerini ayırır. "Buğday: 70.615 kuruş" gibi öğelere dokunmaz |
| `tests/egzersiz-okuma-zorunlu.test.tsx` | 5 test eklendi: tarih ayırma, gizleme ve açılma, axe 0 ihlal, şık karıştırma |

- İçerik JSON'u, `shared/` ve sunucu değişmedi. Seed gerekmiyor.
- Ceza yok kuralı korunuyor: yanlışta ipucu kademesi var (önce tarihler, sonra ilk öğe). Çıkmaz sokak yok.

## 3. Dayanak: hangi egzersiz neden işe yarar?

Ana çerçeve: **ICAP** (Chi & Wylie, 2014, *Educational Psychologist*). Öğrenme şu sırayla güçlenir: Pasif < Aktif < Yapıcı (constructive) < Etkileşimli. "İlk şıkka bas" pasif bile değil. "Hatırla, yaz, gerekçelendir" ise yapıcı düzeyde.

| İlke | Kaynak `[KAYNAK]` | Kök Avı'nda nerede |
|---|---|---|
| **Geri çağırma (testing effect):** Hatırlamaya çalışmak, tekrar okumaktan kalıcıdır | Roediger & Karpicke 2006, *Psychological Science*; Karpicke & Blunt 2011, *Science*; Dunlosky vd. 2013 ("yüksek fayda") | Egzersiz adımı, `GeriCagirmaAdimi` |
| **Tanımak ≠ hatırlamak:** Çoktan seçmeli soru tanımayı ölçer. Cevabı üretmek (yazmak) daha kalıcı iz bırakır (generation effect) | Slamecka & Graf 1978; Bertsch vd. 2007 meta-analiz | Boşluk doldur, şıksız modda (§4-V1) |
| **Önce tahmin et (pretesting / productive failure):** Bilmeden tahmin etmek, sonraki öğrenmeyi artırır | Richland, Kornell & Kao 2009; Kornell, Hays & Bjork 2009; Kapur 2008 | Merak adımı; sırala'da tarihsiz ilk deneme |
| **Geri bildirim:** "Yanlış" demek yetmez. Neyin yanlış olduğunu ve nasıl düzeltileceğini söylemek gerekir | Hattie & Timperley 2007; Shute 2008; Butler & Roediger 2008 | İpucu ve tekrar turu (`EgzersizKabugu`) |
| **Aralıklı tekrar** | Cepeda vd. 2006 meta-analiz | `src/lib/tekrar.ts` |
| **Karışık uygulama (interleaving)** | Rohrer & Taylor 2007; Rohrer, Dedrick & Stershic 2015 (7. sınıf) | Önceki dersten geri çağırma; §4-V3 |
| **Tarihsel düşünme:** Kronoloji ezberi değil, sebep→sonuç ve süreklilik/değişim | Seixas & Morton 2013, *The Big Six Historical Thinking Concepts* | Sırala'nın yeni hâli: sırayı anlam belirler |
| **İkili kodlama / çoklu ortam:** Söz ve görsel birlikte | Paivio 1986; Mayer 2009 | Eser fotoğrafı, Dinle ve seç, Geçmiş/bugün karşılaştırması |
| **Hikâye:** Hikâye biçimindeki bilgi daha iyi hatırlanır | Willingham 2004, *American Educator* ("The Privileged Status of Story") | Perspektif adımındaki diyalog |

> Uyarı: Bu kaynaklar **tasarım ilkelerini** destekler. Kök Avı'nın öğrenmeyi artırdığını **ölçmedik**. Jüriye "kanıtlanmış" değil, "**kanıta dayalı tasarım**" denmeli. Etki ölçümü pilot okulun işi.

## 4. Ders yapısı revizyonu: mevcut 4 tip içinde çeşitlilik

Kural: Yeni tip yok, `shared/types.ts` değişmez. Yalnızca içerik (🟡) ve görünüm (🟢) değişir.

| Kod | Varyant | Nasıl | Dayanak | Maliyet |
|---|---|---|---|---|
| **V1** | **Şıksız boşluk doldur** (hatırla ve yaz) | Ünitenin son 1–2 dersinde `secenekler` alanı kaldırılır. Arayüzdeki serbest metin modu zaten var (`BoslukVerisi.secenekler?`), `turkceNormalize` büyük/küçük harf ve ı/i farkını tolere eder | Generation effect; tanıma → hatırlama geçişi | Yalnız JSON. Test: `icerik.test.ts` |
| **V2** | **Sebep→sonuç sırala** | Para ve sayı sıralamaları (B5, 3 ders) "ne olunca ne oldu" zincirine çevrilir. Ör. "Vakıf kuruldu → gelir bağlandı → medrese açıldı → öğrenci okudu". Her öğe ders metnindeki kaynaklı bilgiden gelir | Seixas & Morton (sebep-sonuç) | 3 ders JSON. Yeni bilgi yok, mevcut kaynak |
| **V3** | **Zorluk merdiveni** | Egzersiz sırası tanımadan üretmeye: eser tanı → eşleştir → sırala → boşluk doldur | Desirable difficulties (Bjork 1994): kolaydan zora | Sıra içerikte duruyorsa JSON, değilse tek satır UI |
| **V4** | **Ünite sonu karışık tekrar** | Ünitenin son dersindeki geri çağırma önceki derslerden de soru çeker | Interleaving, spacing | Mevcut `tekrar.ts` var. Davranış değişikliği 🟡, finalden sonra |

**Öneri:** Finalden önce **V1 + V2** (yalnızca içerik, düşük risk, demoda gösterilebilir). V3 ve V4 sonraya kalır.

### Adımlar zaten pedagojik bir sıra

| Adım | Ne yapar | Dayanak |
|---|---|---|
| Merak | Bilmediği bir soruyla açar ("Bu caminin altında neden çarşı var?") | Merak boşluğu (Loewenstein 1994); pretesting |
| Bağlam | Kısa metin, fotoğraf ve kaynak | İkili kodlama; parçalama (bilişsel yük, Sweller 1988) |
| Perspektif | Bir kişinin gözünden hikâye (vakıf kurucusu, öğrenci, esnaf) | Hikâye (Willingham); tarihsel empati (Seixas & Morton) |
| Egzersiz | Hatırla, eşleştir, sırala, üret | Geri çağırma, generation effect |
| Yansıma | "Sen olsan neyi korurdun?" | Kendi kendine açıklama (Chi 1994; Bisra vd. 2018 meta-analiz) |

## 5. Yol haritası: Duolingo tarzı yeni tipler (finalden sonra)

| Tip | Duolingo karşılığı | Neden değerli | Not |
|---|---|---|---|
| ~~Dinle ve seç~~ | Listening | — | **Zaten var.** `eser-tani` içinde sesli hâli; sessiz modda yazılı betimlemeye düşer (PDF'teki 4 tipten biri) |
| Cümle kur (kelime kartlarından) | Word bank | Üretim; Türkçe söz dizimi | `shared/types.ts` değişir 🔴 |
| Geçmiş / bugün karşılaştır | Görsel eşleştirme | Süreklilik ve değişim kavramı | Görsel hakkı PDF'lere bağlı |
| Tarihçi gibi düşün (gerekçeli seçim) | Yok, Kök Avı'na özgü | ICAP "yapıcı" düzeyi, kanıt kullanma | Ayrıştırıcı özellik adayı |
| Haritada bul | Yok | Yere dayalı eğitim (Sobel 2004) | MapLibre zaten var |
| ~~Konuşma~~ | Speaking | — | **Reddedildi.** Tarayıcı ses tanıma sesi Google sunucularına gönderir. Çocuk verisi ve KVKK ile çelişir |

## 6. Ne söylemeyelim

- "Duolingo gibi her şey var" demeyin. 4 tip var; jüri sayar.
- "Öğrenmeyi %X artırıyor" demeyin. Ölçmedik.
- "Okul müfredatına tam entegre" demeyin. Doğrusu: Sosyal Bilgiler 5 SB.5.3.1 ile **uyumlu**, "Şehrimiz" seçmeli dersiyle **kısmi uyum** (15 kazanımdan 10'u).

Sunum metni ve temellendirme: [SUNUM-TEMELLENDIRME.md](SUNUM-TEMELLENDIRME.md)
