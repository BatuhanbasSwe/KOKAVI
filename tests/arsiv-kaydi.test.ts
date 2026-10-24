/**
 * `arsivKaydiMetni()` — vakfiye/arşiv kaydı gösterimi.
 *
 * Kullanıcı bulgusu: 13 eserin `arsivNo` alanı dolu görünüyordu ama 7'sinde
 * gerçek numara yok, "Vakıflar Genel Müdürlüğü arşiv numarası bulunamadı."
 * gibi bir not vardı. Arayüz bunu "Vakfiye arşiv no: … bulunamadı" diye
 * basıyordu. Bu testler yalnız gerçek referansların gösterilmesini ve uzun
 * künyenin kısaltılmasını kilitler.
 */
import { describe, expect, it } from 'vitest';
import { ARSIV_KAYDI_SINIRI, arsivKaydiMetni } from '../src/lib/arsivKaydi';

describe('arsivKaydiMetni', () => {
  it('boş ve null değeri göstermez', () => {
    expect(arsivKaydiMetni(null)).toBeNull();
    expect(arsivKaydiMetni(undefined)).toBeNull();
    expect(arsivKaydiMetni('   ')).toBeNull();
  });

  it('“bulunamadı / tespit edilemedi” notlarını arşiv numarası saymaz', () => {
    expect(arsivKaydiMetni('Vakıflar Genel Müdürlüğü Vakıf Kayıtlar Arşivi numarası bulunamadı.')).toBeNull();
    expect(arsivKaydiMetni('Medreseye ait ayrı bir vakfiye tespit edilememiştir.')).toBeNull();
    expect(arsivKaydiMetni('H. 804 / M. 1402 tarihli vakfiyenin bir sureti arşivde kayıtlıdır (envanterde numara verilmez).')).toBeNull();
  });

  it('gerçek referansı olduğu gibi döndürür', () => {
    expect(arsivKaydiMetni('Defter nr. 72, s. 114 (966/1559 tarihli vakfiye)')).toBe(
      'Defter nr. 72, s. 114 (966/1559 tarihli vakfiye)',
    );
    expect(arsivKaydiMetni('BS. 25/332 ve BS. 25/345')).toBe('BS. 25/332 ve BS. 25/345');
  });

  it('uzun künyeyi sınırda ve kelime/sıralı noktalama sınırında kısaltır', () => {
    const uzun = `Bursa Şer'iyye Sicilleri: Defter nr. 72, s. 114 (966/1559 tarihli vakfiye); ${'ayrıca kayıt '.repeat(20)}`;
    const metin = arsivKaydiMetni(uzun);
    expect(metin).not.toBeNull();
    expect(metin!.length).toBeLessThanOrEqual(ARSIV_KAYDI_SINIRI + 1);
    expect(metin!.endsWith('…')).toBe(true);
  });

  it('numara içermeyen serbest notu göstermez', () => {
    expect(arsivKaydiMetni('Vakfiye kaydı dijital ortamda tutulmaktadır.')).toBeNull();
  });

  it('deterministiktir', () => {
    const deger = "Bursa Şer'iyye Sicilleri: Defter nr. 72, s. 114 (966/1559 tarihli vakfiye)";
    expect(arsivKaydiMetni(deger)).toBe(arsivKaydiMetni(deger));
  });
});
