# Eksikler — Başvuru PDF'ine göre durum

> Kaynak: `sunum/KokAvi_Başvuru.pdf` (3 sayfa). Kural: önce PDF'teki her şey biter, yeni özellik sonra gelir.

## 1. PDF'te olup eksik / yarım kalanlar

| # | Özellik (PDF) | Şu anki durum | Yapılacak | Tahmini süre |
|---|---|---|---|---|
| 1 | **Dinle ve seç** egzersiz tipi | Derste "dinle" butonu var, ayrı egzersiz tipi yok | Sesli anlatımı dinle → doğru eseri işaretle egzersizi (tip + içerik + test) | 1–2 saat |
| 2 | **Toplu Türkçe TTS** (dosya olarak saklanır, çevrimdışı çalışır) | Tarayıcının anlık sesi (Web Speech) kullanılıyor | Her ders için bir kez ses dosyası üret, `public/` altında sakla, PWA önbelleğine ekle | 2–3 saat |
| 3 | **Erişilebilirlik** (WCAG 2.2 AA, yüksek kontrast, ölçeklenebilir yazı, sessiz mod) | Var, ama yeni koyu tema sonrası tam doğrulanmadı | axe 0 ihlal, yüksek kontrast + yazı boyutu + sessiz modla bütün akışı uçtan uca dene | 1 saat |
| 4 | **AI ile soru üretimi** (içerik hattı: içerik → AI soru → insan kontrolü → yayın) | Sorular script / elle yazılmış | Soru taslağı üreten script veya panel adımı + "insan onayı" durumu | ✅ `scripts/soru-taslak.ts` |
| 5 | **Elmas harcama** (yeni şehir paketi, ek sefer) + **veli onayı** | Elmas kazanılıyor; harcama yeri sınırlı | Elmasla şehir/ek sefer açma; satın alma ekranında simüle veli onayı (gerçek para yok) | 1–2 saat |

## 2. Kapsam dışında bırakılanlar (gerekçeli)

| Özellik (PDF) | Neden şimdi yok | Ne yapılacak |
|---|---|---|
| Premium abonelik, kurumsal lisans, gerçek ödeme | İş modeli kalemi; MVP'de beklenmez | Sunumda anlatılır |
| Kütahya / İzmir / Manisa üniteleri | Vakıf Katılım verisi yalnızca Hatay, Konya, Bursa | `docs/DEMO.md`'deki eski şehir adları düzeltilir |
| PostgreSQL + PostGIS | PGlite + gömülü GeoJSON yeterli, kurulumsuz çalışıyor | Gerekçe `docs/KARARLAR.md`'ye yazılır |

## 3. PDF'te olmayan, ekstra eklenen özellikler

**Başvuruyla bağı kurulabilenler:**

| Özellik | Başvurudaki bağı |
|---|---|
| Canlı sınıf yarışması (Kahoot) + sınıf raporu | Senaryo B — sınıfta birlikte öğrenme |
| Vakıf ağı haritası, keşif rotası | Harita (MapLibre) katmanı |
| Meraklısına arşivi (633 eser), Hikâyesini dinle | Envanterin "üçüncü anlatım kanalı" + sesli anlatım |
| Şehir sertifikası | "Bursa'yı biliyorum" aidiyet fikri |
| Hayrat mı Akar mı? | Bağlam adımındaki çekirdek kavram |
| Uygulamayı yükle kartı | PWA |

**Tamamen yeni olanlar:**

| Özellik | Not |
|---|---|
| Başarım rozetleri | ⚠️ PDF: "Kazanç rozet değil, aidiyet" — doğrudan çelişiyor |
| Günün Eseri (Wordle) | 57 ipucu cümlesi henüz insan tarafından okunmadı |
| Kombo sayacı, ses efektleri, titreşim, konfeti | Oyunlaştırma ekstraları |
| Zaman tüneli, zamana göre öğrenme sekmeleri | Yeni öğrenme görünümü |
| Seri takvimi, Hatalarımı çalış | Seri / tekrar sistemine ek |
| İlk açılış turu, maskot Köstik ve tepkileri | Arayüz katmanı |
