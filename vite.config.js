import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@dimforge/rapier2d-compat'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
})
