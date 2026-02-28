// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Site configuration for Nuxt SEO
  site: {
    url: 'https://twotsps.com',
    name: 'TwoTeaspoons',
    description: 'Recipe sharing platform for home cooks',
    defaultLocale: 'en',
  },

  app: {
    head: {
      titleTemplate: '%s %separator %siteName',
      meta: [
        { name: 'theme-color', content: '#C97B5D' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap',
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  modules: ['@nuxt/ui', '@nuxtjs/seo', '@nuxt/eslint'],

  // Color mode follows system preference by default
  colorMode: {
    preference: 'system',
    fallback: 'light',
  },

  eslint: {
    config: {
      standalone: true,
    },
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    // Server-side only
    neonAuthUrl: process.env.NEON_AUTH_URL,
    // Client-side (public)
    public: {
      neonAuthUrl: process.env.NUXT_PUBLIC_NEON_AUTH_URL,
    },
  },
})
