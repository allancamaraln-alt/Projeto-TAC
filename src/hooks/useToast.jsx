import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

const CONFIG = {
  success: { icon: '✓', bg: 'bg-emerald-500' },
  error:   { icon: '✕', bg: 'bg-red-500' },
  info:    { icon: 'ℹ', bg: 'ac-bg' },
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setItems(prev => [...prev, { id, message, type }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

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
