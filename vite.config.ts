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
        background_color: '#0e1315',
        theme_color: '#0e1315',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Çevrimdışı ders desteği: uygulama kabuğu + ders verisi önbelleğe alınır.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // Eser fotoğrafları (~25 MB) ve arşiv (~23 MB) ilk yüklemeye girmez;
        // açıldıkça aşağıdaki çalışma zamanı önbelleğine alınır.
        globIgnores: ['gorseller/**', 'arsiv/**'],
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
            urlPattern: /^\/(gorseller|arsiv)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kokavi-gorsel-arsiv',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            urlPattern: /^\/api\/(eserler|uniteler|yol|ders)\b.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kokavi-api',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
  },
});
