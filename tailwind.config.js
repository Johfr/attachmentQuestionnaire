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
        lightBrown: '#d4c9c4',
        lightPeach: '#fff8f6',
        rust : '#a7482f',
        brown: '#39312d',
        softGreen: '#f2f7e7',
        softPeach: '#f8ebe6',
        slateBlue: '#dfe8ff',
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