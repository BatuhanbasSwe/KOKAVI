/**
 * 26 Ekim veri düzeltmeleri — 633 arşiv özeti çocuk yüzüne uygun mu?
 *
 * Kullanıcı şikâyeti: bazı arşiv kartları "narlı … MOSQUE" gibi yarım ve
 * İngilizce başlıklı özetler gösteriyordu. `cocukOzeti()` başlık satırını ve
 * yarım cümleyi atlar; bu test 633 kaydın tamamını tarar.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { cocukOzeti, OZET_SINIRI } from '../src/features/arsiv/ozet';

const dizin = path.resolve(process.cwd(), 'public/arsiv/metin');
const dosyalar = fs.readdirSync(dizin).filter((f) => f.endsWith('.json'));

describe('633 arşiv özeti (çocuk yüzü)', () => {
  it('633 dosyanın hepsi dolu, sınır içinde, büyük harfle başlar ve İngilizce başlık taşımaz', () => {
    expect(dosyalar.length).toBe(633);
    const kusurlar: string[] = [];

    for (const dosya of dosyalar) {
      const id = dosya.replace(/\.json$/u, '');
      const { paragraflar } = JSON.parse(fs.readFileSync(path.join(dizin, dosya), 'utf8')) as {
        paragraflar?: string[];
      };
      const { ozet } = cocukOzeti(paragraflar ?? []);

      if (!ozet) kusurlar.push(`${id}: boş özet`);
      else if (ozet.length > OZET_SINIRI) kusurlar.push(`${id}: ${ozet.length} karakter`);
      else if (!/^[A-ZÇĞİÖŞÜÂÎÛ0-9“"]/u.test(ozet)) kusurlar.push(`${id}: küçük harfle başlıyor`);
      else if (/\b(MOSQUE|TOMB|MADRASA|COMPLEX|FOUNTAIN|BATH|GRAVEYARD)\b/u.test(ozet)) {
        kusurlar.push(`${id}: İngilizce başlık sızdı`);
      }
    }

    expect(kusurlar).toEqual([]);
  });
});
