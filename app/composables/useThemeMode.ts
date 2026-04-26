type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme-mode'

export const useThemeMode = () => {
  const themeMode = useState<ThemeMode>('theme-mode', () => 'light')

  const applyThemeMode = (mode: ThemeMode) => {
    if (!import.meta.client) return

    themeMode.value = mode
    document.documentElement.dataset.theme = mode
    document.documentElement.classList.toggle('dark', mode === 'dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  }

  const initThemeMode = () => {
    if (!import.meta.client) return

    const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (storedMode === 'dark' || storedMode === 'light') {
      applyThemeMode(storedMode)
      return
    }

    applyThemeMode('dark')
  }

  const toggleThemeMode = () => {
    applyThemeMode(themeMode.value === 'dark' ? 'light' : 'dark')
  }

  return {
    themeMode,
    initThemeMode,
    toggleThemeMode,
    isDarkMode: computed(() => themeMode.value === 'dark'),
  }
}
