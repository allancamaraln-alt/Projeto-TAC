import { useState } from 'react'
import { getTheme, applyTheme } from '../lib/theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => getTheme())

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return { theme, toggle, isDark: theme === 'dark' }
}
