import { createContext, useContext, useState, useCallback } from 'react'
import { useAuth } from './useAuth'

const ToastCtx = createContext(null)

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1047, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.07, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
  } catch {}
}

const CONFIG = {
  success: { icon: '✓', bg: 'bg-emerald-500' },
  error:   { icon: '✕', bg: 'bg-red-500' },
  info:    { icon: 'ℹ', bg: 'ac-bg' },
}

export function ToastProvider({ children }) {
  const { hasSound } = useAuth()
  const [items, setItems] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setItems(prev => [...prev, { id, message, type }])
    if (hasSound) playNotifSound()
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3000)
  }, [hasSound])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div
        className="fixed left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ top: 'max(16px, env(safe-area-inset-top))' }}
      >
        {items.map(({ id, message, type }) => {
          const { icon, bg } = CONFIG[type] ?? CONFIG.success
          return (
            <div
              key={id}
              className={`${bg} text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2.5 animate-slide-down w-full max-w-sm`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{message}</span>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
