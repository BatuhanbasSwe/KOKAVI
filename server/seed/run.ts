/**
 * Seed — araştırma ve içerik dosyalarını veritabanına yükler.
 *
 * Girdiler:
 *   data/research/*.json   → eser künyeleri (bani, vakfiye amacı, kaynaklar…)
 *   data/content/*.json    → beş adımlı ders içerikleri (araştırmadan üretilir)
 *
 * Kullanım: npm run seed
 *
 * İdempotent: her çalıştırmada şema yeniden kurulur ve içerik baştan yazılır.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { semaKur, veritabaniAl, baglantiKapat, authSemaGarantiEt } from '../db/index.ts';
import { eserKaydet, fotograflariKaydet, type EserGirdisi } from '../repo/eser.ts';
import { sehirKaydet, uniteKaydet } from '../repo/yol.ts';
import { dersKaydet, type DersGirdisi } from '../repo/ders.ts';
import { kullaniciOlustur, kullanicilariListele } from '../auth/oturum.ts';
import { sergiKaydet, sergiyiSehreBagla } from '../repo/sergi.ts';
import { randomBytes } from 'node:crypto';
import type { GelirDurumu, GelirTipi, Kaynak } from '../../shared/types.ts';
import { slug, eserKimligi } from '../../shared/slug.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KOK = resolve(__dirname, '..', '..');
const ARASTIRMA_DIZINI = join(KOK, 'data', 'research');
const ICERIK_DIZINI = join(KOK, 'data', 'content');
const SERGI_DOSYASI = join(KOK, 'data', 'sergiler.json');
const TARIHCE_DOSYASI = join(KOK, 'data', 'tarihce.json');
/** `scripts/gorsel-ders.py` üretir: {eserId: {sayi, kaynak}}; dosyalar public/gorseller/ altında. */
const GORSEL_DOSYASI = join(KOK, 'data', 'gorseller.json');

/**
 * Tarihçe ve İngilizce metinleri yükler.
 *
 * Bilgi Notu: "eserlerin tarihçeleri **Türkçe ve İngilizce** olarak
 * hazırlanmakta" ve veri alanları arasında "tarihçe, Türkçe ve İngilizce
 * metinler" sayılıyor. Envanter kitapları iki dilli basılır.
 */
async function tarihceleriYukle(): Promise<
  Map<string, { adEn?: string; tarihce?: string; tarihceEn?: string }>
> {
  const harita = new Map<string, { adEn?: string; tarihce?: string; tarihceEn?: string }>();
  if (!existsSync(TARIHCE_DOSYASI)) return harita;

  try {
    const veri = await jsonOku<{
      tarihceler?: { eserId: string; adEn?: string; tarihce?: string; tarihceEn?: string }[];
    }>(TARIHCE_DOSYASI);

    for (const t of veri.tarihceler ?? []) {
      harita.set(t.eserId, { adEn: t.adEn, tarihce: t.tarihce, tarihceEn: t.tarihceEn });
    }
    console.log(`  · tarihce.json: ${harita.size} tarihçe (TR+EN)`);
  } catch (hata) {
    console.warn(`  ! tarihce.json okunamadı: ${hata instanceof Error ? hata.message : hata}`);
  }
  return harita;
}

// ---------------------------------------------------------------------------
// Şehir ve ünite kurgusu (PDF yol görseliyle uyumlu)
// ---------------------------------------------------------------------------

/** Şehir sırası: Bursa pilot, ardından envanter hattı. */
const SEHIR_SIRASI: Record<string, number> = {
  Bursa: 1,
  Konya: 2,
  Kütahya: 3,
  İzmir: 4,
};

/** Bursa üç üniteye bölünür (PDF: "Bursa pilotu. 80 eser, 3 ünite"). */
const BURSA_UNITE_SAYISI = 3;

