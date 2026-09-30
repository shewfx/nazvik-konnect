import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'zite-endpoints-sdk': path.resolve(__dirname, './src/stubs/zite-endpoints-sdk.ts'),

      'zite-file-upload-sdk': path.resolve(__dirname, './src/stubs/zite-file-upload-sdk.ts'),
    },
  },
})
