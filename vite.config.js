import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cache separado, muda raramente
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Firebase — maior biblioteca, cache longo
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
          ],
          // Ícones — tree-shaken mas melhor separado
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Avisa apenas se algum chunk passar de 500KB
    chunkSizeWarningLimit: 500,
  },
})
