// https://nuxt.com/docs/api/configuration/nuxt-config
// import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  app: {
    pageTransition: { name: 'slide-up', mode: 'out-in' },
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
    // Disable layout for a route
    // '/landing': { appLayout: false },
  },

  modules: [
    '@nuxt/a11y',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/test-utils',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    'nuxt-charts',
    'nuxt-lucide-icons'
  ],
})