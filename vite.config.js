import { defineConfig } from 'vite';

// Development preview only. Netlify still uses the dependency-free static build.
export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
});
