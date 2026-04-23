import { useEffect } from 'react'

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-3xl px-6 pt-5 animate-slide-up"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-gray-800 text-center">{title}</h2>
        {message && (
          <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">{message}</p>
        )}
        <div className="mt-6 space-y-3 pb-2">
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={
              danger
                ? 'w-full py-3.5 px-4 bg-red-500 text-white rounded-2xl font-semibold active:scale-95 transition-all'
                : 'btn-primary'
            }
          >
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="w-full text-center text-gray-400 py-2.5 font-medium text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
