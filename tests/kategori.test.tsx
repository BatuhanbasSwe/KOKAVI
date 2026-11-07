/**
 * KATEGORİ MANTIĞI — Batu geri bildirimi (07.11): "kategori mantığı getirilebilir
 * camii medrese gibi".
 *
 * Sunucudan gelen `tur` alanı serbest metindir ("Cami ve külliye (cami, medrese,
 * şadırvan, türbeler)"). Bu dosya üç şeyi doğrular:
 *   1. `kategoriBul` tüm ham türleri doğru kategoriye indirir (birim testi).
 *   2. `#/harita` süzgecinde kategori seçimi listeyi istemcide süzer; seçim
 *      sayısı görünür, "Temizle" sıfırlar, şehir + ham tür süzgeçleri bozulmaz.
 *   3. Defter/Pullar sekmesinde pullar kategori başlıkları altında gruplanır;
 *      öğrenilen (button, HD fotoğraf) ve kilitli (bulanık + kilit) davranışı
 *      korunur.
 * Her iki ekran da axe-core ile 0 ihlal vermelidir.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KATEGORILER,
  kategoriBul,
  kategoriSayilari,
  kategoriyeGoreGrupla,
  type Kategori,
} from '../src/lib/kategori';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');

/** `data/research/*.json` içindeki tüm ham `tur` değerleri (tekilleştirilmiş). */
function veridekiHamTurler(): string[] {
  const turler = new Set<string>();
  const gez = (dugum: unknown): void => {
    if (Array.isArray(dugum)) {
      dugum.forEach(gez);
      return;
    }
    if (dugum && typeof dugum === 'object') {
      const nesne = dugum as Record<string, unknown>;
      if (typeof nesne['tur'] === 'string') turler.add(nesne['tur']);
      Object.values(nesne).forEach(gez);
    }
  };
  for (const dosya of readdirSync(join(KOK, 'data/research'))) {
    if (!dosya.endsWith('.json')) continue;
    gez(JSON.parse(readFileSync(join(KOK, 'data/research', dosya), 'utf8')) as unknown);
  }
  return [...turler];
}

/* -------------------------------------------------------------------------- */
/* 1) BİRİM TESTLERİ                                                          */
/* -------------------------------------------------------------------------- */

/**
 * `data/research/*.json` içindeki GERÇEK ham tür metinleri (kopya değil,
 * grep ile çıkarıldı). Veri değişirse bu tablo güncellenmeli.
 */
