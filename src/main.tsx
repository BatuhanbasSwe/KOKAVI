import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { cevrimdisiHazirla } from './lib/cevrimdisi';
import './styles/tokens.css';
import './styles/global.css';

const kok = document.getElementById('kok');
if (!kok) throw new Error('#kok elemanı bulunamadı');

createRoot(kok).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// İnternet varken ders verisini ve kapak fotoğraflarını sessizce önbelleğe al:
// ağ kesildiğinde Keşfet, Harita, Defter ve dersler açılmaya devam eder.
// Önemli: service worker sayfayı KONTROL ETMEDEN başlamak istekleri önbelleğe
// yazmaz (ilk kurulumda yarış olur); bu yüzden `controller` beklenir.
function cevrimdisiBaslat() {
  window.setTimeout(() => {
    void cevrimdisiHazirla();
  }, 3000);
}

if ('serviceWorker' in navigator) {
  const sw = navigator.serviceWorker;
  void sw.ready
    .then(() => {
      if (sw.controller) {
        cevrimdisiBaslat();
        return;
      }
      sw.addEventListener('controllerchange', cevrimdisiBaslat, { once: true });
    })
    .catch(() => {
      /* service worker yoksa çevrimdışı paket de yok: akışı engelleme */
    });
} else {
  cevrimdisiBaslat();
}
