/**
 * Günün Eseri'nin bugünkü durumu — Öğrenme Yolu'ndaki "Bugün" şeridinde kart olarak.
 */
import { gunAnahtari } from '@/lib/ilerleme';
import { HAK, depo, degerlendir, gunNumarasi, gununEseri } from './oyun';
import './gunun-eseri.css';

export function gununEseriDurumu(): { no: number; durum: string; bitti: boolean } {
  const gun = gunNumarasi(gunAnahtari());
  const { tahminler } = depo.gunKaydi(gun);
  const hedef = gununEseri(gun);
  const kazandi = tahminler.some((t) => {
    try {
      return degerlendir(t, hedef).dogru;
    } catch {
      return false;
    }
  });
  const bitti = kazandi || tahminler.length >= HAK;
  const durum = kazandi
    ? 'Bugün bildin!'
    : bitti
      ? 'Yarın yeni eser'
      : tahminler.length > 0
        ? `${HAK - tahminler.length} hak kaldı`
        : 'İpuçlarından eseri bul';
  return { no: gun + 1, durum, bitti };
}
