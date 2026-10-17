import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served from https://beyza-kilicc.github.io/expense-tracker/ on GitHub Pages.
  base: '/expense-tracker/',
  plugins: [react()],
});
