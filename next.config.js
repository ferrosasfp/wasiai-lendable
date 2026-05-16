// next.config.js — W0.5a PWA scaffold mobile-first
const withPWAInit = require('@ducanh2912/next-pwa').default;

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  extendDefaultRuntimeCaching: false,
  fallbacks: { document: '/~offline' },
  workboxOptions: {
    disableDevLogs: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      // CD-17: payment paths MUST never cache (= financial fraud)
      {
        urlPattern: /^https:\/\/wasiai-a2a-production\.up\.railway\.app\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'wasiai-a2a-networkonly' },
      },
      {
        urlPattern: /^https:\/\/wasiai-facilitator-production\.up\.railway\.app\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'wasiai-facilitator-networkonly' },
      },
      {
        urlPattern: /\/api\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'cobraya-api-networkonly' },
      },
      // Brand assets — long-lived cache
      {
        urlPattern: /\/(icons|splashes)\//,
        handler: 'CacheFirst',
        options: {
          cacheName: 'cobraya-brand-assets',
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      // CD-25: cookie-gated routes MUST NEVER be cached, otherwise an authed
      // user could see another tenant's HTML after a logout. WKH-COBRAYA-DAPP-SHELL W11.
      {
        urlPattern: /^\/(login|signup|onboarding|dashboard|negociar|historial|perfil)(\/|$)/,
        handler: 'NetworkOnly',
        options: { cacheName: 'cobraya-auth-gated-networkonly' },
      },
      // Document navigations — NetworkFirst + ~offline fallback
      {
        urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'document',
        handler: 'NetworkFirst',
        options: { cacheName: 'documents', networkTimeoutSeconds: 3 },
      },
    ],
  },
});

module.exports = withPWA({ reactStrictMode: true, poweredByHeader: false });
