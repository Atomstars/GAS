import { defineConfig } from 'vite';
import { resolve } from 'path';

/* Single-entry build so the site emits ONE js chunk and can be shipped
   as a self-contained file for preview on a device with no toolchain. */
export default defineConfig({
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1400,
    rollupOptions: { input: resolve(__dirname, 'index.html') },
  },
});
