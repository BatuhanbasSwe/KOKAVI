/**
 * Yönetim işlem günlüğü (write log).
 *
 * SORUN
 * Vercel'de API her sunucu örneğinde ayrı bir geçici dosya sistemiyle çalışır.
 * Yönetim yazmaları (eser/ünite/ders/kullanıcı/sınıf) yalnızca o örneğin
 * PGlite kopyasında kalırsa, sonraki istek başka bir örneğe düştüğünde içerik
 * görünmez ve öğretmen sınıfı açılamaz. Oturumlar da aynı nedenle kaybolur —
 * o kısım `server/auth/oturum.ts` içindeki Redis oturum deposunda çözülür.
 *
 * ÇÖZÜM
 * Her yönetim yazması başarılı olduktan sonra Redis'teki bir listeye işlem
 * olarak eklenir. Her sunucu örneği, her istekten önce listedeki yeni
 * işlemleri kendi PGlite kopyasına uygular. Böylece:
 *   · eser ekleme/düzenleme/silme tüm örneklerde görünür,
 *   · oluşturulan kullanıcı her örnekte giriş yapabilir,
 *   · oluşturulan sınıf kodu her örnekte açılır,
 *   · sınıf sayaçları örnekler arasında birleşir.
 *
 * Redis yoksa (yerel geliştirme, testler) bu modül hiçbir şey yapmaz: sunucu
 * eskisi gibi yalnızca PGlite ile çalışır.
 */
import { randomUUID } from 'node:crypto';
import { redisAyari, redisKomut } from '../redis.ts';
import { eserKaydet, eserSil, type EserGirdisi } from '../repo/eser.ts';
import { sehirKaydet, uniteKaydet, uniteSil, kulliyeKaydet } from '../repo/yol.ts';
import { dersKaydet, dersSil, type DersGirdisi } from '../repo/ders.ts';
import { sinifEkle, sinifDurumDegistir, tamamlamaKaydet, ogrenciEkle, ogrenciSil } from '../repo/sinif.ts';
import {
  kullaniciDurumDegistir,
  kullaniciEkleHashli,
  kullaniciParolaHashGuncelle,
  type Rol,
} from '../auth/oturum.ts';

/** Günlüğe yazılabilecek işlem türleri. */
export type Islem =
  | { id: string; t: 'eser-kaydet'; d: EserGirdisi }
  | { id: string; t: 'eser-sil'; d: { id: string } }
  | { id: string; t: 'unite-kaydet'; d: Parameters<typeof uniteKaydet>[0] }
  | { id: string; t: 'unite-sil'; d: { id: string } }
  | { id: string; t: 'sehir-kaydet'; d: Parameters<typeof sehirKaydet>[0] }
  | { id: string; t: 'kulliye-kaydet'; d: Parameters<typeof kulliyeKaydet>[0] }
  | { id: string; t: 'ders-kaydet'; d: DersGirdisi }
  | { id: string; t: 'ders-sil'; d: { id: string } }
  | {
      id: string;
      t: 'kullanici-ekle';
      d: { id: string; email: string; ad: string; parolaHash: string; rol: Rol };
    }
  | { id: string; t: 'kullanici-durum'; d: { id: string; aktif: boolean } }
  | { id: string; t: 'kullanici-parola'; d: { id: string; parolaHash: string } }
  | { id: string; t: 'sinif-ekle'; d: { kod: string; ogretmenId: string; ad: string } }
  | { id: string; t: 'sinif-durum'; d: { kod: string; aktif: boolean } }
  | { id: string; t: 'sinif-tamamla'; d: { kod: string; dersId: string; ogrenciId?: string | null } }
  | { id: string; t: 'sinif-ogrenci-ekle'; d: { kod: string; ogrenciId: string; takmaAd: string } }
  | { id: string; t: 'sinif-ogrenci-sil'; d: { kod: string; ogrenciId: string } };

/** `id` sunucu tarafından üretilir; çağıran yalnızca tür + veri verir. */
type Dagit<T> = T extends unknown ? Omit<T, 'id'> : never;
export type IslemGirdisi = Dagit<Islem>;

/** Günlük deposu — Redis (üretim) veya bellek (test). */
export interface GunlukDeposu {
  ekle(kayit: string): Promise<void>;
  oku(sira: number): Promise<string[]>;
}

const ANAHTAR = 'kokavi:yonetim:gunluk';

/** Üretim deposu: Upstash Redis REST. Testlerde sahte fetch ile doğrulanır. */
export class RedisGunlukDeposu implements GunlukDeposu {
  async ekle(kayit: string): Promise<void> {
    await redisKomut('RPUSH', ANAHTAR, kayit);
  }

  async oku(sira: number): Promise<string[]> {
    const kayitlar = await redisKomut<string[]>('LRANGE', ANAHTAR, sira, -1);
    return Array.isArray(kayitlar) ? kayitlar : [];
  }
}

/** Testler için: iki `Gunluk` örneği paylaşırsa iki sunucu örneğini taklit eder. */
export class BellekGunlukDeposu implements GunlukDeposu {
  readonly kayitlar: string[] = [];

  sifirla(): void {
    this.kayitlar.length = 0;
  }

  async ekle(kayit: string): Promise<void> {
    this.kayitlar.push(kayit);
  }

  async oku(sira: number): Promise<string[]> {
    return this.kayitlar.slice(sira);
  }
}

