/**
 * Yönetim uçları — içerik ekleme ve düzenleme.
 *
 * 🔒 GÜVENLİK: Bu eklentideki TÜM uçlar `yoneticiGerekli` kancasıyla korunur.
 * Giriş yapılmamışsa 401, 'admin' rolü yoksa 403 döner. İçerik değiştiren
 * hiçbir uç kimliksiz erişilemez.
 *
 * PDF (KATMAN 04): "Yönetim paneli — eser ekleme/düzenleme, yeni şehir ünitesi
 * tanımlama". Şartname 5.1.1 de bunu zorunlu kılıyor ve "sistem yeni vakıf
 * eserleri eklenmesine uygun kurgulanmalı" diyor.
 *
 * Girdi doğrulama: şartname 5.1.5 "kullanıcı girdilerinin uygun doğrulama ve
 * kontrol mekanizmalarından geçirilmesi beklenmektedir."
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import { eserKaydet, eserSil, eserGetir, type EserGirdisi } from '../repo/eser.ts';
import { uniteKaydet, uniteSil, sehirKaydet, kulliyeKaydet, istatistikler } from '../repo/yol.ts';
import { dersKaydet, dersSil, type DersGirdisi } from '../repo/ders.ts';
import { yoneticiGerekli } from '../auth/koruma.ts';
import type { EgzersizTipi } from '../../shared/types.ts';

const GECERLI_TIPLER: EgzersizTipi[] = ['eslestir', 'sirala', 'bosluk-doldur', 'eser-tani'];
const GECERLI_GELIR_DURUMLARI = ['belgeli', 'belge-bulunamadi'];
/** Vakfiye belgelerindeki iki taraf: para nereden gelir / nereye gider. */
const GECERLI_GELIR_TIPLERI = ['gelir', 'gider'];

class DogrulamaHatasi extends Error {}

function zorunlu(deger: unknown, alan: string): string {
  if (typeof deger !== 'string' || deger.trim() === '') {
    throw new DogrulamaHatasi(`"${alan}" alanı zorunludur.`);
  }
  return deger.trim();
}

function sayi(deger: unknown, alan: string): number {
  const n = typeof deger === 'string' ? Number(deger) : deger;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new DogrulamaHatasi(`"${alan}" sayı olmalıdır.`);
  }
  return n;
}

function hataYanit(cevap: FastifyReply, hata: unknown) {
  if (hata instanceof DogrulamaHatasi) {
    return cevap.code(400).send({ hata: hata.message });
  }
  const mesaj = hata instanceof Error ? hata.message : String(hata);
  // Benzersizlik / yabancı anahtar ihlalleri kullanıcıya anlamlı dönmeli.
  if (mesaj.includes('duplicate key')) {
    return cevap.code(409).send({ hata: 'Bu kayıt zaten var (kimlik veya sıra çakışması).' });
  }
  if (mesaj.includes('foreign key')) {
    return cevap.code(400).send({ hata: 'İlişkili kayıt bulunamadı (şehir/ünite/eser).' });
  }
  return cevap.code(500).send({ hata: 'Sunucu hatası', detay: mesaj });
}

