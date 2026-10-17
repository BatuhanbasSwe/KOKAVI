import { beforeEach, describe, expect, it } from 'vitest';
import {
  ONAY_SURESI_MS,
  cevapDogruMu,
  onayGecerliMi,
  onayKaydet,
  sayiYaziyla,
  veliOnayiAcikMi,
  veliOnayiGerekli,
  veliOnayiniAyarla,
  veliSorusuUret,
} from '../src/lib/veliOnayi';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('veli kapısı sorusu', () => {
  it('sayılar Türkçe yazıyla', () => {
    expect(sayiYaziyla(47)).toBe('kırk yedi');
    expect(sayiYaziyla(30)).toBe('otuz');
    expect(sayiYaziyla(9)).toBe('dokuz');
    expect(() => sayiYaziyla(100)).toThrow();
  });

  it('soru yazıyla, cevap çarpım; rakam içermez', () => {
    const s = veliSorusuUret(() => 0.5);
    expect(s.soru).toBe('otuz çarpı altı kaç eder?');
    expect(s.cevap).toBe(180);
    for (let i = 0; i < 50; i++) expect(veliSorusuUret().soru).not.toMatch(/\d/);
  });

  it('cevap rakamla; boşluk ve nokta yok sayılır; yazıyla cevap kabul edilmez', () => {
    const s = { soru: '', cevap: 1080 };
    expect(cevapDogruMu('1080', s)).toBe(true);
    expect(cevapDogruMu(' 1.080 ', s)).toBe(true);
    expect(cevapDogruMu('1081', s)).toBe(false);
    expect(cevapDogruMu('bin seksen', s)).toBe(false);
    expect(cevapDogruMu('', s)).toBe(false);
  });
});

describe('veli onayı kuralı', () => {
  it('varsayılan açık; onay 10 dakika geçerli', () => {
    expect(veliOnayiAcikMi()).toBe(true);
    expect(veliOnayiGerekli(1_000)).toBe(true);
    onayKaydet(1_000);
    expect(onayGecerliMi(1_000 + ONAY_SURESI_MS - 1)).toBe(true);
    expect(veliOnayiGerekli(1_000 + ONAY_SURESI_MS - 1)).toBe(false);
    expect(veliOnayiGerekli(1_000 + ONAY_SURESI_MS)).toBe(true);
  });

  it('veli kapatınca sorulmaz; yeniden açılabilir', () => {
    veliOnayiniAyarla(false);
    expect(veliOnayiGerekli()).toBe(false);
    veliOnayiniAyarla(true);
    expect(veliOnayiGerekli()).toBe(true);
  });
});