/** Tek bir işlemi yerel veritabanına uygular. */
export async function islemUygula(islem: Islem): Promise<void> {
  switch (islem.t) {
    case 'eser-kaydet':
      await eserKaydet(islem.d);
      return;
    case 'eser-sil':
      await eserSil(islem.d.id);
      return;
    case 'unite-kaydet':
      await uniteKaydet(islem.d);
      return;
    case 'unite-sil':
      await uniteSil(islem.d.id);
      return;
    case 'sehir-kaydet':
      await sehirKaydet(islem.d);
      return;
    case 'kulliye-kaydet':
      await kulliyeKaydet(islem.d);
      return;
    case 'ders-kaydet':
      await dersKaydet(islem.d);
      return;
    case 'ders-sil':
      await dersSil(islem.d.id);
      return;
    case 'kullanici-ekle':
      await kullaniciEkleHashli(islem.d);
      return;
    case 'kullanici-durum':
      await kullaniciDurumDegistir(islem.d.id, islem.d.aktif);
      return;
    case 'kullanici-parola':
      await kullaniciParolaHashGuncelle(islem.d.id, islem.d.parolaHash);
      return;
    case 'sinif-ekle':
      await sinifEkle(islem.d.kod, islem.d.ogretmenId, islem.d.ad);
      return;
    case 'sinif-durum':
      await sinifDurumDegistir(islem.d.kod, islem.d.aktif);
      return;
    case 'sinif-tamamla':
      await tamamlamaKaydet(islem.d.kod, islem.d.dersId, islem.d.ogrenciId);
      return;
    case 'sinif-ogrenci-ekle':
      await ogrenciEkle(islem.d.kod, islem.d.ogrenciId, islem.d.takmaAd);
      return;
    case 'sinif-ogrenci-sil':
      await ogrenciSil(islem.d.kod, islem.d.ogrenciId);
      return;
  }
}

/**
 * Bir sunucu örneğinin günlük görünümü.
 *
 * `sonSira`: bu örneğin yerel veritabanına uyguladığı işlem sayısı.
 * `uygulanan`: aynı işlemin iki kez uygulanmaması için işlem kimlikleri.
 * `kendi`: bu örneğin yazdığı işlemler — yerel veritabanına zaten doğrudan
 * yazıldıkları için senkron sırasında TEKRAR uygulanmazlar.
 */
export class Gunluk {
  private sonSira = 0;
  private readonly uygulanan = new Set<string>();
  private readonly kendi = new Set<string>();

  constructor(private readonly depo: GunlukDeposu) {}

  /** Uygulanmış işlem sayısı (test ve sağlık kontrolü için). */
  get sira(): number {
    return this.sonSira;
  }

  /** Yeni işlemi günlüğe ekler. Depo yoksa/başarısızsa `false`. */
  async yaz(islem: IslemGirdisi): Promise<boolean> {
    const kayit = { ...islem, id: randomUUID() } as Islem;
    this.kendi.add(kayit.id);
    try {
      await this.depo.ekle(JSON.stringify(kayit));
      return true;
    } catch (hata) {
      this.kendi.delete(kayit.id);
      console.warn('[yonetim-gunlugu] işlem yazılamadı:', hata);
      return false;
    }
  }

  /**
   * Günlükteki yeni işlemleri yerel veritabanına uygular.
   * Döndürülen sayı: bu çağrıda uygulanan işlem adedi.
   */
  async senkronize(): Promise<number> {
    let uygulananSayi = 0;
    const kayitlar = await this.depo.oku(this.sonSira);

    for (const ham of kayitlar) {
      this.sonSira += 1;

      let islem: Islem;
      try {
        islem = JSON.parse(ham) as Islem;
      } catch {
        // Bozuk kayıt: atla, diğer işlemleri engelleme.
        continue;
      }

      if (this.uygulanan.has(islem.id) || this.kendi.has(islem.id)) continue;

      try {
        await islemUygula(islem);
      } catch (hata) {
        // Tek işlem başarısız olsa da diğerlerini uygulamaya devam et.
        console.warn(`[yonetim-gunlugu] işlem uygulanamadı (${islem.t}):`, hata);
      }
      this.uygulanan.add(islem.id);
      uygulananSayi += 1;
    }

    return uygulananSayi;
  }
}

// ---------------------------------------------------------------------------
// Süreç geneli kullanım
// ---------------------------------------------------------------------------

let aktif: Gunluk | null = null;

/** Redis yapılandırılmışsa paylaşılan günlüğü döner; yoksa `null`. */
export function gunlukAl(): Gunluk | null {
  if (!redisAyari()) return null;
  aktif ??= new Gunluk(new RedisGunlukDeposu());
  return aktif;
}

/** Yönetim yazmaları örnekler arasında paylaşılıyor mu? */
export function gunlukEtkinMi(): boolean {
  return redisAyari() !== null;
}

/** Yönetim yazmasını günlüğe ekler (Redis yoksa sessizce atlar). */
export async function gunlukYaz(islem: IslemGirdisi): Promise<void> {
  const gunluk = gunlukAl();
  if (!gunluk) return;
  await gunluk.yaz(islem);
}

/** İstek işlenmeden önce günlükteki yeni işlemleri uygular. */
export async function gunlukSenkronize(): Promise<void> {
  const gunluk = gunlukAl();
  if (!gunluk) return;
  try {
    await gunluk.senkronize();
  } catch (hata) {
    // Redis erişilemezse yerel veriyle devam et: kullanıcıyı kilitleme.
    console.warn('[yonetim-gunlugu] senkronizasyon hatası:', hata);
  }
}
