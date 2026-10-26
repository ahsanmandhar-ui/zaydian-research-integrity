import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/zaydian-research-integrity/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      manifest: {
        name: 'Zaydian Research Integrity',
        short_name: 'ZRI',
        description: 'Local-first research management',
        theme_color: '#1a73e8',
        icons: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/excel-spreadsheet/**'],
    isolate: false,
    testTimeout: 30000,
  },
})
