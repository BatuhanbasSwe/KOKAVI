/**
 * Sınıf Vakıf Röntgeni ekranı — tahtada birlikte açılan büyük ekran.
 *
 * PDF Senaryo B: "Sınıf birlikte bir külliyeyi tamamlar; Vakıf Röntgeni'ni
 * birlikte görür." Bu test, ekranın:
 *  1. sınıfın toplu sayaçlarını ve hedef külliyesini gösterdiğini,
 *  2. belgelenmiş gelir dağılımını çubuk + yüzde metniyle çizdiğini,
 *  3. belgelenmemiş eserde oran UYDURMADIĞINI,
 *  4. sınıf kodu yoksa anlaşılır hata verdiğini
 * kanıtlar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SinifRontgenSayfasi } from '../src/features/ogretmen/SinifRontgenSayfasi';
import type { SinifRontgenCevabi } from '../src/features/ogretmen/api';

const BELGELI_ESER: SinifRontgenCevabi['eserler'][number] = {
  dersId: 'bursa-u1-d2',
  eserId: 'bursa-yesilcami-yesil-cami',
  eserAdi: 'Yeşilcami (Yeşil Cami)',
  tur: 'Cami',
  sehirAdi: 'Bursa',
  uniteAdi: 'Ünite 1: İbadet ve İlim',
  gelirDagilimiDurumu: 'belgeli',
  kaynakKunye: "Vakıf Katılım, 'Bursa Vakıf Eserleri', I. Cilt (Nisan 2026), s. 84-91",
  gelirKalemleri: [
    {
      id: 1,
      eserId: 'bursa-yesilcami-yesil-cami',
      kalem: 'Mahsûlât-ı kurâ: vakıf köylerinden buğday',
      yuzde: 82.7,
      tip: 'gelir',
      kaynak: 'Akan Yetişir 2022, s. 214',
      sira: 1,
    },
    {
      id: 2,
      eserId: 'bursa-yesilcami-yesil-cami',
      kalem: 'Personel maaşları',
      yuzde: 77,
      tip: 'gider',
      kaynak: null,
      sira: 2,
    },
  ],
};

const BELGESIZ_ESER: SinifRontgenCevabi['eserler'][number] = {
  dersId: 'bursa-u1-d1',
  eserId: 'bursa-ulucami',
  eserAdi: 'Ulucami',
  tur: 'Cami',
  sehirAdi: 'Bursa',
  uniteAdi: 'Ünite 1: İbadet ve İlim',
  gelirDagilimiDurumu: 'belge-bulunamadi',
  kaynakKunye: "Vakıf Katılım, 'Bursa Vakıf Eserleri', I. Cilt (Nisan 2026), s. 36-83",
  gelirKalemleri: [],
};

const ORNEK: SinifRontgenCevabi = {
  kod: 'KTM-4829',
  ad: '5-B Şehrimiz Dersi',
  toplamTamamlama: 12,
  tamamlananDersCesidi: 2,
  kulliyeler: [
    {
      id: 'yesil-kulliyesi',
      ad: 'Yeşilcami (Yeşil) Külliyesi',
      sehirId: 'bursa',
      toplamDers: 4,
      tamamlananDersCesidi: 2,
      hedefMi: true,
      tamamlandiMi: false,
    },
  ],
  eserler: [BELGELI_ESER, BELGESIZ_ESER],
};

function fetchSahte(govde: unknown, durum = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return new Response(JSON.stringify(govde), {
        status: durum,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sınıf Vakıf Röntgeni', () => {
  it('sınıf bilgisini, hedef külliyeyi ve tamamlanan eserleri gösterir', async () => {
    fetchSahte(ORNEK);
    render(<SinifRontgenSayfasi kod="KTM-4829" />);

    expect(await screen.findByRole('heading', { name: 'Vakıf Röntgeni' })).toBeInTheDocument();
    expect(screen.getByText(/5-B Şehrimiz Dersi/)).toBeInTheDocument();
    expect(screen.getByText(/Kod KTM-4829/)).toBeInTheDocument();

    // Hedef külliye + ilerleme çubuğu metni
    expect(screen.getByText('Yeşilcami (Yeşil) Külliyesi')).toBeInTheDocument();
    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByText(/2 ders kaldı/)).toBeInTheDocument();

    // Belgelenmiş eser: iki ayrı liste (gelir / gider) + yüzdeler
    expect(screen.getByText('Vakfa para nereden geliyordu?')).toBeInTheDocument();
    expect(screen.getByText('Bu para nereye harcanıyordu?')).toBeInTheDocument();
    expect(screen.getByText('%82,7')).toBeInTheDocument();
    expect(screen.getByText('%77')).toBeInTheDocument();
    expect(screen.getByText('Yeşilcami (Yeşil Cami)')).toBeInTheDocument();
  });

  it('belgelenmemiş gelir dağılımında oran uydurmaz', async () => {
    fetchSahte(ORNEK);
    render(<SinifRontgenSayfasi kod="KTM-4829" />);

    expect(await screen.findByText('Ulucami')).toBeInTheDocument();
    expect(
      screen.getByText(/Bu eserin vakfiyesindeki gelir dağılımı belgelenememiştir/),
    ).toBeInTheDocument();
  });

  it('eser yoksa tahtada ders açma yönlendirmesi gösterir', async () => {
    fetchSahte({ ...ORNEK, eserler: [], kulliyeler: [] });
    render(<SinifRontgenSayfasi kod="KTM-4829" />);

    expect(await screen.findByText(/Henüz birlikte görülen eser yok/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Öğretmen paneline git/ })).toHaveAttribute(
      'href',
      '#/ogretmen',
    );
  });

  it('olmayan sınıf kodunda hata + geri dönüş bağlantısı gösterir', async () => {
    fetchSahte({ hata: 'Böyle bir sınıf kodu yok.', kod: 'SINIF_YOK' }, 404);
    render(<SinifRontgenSayfasi kod="XXX-9999" />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Böyle bir sınıf kodu yok/);
    const donusBaglantilari = screen.getAllByRole('link', { name: /Öğretmen paneline dön/ });
    expect(donusBaglantilari.length).toBeGreaterThan(0);
    expect(donusBaglantilari[0]).toHaveAttribute('href', '#/ogretmen');
  });
});
