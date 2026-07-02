import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const isWebView = (
  /\bwv\b|WebView/i.test(navigator.userAgent) ||
  typeof window.Capacitor !== 'undefined' ||
  window.location.protocol === 'capacitor:'
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV || isWebView) {
    // Em dev, desregistra qualquer SW antigo para evitar cache de arquivos JS
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister())
    })
  } else {
    ;(async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
        // iOS standalone (app na tela de início) não dispara a verificação automática
        // de update do SW que o Safari normal faz ao navegar — força manualmente.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update()
        })
        registration.update()
      } catch {
        // registro do SW falhou silenciosamente (sem internet, conflito de escopo, etc.)
      }
    })()
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
