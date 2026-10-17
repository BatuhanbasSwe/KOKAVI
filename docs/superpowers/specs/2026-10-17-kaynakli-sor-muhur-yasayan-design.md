# Farklılaşma: Kaynaklı soru-cevap (B), Sahada mühür (G), Hâlâ yaşayan vakıflar (H)

Tarih: 2026-10-17 · Durum: B onaylandı (Batuhan: "başla"); G ve H aşağıdaki kararlarla · Branch: `gece-calismasi`

## Neden

Diğer takımlar büyük olasılıkla harita + bilgi kartı + quiz + serbest yapay zekâ sohbeti yapacak.
Farkımız: **yapay zekâmız var ama kaynaksız konuşmuyor** (B), **uygulama sokağa çıkarıyor** (G),
**vakıf geçmiş değil, süren bir hayır** (H). Üçü de başvurunun ruhunda: kaynak zorunlu, kişisel veri
yok, "Kazanç rozet değil, aidiyet".

## B. Kaynaklı soru-cevap ("Köstik'e sor")

**Arayüz**
- Arşivdeki arama kutusu "Sor ya da ara" olur. Girdi soru gibiyse (sonu `?` ya da soru kelimesiyle
  başlar/içerir: ne, kim, neden, nasıl, kaç, hangi, nerede, ne zaman) kutunun altında
  **"Köstik'e sor"** düğmesi çıkar; liste her durumda süzülmeye devam eder.
- Arşiv eser sayfasında **"Bu esere sor"**: soru o esere odaklanır.
- Cevap kartı: Köstik portresi, en fazla 3 kısa cümle, her cümlenin sonunda `[1]` gibi kaynak
  işareti; altında numaralı künye listesi (eser sayfasına bağlantı). Yükleniyor ve hata durumları
  metinle duyurulur (`role="status"`).

**Sunucu: `POST /api/sor`** gövde `{ soru: string, eserId?: string }`
1. Doğrulama: soru 3-200 karakter. Kişisel görünen parçalar (e-posta, 5+ basamaklı sayı, telefon
   kalıbı) temizlenir. **Soru hiçbir yere kaydedilmez, günlüğe yazılmaz.** Sıkı hız sınırı
   (IP başına dakikada 10).
2. Bulma: `server/sor/korpus.json` içinde Türkçe normalleştirilmiş (küçük harf, şapka/ı-i katlama)
   kelime eşleşmesiyle BM25 benzeri puanlama; `eserId` verilirse o eserin parçaları öne alınır.
   En iyi 6 parça.
3. Model: Claude Haiku (en güncel Haiku). Sistem talimatı: yalnızca verilen parçalara dayan;
   10-12 yaş, kısa Türkçe; en fazla 3 cümle; her cümle `[n]` ile biter; parçalarda yoksa
   `BILMIYORUM` yaz. Çıktı yapılandırılmış JSON: `{ cumleler: [{ metin, kaynaklar: number[] }] }`.
4. Denetim: her cümlenin en az bir geçerli kaynağı yoksa, ya da cümle sayısı 3'ü aşarsa cevap
   **düşürülür** ve `{ bilmiyorum: true, oneriler }` döner (ilgili 3 eser).
5. Yanıt: `{ cumleler, kaynaklar: [{ no, eserId, eserAd, kunye }] }` ya da `{ bilmiyorum: true, oneriler }`.
- Anahtar yoksa (`ANTHROPIC_API_KEY` tanımsız) uç `503 { hata: 'kapali' }` döner; arayüz yalnızca
  arama sonuçlarını gösterir. Anahtar yalnızca ortam değişkeninde; koda ve sohbete yazılmaz.

**Korpus: `npm run korpus`** (`scripts/korpus-uret.ts`)
- Kaynaklar: `data/research/*.json` (57 eser; alan alan parça: yaptıran, yapım, vakfiye amacı,
  hizmet, bugün; künye `kaynaklar[0].kunye`) + `public/arsiv/metin/*.json` (633 eser; yalnızca
  Türkçe paragraflar; künye `public/arsiv/liste.json` → `kaynak`).
- Çıktı `server/sor/korpus.json`: `[{ id, eserId, eserAd, metin, kunye }]`. Esbuild bunu Vercel
  paketine katar. İçerik değişince betik yeniden çalıştırılır.

**Test:** normalleştirme ve bulma (doğru eser öne çıkar), kişisel veri temizleme, denetim (kaynaksız
cümle düşer), uç: anahtarsız 503, sahte modelle 200, geçersiz girdi 400, sorunun günlüğe yazılmadığı.
Arayüz: soru düğmesinin görünmesi, cevap kartı ve künyeler, bilmiyorum hâli, axe.

## G. Sahada mühür

- Arşiv eser sayfasında ve Keşif rotasındaki her durakta **"Buradayım"** düğmesi (yalnızca
  koordinatı olan ve konumu **yaklaşık olmayan** eserlerde).
- Basınca tarayıcıdan **bir kez** konum istenir (`getCurrentPosition`, takip yok). Eser 150 m
  içindeyse cihazdaki `kokavi-muhurler` kaydına `{ eserId, gun }` yazılır; konumun kendisi
  saklanmaz, hiçbir yere gönderilmez.
- Mühür, Defter > Pullar'da pulun köşesinde "orada bulundum" damgası olarak görünür (metinle de).
  Uzaksa: "Yaklaşık 2,3 km uzaktasın. Gidince tekrar dene." Ret/hatada nazik açıklama.
- Test: mesafe eşiği, kayıt biçimi (konum yok), yaklaşık konumda düğme yok, ret durumu.

## H. Hâlâ yaşayan vakıflar

- `data/research/*.json` eserlerine elle doldurulan alan: `yasiyor: { durum, aciklama, kaynak }`.
  `durum`: `"asil-islevinde"` (bugün hâlâ yapıldığı işi yapıyor: ibadet, su, yemek, eğitim, ticaret)
  ya da yok. Yalnızca `bugunNeOldu` metninde **açıkça** yazıyorsa işaretlenir (örnek: "İbadete
  açıktır" → cami asıl işlevinde; "dükkân ve depo" → hayır). Kaynak, eserin kendi künyesidir.
- Keşfet'te **"Hâlâ yaşıyor"** kutucuğu → `#/kesfet/yasayan`: o eserlerin listesi, her birinde
  bir cümlelik "bugün" açıklaması ve künye.
- Ders ve arşiv eser sayfasında rozet: "Bugün hâlâ cami olarak açık" (metin + simge).
- `tests/icerik.test.ts` alanı doğrular: `durum` varsa `aciklama` ve `kaynak` zorunlu.

## Sıra

B (en büyük fark) → H (veri işi, hızlı) → G. Her biri ayrı commit, `npm run dogrula` yeşil.

## Kapsam dışı

Serbest sohbet (çok turlu), sesli soru, çocuk hesabı, konum takibi, sunucuda soru kaydı.
