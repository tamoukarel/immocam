import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Photos d'annonces (bucket Storage "annonces") : une fois vues
            // en ligne, elles restent consultables hors connexion.
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos-annonces',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'ImmoCam',
        short_name: 'ImmoCam',
        description: 'Logement au Cameroun, sans agence ni commission',
        start_url: '/',
        display: 'standalone',
        background_color: '#F0F4FF',
        theme_color: '#0B3B91',
        icons: [
          { src: '/logo-icon.png', sizes: '450x450', type: 'image/png' },
          { src: '/logo-icon.png', sizes: '450x450', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
