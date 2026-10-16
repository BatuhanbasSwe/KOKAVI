import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/tokens.css';
import './styles/global.css';

/**
 * Palet seçimi (takım kararı verilene kadar karşılaştırma için).
 * Varsayılan: A "İznik Çini". Adres çubuğuna `?palet=yesil` veya `?palet=tas`
 * eklenerek diğer paletler denenir; seçim bu cihazda hatırlanır.
 * Kalıcı karar için index.html'deki <html data-palet="…"> değiştirilir.
 * Paletler yalnızca açık temayı etkiler; koyu ve yüksek kontrast temalar sabittir.
 */
const PALETLER = ['iznik', 'yesil', 'tas'] as const;
try {
  const istenen = new URLSearchParams(window.location.search).get('palet');
  if (istenen && (PALETLER as readonly string[]).includes(istenen)) {
    localStorage.setItem('kokavi.palet', istenen);
  }
  const kayitli = localStorage.getItem('kokavi.palet');
  if (kayitli && (PALETLER as readonly string[]).includes(kayitli)) {
    document.documentElement.dataset.palet = kayitli;
  }
} catch {
  /* depolama kapalıysa index.html'deki varsayılan palet kullanılır */
}

const kok = document.getElementById('kok');
if (!kok) throw new Error('#kok elemanı bulunamadı');

createRoot(kok).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
