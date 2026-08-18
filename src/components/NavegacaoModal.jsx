import { useEffect } from 'react'
import { googleMapsUrl, wazeUrl } from '../lib/maps'
import { GoogleMapsIcon, WazeIcon } from './icons/MapIcons'

export default function NavegacaoModal({ open, endereco, onClose }) {
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
        <h2 className="text-base font-bold text-gray-800 text-center">Como chegar</h2>
        <p className="text-sm text-gray-500 text-center mt-1 mb-5 leading-relaxed">{endereco}</p>

        <div className="space-y-2">
          <a
            href={googleMapsUrl(endereco)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 w-full py-3 px-4 bg-gray-50 rounded-2xl active:scale-95 transition-all"
          >
            <GoogleMapsIcon />
            <span className="font-semibold text-gray-800">Google Maps</span>
          </a>
          <a
            href={wazeUrl(endereco)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 w-full py-3 px-4 bg-gray-50 rounded-2xl active:scale-95 transition-all"
          >
            <WazeIcon />
            <span className="font-semibold text-gray-800">Waze</span>
          </a>
        </div>

        <button onClick={onClose} className="w-full text-center text-gray-400 py-2.5 mt-3 font-medium text-sm">
          Cancelar
        </button>
      </div>
    </div>
  )
}