interface ArastirmaEseri {
  id?: string;
  ad: string;
  sehir: string;
  /** Araştırma dosyasının `tema` alanından taşınır; ünite adını verir. */
  tema?: string;
  ilce?: string | null;
  tur: string;
  koordinat?: { lat: number; lng: number } | null;
  bani?: string | null;
  baniDonem?: string | null;
  yapimYili?: string | null;
  vakfiyeAmaci?: string | null;
  hizmet?: string | null;
  bugunNeOldu?: string | null;
  kulliye?: string | null;
  gelirDagilimi?: {
    kalem: string;
    yuzde: number | null;
    tip?: string | null;
    kaynak?: string | null;
  }[];
  gelirDagilimiDurumu?: GelirDurumu;
  arsivNo?: string | null;
  kaynaklar?: Kaynak[];
  dogrulamaNotu?: string | null;
}

interface IcerikDersi {
  eserId: string;
  merak: DersGirdisi['merak'];
  baglam: DersGirdisi['baglam'];
  perspektif: DersGirdisi['perspektif'];
  yansima: DersGirdisi['yansima'];
  egzersizler: DersGirdisi['egzersizler'];
}

/** Türkçe metni kimlik parçasına çevirir — tek kaynak: `shared/slug.ts`. */
export { slug } from '../../shared/slug.ts';

async function jsonOku<T>(yol: string): Promise<T> {
  const ham = await readFile(yol, 'utf8');
  return JSON.parse(ham) as T;
}

async function arastirmalariYukle(): Promise<ArastirmaEseri[]> {
  if (!existsSync(ARASTIRMA_DIZINI)) return [];
  // Sıralı okunur: Bursa üniteleri dosya + kayıt sırasıyla bölündüğü için
  // readdir sırasına (işletim sistemine göre değişir) güvenilmez.
  const dosyalar = (await readdir(ARASTIRMA_DIZINI)).filter((f) => f.endsWith('.json')).sort();
  const hepsi: ArastirmaEseri[] = [];

  for (const dosya of dosyalar) {
    try {
      const veri = await jsonOku<{ eserler?: ArastirmaEseri[]; tema?: string }>(
        join(ARASTIRMA_DIZINI, dosya),
      );
      if (Array.isArray(veri.eserler)) {
        // Dosya düzeyindeki ünite teması (ör. "İbadet ve İlim") her esere taşınır.
        hepsi.push(...veri.eserler.map((e) => (veri.tema ? { ...e, tema: veri.tema } : e)));
        console.log(`  · ${dosya}: ${veri.eserler.length} eser`);
      }
    } catch (hata) {
      console.warn(`  ! ${dosya} okunamadı: ${hata instanceof Error ? hata.message : hata}`);
    }
  }
  return hepsi;
}

/**
 * Gelir kalemlerini normalize eder ve doğrular.
 *
 * ⚠️ İKİ AYRI KAVRAM: Vakfiye belgeleri hem "para nereden geliyor" (`gelir`:
 * köy mahsulü, han kirası, öşür) hem "para nereye gidiyor" (`gider`: personel
 * maaşı, bakım, burs) kaydeder. İkisi aynı paranın iki tarafıdır ve
 * **ayrı ayrı** %100 eder.
 *
 * Bu ayrım yapılmazsa toplam %200 çıkar ve Vakıf Röntgeni çubukları bozulur.
 * (Gerçekten yaşandı: Habib-i Neccar verisi ilk turda %200 toplam veriyordu.)
 *
 * KURAL: Her `tip` grubu KENDİ İÇİNDE %100'ü aşarsa o grubun oranları
 * `null`'lanır — kalemler ve açıklamalar korunur, ama yanıltıcı çubuk çizilmez.
 * Uydurma düzeltme YAPILMAZ.
 */