const HAM_TURLER: { tur: string; kategori: Kategori }[] = [
  // --- Bursa I: kısa türler ---
  { tur: 'Cami', kategori: 'Cami' },
  { tur: 'Cami (minare ve hazire)', kategori: 'Cami' },
  { tur: 'Medrese', kategori: 'Medrese' },
  { tur: 'Türbe', kategori: 'Türbe' },
  { tur: 'Mektep (dârülkurrâ — Kur\'an okuma okulu)', kategori: 'Diğer' },
  { tur: 'Mescit', kategori: 'Mescit' },
  // --- Hatay: envanter dilinde uzun türler ---
  { tur: 'Cami ve külliye (cami, medrese, şadırvan, türbeler)', kategori: 'Cami' },
  {
    tur: 'Cami ve külliye (medrese, yazlık mescit, şadırvan, türbeler, çeşme, imaret, vakıf dükkânlar)',
    kategori: 'Cami',
  },
  { tur: 'Cami ve külliye (şadırvan, medrese, muvakkithane)', kategori: 'Cami' },
  { tur: 'Cami ve türbe (külliye)', kategori: 'Cami' },
  { tur: 'Cami (zaviye ve türbe ile)', kategori: 'Cami' },
  { tur: 'Cami (medrese odaları ile)', kategori: 'Cami' },
  { tur: 'Medrese ve sıbyan mektebi (menzil külliyesi bünyesinde)', kategori: 'Medrese' },
  { tur: 'Hamam', kategori: 'Hamam' },
  { tur: 'Çeşme (han-cami-çeşme manzumesi bünyesinde)', kategori: 'Çeşme' },
  {
    tur: 'Türbe ve tekke/zaviye (cami-türbe, çilehane ve medrese hücreleri)',
    kategori: 'Türbe',
  },
  {
    tur: 'Han/kervansaray (menzil külliyesi: kervansaray, cami ve hamam)',
    kategori: 'Han / Kervansaray',
  },
  { tur: 'Kilise', kategori: 'Kilise' },
  // --- Diğer şehirler (Konya, vb.) ---
  { tur: 'Külliye', kategori: 'Külliye' },
  { tur: 'Kervansaray', kategori: 'Han / Kervansaray' },
  { tur: 'Türbe (Mevlâna Külliyesi, bugün müze)', kategori: 'Türbe' },
  { tur: 'Medrese (darülhadis)', kategori: 'Medrese' },
  { tur: 'Külliye (cami, türbe, bedesten, hamam)', kategori: 'Külliye' },
  { tur: 'Külliye (menzil külliyesi)', kategori: 'Külliye' },
  { tur: 'Mescit ve türbe', kategori: 'Mescit' },
  { tur: 'Cami (ulu cami)', kategori: 'Cami' },
  // --- Bursa II: hanlar, hamamlar, köprü ---
  { tur: 'Han', kategori: 'Han / Kervansaray' },
  { tur: 'Han/kervansaray', kategori: 'Han / Kervansaray' },
  { tur: 'Bedesten', kategori: 'Diğer' },
  { tur: 'Köprü', kategori: 'Köprü' },
  { tur: 'Hamam (çifte hamam)', kategori: 'Hamam' },
  // --- Bursa III: külliyeler, imaret, sosyal yapı ---
  { tur: 'İmaret', kategori: 'Diğer' },
  { tur: 'İmaret (zaviyeli/tabhaneli yapı)', kategori: 'Diğer' },
  { tur: 'Külliye (cami, medrese, hamam, imaret, han, darüşşifa)', kategori: 'Külliye' },
  {
    tur: 'Külliye (cami, medrese, hamam, imaret, sıbyan mektebi, çeşme, türbeler)',
    kategori: 'Külliye',
  },
  { tur: 'Külliye (cami ve hazire)', kategori: 'Külliye' },
  { tur: 'Sosyal yardım yapısı (vakıf binası)', kategori: 'Diğer' },
  { tur: 'Külliye (cami, zaviye, imaret, türbe, hamam, mektep, muvakkithane, çeşme, kütüphane)', kategori: 'Külliye' },
  { tur: 'Külliye (cami, han, hamam, imaret, mektep)', kategori: 'Külliye' },
  { tur: 'Külliye (cami, medrese, türbe)', kategori: 'Külliye' },
  { tur: 'Çeşme', kategori: 'Çeşme' },
];

