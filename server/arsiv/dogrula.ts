/**
 * Arşive (Meraklısına) eklenecek kayıtların doğrulanması — saf fonksiyonlar.
 *
 * Panelden iki yolla kayıt gelir:
 *   · JSON dosyasıyla toplu içe aktarma (tek tık)
 *   · tek eser formu (fotoğraf dosyadan seçilir)
 * İkisi de buradan geçer. Kabul edilen JSON biçimleri:
 *   [ {...}, {...} ]                     — kayıt dizisi
 *   { "eserler": [ ... ], "sehir": "…" } — data/research/*.json biçimi
 *
 * Kayıt alanları (araştırma dosyası adlarıyla da gelebilir):
 *   ad*  · il | sehir*  · tur*  · kaynak | kaynaklar[]*  · ilce
 *   paragraflar[] | metin | aciklama | tarihce (+ vakfiyeAmaci, hizmet, bugunNeOldu, tarihceEn)
 *   foto | fotoUrl | fotograflar[0].url  (https adresi, /yol veya data:image/...;base64)
 *   id (yoksa il + ad'dan üretilir) · ders (uygulamadaki eser kimliği)
 *
 * Kaynak ZORUNLU (proje kuralı 5): kaynaksız tarihî bilgi arşive girmez.
 */
import { slug } from '../../shared/slug.ts';

export const AZAMI_KAYIT = 500;
/** data URL karakter sınırı (~1,5 MB görsel). Panel görseli küçültüp ~300 KB'a indirir. */
export const AZAMI_FOTO_KARAKTER = 2_000_000;
const FOTO_DATA_URL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/;

const BILINEN_ILLER: Record<string, string> = { bursa: 'Bursa', konya: 'Konya', hatay: 'Hatay' };

export interface ArsivGirdisi {
  id: string;
  ad: string;
  il: string;
  ilAd: string;
  ilce: string | null;
  tur: string;
  kaynak: string;
  paragraflar: string[];
  /** Dış adres veya site içi yol. */
  fotoUrl: string | null;
  /** Yüklenen dosya (data URL). `undefined` = fotoğrafa dokunma. */
  fotoVeri?: string | null;
  ders: string | null;
}

export class ArsivHatasi extends Error {}

function metin(deger: unknown, azami = 20_000): string | null {
  if (typeof deger !== 'string') return null;
  const t = deger.trim();
  return t ? t.slice(0, azami) : null;
}

