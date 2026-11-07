/**
 * Öğretmen panelinin küçük ortak parçaları.
 *
 * Buradaki üç şey kasıtlı olarak tek yerde tutulur, çünkü panelin tamamı
 * bunlara dayanır:
 *  1. `IlerlemeCubugu` — `role="progressbar"` + `aria-valuenow` + açıklayıcı
 *     `aria-label`; oran ayrıca METİN olarak yazılır (SC 1.4.1: renk tek
 *     başına anlam taşımaz).
 *  2. `GizlilikNotu` — sayıların ne OLMADIĞINI söyleyen dürüstlük kutusu.
 *  3. `KodKopyala` — sınıf kodunu büyük gösterir, kopyalar ve sonucu
 *     `role="status"` ile duyurur.
 *
 * DİKKAT: Hiçbir metinde "öğrenci sayısı" geçmez; sunucu yalnızca sayaç tutar.
 */
import { useState, type ReactNode } from 'react';
import { IkonKilit, IkonUyari } from '@/app/Ikonlar';

// ---------------------------------------------------------------------------
// Canlı bölge
// ---------------------------------------------------------------------------

export interface CanliBolgeProps {
  /** `durum` → role="status" (kibar), `hata` → role="alert" (acil). */
  tur: 'durum' | 'hata';
  children: ReactNode;
}

/**
 * Ekran okuyucu duyurusu için KALICI canlı bölge.
 *
 * Bölge ilk render'da boş olarak DOM'a girer; içeriği sonradan eklenir.
 * (Doğrudan içerikle eklenen bir canlı bölgeyi ekran okuyucular çoğu zaman
 * duyurmaz — bu yüzden kapsayıcı hep vardır.)
 */
export function CanliBolge({ tur, children }: CanliBolgeProps) {
  return (
    <div className="ogretmen__canli" role={tur === 'hata' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Durum rozeti
// ---------------------------------------------------------------------------

/** Durum her zaman METİNLE yazılır; renk yalnızca destektir (SC 1.4.1). */
export function DurumRozeti({ aktif }: { aktif: boolean }) {
  return (
    <span className={`rozet ${aktif ? 'ogretmen__rozet--aktif' : 'ogretmen__rozet--kapali'}`}>
      <span aria-hidden="true">{aktif ? '●' : '○'}</span>
      {aktif ? 'Açık' : 'Kapalı'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// İlerleme çubuğu
// ---------------------------------------------------------------------------

export interface IlerlemeCubuguProps {
  /** Çubuğu tanımlayan tam cümle (ekran okuyucu adı). */
  etiket: string;
  /** En az bir kez tamamlanmış farklı ders sayısı. */
  tamamlanan: number;
  /** Yayındaki toplam ders sayısı. */
  toplam: number;
  /** Desen çeşnisi — renk körü kullanıcı için doku ayrımı (1–4). */
  desen?: 1 | 2 | 3 | 4;
}

export function IlerlemeCubugu({ etiket, tamamlanan, toplam, desen = 3 }: IlerlemeCubuguProps) {
  if (toplam <= 0) {
    return <p className="ogretmen__ilerleme-bos">Bu bölümde yayında ders yok.</p>;
  }

  const yuzde = Math.round((tamamlanan / toplam) * 100);

  return (
    <div className="ogretmen__ilerleme">
      <div
        className="cubuk"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={toplam}
        aria-valuenow={tamamlanan}
        aria-label={`${etiket}: ${toplam} dersin ${tamamlanan} tanesi en az bir kez tamamlandı`}
      >
        <div className={`cubuk__dolgu cubuk__dolgu--d${desen}`} style={{ width: `${yuzde}%` }} />
      </div>
      <p className="ogretmen__ilerleme-metni">
        <strong>
          {tamamlanan}/{toplam}
        </strong>{' '}
        ders en az bir kez tamamlandı · %{yuzde}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dürüstlük kutusu
// ---------------------------------------------------------------------------

/**
 * Panelin en kritik metni: sayıların "kaç öğrenci" OLMADIĞINI söyler.
 * Renk tek başına anlam taşımasın diye uyarı simgesi ve metin birlikte verilir.
 */
export function GizlilikNotu() {
  return (
    <div className="bildirim bildirim--uyari ogretmen__gizlilik" role="note">
      <p className="ogretmen__gizlilik-baslik">
        <IkonUyari boyut={16} />{' '}
        <strong>Bu sayılar kaç öğrenci olduğunu göstermez.</strong>
      </p>
      <p>
        Uygulama çocuklardan kimlik toplamaz; yalnızca “bu ders bu sınıfta kaç kez tamamlandı”
        sayılır. Bu yüzden sayı, tekrar tamamlamalarla birden fazla öğrenciyi de temsil edebilir.
      </p>
    </div>
  );
}

/** Çocuk ekranındaki kısa sürüm — aynı ilke, daha az kelime. */
export function KatilimGizlilikNotu() {
  return (
    <div className="bildirim bildirim--bilgi ogretmen__gizlilik" role="note">
      <p>
        <IkonKilit boyut={16} />{' '}
        Bu sayı <strong>kaç kişi olduğunuzu göstermez.</strong> Uygulama senden isim, e-posta veya
        cihaz bilgisi istemez; yalnızca “bu ders bu sınıfta kaç kez tamamlandı” sayılır.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sınıf kodu + kopyala
// ---------------------------------------------------------------------------

export interface KodKopyalaProps {
  kod: string;
  /** `buyuk` panelin başlığında, `kucuk` liste kartlarında kullanılır. */
  boyut?: 'buyuk' | 'kucuk';
  /** Kodun üstünde görünen küçük etiket. */
  etiket?: string;
}

export function KodKopyala({ kod, boyut = 'buyuk', etiket = 'Sınıf kodu' }: KodKopyalaProps) {
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function kopyala() {
    try {
      if (!navigator.clipboard) throw new Error('pano yok');
      await navigator.clipboard.writeText(kod);
      setMesaj(`${kod} panoya kopyalandı.`);
    } catch {
      // Kopyalama engellenmişse kod zaten ekranda yazılı: elle yazılabilir.
      setMesaj(`Kopyalanamadı. Kodu elle yazabilirsin: ${kod}`);
    }
  }

  return (
    <div className="ogretmen__kod-kutu">
      <span className="etiket">{etiket}</span>
      <p className={`ogretmen__kod${boyut === 'kucuk' ? ' ogretmen__kod--kucuk' : ''}`}>{kod}</p>
      <button
        type="button"
        className="dugme dugme--ikincil ogretmen__kopyala"
        aria-label={`${kod} kodunu kopyala`}
        onClick={() => void kopyala()}
      >
        <span aria-hidden="true">⧉</span> Kopyala
      </button>
      <p className="ogretmen__kopyala-mesaj" role="status">
        {mesaj}
      </p>
    </div>
  );
}
