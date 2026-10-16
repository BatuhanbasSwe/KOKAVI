/**
 * Öğrenme yolunun üstündeki "Günün Eseri" kartı: bugün oynandı mı, gösterir.
 */
import { gunAnahtari } from '@/lib/ilerleme';
import { HAK, depo, degerlendir, gunNumarasi, gununEseri } from './oyun';
import './gunun-eseri.css';

export function GununEseriDavet() {
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
    ? '✓ Bugün bildin'
    : bitti
      ? 'Yarın yeni eser'
      : tahminler.length > 0
        ? `${HAK - tahminler.length} hak kaldı`
        : 'Oyna';

  return (
    <a className="ge-davet" href="#/gunun-eseri">
      <span className="ge-davet__simge" aria-hidden="true">
        ?
      </span>
      <span className="ge-davet__metin">
        <span className="ge-davet__baslik">Günün Eseri #{gun + 1}</span>
        <span className="ge-davet__alt">İpuçlarından bugünün vakıf eserini bul.</span>
      </span>
      <span className="ge-davet__durum">{durum}</span>
    </a>
  );
}