describe('kategoriBul — ham tür → kategori', () => {
  it('KATEGORILER sabit ve sıralı bir liste; "Diğer" her zaman sonda', () => {
    expect(KATEGORILER).toHaveLength(11);
    expect(new Set(KATEGORILER).size).toBe(KATEGORILER.length);
    expect(KATEGORILER[0]).toBe('Cami');
    expect(KATEGORILER[KATEGORILER.length - 1]).toBe('Diğer');
  });

  it('verideki tüm ham türler doğru kategoriye düşer', () => {
    for (const { tur, kategori } of HAM_TURLER) {
      expect(kategoriBul(tur), `ham tür: ${tur}`).toBe(kategori);
    }
  });

  it('veri dosyalarındaki her ham tür tabloda temsil edilir (bilinçli kapı)', () => {
    const tablo = new Set(HAM_TURLER.map((kayit) => kayit.tur));
    const eksik = veridekiHamTurler().filter((tur) => !tablo.has(tur));
    expect(
      eksik,
      `Yeni ham tür(ler) bulundu; HAM_TURLER tablosuna beklenen kategoriyi ekleyin:\n${eksik
        .map((tur) => `  - ${tur}`)
        .join('\n')}`,
    ).toEqual([]);
  });

  it('hiçbir ham tür boş kategoriye düşmez', () => {
    for (const { tur } of HAM_TURLER) {
      expect(KATEGORILER).toContain(kategoriBul(tur));
    }
  });

  it('İLK kavram kelimesi kazanır (cami ve külliye → Cami)', () => {
    expect(kategoriBul('Cami ve külliye (cami, medrese)')).toBe('Cami');
    expect(kategoriBul('Külliye (cami, türbe, bedesten, hamam)')).toBe('Külliye');
    expect(kategoriBul('Mescit ve türbe')).toBe('Mescit');
    expect(kategoriBul('Türbe ve tekke/zaviye')).toBe('Türbe');
    expect(kategoriBul('Han/kervansaray (menzil külliyesi)')).toBe('Han / Kervansaray');
  });

  it('Türkçe büyük/küçük harf ve inceltme işaretlerini sadeleştirir', () => {
    expect(kategoriBul('KİLİSE')).toBe('Kilise');
    expect(kategoriBul('  HAMAM  ')).toBe('Hamam');
    expect(kategoriBul('ÇEŞME (han-cami-çeşme)')).toBe('Çeşme');
    expect(kategoriBul('CÂMİ')).toBe('Cami');
    expect(kategoriBul('Külliyesi')).toBe('Külliye');
  });

  it('ek alan kelimeleri de yakalar ("camisi", "medresesi")', () => {
    expect(kategoriBul('Yeşil Camisi')).toBe('Cami');
    expect(kategoriBul('Sultaniye Medresesi')).toBe('Medrese');
    expect(kategoriBul('Büyük Hamamı')).toBe('Hamam');
  });

  it('boş, tanımsız ve tanınmayan tür "Diğer" olur; istisna atmaz', () => {
    expect(kategoriBul('')).toBe('Diğer');
    expect(kategoriBul('   ')).toBe('Diğer');
    expect(kategoriBul(null)).toBe('Diğer');
    expect(kategoriBul(undefined)).toBe('Diğer');
    expect(kategoriBul('Bilinmeyen yapı')).toBe('Diğer');
    expect(kategoriBul('123 / ()')).toBe('Diğer');
  });
});

describe('kategoriSayilari — ham tür sayılarını kategoriye toplar', () => {
  it('sayıları toplar ve KATEGORILER sırasında döner', () => {
    const sonuc = kategoriSayilari([
      { tur: 'Külliye (cami, medrese, türbe)', sayi: 3 },
      { tur: 'Hamam', sayi: 1 },
      { tur: 'Cami', sayi: 2 },
      { tur: 'Cami (minare ve hazire)', sayi: 1 },
      { tur: 'Bedesten', sayi: 1 },
    ]);
    expect(sonuc).toEqual([
      { kategori: 'Cami', sayi: 3 },
      { kategori: 'Hamam', sayi: 1 },
      { kategori: 'Külliye', sayi: 3 },
      { kategori: 'Diğer', sayi: 1 },
    ]);
  });

  it('sıfır ve geçersiz sayıları listelemez', () => {
    expect(kategoriSayilari([])).toEqual([]);
    expect(kategoriSayilari([{ tur: 'Cami', sayi: 0 }])).toEqual([]);
    expect(kategoriSayilari([{ tur: 'Cami', sayi: Number.NaN }])).toEqual([]);
  });
});

describe('kategoriyeGoreGrupla — defter gruplaması', () => {
  const eserler = [
    { id: 'e1', ad: 'Ulucami', tur: 'Cami' },
    { id: 'e2', ad: 'Koza Hanı', tur: 'Han/kervansaray' },
    { id: 'e3', ad: 'Yeşilcami', tur: 'Cami ve külliye (cami, medrese)' },
    { id: 'e4', ad: 'Bedesten', tur: 'Bedesten' },
  ];

  it('kategoriye böler, girdi sırasını grup içinde korur; boş grup üretmez', () => {
    const gruplar = kategoriyeGoreGrupla(eserler, (eser) => eser.tur);
    expect(gruplar.map((grup) => grup.kategori)).toEqual([
      'Cami',
      'Han / Kervansaray',
      'Diğer',
    ]);
    expect(gruplar[0]!.ogeler.map((eser) => eser.id)).toEqual(['e1', 'e3']);
    expect(gruplar[1]!.ogeler.map((eser) => eser.id)).toEqual(['e2']);
  });

  it('boş liste boş gruplar döner', () => {
    expect(kategoriyeGoreGrupla([], () => 'Cami')).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* 2) HARİTA SÜZGECİ — kategori seçimi                                        */
/* -------------------------------------------------------------------------- */

function yanit(govde: unknown, durum = 200): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { 'Content-Type': 'application/json' },
  });
}

