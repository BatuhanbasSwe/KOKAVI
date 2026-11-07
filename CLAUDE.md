# CLAUDE.md — Kök Avı MVP (Takım TRİA)

> Bu dosya, takım arkadaşlarının Claude oturumları için yazıldı. Kodu değiştirmeden önce sonuna kadar oku.
> Kullanıcıyla **Türkçe**, kısa ve net konuş. Kod ve teknik terimler İngilizce kalabilir.
> **İşe başlamadan önce [TODOLIST.md](TODOLIST.md) dosyasını oku:** neyin bittiği, neyin kaldığı ve kimin hangi işte olduğu orada. Bir işi bitirince oradaki kutuyu `[x]` yap.

## 1. Proje özeti

- **Ne:** 10–12 yaş çocuklara vakıf eserlerini günlük mikro derslerle öğreten bir PWA (Duolingo tarzı öğrenme yolu).
- **Yarışma:** KÖK & KOD Hackathon (Vakıf Katılım × 42 Türkiye). Final 7–8 Kasım 2026.
- **Ana kural:** Organizatörler "başvuru PDF'inde ne yazıyorsa onu yapın, dışına çok çıkmayın" dedi. Başvuruda olmayan büyük bir özellik ekleme; önce kullanıcıya sor.
- **Şehirler:** Hatay, Konya, Bursa. Bursa'da 3 ünite var.
- **İçerik durumu:** Uygulamadaki metinler ve eser listesi geçici prototip. Resmi veri, Vakıf Katılım'ın gönderdiği PDF'lerden (metin + görsel) gelecek.
- **Canlı sürüm:** Vercel üzerinde.

## 2. Teknoloji

| Katman | Teknoloji |
|---|---|
| Ön yüz | React 19 + TypeScript (strict) + Vite, `vite-plugin-pwa` (çevrimdışı) |
| Yönlendirme | Hash tabanlı, `src/lib/yonlendirme.ts` (`#/yol`, `#/ders/:id`, `#/panel`…) |
| API | Fastify 5 (`server/index.ts`), cookie oturum, helmet, rate-limit |
| Veritabanı | PGlite (gömülü Postgres). Veri `.pgdata/` klasöründe. Şema `server/db/schema.sql`, `auth-schema.sql` |
| Harita | MapLibre GL, çevrimdışı GeoJSON (`src/features/harita/veri/`) |
| Test | vitest + Testing Library + axe-core |
| Yayın | Vercel: `api/index.mjs` (esbuild bundle) + `deploy/pgdata.tgz` |

Node.js 22 veya üstü gerekir.

## 3. Komutlar

```bash
npm install
npm run seed       # data/*.json → veritabanı. API KAPALIYKEN çalıştır!
npm run dev        # API :8787 + arayüz :5173
npm test           # tüm testler
npm run dogrula    # typecheck + test + build. Teslimden önce MUTLAKA çalıştır
```

- Windows'ta `BASLAT.bat` kurulumu, seed ve dev adımlarını tek tıkla yapar.
- **Uyarı:** Seed, `npm run dev` açıkken çalışırsa PGlite bozulur. Bozulursa `.pgdata` klasörünü kenara taşı, seed'i yeniden çalıştır.

## 4. Klasör haritası

```
src/
  app/          App.tsx (kabuk + rotalar), HataSiniri, DurumSaglayici, ikonlar
  features/     her ekran ayrı klasör:
    yol/        öğrenme yolu (ana ekran)
    ders/       5 adımlı ders + egzersizler + VakifRontgeni + DinleDugmesi
    harita/     MapLibre haritası
    defter/     Kâşif Defteri
    carsi/      elmas harcama (yalnızca uygulama içi)
    ayarlar/    erişilebilirlik ayarları
    sinif/ ogretmen/   sınıf kodu ve öğretmen paneli
    panel/      admin içerik yönetimi
  lib/          saf mantık (ilerleme, tekrar, oturum, api, ses, carsi…)
  styles/       tokens.css (tasarım jetonları), global.css
server/
  routes/       public.ts, auth.ts, admin.ts, sinif.ts
  repo/         SQL erişimi
  auth/         parola hash, oturum, yetki koruması
  seed/run.ts   JSON → DB
shared/         types.ts (ön yüz ve API ortak tipleri), slug.ts
data/
  research/*.json   kaynaklı eser verisi (her bilgi için "kaynak" alanı zorunlu)
  content/*.json    ders metinleri ve egzersizler
tests/          vitest paketleri
docs/           API.md, KARARLAR.md, UI-DEVIR.md, VERI.md, DEMO.md, DURUM.md
deploy/ api/    Vercel yayın dosyaları
```

## 5. Dokunma kuralları

