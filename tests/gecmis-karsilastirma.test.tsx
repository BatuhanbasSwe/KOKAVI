/**
 * Geçmişten bugüne: tarihî fotoğraf ile bugünkü fotoğrafın karşılaştırılması.
 * Kaydırıcı gerçek bir range input olmalı; iki fotoğrafın da metin karşılığı
 * bulunmalı (WCAG 1.1.1) ve axe ihlali olmamalı.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { GecmisKarsilastirma } from '../src/features/ders/GecmisKarsilastirma';

describe('Geçmişten bugüne fotoğraf karşılaştırması', () => {
  it('Ulucami için iki karşılaştırma, kaydırıcı ve kaynak gösterir', async () => {
    const { container } = render(<GecmisKarsilastirma eserId="bursa-ulucami" />);

    expect(screen.getByRole('heading', { name: 'Aynı yer, iki zaman' })).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(2);
    expect(
      screen.getByAltText("Bursa Ulu Cami'nin bugünkü genel görünümü"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/kamu malı \(CC0\)/)).toHaveLength(2);
    expect(screen.getByText(/Vakıf Eserleri Envanteri fotoğraf arşivi/)).toBeInTheDocument();

    const sonuc = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(sonuc.violations.map((v) => v.id)).toEqual([]);
  });

  it('arşiv fotoğrafı olmayan eserde hiçbir şey göstermez', () => {
    const { container } = render(<GecmisKarsilastirma eserId="bursa-koza-hani" />);
    expect(container).toBeEmptyDOMElement();
  });
});
