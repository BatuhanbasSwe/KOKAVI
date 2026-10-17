# Kaynaklı soru-cevap, Hâlâ yaşayan vakıflar, Sahada mühür — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spec'teki B (kaynaklı soru-cevap), H (hâlâ yaşayan vakıflar), G (sahada mühür) özelliklerini
testli olarak eklemek (spec: `docs/superpowers/specs/2026-10-17-kaynakli-sor-muhur-yasayan-design.md`).

**Architecture:** B: derleme betiği `server/sor/korpus.json` üretir; sunucu saf modüllerle
(normalleştirme + BM25 bulma, kişisel veri temizleme, cevap denetimi) parçaları seçer ve Claude Haiku'yu
`messages.parse` + Zod şemasıyla çağırır; `POST /api/sor` bunları birleştirir; arayüz Arşiv'de
"Köstik'e sor" kartı. H: araştırma JSON'una `yasiyor` alanı + Keşfet listesi. G: tarayıcı konumu
bir kez, cihazda mühür kaydı.

**Tech Stack:** Fastify 5, `@anthropic-ai/sdk` (Claude `claude-haiku-5-5`), `zod`, React 19, vitest.

**Ortak kurallar:** her görev sonunda `npm run dogrula` yeşil + ayrı commit; Python düzenlemeleri
`scratchpad/duzenle.py` ile; ham renk yok; 44 px; emoji yok; çocuk metni kısa Türkçe.

---

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| `scripts/korpus-uret.ts` | `data/research` + `public/arsiv` → `server/sor/korpus.json` |
| `server/sor/metin.ts` | Türkçe normalleştirme, kelimeleme, soru mu tespiti |
| `server/sor/bul.ts` | BM25 benzeri puanlama, `bul(korpus, soru, eserId?, n)` |
| `server/sor/temizle.ts` | `kisiselVeriTemizle(soru)` |
| `server/sor/denetle.ts` | `cevapDenetle(cikti, parcaSayisi)` |
| `server/sor/model.ts` | Claude çağrısı (Zod şeması, sistem talimatı); test için enjekte edilebilir |
| `server/routes/sor.ts` | `POST /api/sor` (hız sınırı 10/dk, anahtarsız 503) |
| `src/lib/sor.ts` | İstemci: `soruMu(metin)`, `sor(soru, eserId?)` |
| `src/features/arsiv/SorKarti.tsx` | Cevap kartı (Köstik, cümleler, künyeler, bilmiyorum) |
| `tests/sor-*.test.ts(x)` | Birim + uç + arayüz testleri |

---

### Task B1: Bağımlılıklar ve korpus

- [ ] `npm install @anthropic-ai/sdk@0.135.0 zod@4.6.7 --save-exact`
- [ ] `scripts/korpus-uret.ts`: araştırma eserleri için alan başına parça (`Yaptıran: …`, `Yapım: …`,
  `Neden yaptırıldı: …`, `Ne hizmet verdi: …`, `Bugün: …`), künye `kaynaklar[0].kunye`; arşiv için
  `paragraflar` içinden Türkçe olanlar (Türkçe harf içeren ya da İngilizce kalıbı olmayan), künye
  `liste.json` `kaynak`. 600 karakterden uzun paragraflar cümle sınırından bölünür. Çıktı
  `[{ id, eserId, eserAd, metin, kunye }]`.
- [ ] `package.json` → `"korpus": "tsx scripts/korpus-uret.ts"`; çalıştır, `server/sor/korpus.json` oluşur.
- [ ] Test `tests/sor-korpus.test.ts`: her parçada künye var; `bursa-ulucami` parçaları var; İngilizce
  paragraf yok (`/ is located in /` geçmez).

### Task B2: Saf modüller (TDD)

- [ ] `metin.ts`: `normallestir("İPEK Hanı'nın") === "ipek haninin"` (küçük harf tr, ı/i/ş/ğ/ç/ö/ü
  katlama, şapka kaldırma, noktalama silme); `kelimeler()` 2 harften kısa ve durak kelimeleri
  (ve, ile, bir, bu, mi, mı, ne, de, da…) atar; `soruMu("Ulucami'de kaç kubbe var?") === true`,
  `soruMu("hamam") === false`.
- [ ] `bul.ts`: BM25 (k1=1.2, b=0.75); eser adı geçen parçalara +2 puan; `eserId` verilirse o eserin
  parçalarına +3; en iyi `n`. Test: "Ulucami kaç kubbe" → ilk parça `bursa-ulucami`.
- [ ] `temizle.ts`: e-posta, 7+ haneli sayı, `05xx` telefon kalıbı → `[gizlendi]`; 200 karaktere kırp.
- [ ] `denetle.ts`: girdi `{ bilmiyorum?: boolean, cumleler: {metin, kaynaklar:number[]}[] }`;
  geçersiz → `null`: cümle yok, 3'ten fazla, kaynaksız cümle, 1..parcaSayisi dışı numara, 300+ karakter
  cümle. `bilmiyorum: true` → `{ bilmiyorum: true }`.

### Task B3: Model çağrısı ve uç

