import { defineConfig } from 'astro/config';

// Sitio estático: `npm run build` genera dist/ con HTML listo.
export default defineConfig({
  site: 'https://juanacabrera.com.ar',
  output: 'static',
  trailingSlash: 'never',
  build: { inlineStylesheets: 'auto' },
  server: { port: 4321 },
});
