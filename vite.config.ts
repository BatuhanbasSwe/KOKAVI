import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Kök Avı — Vakıf Eserleri',
        short_name: 'Kök Avı',
        description:
          'Vakıf eserlerini çocuklara günlük mikro derslerle öğreten öğrenme uygulaması.',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Çevrimdışı ders desteği: uygulama kabuğu + ders verisi önbelleğe alınır.
        // .mjs: MapLibre worker'ı (harita çevrimdışı da çizilsin).
        // k.webp: 57 eserin küçük kapak fotoğrafı (~1,5 MB). Keşfet/Bugün/Yol/
        // Defter kutucukları ile ders başlıkları internetsiz de görünür.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2,json}', 'gorseller/**/k.webp'],
        // Büyük eser fotoğrafları (~25 MB) ve arşiv (~23 MB) ilk yüklemeye girmez;
        // açıldıkça aşağıdaki çalışma zamanı önbelleğine alınır. Ayrıca
        // `src/lib/cevrimdisi.ts` internet varken ders verisini ve kapakları
        // sessizce ısıtır; böylece çevrimdışı ders açılır.
        // liste.json (136 KB) önbelleğe girer: harita ilçe sayıları internetsiz de gelsin.
        globIgnores: [
          'gorseller/**/[0-9].webp',
          'gorseller/**/[0-9][0-9].webp',
          'arsiv/foto/**',
          'arsiv/metin/**',
        ],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Harita sokak karoları: gezilen bölgeler internetsiz de görünsün.
            // StaleWhileRevalidate: TileJSON her hafta yeni karo sürümünü gösterir.
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kokavi-harita-karo',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Not: Workbox RegExp'i tam URL'ye (https://...) uygular; ^\/ hiç eşleşmez.
            // Eser fotoğrafı (1..6.webp), arşiv fotoğrafı ve arşiv metni: açıldıkça
            // önbelleğe alınır; kez görülen görsel çevrimdışı da açılır.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /^\/(gorseller|arsiv)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kokavi-gorsel-arsiv',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // Ders, eser, şehir/ünite, külliye ve filtre verisi: önce ağ (taze);
            // 4 sn'de gelmezse ya da internet yoksa son kopya.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              /^\/api\/(eserler|uniteler|sehirler|kulliyeler|yol|dersler|filtreler)\b/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'kokavi-api',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [200] },
              // 57 ders + 57 eser + liste uçları: çevrimdışı paket tam sığsın.
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // axe denetimleri paralel yük altında 5 sn varsayılanı aşabiliyor
    testTimeout: 20000,
  },
});