function gelirKalemleriniNormalize(
  kalemler: { kalem: string; yuzde: number | null; tip?: string | null; kaynak?: string | null }[],
  eserAdi: string,
): { kalem: string; yuzde: number | null; tip: GelirTipi | null; kaynak?: string | null }[] {
  const gecerliTip = (t: string | null | undefined): GelirTipi | null =>
    t === 'gelir' || t === 'gider' ? t : null;

  // Tip gruplarına göre toplam
  const toplamlar = new Map<string, number>();
  for (const k of kalemler) {
    const anahtar = gecerliTip(k.tip) ?? 'belirsiz';
    toplamlar.set(anahtar, (toplamlar.get(anahtar) ?? 0) + (k.yuzde ?? 0));
  }

  const tasanGruplar = new Set<string>();
  for (const [grup, toplam] of toplamlar) {
    if (toplam > 100.5) {
      tasanGruplar.add(grup);
      console.warn(
        `  ! ${eserAdi}: "${grup}" kalemleri toplamı %${toplam.toFixed(1)} — kaynak tutarsız. ` +
          `Bu grubun oranları null'landı, kalemler korundu.`,
      );
    }
  }

  return kalemler.map((k) => {
    const tip = gecerliTip(k.tip);
    const grup = tip ?? 'belirsiz';
    return {
      kalem: k.kalem,
      yuzde: tasanGruplar.has(grup) ? null : k.yuzde,
      tip,
      kaynak: k.kaynak ?? null,
    };
  });
}

/**
 * Eser türünü rozet ve filtre olarak kullanılabilir kısa biçime indirger.
 *
 * Araştırma kayıtlarında tür ayrıntılı olabilir:
 *   "Cami ve külliye (cami, medrese, şadırvan, türbeler)"
 *   "Türbe ve tekke/zaviye (cami-türbe, çilehane ve medrese hücreleri)"
 *
 * Bu değerler arayüzde hem rozettir hem **filtre kategorisidir**. Uzun ve
 * bileşik bırakılırsa filtre listesi onlarca anlamsız kategoriye bölünür.
 * Bu yüzden ilk tür adı alınır: "Cami", "Medrese", "Türbe", "Han", "Çeşme".
 *
 * **Tam değer `data/research/` altında arşivde korunur** — burada yalnızca
 * gösterim/filtre biçimi sadeleştirilir.
 */
