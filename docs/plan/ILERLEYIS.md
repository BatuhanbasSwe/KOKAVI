# İlerleyiş Planı

> Sıra değişmez: **Aşama 1 bitmeden Aşama 2'ye geçilmez.** Her adım ayrı commit; sonunda `npm run dogrula` yeşil olmalı.
> Detaylı eksik listesi: [EKSIKLER.md](EKSIKLER.md)

## Aşama 1 — Başvuru PDF'ini tamamla

| # | İş | Bitti sayılması için | Durum |
|---|---|---|---|
| 1 | Dinle ve seç egzersizi | Yeni tip derslerde çıkıyor, testi var, ekran okuyucuyla da çözülebiliyor | ⬜ |
| 2 | Toplu TTS ses dosyaları | Her dersin ses dosyası var, internet kapalıyken çalıyor | ⬜ |
| 3 | Erişilebilirlik doğrulaması | axe 0 ihlal; kontrast/yazı boyutu/sessiz modla tam ders bitiyor | ⬜ |
| 4 | AI soru üretimi hattı | Script/panel taslak soru üretiyor, insan onayı olmadan yayına girmiyor | ⬜ |
| 5 | Elmas harcama + veli onayı (simüle) | Elmasla şehir/ek sefer açılıyor; onay ekranı var | ⬜ |
| 6 | Belge düzeltmeleri | DEMO.md şehirleri güncel; KARARLAR.md'de PostGIS gerekçesi | ⬜ |

## Aşama 2 — Ekstra özelliklerin kararı

PDF'te olmayan özellikler için öneri (son karar takımın):

| Özellik | Öneri | Gerekçe |
|---|---|---|
| Canlı sınıf yarışması + sınıf raporu | ✅ Kalsın | Senaryo B'yi güçlendiriyor; jüri için etkili |
| Vakıf ağı haritası, keşif rotası | ✅ Kalsın | Haritanın doğal uzantısı |
| Meraklısına arşivi, Hikâyesini dinle | ✅ Kalsın | Envanter verisini gösteriyor |
| Şehir sertifikası | ✅ Kalsın | PDF'teki aidiyet fikrine uyuyor |
| Hayrat mı Akar mı? | ✅ Kalsın | Çekirdek kavram |
| Uygulamayı yükle kartı | ✅ Kalsın | PWA'nın parçası |
| Başarım rozetleri | ❌ Kaldır | PDF'le çelişiyor ("rozet değil, aidiyet") |
| Günün Eseri | ⚠️ Şartlı | İpuçları insan kontrolünden geçerse kalsın |
| Kombo, ses efekti, titreşim, konfeti | ⚠️ Sadeleştir | Ses/titreşim sessiz moda uyuyorsa kalsın; kombo çıkabilir |
| Zaman tüneli, zamana göre öğrenme | ⚠️ Tartış | Öğrenme yolunu bulandırıyor mu bakılmalı |
| Seri takvimi, Hatalarımı çalış | ✅ Kalsın | Seri ve tekrar sistemine hizmet ediyor |
| İlk açılış turu, maskot Köstik | ✅ Kalsın | Çocuk deneyimi |

Kaldırma yöntemi: her özellik ayrı commit → `git revert <commit>`.

## Aşama 3 — Öneriler (Aşama 1–2 bittikten sonra)

1. **Canlı yarışma için kalıcı oda:** Odalar şu an bellekte, Vercel'de bölünebilir. Final demosu `npm run dev:lan` ile laptoptan yapılmalı ya da odalar DB'ye taşınmalı.
2. **İçerik okuması:** Yeni 57 dersin metinleri bir insan tarafından 10–12 yaş diline göre okunmalı.
3. **Demo senaryosu:** `docs/DEMO.md` yeni akışa göre baştan yazılmalı (Senaryo A + B, 3 dakika).
4. **Dağıtım kararı:** PWA mı kalacak, APK mı olacak? Final öncesi netleşmeli.
5. **Hatay notu:** Deprem sonrası durumu "doğrulanmadı" olarak işaretli derslere mentörden teyit istenmeli.
