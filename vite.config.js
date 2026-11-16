import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // works at any path, e.g. username.github.io/natefy/
  plugins: [react()],
  server: { port: 5174 },
});