function turNormalize(tur: string): string {
  const ilkParca = tur.split(/[(—–:/]|\s+ve\s+/i)[0]?.trim() ?? tur.trim();
  return ilkParca.length > 0 ? ilkParca : tur.trim();
}

async function icerikleriYukle(): Promise<Map<string, IcerikDersi>> {
  const harita = new Map<string, IcerikDersi>();
  if (!existsSync(ICERIK_DIZINI)) return harita;

  const dosyalar = (await readdir(ICERIK_DIZINI)).filter((f) => f.endsWith('.json')).sort();
  for (const dosya of dosyalar) {
    try {
      const veri = await jsonOku<{ dersler?: IcerikDersi[] }>(join(ICERIK_DIZINI, dosya));
      for (const ders of veri.dersler ?? []) {
        harita.set(ders.eserId, ders);
      }
      console.log(`  · ${dosya}: ${veri.dersler?.length ?? 0} ders içeriği`);
    } catch (hata) {
      console.warn(`  ! ${dosya} okunamadı: ${hata instanceof Error ? hata.message : hata}`);
    }
  }
  return harita;
}

async function main() {
  console.log('Kök Avı — seed başlıyor\n');

  console.log('[1/5] Şema kuruluyor…');
  // ÖNEMLİ: Depo katmanının KENDİ bağlantısını kullan. Ayrı bir PGlite örneği
  // açmak aynı dizinde iki bağlantı yaratır ve yazılan veri görünmez olur.
  await veritabaniAl();
  await semaKur();
  // Auth tabloları içerikten bağımsız ve kalıcıdır — seed onları düşürmez.
  await authSemaGarantiEt();

  console.log('[2/5] Araştırma dosyaları okunuyor…');
  const arastirmaEserleri = await arastirmalariYukle();
  if (arastirmaEserleri.length === 0) {
    console.error('\nHATA: data/research/ içinde eser bulunamadı.');
    await baglantiKapat();
    process.exit(1);
  }

  console.log('\n[3/5] İçerik dosyaları okunuyor…');
  const icerikler = await icerikleriYukle();

  console.log('\n[3b/7] Tarihçeler (TR + EN) okunuyor…');
  const tarihceler = await tarihceleriYukle();
  const gorseller = existsSync(GORSEL_DOSYASI)
    ? await jsonOku<Record<string, { sayi: number; kaynak: string }>>(GORSEL_DOSYASI)
    : {};
  let fotografSayisi = 0;

  console.log('\n[4/5] Şehirler ve üniteler oluşturuluyor…');

  // Eserleri şehre göre grupla
  const sehreGore = new Map<string, ArastirmaEseri[]>();
  for (const eser of arastirmaEserleri) {
    const sehir = eser.sehir?.trim() || 'Bilinmeyen';
    sehreGore.set(sehir, [...(sehreGore.get(sehir) ?? []), eser]);
  }

  const sehirIdleri = new Map<string, string>();
  for (const sehirAdi of [...sehreGore.keys()].sort(
    (a, b) => (SEHIR_SIRASI[a] ?? 99) - (SEHIR_SIRASI[b] ?? 99),
  )) {
    const id = slug(sehirAdi);
    sehirIdleri.set(sehirAdi, id);
    await sehirKaydet({ id, ad: sehirAdi, sira: SEHIR_SIRASI[sehirAdi] ?? 99, aktif: true });
  }
  console.log(`  · ${sehirIdleri.size} şehir`);

  // Üniteler: Bursa 3'e bölünür, diğer şehirler tek ünite
  const uniteIdleri = new Map<string, string[]>(); // sehirAdi -> uniteId listesi
  for (const [sehirAdi, eserler] of sehreGore) {
    const sehirId = sehirIdleri.get(sehirAdi)!;
    const uniteSayisi = sehirAdi === 'Bursa' ? BURSA_UNITE_SAYISI : 1;
    const bolumBoyu = Math.ceil(eserler.length / uniteSayisi);
    const idler: string[] = [];

    for (let i = 0; i < uniteSayisi; i++) {
      const uniteId = `${sehirId}-u${i + 1}`;
      // Ünitenin teması, o üniteye düşen ilk eserin araştırma dosyasından gelir.
      const tema = eserler[i * bolumBoyu]?.tema;
      await uniteKaydet({
        id: uniteId,
        sehirId,
        ad: tema ? `Ünite ${i + 1}: ${tema}` : `${sehirAdi} Ünite ${i + 1}`,
        sira: i + 1,
        aciklama: tema
          ? `${sehirAdi} · ${tema}`
          : uniteSayisi === 1
            ? `${sehirAdi} vakıf eserleri`
            : `${sehirAdi} vakıf eserleri · bölüm ${i + 1}/${uniteSayisi}`,
      });
      idler.push(uniteId);
    }
    uniteIdleri.set(sehirAdi, idler);
  }
  console.log(`  · ${[...uniteIdleri.values()].reduce((t, l) => t + l.length, 0)} ünite`);

  console.log('\n[5/5] Eserler ve dersler yazılıyor…');
  let eserSayisi = 0;
  let dersSayisi = 0;
  const derssiz: string[] = [];

  for (const [sehirAdi, eserler] of sehreGore) {
    const sehirId = sehirIdleri.get(sehirAdi)!;
    const uniteler = uniteIdleri.get(sehirAdi)!;
    const bolumBoyu = Math.ceil(eserler.length / uniteler.length);

    for (const [i, eser] of eserler.entries()) {
      const eserId = eserKimligi(eser);
      const tarihceKaydi = tarihceler.get(eserId);

      const girdi: EserGirdisi = {
        id: eserId,
        ad: eser.ad,
        // Bilgi Notu veri alanı: "Türkçe ve İngilizce metinler"
        adEn: tarihceKaydi?.adEn ?? null,
        tarihce: tarihceKaydi?.tarihce ?? null,
        tarihceEn: tarihceKaydi?.tarihceEn ?? null,
        sehirId,
        tur: turNormalize(eser.tur),
        ilce: eser.ilce ?? null,
        koordinat: eser.koordinat ?? null,
        bani: eser.bani ?? null,
        baniDonem: eser.baniDonem ?? null,
        yapimYili: eser.yapimYili ?? null,
        vakfiyeAmaci: eser.vakfiyeAmaci ?? null,
        hizmet: eser.hizmet ?? null,
        bugunNeOldu: eser.bugunNeOldu ?? null,
        arsivNo: eser.arsivNo ?? null,
        kaynaklar: eser.kaynaklar ?? [],
        dogrulamaNotu: eser.dogrulamaNotu ?? null,
        // PDF: içerik yalnızca ders içeriği varsa yayına girer.
        yayinda: icerikler.has(eserId),
        gelirKalemleri: gelirKalemleriniNormalize(
          (eser.gelirDagilimi ?? []).map((k) => ({
            kalem: k.kalem,
            yuzde: k.yuzde,
            tip: k.tip ?? null,
            kaynak: k.kaynak ?? null,
          })),
          eser.ad,
        ),
      };

      // Gelir durumu: oran varsa belgeli, yoksa açıkça belge-bulunamadi
      girdi.gelirDagilimiDurumu =
        eser.gelirDagilimiDurumu ??
        (girdi.gelirKalemleri!.some((k) => k.yuzde !== null) ? 'belgeli' : 'belge-bulunamadi');

      await eserKaydet(girdi);
      eserSayisi++;

      // Fotoğraflar: Vakıf Katılım envanterlerinden (scripts/gorsel-ders.py).
      const gorsel = gorseller[eserId];
      if (gorsel && gorsel.sayi > 0) {
        const kisa = eser.ad.split(' (')[0]!;
        const kisaEn = tarihceKaydi?.adEn?.split(' (')[0] ?? null;
        await fotograflariKaydet(
          eserId,
          Array.from({ length: gorsel.sayi }, (_, i) => ({
            url: `/gorseller/${eserId}/${i + 1}.webp`,
            altMetin: `${kisa} — fotoğraf ${i + 1}/${gorsel.sayi}`,
            altMetinEn: kisaEn ? `${kisaEn} — photo ${i + 1}/${gorsel.sayi}` : null,
            kaynak: gorsel.kaynak,
            lisans: '© Vakıf Katılım envanter yayını; eğitim amaçlı kullanım',
          })),
        );
        fotografSayisi += gorsel.sayi;
      }

      const icerik = icerikler.get(eserId);
      if (!icerik) {
        derssiz.push(eser.ad);
        continue;
      }

      const uniteId = uniteler[Math.min(Math.floor(i / bolumBoyu), uniteler.length - 1)]!;
      const uniteIciSira = i % bolumBoyu;

      await dersKaydet({
        id: `${uniteId}-d${uniteIciSira + 1}`,
        uniteId,
        eserId,
        sira: uniteIciSira + 1,
        merak: icerik.merak,
        baglam: icerik.baglam,
        perspektif: icerik.perspektif,
        yansima: icerik.yansima,
        egzersizler: icerik.egzersizler.map((e, idx) => ({
          id: `${uniteId}-d${uniteIciSira + 1}-e${idx + 1}`,
          tip: e.tip,
          veri: e.veri,
          kaynak: e.kaynak ?? null,
        })),
      });
      dersSayisi++;
    }
  }

  console.log(`\n  ✓ ${eserSayisi} eser`);
  console.log(`  ✓ ${fotografSayisi} fotoğraf`);
  console.log(`  ✓ ${dersSayisi} ders (yayında)`);
  if (derssiz.length) {
    console.log(`  ! ${derssiz.length} eser ders içeriği olmadığı için yayında değil:`);
    for (const ad of derssiz.slice(0, 10)) console.log(`      - ${ad}`);
    if (derssiz.length > 10) console.log(`      … ve ${derssiz.length - 10} tane daha`);
  }

  // ---------------------------------------------------------------------
  // Sergi bilgileri — Bilgi Notu veri alanı
  // ---------------------------------------------------------------------
  console.log('\n[6/7] Sergi bilgileri yükleniyor…');
  if (existsSync(SERGI_DOSYASI)) {
    const sergiVerisi = await jsonOku<{
      sergiler?: {
        id: string;
        ad: string;
        adEn?: string;
        tarih?: string;
        mekan?: string;
        aciklama?: string;
      }[];
      _baglantilar?: Record<string, string[] | string>;
    }>(SERGI_DOSYASI);

    let baglantiSayisi = 0;
    for (const sergi of sergiVerisi.sergiler ?? []) {
      await sergiKaydet(sergi);

      // Sergiyi ilgili şehirlerdeki yayındaki eserlere bağla
      const sehirler = sergiVerisi._baglantilar?.[sergi.id];
      if (Array.isArray(sehirler)) {
        for (const sehirAdi of sehirler) {
          const sehirId = slug(sehirAdi);
          baglantiSayisi += await sergiyiSehreBagla(sergi.id, sehirId);
        }
      }
    }
    console.log(`  ✓ ${sergiVerisi.sergiler?.length ?? 0} sergi, ${baglantiSayisi} eser bağlantısı`);
  } else {
    console.log('  · data/sergiler.json yok — atlandı');
  }

  // ---------------------------------------------------------------------
  // Yönetici hesabı — sabit varsayılan parola YOK
  // ---------------------------------------------------------------------
  console.log('\n[7/7] Yönetici hesabı kontrol ediliyor…');
  const mevcutKullanicilar = await kullanicilariListele();
  const adminVar = mevcutKullanicilar.some((k) => k.rol === 'admin');

  if (adminVar) {
    console.log(`  · ${mevcutKullanicilar.length} kullanıcı mevcut, yönetici var — dokunulmadı.`);
  } else {
    const eposta = process.env.KOKAVI_ADMIN_EPOSTA?.trim() || 'admin@kokavi.local';
    // Parola verilmediyse RASTGELE üretilir ve yalnızca bu çalıştırmada gösterilir.
    // Sabit bir varsayılan parola, bilinen kimlik bilgisi demek olurdu.
    const sifirdanUretildi = !process.env.KOKAVI_ADMIN_PAROLA;
    const parola =
      process.env.KOKAVI_ADMIN_PAROLA ?? `Kok-${randomBytes(9).toString('base64url')}!7`;

    await kullaniciOlustur({ email: eposta, ad: 'Sistem Yöneticisi', parola, rol: 'admin' });

    console.log('  ✓ Yönetici hesabı oluşturuldu.');
    console.log(`      E-posta : ${eposta}`);
    if (sifirdanUretildi) {
      console.log(`      Parola  : ${parola}`);
      console.log('      ⚠️  Bu parola yalnızca şimdi gösterilir. Hemen not al ve değiştir.');
      console.log('      (Kalıcı parola için: KOKAVI_ADMIN_PAROLA ortam değişkeni)');
    } else {
      console.log('      Parola  : (KOKAVI_ADMIN_PAROLA ortam değişkeninden alındı)');
    }
  }

  await baglantiKapat();
  console.log('\nSeed tamamlandı.');
}

main().catch((hata) => {
  console.error('Seed hatası:', hata);
  process.exit(1);
});
