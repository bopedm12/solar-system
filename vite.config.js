import { defineConfig } from 'vite';

export default defineConfig({
  base: '/solar-system/',
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-gsap': ['gsap']
        }
      }
    }
  }
});

