/**
 * Harita eser satırı — tarihçe önizlemesi çocuk özetidir.
 *
 * Kullanıcı şikâyeti: harita listesindeki eser satırı yetişkin tarihçesini
 * kocaman basıyordu. Bu testler önizlemenin ~260 karakterlik kısa özet
 * olduğunu, tam Türkçe metnin "Tarihçeyi oku" altında katlandığını ve
 * İngilizce bölümün ayrı `details` içinde kaldığını kilitler.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Eser } from '@shared/types';
import { EserSatiri } from '../src/features/harita/EserSatiri';
import { OZET_SINIRI } from '../src/features/arsiv/ozet';

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

function ciz(e: Eser) {
  return render(
    <ul>
      <EserSatiri eser={e} defterinde={false} />
    </ul>,
  );
}

afterEach(cleanup);

describe('harita eser satırı: tarihçe özeti', () => {
  it('uzun tarihçeyi kısa özetle basar; tam metin "Tarihçeyi oku" details içinde kalır', () => {
    const ilkCumle =
      'Yeşilcami, Çelebi Sultan Mehmed tarafından 1414-1419 yılları arasında Bursa’da yaptırılmış ve erken Osmanlı mimarisinin en önemli eserlerinden biri sayılmıştır.';
    const ikinciCumle =
      'Caminin içi çini süslemeleriyle ünlüdür ve türbe, medrese ile imaret de aynı külliyede yer alır; bu yüzden yapı topluluğu bir bütün olarak değerlendirilir.';
    const tamMetin = `${ilkCumle} ${ikinciCumle}`;
    expect(tamMetin.length).toBeGreaterThan(OZET_SINIRI);
    const { container } = ciz(eser({ tarihce: tamMetin }));

    const onizlemeler = container.querySelectorAll('.harita-eser__tarihce');
    expect(onizlemeler.length).toBe(2);
    const onizleme = onizlemeler[0]!.textContent ?? '';
    expect(onizleme.length).toBeLessThanOrEqual(OZET_SINIRI);
    expect(onizleme).toBe(ilkCumle); // ikinci cümle sığmadı: cümle sınırında kesildi
    expect(container.textContent).toContain('Tarihçeyi oku');

    const details = screen.getByText('Tarihçeyi oku').closest('details');
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
    expect(screen.getByText(tamMetin)).toBeInTheDocument();
  });

  it('tek uzun cümleyi kelime ortasından kesmez; "…" ekler', () => {
    const tekCumle = `Yeşilcami ${'çok önemli bir vakıf yapısı olarak '.repeat(12)}bilinir.`;
    const { container } = ciz(eser({ tarihce: tekCumle }));

    const onizleme = container.querySelector('.harita-eser__tarihce')?.textContent ?? '';
    expect(tekCumle.length).toBeGreaterThan(OZET_SINIRI);
    expect(onizleme.length).toBeLessThanOrEqual(OZET_SINIRI);
    expect(onizleme.endsWith('…')).toBe(true);
    expect(tekCumle.startsWith(onizleme.slice(0, -1))).toBe(true);
    expect(screen.getByText(tekCumle)).toBeInTheDocument(); // tam metin details içinde
  });

  it('kısa tarihçeyi olduğu gibi basar; katlama düğmesi çıkmaz', () => {
    const kisa = 'Yeşilcami 1419’da tamamlanmıştır.';
    ciz(eser({ tarihce: kisa }));

    expect(screen.getByText(kisa)).toBeInTheDocument();
    expect(screen.queryByText('Tarihçeyi oku')).toBeNull();
  });

  it('İngilizce tarihçe ayrı, dil işaretli details içinde kalır', () => {
    const kisa = 'Yeşilcami 1419’da tamamlanmıştır.';
    const ingilizce = 'The Green Mosque was completed in 1419.';
    ciz(eser({ tarihce: kisa, tarihceEn: ingilizce }));

    const ingilizceDetails = screen.getByText('English').closest('details');
    expect(ingilizceDetails).not.toBeNull();
    expect(ingilizceDetails!.open).toBe(false);
    const ingilizceMetin = screen.getByText(ingilizce);
    expect(ingilizceMetin).toHaveAttribute('lang', 'en');
  });
});
