import colors from 'tailwindcss/colors'
export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}'
  ],
  theme: {
    colors: {
      primary: '#ecf3fd',
      secondary: '#faecf1',
      white: colors.white,
      gray: colors.gray,
      blue: colors.sky,
      red: colors.rose,
      pink: colors.fuchsia,
      yellow: colors.amber,
      green: colors.emerald,
      transparent: 'transparent',
      current: 'currentColor',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    fontFamily: {
      sans: ['Inter', 'Arial', 'Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
    },
    extend: {
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      colors: { 
        primary: '#ecf3fd',
        secondary: '#faecf1',
      },
    }
  },
  variants: {
    extend: {
      borderColor: ['focus-visible'],
      opacity: ['disabled'],
    }
  },
  // plugins: [
  //   require('@tailwindcss/forms'),
  //   require('@tailwindcss/aspect-ratio'),
  //   require('@tailwindcss/typography'),
  //   require('tailwindcss-children'),
  // ],
}