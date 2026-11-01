import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// On GitHub Pages the site lives at https://<user>.github.io/<repo>/, so every
// asset URL needs the "/<repo>/" prefix. GitHub Actions sets GITHUB_REPOSITORY
// to "owner/repo", so we derive the base path from it. Locally it's just "/".
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repo ? `/${repo}/` : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version installs in the background and is used on the next page load.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'My personal dashboard: dailies, weekly goal, affirmations, and goals.',
        theme_color: '#0f766e',
        background_color: '#f3f6f9',
        display: 'standalone',
        // start_url and scope default to `base`, so they work on GitHub Pages too.
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything the app needs so it works fully offline,
        // including the lazy-loaded 3D chunk.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // The default limit is 2 MiB per file. The three.js chunk is ~0.9 MB today;
        // 5 MiB leaves room for richer 3D in the redesign.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    // three.js makes the lazy-loaded 3D chunk ~900 kB. That's expected and it
    // never blocks the first paint, so raise the warning threshold above it.
    chunkSizeWarningLimit: 1200,
  },
})
