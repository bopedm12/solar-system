import { defineConfig } from 'vite';

// Content-Security-Policy injected only into production builds (keeps Vite dev HMR working).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://images-api.nasa.gov",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'"
].join('; ');

const injectCsp = () => ({
  name: 'inject-csp-meta',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<head>',
      `<head>\n  <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n  <meta name="referrer" content="no-referrer" />`
    );
  }
});

export default defineConfig({
  base: '/solar-system/',
  plugins: [injectCsp()],
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