const HARITA_ESERLERI = [
  {
    id: 'bursa-ulucami',
    ad: 'Ulucami',
    tur: 'Cami',
    sehirId: 'bursa',
    ilce: 'Osmangazi',
    koordinat: { lat: 40.18, lng: 29.06 },
    fotograflar: [],
    kaynaklar: [],
  },
  {
    id: 'bursa-yesilcami',
    ad: 'Yeşilcami',
    tur: 'Cami ve külliye (cami, medrese, şadırvan)',
    sehirId: 'bursa',
    ilce: 'Yıldırım',
    koordinat: { lat: 40.19, lng: 29.08 },
    fotograflar: [],
    kaynaklar: [],
  },
  {
    id: 'bursa-koza-hani',
    ad: 'Koza Hanı',
    tur: 'Han/kervansaray',
    sehirId: 'bursa',
    ilce: 'Osmangazi',
    koordinat: { lat: 40.18, lng: 29.05 },
    fotograflar: [],
    kaynaklar: [],
  },
];

/** Haritanın iki süzgeci de (şehir + ham tür) sunucuda çalışır; taklit edilir. */
function sahteHaritaFetch(cagrilar: string[]) {
  return vi.fn(async (girdi: RequestInfo | URL) => {
    const url = typeof girdi === 'string' ? girdi : String(girdi);
    cagrilar.push(url);
    if (url.includes('/api/auth/ben')) return yanit({ hata: 'oturum yok' }, 401);
    if (url.includes('/api/filtreler')) {
      return yanit({
        sehirler: [{ id: 'bursa', ad: 'Bursa', sayi: HARITA_ESERLERI.length }],
        turler: [
          { tur: 'Cami', sayi: 1 },
          { tur: 'Cami ve külliye (cami, medrese, şadırvan)', sayi: 1 },
          { tur: 'Han/kervansaray', sayi: 1 },
        ],
      });
    }
    if (url.includes('/api/eserler')) {
      const adres = new URL(url, 'http://yerel');
      const sehir = adres.searchParams.get('sehir');
      const tur = adres.searchParams.get('tur');
      return yanit(
        HARITA_ESERLERI.filter(
          (eser) => (!sehir || eser.sehirId === sehir) && (!tur || eser.tur === tur),
        ),
      );
    }
    if (url.includes('/api/yol')) return yanit({ sehirler: [] });
    if (url.includes('/arsiv/liste.json')) return yanit([]);
    if (url.includes('/api/')) return yanit([]);
    return yanit({});
  });
}

