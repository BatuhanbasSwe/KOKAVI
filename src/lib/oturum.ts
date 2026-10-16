/**
 * İstemci tarafı oturum yönetimi.
 *
 * Oturum belirteci httpOnly çerezde tutulur; JavaScript onu OKUYAMAZ.
 * Bu yüzden istemci "giriş yapıldı mı?" sorusunu sunucuya sorarak yanıtlar
 * (`/api/auth/ben`). Bu, XSS ile oturum çalınmasını engeller.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Rol } from '@shared/types';

export interface OturumKullanicisi {
  id: string;
  email: string;
  ad: string;
  rol: Rol;
  sonGiris: string | null;
}

interface OturumDurumu {
  kullanici: OturumKullanicisi | null;
  yukleniyor: boolean;
  girisYap: (email: string, parola: string) => Promise<{ tamam: boolean; hata?: string }>;
  cikisYap: () => Promise<void>;
  yenile: () => Promise<void>;
}

async function iste(yol: string, secenekler?: RequestInit): Promise<Response> {
  return fetch(`/api${yol}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...secenekler,
  });
}

export async function aktifKullanici(): Promise<OturumKullanicisi | null> {
  try {
    const cevap = await iste('/auth/ben');
    if (!cevap.ok) return null;
    const govde = (await cevap.json()) as { kullanici: OturumKullanicisi };
    return govde.kullanici;
  } catch {
    return null;
  }
}

export function useOturum(): OturumDurumu {
  const [kullanici, setKullanici] = useState<OturumKullanicisi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yenile = useCallback(async () => {
    setYukleniyor(true);
    setKullanici(await aktifKullanici());
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  const girisYap = useCallback(async (email: string, parola: string) => {
    try {
      const cevap = await iste('/auth/giris', {
        method: 'POST',
        body: JSON.stringify({ email, parola }),
      });
      const govde = (await cevap.json()) as {
        kullanici?: OturumKullanicisi;
        hata?: string;
      };

      if (!cevap.ok) {
        return { tamam: false, hata: govde.hata ?? 'Giriş yapılamadı.' };
      }
      setKullanici(govde.kullanici ?? null);
      return { tamam: true };
    } catch {
      return { tamam: false, hata: 'Sunucuya ulaşılamadı.' };
    }
  }, []);

  const cikisYap = useCallback(async () => {
    await iste('/auth/cikis', { method: 'POST' });
    setKullanici(null);
  }, []);

  return { kullanici, yukleniyor, girisYap, cikisYap, yenile };
}
