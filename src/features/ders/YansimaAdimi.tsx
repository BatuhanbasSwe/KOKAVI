/**
 * 05 · YANSIMA — ders özeti + Vakıf Röntgeni + Kâşif Defteri kaydı.
 *
 * PDF: "Dört katman açıldığında ortaya çıkan ödül ekranı" ve "Ödülün kendisi
 * bilgi." Bu yüzden ekranda rozet değil, eserin ekonomik döngüsü gösterilir.
 */
import type { Eser, YansimaAdimi as YansimaVerisi } from '@shared/types';
import { VakifRontgeni } from './VakifRontgeni';
import { DinleDugmesi } from './DinleDugmesi';

interface Props {
  yansima: YansimaVerisi;
  eser: Eser | null;
  eserYukleniyor: boolean;
  eserHatasi: string | null;
  onBitir: () => void;
}

export function YansimaAdimi({ yansima, eser, eserYukleniyor, eserHatasi, onBitir }: Props) {
  return (
    <div className="yigin">
      <div className="kart ders-ozet">
        <div className="ders-soru-kutusu">
          <p className="etiket">Ders özeti</p>
          <DinleDugmesi metin={yansima.ozet} />
        </div>
        <p className="ders-ozet__metin">{yansima.ozet}</p>
      </div>

      {/* Vakıf Röntgeni başlığı: soru, ekranın odağıdır. */}
      <h3 className="ders-soru">{yansima.rontgenSorusu}</h3>

      <section className="ders-rontgen-bolumu" aria-labelledby="ders-rontgen-basligi">
        <p className="etiket" id="ders-rontgen-basligi">
          Vakıf Röntgeni
        </p>
        <VakifRontgeni eser={eser} eserYukleniyor={eserYukleniyor} eserHatasi={eserHatasi} />
      </section>

      {/*
        Uzun açıklama ve künye "Büyükler için" bölümünde: çocuk ekranı tek
        fikirde kalır, yetişkin tüm ayrıntıya bir dokunuşla ulaşır.
        PDF: "Her eser kaynağıyla öğretilir." — künye silinmedi, katlandı.
      */}
      <details className="ders-ayrinti">
        <summary>Büyükler için: ayrıntılı açıklama</summary>
        <div className="ders-ayrinti__icerik">
          <p>{yansima.rontgenAciklama}</p>
          <p className="kaynak">{yansima.kaynakKunye}</p>
        </div>
      </details>

      <div className="ders-eylem">
        <button type="button" className="dugme dugme--genis" onClick={onBitir}>
          Dersi bitir
        </button>
      </div>
    </div>
  );
}