- [ ] `model.ts`: `CevapSemasi = z.object({ bilmiyorum: z.boolean(), cumleler: z.array(z.object({ metin: z.string(), kaynaklar: z.array(z.number().int()) })) })`.
  `modelleCevapla(soru, parcalar)` → `client.messages.parse({ model: process.env.KOKAVI_SOR_MODEL ?? 'claude-haiku-5-5', max_tokens: 1024, output_config: { effort: 'low', format: zodOutputFormat(CevapSemasi) }, system: SISTEM, messages: [{ role: 'user', content: <numaralı parçalar + soru> }] })`;
  `stop_reason === 'refusal'` ya da `parsed_output` yoksa `{ bilmiyorum: true, cumleler: [] }`.
  Sistem talimatı: yalnızca parçalar, 10-12 yaş kısa Türkçe, en fazla 3 cümle, her cümlenin
  `kaynaklar` alanı parça numaraları, parçalarda yoksa `bilmiyorum: true`, kişisel bilgi sorma/yazma yok.
- [ ] `routes/sor.ts`: `POST /api/sor` gövde şeması (soru string 3-400, eserId opsiyonel string);
  `ANTHROPIC_API_KEY` yoksa `503 { hata: 'kapali' }`; temizle → bul (6) → model → denetle;
  geçersiz/bilmiyorum → `{ bilmiyorum: true, oneriler: [{eserId, eserAd}] }` (bulunan ilk 3 farklı eser);
  geçerli → `{ cumleler, kaynaklar: [{ no, eserId, eserAd, kunye }] }` (yalnızca atıf yapılan parçalar,
  yeniden numaralandırılmış). `config.rateLimit = { max: 10, timeWindow: '1 minute' }`.
  **Soru günlüğe yazılmaz** (`logLevel` bu rotada `warn`; istek gövdesi asla loglanmaz).
  Model `sunucuKur` seçeneğiyle enjekte edilebilir (test).
- [ ] `server/index.ts`: `await app.register(sorUclari)`.
- [ ] Test `tests/sor-uc.test.ts` (sahte model): anahtarsız 503; kısa soru 400; geçerli cevap 200 ve
  künyeler; kaynaksız model çıktısı → bilmiyorum; e-postalı soru modele temizlenmiş gider.

### Task B4: Arayüz

- [ ] `src/lib/sor.ts`: `soruMu` (sunucudakiyle aynı kural, `shared/` değil istemcide kopya değil:
  `src/lib/soruMu.ts` tek kaynak, sunucu da bunu içe aktarır), `sor()` fetch `/api/sor`.
- [ ] `ArsivSayfasi`: arama kutusu etiketi "Sor ya da ara", yer tutucu "hamam ya da: Ulucami'de kaç kubbe var?";
  `soruMu(arama)` ise kutunun altında "Köstik'e sor" düğmesi; basınca `SorKarti` (yükleniyor → cevap /
  bilmiyorum / kapalı / hata). `role="status"` duyurusu.
- [ ] `ArsivEserSayfasi`: "Bu esere sor" küçük form (eserId ile).
- [ ] Test `tests/sor-arayuz.test.tsx`: soru yazınca düğme çıkar; cevap kartı cümle + `[1]` + künye
  bağlantısı; bilmiyorum hâli önerilerle; 503'te "şu an kapalı" ve liste çalışır; axe.

### Task B5: Yayın

- [ ] `npm run build:vercel` → `api/index.mjs` yeniden üretilir (korpus pakete girer).
- [ ] `.env.example`: `ANTHROPIC_API_KEY=` ve `KOKAVI_SOR_MODEL=claude-haiku-5-5` satırları; `.env` zaten
  gitignore'da mı kontrol.
- [ ] `docs/API.md`: `/api/sor` bölümü.

### Task H1: Hâlâ yaşayan vakıflar

- [ ] `data/research/*.json` her esere (yalnızca `bugunNeOldu` açıkça söylüyorsa) `yasiyor: { durum:
  "asil-islevinde", aciklama: "<10-12 yaş tek cümle>", kaynak: "<eserin künyesi>" }`.
- [ ] `tests/icerik.test.ts`: `yasiyor` varsa üç alan dolu, `durum` geçerli.
- [ ] `src/features/merkez/YasayanSayfasi.tsx` + rota `#/kesfet/yasayan` + Keşfet kutucuğu.
- [ ] Eser rozetleri (ders üst bilgisi ve arşiv eser sayfası): "Bugün hâlâ … olarak açık".

### Task G1: Sahada mühür

- [ ] `src/lib/muhur.ts`: `muhurBas(eserId, gun)`, `muhurlu(eserId)`, `MUHUR_YARICAP = 150`;
  `konumdanKontrol(eser, konum)` → `{ yakin: boolean, mesafe }` (rota.ts `mesafe` kullanılır).
- [ ] `src/features/muhur/BuradayimDugmesi.tsx`: `navigator.geolocation.getCurrentPosition` bir kez;
  durumlar: soruluyor, yakın (mühür basıldı), uzak (mesafe metni), izin yok, desteklenmiyor.
- [ ] Arşiv eser sayfası ve rota durağı (konum yaklaşık değilse); Defter pulunda "orada bulundum".
- [ ] Test: mesafe eşiği; konum saklanmaz; yaklaşık eserde düğme yok; ret mesajı; axe.

---

## Self-review

Spec kapsamı: B arayüz (B4), uç ve denetim (B2-B3), korpus (B1), anahtarsız davranış (B3-B4),
gizlilik (B2 temizle, B3 log yok), test (B1-B4); H (H1); G (G1). Ad tutarlılığı: `soruMu`,
`bul`, `kisiselVeriTemizle`, `cevapDenetle`, `modelleCevapla`, `sorUclari`, `SorKarti`.
