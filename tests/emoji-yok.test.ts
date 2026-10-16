/**
 * Tasarım kuralı (DESIGN.md §1.4, src/app/Ikonlar.tsx): arayüzde emoji simge yok.
 * Emoji temaya boyanmaz, ekran okuyucu tutarsız okur. Yorum satırları hariç
 * bütün .tsx dosyaları taranır.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

function dosyalar(d: string): string[] {
  return readdirSync(d).flatMap((ad) => {
    const yol = join(d, ad);
    return statSync(yol).isDirectory() ? dosyalar(yol) : yol.endsWith('.tsx') ? [yol] : [];
  });
}

describe('emoji simge yok', () => {
  it('arayüz dosyalarında (yorumlar hariç) emoji kullanılmaz', () => {
    const bulunan: string[] = [];
    for (const f of dosyalar(KOK)) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((satir, i) => {
          const t = satir.trim();
          if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*') || t.startsWith('{/*')) return;
          // ©, ® ve ™ Unicode'da "pictographic" sayılır ama simge değil, metin işaretidir.
          if (/\p{Extended_Pictographic}/u.test(satir.replace(/[©®™]/g, ''))) bulunan.push(`${f.slice(KOK.length)}:${i + 1}: ${t.slice(0, 60)}`);
        });
    }
    expect(bulunan).toEqual([]);
  });
});
