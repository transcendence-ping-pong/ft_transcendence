// https://vitejs.dev/config/
// @ts-nocheck
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true,
     proxy: {
      '/api': {
        target: 'http://localhost:4000', // ou http://backend:4000 no Docker
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
