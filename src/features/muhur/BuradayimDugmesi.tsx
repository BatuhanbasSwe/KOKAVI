/**
 * "Buradayım" düğmesi: konumu bir kez ister (takip yok), eser 150 m içindeyse
 * mühür basar. Konumu yaklaşık olan ya da koordinatı olmayan eserlerde hiç
 * çizilmez (yanlış mühür çıkmasın). Konum saklanmaz ve gönderilmez.
 */
import { useState } from 'react';
import { IkonTik } from '../../app/Ikonlar';
import { gunAnahtari } from '../../lib/ilerleme';
import { konumKontrol, muhurBas, muhurGunu, type Nokta } from '../../lib/muhur';
import { mesafeMetni } from '../rota/rota';
import './muhur.css';

type Durum =
  | { tur: 'bos' }
  | { tur: 'soruluyor' }
  | { tur: 'basildi' }
  | { tur: 'uzak'; mesafe: number }
  | { tur: 'izin-yok' }
  | { tur: 'hata' };

export function BuradayimDugmesi({
  eserId,
  eserAd,
  koordinat,
  yaklasik,
}: {
  eserId: string;
  eserAd: string;
  koordinat: Nokta | null;
  yaklasik: boolean;
}) {
  const [durum, setDurum] = useState<Durum>({ tur: 'bos' });
  const [gun, setGun] = useState(() => muhurGunu(eserId));

  if (!koordinat || yaklasik || typeof navigator === 'undefined' || !navigator.geolocation) return null;

  if (gun) {
    return (
      <p className="muhur muhur--var" role="status">
        <IkonTik boyut={18} /> Orada bulundun: {gun.split('-').reverse().join('.')}
      </p>
    );
  }

  function dene() {
    setDurum({ tur: 'soruluyor' });
    navigator.geolocation.getCurrentPosition(
      (konum) => {
        const sonuc = konumKontrol(koordinat!, { lat: konum.coords.latitude, lng: konum.coords.longitude });
        if (sonuc.yakin) {
          const bugun = gunAnahtari();
          muhurBas(eserId, bugun);
          setGun(bugun);
          setDurum({ tur: 'basildi' });
        } else setDurum({ tur: 'uzak', mesafe: sonuc.mesafe });
      },
      (hata) => setDurum({ tur: hata.code === hata.PERMISSION_DENIED ? 'izin-yok' : 'hata' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="muhur">
      <button type="button" className="dugme dugme--ikincil dugme--kucuk" onClick={dene} disabled={durum.tur === 'soruluyor'}>
        Buradayım<span className="sr-only">: {eserAd} için mühür al</span>
      </button>
      <p className="muhur__durum" role="status" aria-live="polite">
        {durum.tur === 'soruluyor' && 'Konumuna bakıyorum…'}
        {durum.tur === 'uzak' &&
          `Yaklaşık ${mesafeMetni(durum.mesafe)} uzaktasın. Esere ${150} m kadar yaklaşınca tekrar dene.`}
        {durum.tur === 'izin-yok' &&
          'Konum izni verilmedi. Konumun hiçbir yere gönderilmez; istersen tarayıcı ayarlarından izin verip tekrar dene.'}
        {durum.tur === 'hata' && 'Konumun bulunamadı. Açık havada biraz bekleyip tekrar dene.'}
        {durum.tur === 'bos' && 'Konumun yalnızca bu cihazda, bir kez ölçülür; kaydedilmez.'}
      </p>
    </div>
  );
}
