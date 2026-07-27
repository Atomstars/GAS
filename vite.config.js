import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'index.html'),
        proof: resolve(__dirname, 'proof.html'),
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