async function haritayiAc() {
  const { HaritaSayfasi } = await import('../src/features/harita/HaritaSayfasi');
  const { DurumSaglayici } = await import('../src/app/DurumSaglayici');
  const sonuc = render(
    <DurumSaglayici>
      <HaritaSayfasi />
    </DurumSaglayici>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Harita' });
  // Eser listesi gelene kadar bekle
  await screen.findByText('Ulucami');
  return sonuc;
}

async function suzgeciAc() {
  const dugme = screen.getByRole('button', { name: /^Süz/ });
  if (dugme.getAttribute('aria-expanded') !== 'true') await userEvent.click(dugme);
  return dugme;
}

describe('harita — kategori süzgeci (istemci tarafı)', () => {
  const cagrilar: string[] = [];

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    cagrilar.length = 0;
    vi.stubGlobal('fetch', sahteHaritaFetch(cagrilar));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('kategori seçimi listeyi süzer; seçim sayısı görünür; Temizle sıfırlar', async () => {
    const { container } = await haritayiAc();
    expect(screen.getByRole('status')).toHaveTextContent('Tüm eserler: 3 eser listelendi.');

    // Süzgeç paneli kapalı başlar; açınca kategori çipleri görünür.
    await suzgeciAc();
    const camiCipi = screen.getByRole('button', { name: /^Cami 2 eser/ });
    expect(camiCipi).toHaveAttribute('aria-pressed', 'false');

    const eserIstegiOnce = cagrilar.filter((url) => url.includes('/api/eserler')).length;
    await userEvent.click(camiCipi);

    // Süzgeç istemcide çalışır: yeni eser isteği GİTMEZ.
    expect(cagrilar.filter((url) => url.includes('/api/eserler'))).toHaveLength(eserIstegiOnce);

    expect(camiCipi).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Cami: 2 eser bulundu.');
    });
    expect(screen.queryByText('Koza Hanı')).toBeNull();
    expect(screen.getByText('Ulucami')).toBeInTheDocument();
    expect(screen.getByText('Yeşilcami')).toBeInTheDocument();

    // Seçili süzgeç sayısı düğmede metinle de yazılır.
    await suzgeciAc();
    expect(screen.getByRole('button', { name: /Süz 1 süzgeç seçili/ })).toBeInTheDocument();

    // Seçili çip (onay simgesi + aria-pressed) ve süzülmüş liste: axe 0 ihlal.
    const sonuc = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(
      sonuc.violations.map((ihlal) => `${ihlal.id}: ${ihlal.nodes[0]?.html.slice(0, 100)}`),
    ).toEqual([]);

    // "Temizle" tüm seçimleri sıfırlar.
    await userEvent.click(screen.getByRole('button', { name: 'Temizle' }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Tüm eserler: 3 eser listelendi.');
    });
    await suzgeciAc();
    expect(screen.getByRole('button', { name: /^Cami 2 eser/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('şehir ve ham tür süzgeçleriyle birlikte çalışır', async () => {
    await haritayiAc();
    await suzgeciAc();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Şehir' }), 'bursa');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Bursa: 3 eser bulundu.');
    });

    // Ham tür süzgeci (sunucuda çalışır) bozulmadı.
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Eser türü' }),
      'Han/kervansaray',
    );
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Bursa, Han/kervansaray: 1 eser bulundu.',
      );
    });
    expect(screen.getByText('Koza Hanı')).toBeInTheDocument();
    expect(screen.queryByText('Ulucami')).toBeNull();

    // Kategori süzgeci ham türle birleşince kesişimi gösterir.
    await suzgeciAc();
    await userEvent.click(screen.getByRole('button', { name: /^Cami 2 eser/ }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Bursa, Cami, Han/kervansaray: 0 eser bulundu.',
      );
    });
    expect(screen.getByText(/Bu süzgeçle eser bulunamadı/)).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/* 3) KÂŞİF DEFTERİ — kategori kırılımı                                       */
/* -------------------------------------------------------------------------- */

const DEFTER_YOL = {
  sehirler: [
    {
      sehirId: 'bursa',
      ad: 'Bursa',
      sira: 1,
      uniteler: [
        {
          uniteId: 'bursa-u1',
          ad: 'Bursa Ünite 1',
          sira: 1,
          dersler: [
            { dersId: 'bursa-u1-d1', eserId: 'bursa-ulucami', eserAdi: 'Ulucami', tur: 'Cami', sira: 1 },
            {
              dersId: 'bursa-u1-d2',
              eserId: 'bursa-yesilcami',
              eserAdi: 'Yeşilcami',
              tur: 'Cami ve külliye (cami, medrese, şadırvan)',
              sira: 2,
            },
            {
              dersId: 'bursa-u1-d3',
              eserId: 'bursa-koza-hani',
              eserAdi: 'Koza Hanı',
              tur: 'Han/kervansaray',
              sira: 3,
            },
          ],
        },
      ],
    },
  ],
};

