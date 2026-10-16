# Gece çalışması raporu (16 Ekim 2026)

> Batuhan için sabah okuma notu. Her özellik **ayrı commit**; istemediğini
> tek komutla geri alabilirsin (en altta).

## Nerede?

- Proje artık **yerel git** deposu (hiçbir yere push edilmedi).
- `main` → gece öncesi durum (tek "Başlangıç" commit'i).
- `gece-calismasi` → gece eklenenler. Şu an bu branch açık.
- `.gitignore`'a eklendi: `deploy/ADMIN-PAROLA.txt`, `kaynak/` (356 MB PDF çıktısı),
  `.playwright-mcp/`, `*.tsbuildinfo`. `.pgdata`, `node_modules`, `dist` zaten dışarıdaydı.
- Git'in satır sonlarına dokunmaması için yerel `core.autocrlf=false`.

Commit listesini görmek için: `git log --oneline main..gece-calismasi`

---

## 1. Canlı sınıf yarışması (Kahoot tarzı) — `Canlı sınıf yarışması` commit'i

Başvuruda: **var** (iş listesinde "Kahoot tarzı canlı sınıf yarışması").

**Nasıl kullanılır**
1. Öğretmen: altbilgide *Yetişkinler için → Canlı yarışma kur* (`#/canli/kur`).
   Ders kapsamı (tümü / şehir / ünite), soru sayısı (5–15), süre (20/30/60 sn) seçer.
2. Tahta ekranında dev PIN + **QR kod** çıkar. Çocuklar *Sınıfım → Canlı yarışmaya katıl*
   ya da QR'ı okutup katılır. **Ad sorulmaz**: "Turkuaz Kubbe", "Altın Minare" gibi takma ad gelir.
3. Sorular: dersin kendi "boşluk doldur" ve "eseri tanı" egzersizleri + envanter
   fotoğrafından "Bu fotoğraftaki eser hangisi?". Seçenekler Kahoot gibi renk **ve** şekil (▲◆●■).
4. Süre bitince ya da herkes cevaplayınca sonuç açılır: doğru cevap, cevap dağılımı,
   açıklama + kaynak künyesi, ilk 5. Sonunda podyum + konfeti.

**Kurallar korunuyor**: ceza yok (yanlış puan düşürmez, 500–1000 hız puanı), kişisel veri yok
(odalar yalnızca bellekte, oyun bitince silinir), doğru cevap süre bitmeden telefona gitmez,
axe 0 ihlal, ekran okuyucuya şekil adı söylenir, 60 sn "rahat mod".

**⚠ Bilmen gereken**: Odalar sunucu belleğinde. **Vercel'de oda bölünebilir** (istekler farklı
örneklere düşerse). Finalde **laptop + aynı Wi-Fi** ile göster: `npm run dev:lan`
(telefonlar laptopun IP'sine bağlanır; QR kod doğru adresi verir). Ayrıntı: `docs/KARARLAR.md` §15.

**Yeni dosyalar**: `shared/canli.ts`, `server/canli/{oda,sorular}.ts`, `server/routes/canli.ts`,
`src/features/canli/*`, `tests/canli.test.ts`, `tests/canli-arayuz.test.tsx`.
**Değişen**: `server/index.ts` (1 satır kayıt), `src/app/App.tsx`, `src/lib/yonlendirme.ts`,
`package.json` (`qrcode-generator` MIT paketi + `dev:lan` betiği).

**Test**: 28 yeni test. Ayrıca tarayıcıda 1 öğretmen + 2 oyuncu ile baştan sona oynandı.
30 kişilik sınıfın aynı IP'den saniyede bir yoklaması hız sınırına takılmıyor (testli).

---

## 2. Günün Eseri (Wordle tarzı) — `Günün Eseri` commit'i

Başvuruda: **yok** (senin fikrin; çıkarmak istersen tek commit).

- Öğrenme Yolu'nun üstünde sarı **Günün Eseri #N** kartı → `#/gunun-eseri`.
- Her gün herkese aynı eser (57 günde hiçbiri tekrar etmez). 6 tahmin hakkı.
- İpuçları her yanlış tahminde sırayla açılır: **1) şehir 2) ne için kullanıldı 3) fotoğraf**
  4) ne zaman 5) adının ilk harfi 6) kim yaptırdı.
