/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base: the build works from any folder of any static host.
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Flag Quiz',
        short_name: 'Flag Quiz',
        description: 'Learn the flags of the world.',
        lang: 'en',
        theme_color: '#00843D',
        background_color: '#121212',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Only used by social media previews.
        globIgnores: ['og-image.png'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
