/**
 * Zaman tüneli — 57 ders eseri yapılış yılına göre, yüzyıl yüzyıl (Pratik).
 * Liste `ZamanListesi` bileşenindedir; Öğrenme Yolu'nun "Zamana göre"
 * sekmesi de aynı listeyi ders sırası olarak kullanır.
 */
import { useMemo } from 'react';
import { useDurum } from '@/app/DurumSaglayici';
import { ESERLER } from '../gunun-eseri/oyun';
import { ZamanListesi } from './ZamanListesi';

export function ZamanTuneliSayfasi() {
  const { yol } = useDurum();
  const kesfedilen = useMemo(
    () =>
      (yol?.sehirler ?? []).flatMap((s) => s.uniteler.flatMap((u) => u.dersler.filter((d) => d.tamamlandi))).length,
    [yol],
  );
  const ilk = ESERLER.reduce((a, b) => (b.yil < a.yil ? b : a));
  const son = ESERLER.reduce((a, b) => (b.yil > a.yil ? b : a));

  return (
    <div className="yigin">
      <header>
        <p className="etiket">Pratik · Zaman tüneli</p>
        <h1 className="zt__baslik">Yüzyıllar boyunca vakıf eserleri</h1>
        <p className="metin-ikincil">
          {ilk.yil} ile {son.yil} arası: {ESERLER.length} eser, yapıldıkları sırayla. Keşfettiğin{' '}
          {kesfedilen} eser renkli. “~” işareti yılın yaklaşık olduğunu gösterir.
        </p>
      </header>
      <ZamanListesi mod="tunel" />
    </div>
  );
}