### 🔴 DOKUNMA (sormadan değiştirme)
- `server/**`: API, yetki ve DB. Güvenlik testleri bunlara bağlı.
- `shared/**`: ortak tipler. Değişirse hem ön yüz hem API kırılır.
- `src/lib/api.ts`, `src/lib/ilerleme.ts`, `src/lib/oturum.ts`: iş mantığı ve API sözleşmesi.
- `server/db/*.sql`: şema.
- `api/`, `deploy/`, `vercel.json`: yayın düzeni.
- `.pgdata/`: veritabanı dosyaları. Elle düzenleme; ZIP'e de koyma.
- `deploy/ADMIN-PAROLA.txt`: gizli. İçeriğini okuma, kopyalama, sohbete yazma.

Bunlardan birini değiştirmek gerçekten gerekiyorsa dur, kullanıcıya nedenini söyle ve onay al.

### 🟡 DİKKATLİ (yapıyı koru)
- `src/app/App.tsx`: rota ve kabuk. Atlama bağlantısı, `aria-current` ve odak yönetimi korunmalı.
- `src/lib/yonlendirme.ts`: yeni rota eklenebilir, var olanlar bozulmamalı.
- `data/research/*.json`, `data/content/*.json`: içerik. Format testlerle korunuyor (`tests/icerik.test.ts`). Değiştirdikten sonra `npm run seed` çalıştır.
- `src/lib/tekrar.ts`, `carsi.ts`, `erisilebilirlik.ts`, `ses.ts`: testleri var, davranışı değiştirme.

### 🟢 SERBEST
- `src/features/**/*.tsx` ve `*.css`: ekranlar ve görünüm.
- `src/styles/*.css`, `src/app/app.css`.
- `tests/`: yeni test eklemek her zaman serbest.
- `docs/`: belgeler.

## 6. Bozulmaması gereken kurallar

1. **Gizlilik:** Çocuk hesabı ve kişisel veri yok. İlerleme cihazda (localStorage) tutulur. `/api/yol` ilerleme döndürmez; kilit durumu `yolHesapla()` ile cihazda hesaplanır. Sınıf kaydında sunucuya yalnızca `{kod, dersId}` gider.
2. **Ceza yok:** Kalp mekaniği yok. Yanlış cevapta yalnızca ipucu ve tekrar turu olur; elmas eksilmez. Gerekçe: `docs/KARARLAR.md`.
3. **Erişilebilirlik (axe 0 ihlal):**
   - Renk tek başına anlam taşımaz; simge ve metin de olmalı.
   - Tıklanan her şey `<button>` ya da `<a>` olmalı. `div` üzerinde `onClick` yasak.
   - `:focus-visible` görünür kalmalı.
   - Dokunma hedefleri en az 44px olmalı.
4. **Ham renk yok:** Renkler `src/styles/tokens.css` jetonlarıyla verilir.
5. **Kaynak zorunlu:** Her tarihî bilgi için bir kaynak gösterilmeli. Uydurma bilgi ekleme.
6. **Dil:** Çocuk metinleri 10–12 yaşa uygun, kısa ve sade Türkçe olmalı.
7. **Ders yapısı:** Merak → Bağlam → Perspektif → Egzersiz → Yansıma. Egzersiz tipleri: eşleştir, sırala, boşluk doldur, eser tanı.

## 7. Çalışma akışı

1. İşe başlamadan önce `npm test` çalıştır; çıktı yeşil olmalı.
2. Değişikliği küçük parçalar halinde yap.
3. Yeni bir özellik eklediysen test de ekle.
4. Bitirince `npm run dogrula` çalıştır. Hepsi yeşil değilse teslim etme.
5. `TODOLIST.md`'de ilgili kutuyu işaretle (aynı commit'te).
6. Kullanıcıya kısaca bildir: değişen dosyalar, ne yapıldığı, test sonucu.

**Teslim (git):** Ana depo `github.com/abdkayaa/hackathon`. ZIP artık kullanılmıyor; Vercel production yayını bu deponun `main` dalından otomatik yapılır.
- Herkes kendi dalında çalışır, `main`'e PR ya da merge ile girer. Push'u kullanıcı kendisi yapar; sorulmadan push etme.
- `node_modules/`, `.pgdata/`, `dist/`, `.env` ve `deploy/ADMIN-PAROLA.txt` commit'e girmez (`.gitignore`).
- Commit mesajı: ne değişti, neden; `npm run seed` gerekiyorsa mesajda belirt.

## 8. İş listesi

Güncel liste [TODOLIST.md](TODOLIST.md) dosyasında: biten işler `[x]`, kalanlar `[ ]`.

Aynı işe iki kişi girmesin: başlamadan önce TODOLIST.md'deki satırın sonuna adını yaz (`— 🔧 Ad`) ve kaptana hangi maddeyi aldığını söyle.

## 9. Daha fazla bilgi

- `docs/API.md`: tüm uçlar.
- `docs/KARARLAR.md`: başvuru PDF'indeki belirsizliklerin nasıl yorumlandığı.
- `docs/UI-DEVIR.md`: arayüz ve erişilebilirlik sözleşmesi.
- `docs/VERI.md`: veri kaynakları.
