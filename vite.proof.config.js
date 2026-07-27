import { defineConfig } from 'vite';
import { resolve } from 'path';

/* Single-entry build so the proof emits ONE js chunk and can be shipped
   as a self-contained file. The multi-page config splits three.js into a
   shared chunk, which cannot simply be concatenated. */
export default defineConfig({
  build: {
    outDir: 'dist-proof',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: resolve(__dirname, 'proof.html') },
  },
});
