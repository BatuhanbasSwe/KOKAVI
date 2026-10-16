/**
 * Test yardımcıları.
 *
 * Yönetim uçları artık kimlik doğrulama istediği için testlerin gerçek bir
 * oturum açması gerekir. Bu, güvenlik katmanının testlerde de ATLANMADIĞINI
 * garanti eder — testler üretimdeki yoldan geçer.
 */
import type { FastifyInstance } from 'fastify';

export const TEST_ADMIN = {
  email: 'test-admin@kokavi.local',
  parola: 'TestParola1',
  ad: 'Test Yönetici',
};

/** Çerez dizisinden oturum belirtecini çıkarır. */
export function cerezBelirteci(cevap: { cookies: unknown[] }): string {
  const cerez = (cevap.cookies as { name: string; value: string }[]).find(
    (c) => c.name === 'kokavi_oturum',
  );
  return cerez?.value ?? '';
}

/**
 * Test yöneticisi oluşturur ve giriş yapıp belirteci döner.
 * `cookies: { kokavi_oturum: belirtec }` olarak kullanılır.
 */
export async function yoneticiOturumuAc(app: FastifyInstance): Promise<string> {
  const { kullaniciOlustur, kullaniciVarMi } = await import('../server/auth/oturum.ts');

  if (!(await kullaniciVarMi(TEST_ADMIN.email))) {
    await kullaniciOlustur({ ...TEST_ADMIN, rol: 'admin' });
  }

  const giris = await app.inject({
    method: 'POST',
    url: '/api/auth/giris',
    payload: { email: TEST_ADMIN.email, parola: TEST_ADMIN.parola },
  });

  const belirtec = cerezBelirteci(giris);
  if (!belirtec) {
    throw new Error(`Test yöneticisi girişi başarısız (HTTP ${giris.statusCode})`);
  }
  return belirtec;
}

/** Yönetim isteği için kısayol: çerezi otomatik ekler. */
export function yoneticiCerezi(belirtec: string): Record<string, string> {
  return { kokavi_oturum: belirtec };
}
