/**
 * `npm run build:vercel` yardımcısı: şema dosyalarını `api/` yanına kopyalar.
 * Neden: önceki komut Unix `cp` kullanıyordu ve Windows'ta çalışmıyordu.
 */
import { copyFileSync } from 'node:fs';

const dosyalar = ['schema.sql', 'auth-schema.sql'];
for (const ad of dosyalar) {
  copyFileSync(`server/db/${ad}`, `api/${ad}`);
}
console.log(`✓ api/ şema dosyaları güncellendi: ${dosyalar.join(', ')}`);