/** Fotoğraf değerini sınıflar: data URL → veri, adres/yol → url. */
export function fotoAyikla(deger: unknown): { fotoUrl: string | null; fotoVeri?: string | null } {
  const ham = metin(deger, AZAMI_FOTO_KARAKTER + 1);
  if (!ham) return { fotoUrl: null };
  if (ham.startsWith('data:')) {
    if (ham.length > AZAMI_FOTO_KARAKTER) throw new ArsivHatasi('Fotoğraf çok büyük (en fazla ~1,5 MB).');
    if (!FOTO_DATA_URL.test(ham)) throw new ArsivHatasi('Fotoğraf yalnızca WebP, JPEG veya PNG olabilir.');
    return { fotoUrl: null, fotoVeri: ham };
  }
  if (/^https:\/\/[^\s"'<>]+$/i.test(ham) || /^\/[^\s"'<>]*$/.test(ham)) return { fotoUrl: ham };
  throw new ArsivHatasi('Fotoğraf adresi https:// ile ya da / ile başlamalı.');
}

function paragraflariTopla(g: Record<string, unknown>): string[] {
  if (Array.isArray(g.paragraflar)) {
    return g.paragraflar.map((p) => metin(p)).filter((p): p is string => !!p).slice(0, 60);
  }
  const bol = (s: string | null) => (s ? s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : []);
  const parcalar = [
    ...bol(metin(g.metin) ?? metin(g.aciklama) ?? metin(g.tarihce)),
    ...(metin(g.vakfiyeAmaci) ? [`Vakfiye amacı: ${metin(g.vakfiyeAmaci)}`] : []),
    ...(metin(g.hizmet) ? [`Kimlere hizmet etti: ${metin(g.hizmet)}`] : []),
    ...(metin(g.bugunNeOldu) ? [`Bugün: ${metin(g.bugunNeOldu)}`] : []),
    ...bol(metin(g.tarihceEn)),
  ];
  return parcalar.slice(0, 60);
}

function kaynakMetni(g: Record<string, unknown>, varsayilan: string | null): string | null {
  const tek = metin(g.kaynak, 600);
  if (tek) return tek;
  if (Array.isArray(g.kaynaklar)) {
    const kunyeler = g.kaynaklar
      .map((k) => (typeof k === 'string' ? k : metin((k as { kunye?: unknown })?.kunye, 400)))
      .filter((k): k is string => !!k && k.trim() !== '');
    if (kunyeler.length) return kunyeler.join(' · ').slice(0, 600);
  }
  return varsayilan;
}

/** "Cami ve külliye (cami, medrese…)" → "Cami" (filtre ve rozet için kısa biçim). */
export function turKisalt(tur: string): string {
  const ilk = tur.split(/[(—–:/]|\s+ve\s+/i)[0]?.trim() ?? '';
  return (ilk || tur.trim()).slice(0, 60);
}

export interface Varsayilanlar {
  sehir?: string | null;
  kaynak?: string | null;
}

/** Tek kaydı doğrular; hata varsa ArsivHatasi fırlatır. */
export function arsivKaydiDogrula(ham: unknown, v: Varsayilanlar = {}): ArsivGirdisi {
  if (!ham || typeof ham !== 'object' || Array.isArray(ham)) throw new ArsivHatasi('Kayıt bir nesne olmalı.');
  const g = ham as Record<string, unknown>;

  const ad = metin(g.ad, 200);
  if (!ad) throw new ArsivHatasi('"ad" zorunlu.');

  const ilHam = metin(g.il, 80) ?? metin(g.sehir, 80) ?? metin(v.sehir, 80);
  if (!ilHam) throw new ArsivHatasi('"il" (ya da "sehir") zorunlu.');
  const il = slug(ilHam);
  if (!il) throw new ArsivHatasi('"il" geçersiz.');
  const ilAd = BILINEN_ILLER[il] ?? (ilHam === il ? ilHam.charAt(0).toLocaleUpperCase('tr') + ilHam.slice(1) : ilHam);

  const turHam = metin(g.tur, 200);
  if (!turHam) throw new ArsivHatasi('"tur" zorunlu (ör. Cami, Han, Çeşme).');

  const kaynak = kaynakMetni(g, metin(v.kaynak, 600));
  if (!kaynak) throw new ArsivHatasi('"kaynak" zorunlu: bilginin hangi yayından geldiği yazılmalı.');

  const fotoHam =
    g.foto ?? g.fotoUrl ?? (Array.isArray(g.fotograflar) ? (g.fotograflar[0] as { url?: unknown } | undefined)?.url : undefined);
  const foto = fotoAyikla(fotoHam);

  const idHam = metin(g.id, 120);
  const id = idHam ? slug(idHam) || idHam : `${il}-${slug(ad)}`;
  if (!/^[a-z0-9-]{2,120}$/.test(id)) throw new ArsivHatasi('"id" yalnızca küçük harf, rakam ve tire içerebilir.');

  return {
    id,
    ad,
    il,
    ilAd,
    ilce: metin(g.ilce, 120),
    tur: turKisalt(turHam),
    kaynak,
    paragraflar: paragraflariTopla(g),
    fotoUrl: foto.fotoUrl,
    ...(foto.fotoVeri !== undefined ? { fotoVeri: foto.fotoVeri } : {}),
    ders: metin(g.ders, 120),
  };
}

/** JSON gövdesinden kayıt listesini ve dosya düzeyi varsayılanları çıkarır. */
export function iceAktarmaListesi(govde: unknown): { kayitlar: unknown[]; varsayilan: Varsayilanlar } {
  if (Array.isArray(govde)) return { kayitlar: govde, varsayilan: {} };
  if (govde && typeof govde === 'object') {
    const g = govde as Record<string, unknown>;
    if (Array.isArray(g.eserler)) {
      return {
        kayitlar: g.eserler,
        varsayilan: { sehir: metin(g.sehir), kaynak: metin(g.kaynak) },
      };
    }
    // Tek kayıt nesnesi
    if ('ad' in g) return { kayitlar: [g], varsayilan: {} };
  }
  throw new ArsivHatasi('JSON bir dizi ya da "eserler" listesi içeren bir nesne olmalı.');
}