- Her tahmin karşılaştırılır: *Şehir aynı/farklı · Tür aynı/farklı · Biraz/Çok daha eski/yeni*.
- Bitince: konfeti, fotoğraf, kaynak künyesi, **derse git**, Wordle gibi kareli paylaşım
  (cevabı ele vermez), seri ve "kaçıncı tahminde" grafiği. Her şey cihazda; sunucu yok.

**İçerik**: 57 eserin ipuçlarını envanterdeki bilgiden çocuk diline ben yazdım
(`scripts/gunun-eseri.py`). Yazarken envanterde **olmayan** 9 ayrıntıyı yakalayıp düzelttim
(ör. "ipek ticareti", "yeşil kubbe", "depremden sonra" — kaynakta yoktu, çıkardım).
Bir test ilk dört ipucunun eserin adını ele vermediğini denetliyor; bu test de 5 sızıntı yakaladı
(ör. Osman Gazi ipucunda "Osmanlı"), hepsi düzeltildi. **Yine de bir insan okumalı.**

**Test**: 11 yeni test (veri, sızıntı, günlük seçim, karşılaştırma, paylaşım, istatistik, axe).

---

## 3. Ses efektleri ve titreşim — `Ses efektleri` commit'i

Başvuruda: **dolaylı** (Duolingo hissi; "sessiz mod" taahhüdüne uyuyor).

- Sesler **dosya değil**, Web Audio ile kodda sentezleniyor (indirme, lisans yok; çevrimdışı çalışır).
- Doğru cevap: iki notalı "ding" + 30 ms titreşim. Yanlış (ipucu): alçak, yumuşak bir ton,
  **titreşim yok** (ceza hissi vermesin). Ders sonu ve Günün Eseri'ni bilince: 4 notalı arpej.
- Canlı yarışmada: cevaba dokununca "tık", sonuçta doğru/ipucu sesi, podyumda kutlama.
- **Ayarlar → Sessiz mod** artık efektleri ve titreşimi de kapatıyor (açıklaması güncellendi).
  **Hareketi azalt** titreşimi kapatıyor.
- Ufak düzeltme: Sıralama egzersizi geri bildirim nesnesini her çizimde yeniden üretiyordu
  (`useMemo` ile sabitlendi); yoksa ses tekrar tekrar çalardı.

**Test**: `tests/efekt.test.ts` (5).

---

## 4. Kombo sayacı — `Kombo sayacı` commit'i

Başvuruda: **yok** (Duolingo'daki "üst üste doğru" hissi).

- Derste egzersizler üst üste **ipucu almadan** çözülünce "🔥 2 egzersiz üst üste ilk
  denemede!" bandı yaylanarak çıkar, alev titrer, kombo sesi çalar.
- İpucu alınınca sayaç sessizce sıfırlanır; elmas/puan **eksilmez** (ceza yok).
- Önceki dersten gelen tekrar sorusu da sayılır.

**Test**: `tests/kombo.test.tsx`.

---

## Geri alma

Bir özelliği istemezsen (örnek Günün Eseri):

```bash
git log --oneline main..gece-calismasi   # commit kimliğini bul
git revert <kimlik>                        # o özelliği geri alır, diğerleri kalır
```

Hepsini beğendiysen `main`'e almak için: `git checkout main && git merge gece-calismasi`.

## Kaptana ZIP

Proje git kullanmadığı için kaptana yine ZIP gidecek. Değişen dosya listesini almak için:
`git diff --name-only main..gece-calismasi`
