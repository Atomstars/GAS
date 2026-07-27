import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  build: {
    outDir: 'dist-logo', emptyOutDir: true, chunkSizeWarningLimit: 1200,
    rollupOptions: { input: resolve(__dirname, 'logo.html') },
  },
});
