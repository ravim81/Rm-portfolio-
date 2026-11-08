import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root,
  base: '/world/',
  publicDir: false,
  plugins: [react()],
  build: { outDir: path.resolve(root, '../public/world'), emptyOutDir: true, sourcemap: false, target: 'es2022', rollupOptions: { output: { manualChunks: { three: ['three'], fiber: ['@react-three/fiber', '@react-three/drei'], physics: ['@react-three/rapier'], motion: ['gsap'] } } } },
  server: { host: '0.0.0.0', port: 5173 }
});