const DEFTER_ESERLERI = [
  {
    id: 'bursa-ulucami',
    ad: 'Ulucami',
    tur: 'Cami',
    sehirId: 'bursa',
    bani: null,
    yapimYili: null,
    arsivNo: null,
  },
  {
    id: 'bursa-yesilcami',
    ad: 'Yeşilcami',
    tur: 'Cami ve külliye (cami, medrese, şadırvan)',
    sehirId: 'bursa',
    bani: null,
    yapimYili: null,
    arsivNo: null,
  },
  {
    id: 'bursa-koza-hani',
    ad: 'Koza Hanı',
    tur: 'Han/kervansaray',
    sehirId: 'bursa',
    bani: null,
    yapimYili: null,
    arsivNo: null,
  },
];

async function defteriAc() {
  const { DefterSayfasi } = await import('../src/features/defter/DefterSayfasi');
  const { DurumSaglayici } = await import('../src/app/DurumSaglayici');
  const sonuc = render(
    <DurumSaglayici>
      <DefterSayfasi />
    </DurumSaglayici>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Kâşif Defteri' });
  await screen.findByText('Koza Hanı');
  return sonuc;
}

describe('defter — kategori kırılımı', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '#/defter';
    // Ulucami öğrenildi; diğer iki pul kilitli kalır.
    localStorage.setItem(
      'kokavi.ilerleme.v1',
      JSON.stringify({ defterSayfalari: ['bursa-ulucami'] }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (girdi: RequestInfo | URL) => {
        const url = String(girdi);
        if (url.includes('/api/auth/ben')) return yanit({ hata: 'oturum yok' }, 401);
        if (url.includes('/api/yol')) return yanit(DEFTER_YOL);
        if (url.includes('/api/eserler')) return yanit(DEFTER_ESERLERI);
        if (url.includes('/api/')) return yanit([]);
        return yanit({});
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pullar kategori başlıkları altında gruplanır; sayaçlar doğru', async () => {
    const { container } = await defteriAc();

    const camiBasligi = screen.getByRole('heading', { level: 3, name: /^Cami/ });
    expect(camiBasligi).toHaveTextContent('1/2 pul');
    const hanBasligi = screen.getByRole('heading', { level: 3, name: /^Han \/ Kervansaray/ });
    expect(hanBasligi).toHaveTextContent('0/1 pul');

    // Kategori başlığı, o kategorinin pullarını içerir.
    const camiBolumu = camiBasligi.closest('section');
    expect(camiBolumu).not.toBeNull();
    const camiPullari = within(camiBolumu as HTMLElement).getAllByRole('listitem');
    expect(camiPullari).toHaveLength(2);
    expect(camiPullari[0]).toHaveTextContent('Ulucami');
    expect(camiPullari[1]).toHaveTextContent('Yeşilcami');

    const sonuc = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(sonuc.violations.map((ihlal) => `${ihlal.id}: ${ihlal.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });

  it('öğrenilen pul açılır (button + HD fotoğraf), kilitli pul bulanık ve kilitli kalır', async () => {
    await defteriAc();

    // Öğrenilen: gerçek <button>, aria-expanded; dokununca sayfa açılır.
    const ogrenilenPul = screen.getByRole('button', { name: /Ulucami/ });
    expect(ogrenilenPul).toHaveClass('defter-pul--acik');
    expect(ogrenilenPul).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(ogrenilenPul);
    expect(ogrenilenPul).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('.defter-sayfasi__foto')?.getAttribute('src')).toBe(
      '/gorseller/bursa-ulucami/1.webp',
    );

    // Kilitli: div, adıyla görünür, fotoğraf bulanık, kilit simgesi var.
    const kilitliPul = screen.getByText('Yeşilcami').closest('.defter-pul') as HTMLElement;
    expect(kilitliPul).toHaveClass('defter-pul--kapali');
    expect(within(kilitliPul).getByText(/henüz öğrenilmedi/)).toBeInTheDocument();
    expect(kilitliPul.querySelector('.defter-pul__resim--bulanik')).not.toBeNull();
    expect(kilitliPul.querySelector('.defter-pul__kilit')).not.toBeNull();
    expect(kilitliPul.textContent).not.toMatch(/\?/);
  });
});
