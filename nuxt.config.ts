// https://nuxt.com/docs/api/configuration/nuxt-config
// import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  app: {
    pageTransition: { name: 'slide-up', mode: 'out-in' },
    layoutTransition: { name: 'slide-up', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'fr' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: '%s | Relation anxieux-évitant',
      meta: [
        { name: 'description', content: 'Comprends l\'attachement adulte et la dynamique anxieux-évitant. Test gratuit, analyses personnalisées et ressources pour mieux vivre tes relations amoureuses.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Relation anxieux-évitant' },
        { property: 'og:locale', content: 'fr_FR' },
        { name: 'twitter:card', content: 'summary' },
      ],
    },
  },
  
  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  routeRules: {
    // Set layout for specific route
    '/blog': { appLayout: 'article' },
    // '/admin': { appLayout: 'admin' },
    // Set layout for multiple routes
    // '/dashboard/**': { appLayout: 'dashboard' },
    '/attachment-questionnaire/**': { appLayout: 'questionnaire' },
    '/user/attachment-questionnaire/**': { appLayout: 'results' },
    // Disable layout for a route
    // '/landing': { appLayout: false },
  },

  modules: [
    '@nuxt/a11y',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxtjs/sitemap',
    '@nuxt/test-utils',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    'nuxt-charts',
    'nuxt-lucide-icons'
  ],

  site: {
    url: 'https://relation-anxieux-evitant.web.app',
  },

  sitemap: {
    exclude: [
      '/user/**',
      '/attachment-questionnaire/questionnaire',
      '/attachment-questionnaire/results',
    ],
  },

  nitro: {
    preset: 'firebase',
  },

  runtimeConfig: {
    openAiApiKey: process.env.NUXT_OPENAI_API_KEY,
    openAiModel: process.env.NUXT_OPENAI_MODEL || 'gpt-5-mini',
    openAiReasoningEffort: process.env.NUXT_OPENAI_REASONING_EFFORT || 'low',
    openAiMaxOutputTokens: Number(process.env.NUXT_OPENAI_MAX_OUTPUT_TOKENS || 1800),
    openAiPromptCacheKey: process.env.NUXT_OPENAI_PROMPT_CACHE_KEY || 'relation-anxieux-evitant:attachment-ai',
    openAiPromptCacheRetention: process.env.NUXT_OPENAI_PROMPT_CACHE_RETENTION || 'in_memory',
    public: {
      appEnv: process.env.NUXT_PUBLIC_APP_ENV || 'prod',
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
      firebaseMeasurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
      stripeResultsProductId: process.env.NUXT_PUBLIC_STRIPE_RESULTS_PRODUCT_ID || '',
      stripeResultsPriceId: process.env.NUXT_PUBLIC_STRIPE_RESULTS_PRICE_ID || '',
      stripeIaProductId: process.env.NUXT_PUBLIC_STRIPE_IA_PRODUCT_ID || '',
      stripeIaPriceId: process.env.NUXT_PUBLIC_STRIPE_IA_PRICE_ID || '',
      stripeEbookProductId: process.env.NUXT_PUBLIC_STRIPE_EBOOK_PRODUCT_ID || '',
      stripeEbookPriceId: process.env.NUXT_PUBLIC_STRIPE_EBOOK_PRICE_ID || '',
      stripeMembershipProductId: process.env.NUXT_PUBLIC_STRIPE_MEMBERSHIP_PRODUCT_ID || '',
      stripeMembershipPriceId: process.env.NUXT_PUBLIC_STRIPE_MEMBERSHIP_PRICE_ID || '',
      stripeFormationProductId: process.env.NUXT_PUBLIC_STRIPE_FORMATION_PRODUCT_ID || '',
      stripeFormationPriceId: process.env.NUXT_PUBLIC_STRIPE_FORMATION_PRICE_ID || '',
      stripeTestLiveProductId: process.env.NUXT_PUBLIC_STRIPE_TESTLIVE_PRODUCT_ID || '',
      stripeTestLivePriceId: process.env.NUXT_PUBLIC_STRIPE_TESTLIVE_PRICE_ID || '',
    },
  },
})
