const LS_KEY = 'climapro-theme'

export function getTheme() {
  const stored = localStorage.getItem(LS_KEY)
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  localStorage.setItem(LS_KEY, mode)
}
