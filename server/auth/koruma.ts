/**
 * Kimlik doğrulama koruma katmanı (Fastify preHandler).
 *
 * KULLANIM
 *   app.addHook('preHandler', oturumGerekli)          → giriş yapılmış olmalı
 *   app.addHook('preHandler', yoneticiGerekli)        → rol 'admin' olmalı
 *
 * Belirteç iki yerden okunur:
 *   1. `kokavi_oturum` çerezi (httpOnly, sameSite=strict) — tarayıcı istemcisi
 *   2. `Authorization: Bearer <token>` başlığı — CLI/test istemcileri
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { oturumDogrula, type Kullanici } from './oturum.ts';

export const OTURUM_CEREZ_ADI = 'kokavi_oturum';

declare module 'fastify' {
  interface FastifyRequest {
    kullanici?: Kullanici;
  }
}

/** Belirteci istekten çıkarır (çerez veya Bearer başlığı). */
export function belirtecAl(istek: FastifyRequest): string | null {
  const cerez = (istek.cookies as Record<string, string> | undefined)?.[OTURUM_CEREZ_ADI];
  if (cerez) return cerez;

  const baslik = istek.headers.authorization;
  if (baslik?.startsWith('Bearer ')) return baslik.slice(7).trim();

  return null;
}

/**
 * Kimliği çözer ama ZORUNLU KILMAZ. Genel uçlarda "giriş yapılmışsa göster"
 * davranışı için kullanılır.
 */
export async function kimlikCoz(istek: FastifyRequest): Promise<void> {
  const belirtec = belirtecAl(istek);
  if (!belirtec) return;
  const kullanici = await oturumDogrula(belirtec);
  if (kullanici) istek.kullanici = kullanici;
}

/** Giriş zorunlu. Yoksa 401 döner ve işleyici çalışmaz. */
export async function oturumGerekli(istek: FastifyRequest, cevap: FastifyReply): Promise<void> {
  await kimlikCoz(istek);
  if (!istek.kullanici) {
    await cevap.code(401).send({
      hata: 'Bu işlem için giriş yapmalısın.',
      kod: 'GIRIS_GEREKLI',
    });
  }
}

/** Yönetici rolü zorunlu. Girişsizse 401, yetkisizse 403. */
export async function yoneticiGerekli(istek: FastifyRequest, cevap: FastifyReply): Promise<void> {
  await kimlikCoz(istek);

  if (!istek.kullanici) {
    await cevap.code(401).send({
      hata: 'Bu işlem için giriş yapmalısın.',
      kod: 'GIRIS_GEREKLI',
    });
    return;
  }

  if (istek.kullanici.rol !== 'admin') {
    // 403: kimlik doğru ama yetki yok. Bilgi sızdırmamak için ayrıntı verilmez.
    await cevap.code(403).send({
      hata: 'Bu işlem için yetkin yok.',
      kod: 'YETKI_YOK',
    });
  }
}
