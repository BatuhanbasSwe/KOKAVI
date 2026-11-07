import { useState } from 'react';
import { LabKabuk, Geribildirim } from '../ortak/LabKabuk';

/**
 * V4 · Vakıf Dedektifi (tek tek kart ayırma + akış şeması)
 * Kanıt kartları birer birer gelir. Çocuk her kartı "para getirir" ya da "hizmet eder" kutusuna atar.
 * Sonunda kendi ayırdığı kartlarla vakfın çarkını görür: akar → vakıf → hayrat.
 * İçerik: bursa-1.json → bursa-yesilcami-yesil-cami-e1 (kategori egzersizi).
 */

type Kutu = 'akar' | 'hayrat';
const KARTLAR: { metin: string; simge: string; kutu: Kutu; ipucu: string }[] = [
  { metin: 'İpek Hanı’ndan gelen para', simge: '', kutu: 'akar', ipucu: 'Han kiraya verilir. Kira vakfın kasasına girer.' },
  { metin: 'İmarette pişen çorba', simge: '', kutu: 'hayrat', ipucu: 'Çorba yoksullara dağıtılır. Bu bir hizmettir, para getirmez.' },
  { metin: 'Köylerden gelen buğday', simge: '', kutu: 'akar', ipucu: 'Buğday vakfa gelir. Vakıf bununla yemek pişirir.' },
  { metin: 'Medresede okuyan otuz öğrenci', simge: '', kutu: 'hayrat', ipucu: 'Öğrenciler para getirmez. Vakıf onlara hizmet eder.' },
  { metin: 'Meyve bahçelerinden alınan vergi', simge: '', kutu: 'akar', ipucu: 'Vergi vakfın kasasına girer. Yani para getirir.' },
  { metin: 'Sabah dağıtılan bal', simge: '', kutu: 'hayrat', ipucu: 'Bal insanlara dağıtılır. Dağıtılan şey hizmettir.' },
];

export function VakifDedektifi({ baslangic = 0 }: { baslangic?: number }) {
  const [sira, setSira] = useState(Math.min(baslangic, KARTLAR.length));
  const [yanlis, setYanlis] = useState<Kutu | null>(baslangic === 2 ? 'akar' : null);
  const kart = KARTLAR[sira];
  const bitti = sira >= KARTLAR.length;
  const ayrilan = KARTLAR.slice(0, sira);

  function at(kutu: Kutu) {
    if (!kart) return;
    if (kutu === kart.kutu) {
      setYanlis(null);
      setSira((s) => s + 1);
    } else {
      setYanlis(kutu);
    }
  }

  return (
    <LabKabuk
      kod="V4"
      ad="Vakıf Dedektifi"
      eser="Yeşilcami’nin çarkı"
      adim={sira}
      toplamAdim={KARTLAR.length}
      kaynak="Zeynep Akan Yetişir, 'Yeşil Külliye'nin On Dokuzuncu Yüzyıl Ortalarındaki Vaziyeti', Bursa 2022, s. 209 vd.; Doğan Yavaş, 'Yeşilcami Külliyesi', TDV İslâm Ansiklopedisi, C. 43 (2013)"
    >
      {!bitti && kart && (
        <section className="yigin" aria-labelledby="dedektif-soru">
          <p id="dedektif-soru" className="lab__soru-metni">
            Bu kanıt para mı getiriyor, yoksa insanlara hizmet mi ediyor?
          </p>
          <div className="dedektif__kart kart" aria-live="polite">
            <span className="dedektif__simge" aria-hidden="true">
              {kart.simge}
            </span>
            <span className="dedektif__metin">{kart.metin}</span>
            <span className="metin-soluk">
              Kanıt {sira + 1} / {KARTLAR.length}
            </span>
          </div>
          <div className="izgara-2 dedektif__kutular">
            <button type="button" className="dedektif__kutu dedektif__kutu--akar" onClick={() => at('akar')}>
              <span aria-hidden="true"></span>
              <strong>Para getirir</strong>
              <span className="metin-ikincil">Akar</span>
            </button>
            <button type="button" className="dedektif__kutu dedektif__kutu--hayrat" onClick={() => at('hayrat')}>
              <span aria-hidden="true"></span>
              <strong>Hizmet eder</strong>
              <span className="metin-ikincil">Hayrat</span>
            </button>
          </div>
          {yanlis && <Geribildirim tur="ipucu">{kart.ipucu}</Geribildirim>}
        </section>
      )}

      <section className="carki yigin" aria-label="Vakfın çarkı">
        <div className="carki__sutun">
          <p className="carki__baslik">Para getirenler</p>
          <ul className="carki__liste">
            {ayrilan.filter((k) => k.kutu === 'akar').map((k) => (
              <li key={k.metin}>
                <span aria-hidden="true">{k.simge}</span> {k.metin}
              </li>
            ))}
          </ul>
        </div>
        <div className="carki__orta">
          <span className="carki__ok" aria-hidden="true">→</span>
          <span className="carki__vakif">Vakıf</span>
          <span className="carki__ok" aria-hidden="true">→</span>
        </div>
        <div className="carki__sutun">
          <p className="carki__baslik">Hizmet edenler</p>
          <ul className="carki__liste">
            {ayrilan.filter((k) => k.kutu === 'hayrat').map((k) => (
              <li key={k.metin}>
                <span aria-hidden="true">{k.simge}</span> {k.metin}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {bitti && (
        <div className="kart yigin lab__bitis">
          <p className="lab__bitis-baslik">Dosya kapandı!</p>
          <p>
            Soldakiler vakfa para getirdi. Vakıf bu parayla sağdaki hizmetleri yaptı. 1800’lerin hesap defteri
            gösteriyor: Yeşilcami o zaman bile kendi masrafını bu çarkla karşılıyordu.
          </p>
        </div>
      )}
    </LabKabuk>
  );
}
