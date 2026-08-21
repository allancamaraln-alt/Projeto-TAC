import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Recuperação automática de "chunk perdido": as páginas são carregadas sob
// demanda (React.lazy) com arquivos de nome único por deploy. Se alguém está
// com o app aberto quando um novo deploy sai, o navegador ainda tenta buscar
// o arquivo antigo — que não existe mais — e trava numa tela em branco (visto
// no Sentry como "Failed to fetch dynamically imported module" / "Importing a
// module script failed" / "'text/html' is not a valid JavaScript MIME type").
// Vite dispara este evento nesse caso; a saída é recarregar a página pra
// pegar o HTML/manifesto novo. Guarda de sessão evita loop de reload infinito
// caso o problema persista (ex: deploy realmente quebrado).
window.addEventListener('vite:preloadError', () => {
  const key = 'climapro:chunk-reload'
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  window.location.reload()
})

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

// Sessão ficou estável por 10s sem outro erro de chunk — libera a guarda
// acima pra reagir de novo caso um deploy futuro (mais tarde, na mesma aba)
// cause o mesmo problema.
setTimeout(() => sessionStorage.removeItem('climapro:chunk-reload'), 10_000)
