/**
 * Harita eser satırı — SADECE konum bilgisi (26 Ekim ürün kararı).
 *
 * Harita "bu eser Türkiye'nin neresinde?" sorusunu yanıtlar. Satırda tarihçe,
 * İngilizce metin, fotoğraf galerisi ve sergi listesi YOKTUR; bunlar
 * Meraklısına arşivinde (yetişkin görünümü) yaşar. Test bu sadeleşmeyi kilitler.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Eser } from '@shared/types';
import { EserSatiri } from '../src/features/harita/EserSatiri';

function eser(alanlar: Partial<Eser>): Eser {
  return {
    id: 'bursa-yesilcami',
    ad: 'Yeşilcami',
    adEn: 'Green Mosque',
    sehirId: 'bursa',
    kulliyeId: null,
    tur: 'Cami',
    ilce: 'Yıldırım',
    koordinat: null,
    bani: 'Çelebi Sultan Mehmed',
    baniDonem: null,
    yapimYili: '1414-1419',
    vakfiyeAmaci: null,
    hizmet: null,
    bugunNeOldu: null,
    tarihce: null,
    tarihceEn: null,
    gelirDagilimiDurumu: 'belge-bulunamadi',
    arsivNo: null,
    kaynaklar: [],
    dogrulamaNotu: null,
    yayinda: true,
    gelirKalemleri: [],
    fotograflar: [],
    sergiler: [],
    ...alanlar,
  };
}

function ciz(e: Eser, defterinde = false) {
  return render(
    <ul>
      <EserSatiri eser={e} defterinde={defterinde} />
    </ul>,
  );
}

afterEach(cleanup);

describe('harita eser satırı: konum bilgisi', () => {
  it('ad ve kısa künyeyi (tür · ilçe · yıl) basar', () => {
    ciz(eser({}));

    expect(screen.getByText('Yeşilcami')).toBeInTheDocument();
    expect(screen.getByText('Cami · Yıldırım · Yapım yılı: 1414-1419')).toBeInTheDocument();
  });

  it('tarihçeyi, İngilizce adı, galeriyi ve sergileri basmaz', () => {
    const tarihce = 'Yeşilcami, Çelebi Sultan Mehmed tarafından yaptırılmıştır.';
    const { container } = ciz(
      eser({
        tarihce,
        tarihceEn: 'The Green Mosque was built by Çelebi Sultan Mehmed.',
        fotograflar: [
          {
            id: 'f1',
            eserId: 'bursa-yesilcami',
            url: '/gorseller/bursa-yesilcami/k.webp',
            altMetin: 'Yeşilcami ön cephe',
            altMetinEn: null,
            sira: 1,
            kaynak: 'Vakıf Katılım',
            lisans: 'İzinsiz kullanılamaz',
          },
        ],
        sergiler: [{ id: 's1', ad: 'Sergi', adEn: null, tarih: '2026', mekan: 'Bursa', aciklama: null }],
      }),
    );

    expect(screen.queryByText(tarihce)).toBeNull();
    expect(container.textContent).not.toContain('Green Mosque');
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).not.toContain('Sergi');
    expect(container.textContent).not.toContain('Tarihçeyi oku');
  });

  it('defterdeyse rozet gösterir', () => {
    ciz(eser({}), true);
    expect(screen.getByText(/defterinde/)).toBeInTheDocument();
  });
});
