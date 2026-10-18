/**
 * Kazanma anları: ders sonunda kazanılan elmas kadar (en çok 8) elmas tanesi
 * uçar, katman ekran okuyucudan gizlidir; elmas kartının erişilebilir metni
 * gerçek kazancı söyler. Elmas yoksa yağmur yok. Ünite bitince mühür görünür.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DersSonu } from '../src/features/ders/DersSonu';
import { FotografPatikasi } from '../src/features/yol/FotografPatikasi';
import type { YolUnitesi } from '../shared/types';

afterEach(cleanup);

const sonu = (kazanilanElmas: number) =>
  render(
    <DersSonu
      eserAdi="Koza Hanı"
      eserTur="Han"
      eserSehir="Bursa"
      kazanilanElmas={kazanilanElmas}
      seriGun={2}
      tekrarSonucMetni={null}
      onDevam={() => {}}
    />,
  );

describe('ders sonu elmas yağmuru', () => {
  it('kazanç kadar tane (en çok 8), gizli katman; kart gerçek kazancı söyler', () => {
    const { container } = sonu(10);
    const katman = container.querySelector('.elmas-yagmuru')!;
    expect(katman.getAttribute('aria-hidden')).toBe('true');
    expect(katman.querySelectorAll('.elmas-yagmuru__tane')).toHaveLength(8);
    expect(container.querySelector('.ders-sonu__kazanc--elmas .sr-only')!.textContent).toBe('+10');
  });

  it('elmas yoksa yağmur yok', () => {
    const { container } = sonu(0);
    expect(container.querySelector('.elmas-yagmuru')).toBeNull();
  });
});

describe('ünite mührü', () => {
  const unite = (tamam: number): YolUnitesi => ({
    uniteId: 'u1',
    ad: 'Ünite 1',
    sira: 1,
    dersler: [0, 1].map((i) => ({ dersId: `d${i}`, eserId: `e${i}`, eserAdi: `Eser ${i}`, tur: 'Cami', sira: i, tamamlandi: i < tamam })),
    tamamlananSayi: tamam,
    toplamSayi: 2,
    kilitli: false,
    aktif: true,
  });

  it('bütün dersler bitince mühür görünür (süs, gizli); bitmeden yok', () => {
    const { container, rerender } = render(<FotografPatikasi unite={unite(1)} sehirAdi="Bursa" guncelDersId="d1" />);
    expect(container.querySelector('.patika-unite__muhur')).toBeNull();
    rerender(<FotografPatikasi unite={unite(2)} sehirAdi="Bursa" guncelDersId={null} />);
    expect(container.querySelector('.patika-unite__muhur')!.getAttribute('aria-hidden')).toBe('true');
  });
});
