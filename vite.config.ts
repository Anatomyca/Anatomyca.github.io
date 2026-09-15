import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// PAGES_BASE lets the same build serve from a project sub-path
// (anatomyca.github.io/repo/) or from a custom domain at the root.
export default defineConfig({
  base: process.env.PAGES_BASE ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // never swap versions under a teacher mid-lesson
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,json}'],
        globIgnores: ['atlas/chunks/**'], // geometry is fetched on demand, not precached
        runtimeCaching: [
          {
            // Safe as CacheFirst because every chunk filename is content-hashed.
            urlPattern: ({ url }) => url.pathname.includes('/atlas/chunks/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'atlas-geometry',
              expiration: { maxEntries: 300 },
            },
          },
        ],
      },
      manifest: {
        name: 'Anatomyca',
        short_name: 'Anatomyca',
        description:
          'A 3D map of the human body, with organ names in English, Sinhala and Tamil.',
        lang: 'en',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        theme_color: '#0b131b',
        background_color: '#0b131b',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Keep the 3D engine and the search index out of the entry chunk, so
        // the shell stays inside its size budget and three.js caches across
        // releases that do not touch it.
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/minisearch')) return 'search';
          return undefined;
        },
      },
    },
  },
});
