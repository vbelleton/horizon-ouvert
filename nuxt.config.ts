// Horizon Ouvert : la page d'accueil publique est rendue côté serveur,
// l'application elle-même (/app/**) tourne en SPA : elle est privée,
// n'a pas besoin de SEO et parle directement à Supabase.
export default defineNuxtConfig({
  compatibilityDate: '2026-07-31',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // Clés publiques (l'anon key est faite pour être exposée : la sécurité
      // repose sur les politiques RLS de la base, pas sur ce secret).
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },

  nitro: {
    // @ts-expect-error: option valide pour Nitro, absente du type InputConfig de cette version de Nuxt (même cas que Cieux Ouverts)
    preset: 'cloudflare-pages',
  },

  routeRules: {
    '/app/**': { ssr: false },
    '/connexion': { ssr: false },
    // Source UNIQUE des en-têtes de sécurité (leçon de Cieux Ouverts :
    // ne jamais les redéclarer dans public/_headers, Cloudflare joindrait
    // les deux valeurs par une virgule et les navigateurs les ignoreraient).
    '/**': {
      // @ts-expect-error: `headers` est valide à l'exécution, absent du type de cette version de Nuxt (même cas que Cieux Ouverts)
      headers: {
        'x-frame-options': 'DENY',
        'content-security-policy': "frame-ancestors 'none'",
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        'strict-transport-security': 'max-age=15552000',
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Horizon Ouvert',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Voir clairement. Discerner sereinement. Garder le cap.' },
        { name: 'theme-color', content: '#f6f4ef', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#14161a', media: '(prefers-color-scheme: dark)' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  typescript: { strict: true },
})
