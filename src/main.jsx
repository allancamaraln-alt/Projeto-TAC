import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const isWebView = /\bwv\b|WebView/i.test(navigator.userAgent)

if ('serviceWorker' in navigator && !isWebView) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .catch(() => {})

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
