/**
 * Hata sınırı (Error Boundary).
 *
 * NEDEN GEREKLİ: React'te bir bileşen render sırasında istisna fırlatırsa
 * TÜM ağaç sökülür ve kullanıcı boş beyaz ekran görür. Canlı demodan önce
 * bu risk kapatılmalıdır — tek bir bozuk veri alanı sunumun tamamını
 * götürebilir.
 *
 * Bu sınır hatayı yakalar, kullanıcıya anlaşılır bir mesaj ve ÇIKIŞ YOLU
 * sunar. Ayrıca hatayı konsola ve (varsa) sunucu günlüğüne bildirir.
 *
 * Erişilebilirlik: hata mesajı `role="alert"` ile duyurulur, odak hata
 * başlığına taşınır.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Durum {
  hata: Error | null;
}

interface Ozellikler {
  children: ReactNode;
  /** Hata sonrası gösterilecek ek eylem (örn. "Öğrenme yoluna dön"). */
  eylem?: ReactNode;
}

export class HataSiniri extends Component<Ozellikler, Durum> {
  state: Durum = { hata: null };

  static getDerivedStateFromError(hata: Error): Durum {
    return { hata };
  }

  componentDidCatch(hata: Error, bilgi: ErrorInfo): void {
    // Demo/üretim ortamında teşhis için konsola yaz. Kullanıcıya teknik
    // ayrıntı GÖSTERİLMEZ (bilgi sızıntısını önlemek için).
    console.error('[Kök Avı] Yakalanan hata:', hata, bilgi.componentStack);
  }

  private sifirla = (): void => {
    this.setState({ hata: null });
  };

  render(): ReactNode {
    const { hata } = this.state;
    if (!hata) return this.props.children;

    return (
      <div className="sarmal" style={{ paddingBlock: 'var(--b-6)' }}>
        <div className="kart yigin" role="alert">
          <div>
            <p className="etiket">Beklenmeyen bir sorun</p>
            <h1 style={{ marginBottom: 'var(--b-2)' }}>Bu bölüm yüklenemedi</h1>
            <p className="metin-ikincil" style={{ margin: 0 }}>
              İlerlemen kaybolmadı — bu cihazda saklı duruyor. Aşağıdan devam edebilirsin.
            </p>
          </div>

          <div className="satir">
            <button
              type="button"
              className="dugme"
              onClick={() => {
                window.location.hash = '#/yol';
                this.sifirla();
              }}
            >
              Öğrenme yoluna dön
            </button>
            <button type="button" className="dugme dugme--ikincil" onClick={this.sifirla}>
              Tekrar dene
            </button>
            <button
              type="button"
              className="dugme dugme--ikincil"
              onClick={() => window.location.reload()}
            >
              Sayfayı yenile
            </button>
          </div>

          {this.props.eylem}

          <details>
            <summary className="metin-soluk" style={{ cursor: 'pointer' }}>
              Teknik ayrıntı (geliştirici için)
            </summary>
            <pre
              style={{
                overflowX: 'auto',
                fontSize: 'var(--yazi-sm)',
                background: 'var(--zemin-vurgu)',
                padding: 'var(--b-3)',
                borderRadius: 'var(--kose-sm)',
                marginTop: 'var(--b-2)',
              }}
            >
              {hata.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
