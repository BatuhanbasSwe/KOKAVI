/**
 * Erişilebilir veri tablosu.
 *
 * WCAG 2.2 AA gereği:
 *  - `<caption>` ile tablonun ne listelediği duyurulur (SC 1.3.1).
 *  - Başlık hücreleri `<th scope="col">` taşır; ekran okuyucu hücreyi başlıkla
 *    birlikte okur.
 *  - Yatay kaydırma gerektiğinde kap `role="region"` + `tabIndex={0}` olur, böylece
 *    klavye kullanıcısı tabloyu kaydırabilir (SC 2.1.1).
 */
import type { ReactNode } from 'react';

export interface TabloSutunu<Satir> {
  /** Kararlı anahtar — React ve hücre eşlemesi için. */
  anahtar: string;
  baslik: string;
  icerik: (satir: Satir, indeks: number) => ReactNode;
  sinif?: string;
}

export interface VeriTablosuProps<Satir> {
  /** Tablonun adı; `<caption>` olarak yazılır. */
  baslik: string;
  /** false ise başlık yalnızca ekran okuyucuya verilir (görsel başlık varsa). */
  baslikGorunur?: boolean;
  sutunlar: TabloSutunu<Satir>[];
  satirlar: Satir[];
  satirAnahtari: (satir: Satir, indeks: number) => string;
  /** Liste boşken gösterilecek metin. */
  bosMesaj: string;
}

export function VeriTablosu<Satir>({
  baslik,
  baslikGorunur = false,
  sutunlar,
  satirlar,
  satirAnahtari,
  bosMesaj,
}: VeriTablosuProps<Satir>) {
  if (satirlar.length === 0) {
    return <p className="bildirim bildirim--bilgi">{bosMesaj}</p>;
  }

  return (
    <div
      className="panel__tablo-kaydirma"
      role="region"
      aria-label={`${baslik} (yatay kaydırılabilir tablo)`}
      tabIndex={0}
    >
      <table className="panel__tablo">
        <caption className={baslikGorunur ? 'panel__tablo-baslik' : 'sr-only'}>{baslik}</caption>
        <thead>
          <tr>
            {sutunlar.map((sutun) => (
              <th key={sutun.anahtar} scope="col" className={sutun.sinif}>
                {sutun.baslik}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir, indeks) => (
            <tr key={satirAnahtari(satir, indeks)}>
              {sutunlar.map((sutun) => (
                <td key={sutun.anahtar} className={sutun.sinif}>
                  {sutun.icerik(satir, indeks)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