export async function yonetimUclari(app: FastifyInstance): Promise<void> {
  // 🔒 Bu eklentideki tüm uçlar yönetici oturumu ister. Tek satırda, tüm
  // mevcut ve gelecekteki yönetim uçlarını kapsar — uç bazında unutma riski yok.
  app.addHook('preHandler', yoneticiGerekli);

  app.get('/api/yonetim/istatistik', async () => istatistikler());

  // --- Şehir ---------------------------------------------------------------
  app.post('/api/yonetim/sehirler', async (istek, cevap) => {
    try {
      const g = istek.body as Record<string, unknown>;
      const sonuc = await sehirKaydet({
        id: zorunlu(g.id, 'id'),
        ad: zorunlu(g.ad, 'ad'),
        sira: sayi(g.sira, 'sira'),
        aktif: g.aktif === undefined ? true : Boolean(g.aktif),
      });
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  // --- Külliye -------------------------------------------------------------
  app.post('/api/yonetim/kulliyeler', async (istek, cevap) => {
    try {
      const g = istek.body as Record<string, unknown>;
      await kulliyeKaydet({
        id: zorunlu(g.id, 'id'),
        ad: zorunlu(g.ad, 'ad'),
        sehirId: zorunlu(g.sehirId, 'sehirId'),
        bani: (g.bani as string) ?? null,
        aciklama: (g.aciklama as string) ?? null,
      });
      return cevap.code(201).send({ tamam: true });
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  // --- Ünite ---------------------------------------------------------------
  app.post('/api/yonetim/uniteler', async (istek, cevap) => {
    try {
      const g = istek.body as Record<string, unknown>;
      const sonuc = await uniteKaydet({
        id: zorunlu(g.id, 'id'),
        sehirId: zorunlu(g.sehirId, 'sehirId'),
        ad: zorunlu(g.ad, 'ad'),
        sira: sayi(g.sira, 'sira'),
        aciklama: (g.aciklama as string) ?? null,
      });
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  app.delete('/api/yonetim/uniteler/:id', async (istek, cevap) => {
    try {
      const { id } = istek.params as { id: string };
      const silindi = await uniteSil(id);
      if (!silindi) return cevap.code(404).send({ hata: 'Ünite bulunamadı' });
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  // --- Eser ----------------------------------------------------------------
  app.post('/api/yonetim/eserler', async (istek, cevap) => {
    try {
      const girdi = eserGirdisiDogrula(istek.body as Record<string, unknown>);
      const sonuc = await eserKaydet(girdi);
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  app.put('/api/yonetim/eserler/:id', async (istek, cevap) => {
    try {
      const { id } = istek.params as { id: string };
      if (!(await eserGetir(id))) return cevap.code(404).send({ hata: 'Eser bulunamadı' });
      const girdi = eserGirdisiDogrula({ ...(istek.body as object), id });
      return await eserKaydet(girdi);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  app.delete('/api/yonetim/eserler/:id', async (istek, cevap) => {
    try {
      const { id } = istek.params as { id: string };
      const silindi = await eserSil(id);
      if (!silindi) return cevap.code(404).send({ hata: 'Eser bulunamadı' });
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  // --- Ders ----------------------------------------------------------------
  app.post('/api/yonetim/dersler', async (istek, cevap) => {
    try {
      const girdi = dersGirdisiDogrula(istek.body as Record<string, unknown>);
      const sonuc = await dersKaydet(girdi);
      return cevap.code(201).send(sonuc);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  app.put('/api/yonetim/dersler/:id', async (istek, cevap) => {
    try {
      const { id } = istek.params as { id: string };
      const girdi = dersGirdisiDogrula({ ...(istek.body as object), id });
      return await dersKaydet(girdi);
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });

  app.delete('/api/yonetim/dersler/:id', async (istek, cevap) => {
    try {
      const { id } = istek.params as { id: string };
      const silindi = await dersSil(id);
      if (!silindi) return cevap.code(404).send({ hata: 'Ders bulunamadı' });
      return { tamam: true };
    } catch (hata) {
      return hataYanit(cevap, hata);
    }
  });
}

function eserGirdisiDogrula(g: Record<string, unknown>): EserGirdisi {
  const durum = g.gelirDagilimiDurumu;
  if (durum !== undefined && !GECERLI_GELIR_DURUMLARI.includes(durum as string)) {
    throw new DogrulamaHatasi(
      `"gelirDagilimiDurumu" şunlardan biri olmalı: ${GECERLI_GELIR_DURUMLARI.join(', ')}`,
    );
  }

  const hamKalemler = Array.isArray(g.gelirKalemleri) ? g.gelirKalemleri : [];
  const gelirKalemleri = hamKalemler.map((k, i) => {
    const kalem = k as Record<string, unknown>;
    const yuzde = kalem.yuzde;
    if (yuzde !== null && yuzde !== undefined) {
      const n = Number(yuzde);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new DogrulamaHatasi(`Gelir kalemi #${i + 1}: yüzde 0-100 arasında olmalıdır.`);
      }
    }

    // GELİR/GİDER AYRIMI — vakfiye belgeleri "para nereden geliyor" (`gelir`)
    // ile "para nereye gidiyor" (`gider`) ayrı kaydeder; ikisi ayrı ayrı %100
    // eder. Bu alan doğrulanmazsa sessizce düşer ve Röntgeni çubukları bozulur.
    const tipHam = kalem.tip;
    if (tipHam !== null && tipHam !== undefined && !GECERLI_GELIR_TIPLERI.includes(tipHam as string)) {
      throw new DogrulamaHatasi(
        `Gelir kalemi #${i + 1}: "tip" şunlardan biri olmalı: ${GECERLI_GELIR_TIPLERI.join(', ')}`,
      );
    }

    return {
      kalem: zorunlu(kalem.kalem, `gelirKalemleri[${i}].kalem`),
      yuzde: yuzde === null || yuzde === undefined ? null : Number(yuzde),
      tip: tipHam === null || tipHam === undefined ? null : (tipHam as 'gelir' | 'gider'),
      kaynak: (kalem.kaynak as string) ?? null,
    };
  });

  const koordinatHam = g.koordinat as { lat?: unknown; lng?: unknown } | null | undefined;
  const koordinat =
    koordinatHam && koordinatHam.lat !== undefined && koordinatHam.lng !== undefined
      ? { lat: sayi(koordinatHam.lat, 'koordinat.lat'), lng: sayi(koordinatHam.lng, 'koordinat.lng') }
      : null;

  return {
    id: zorunlu(g.id, 'id'),
    ad: zorunlu(g.ad, 'ad'),
    adEn: (g.adEn as string) ?? null,
    sehirId: zorunlu(g.sehirId, 'sehirId'),
    kulliyeId: (g.kulliyeId as string) ?? null,
    tur: zorunlu(g.tur, 'tur'),
    ilce: (g.ilce as string) ?? null,
    koordinat,
    bani: (g.bani as string) ?? null,
    baniDonem: (g.baniDonem as string) ?? null,
    yapimYili: (g.yapimYili as string) ?? null,
    vakfiyeAmaci: (g.vakfiyeAmaci as string) ?? null,
    hizmet: (g.hizmet as string) ?? null,
    bugunNeOldu: (g.bugunNeOldu as string) ?? null,
    // Bilgi Notu veri alanı: "tarihçe, Türkçe ve İngilizce metinler"
    tarihce: (g.tarihce as string) ?? null,
    tarihceEn: (g.tarihceEn as string) ?? null,
    gelirDagilimiDurumu: durum as EserGirdisi['gelirDagilimiDurumu'],
    arsivNo: (g.arsivNo as string) ?? null,
    kaynaklar: Array.isArray(g.kaynaklar) ? (g.kaynaklar as EserGirdisi['kaynaklar']) : [],
    dogrulamaNotu: (g.dogrulamaNotu as string) ?? null,
    yayinda: g.yayinda === undefined ? false : Boolean(g.yayinda),
    gelirKalemleri,
  };
}

function dersGirdisiDogrula(g: Record<string, unknown>): DersGirdisi {
  for (const adim of ['merak', 'baglam', 'perspektif', 'yansima'] as const) {
    const deger = g[adim];
    if (!deger || typeof deger !== 'object') {
      throw new DogrulamaHatasi(`"${adim}" adımı zorunludur.`);
    }
  }

  const hamEgzersizler = Array.isArray(g.egzersizler) ? g.egzersizler : [];
  if (hamEgzersizler.length === 0) {
    throw new DogrulamaHatasi('En az bir egzersiz gereklidir (04 · Geri çağırma adımı).');
  }

  const egzersizler = hamEgzersizler.map((e, i) => {
    const eg = e as Record<string, unknown>;
    const tip = eg.tip as EgzersizTipi;
    if (!GECERLI_TIPLER.includes(tip)) {
      throw new DogrulamaHatasi(
        `Egzersiz #${i + 1}: tip şunlardan biri olmalı: ${GECERLI_TIPLER.join(', ')}`,
      );
    }
    if (!eg.veri || typeof eg.veri !== 'object') {
      throw new DogrulamaHatasi(`Egzersiz #${i + 1}: "veri" zorunludur.`);
    }
    return {
      id: zorunlu(eg.id, `egzersizler[${i}].id`),
      tip,
      veri: eg.veri as DersGirdisi['egzersizler'][number]['veri'],
      kaynak: (eg.kaynak as string) ?? null,
    };
  });

  return {
    id: zorunlu(g.id, 'id'),
    uniteId: zorunlu(g.uniteId, 'uniteId'),
    eserId: zorunlu(g.eserId, 'eserId'),
    sira: sayi(g.sira, 'sira'),
    merak: g.merak as DersGirdisi['merak'],
    baglam: g.baglam as DersGirdisi['baglam'],
    perspektif: g.perspektif as DersGirdisi['perspektif'],
    yansima: g.yansima as DersGirdisi['yansima'],
    egzersizler,
  };
}
