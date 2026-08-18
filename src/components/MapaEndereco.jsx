import { useState } from 'react'
import { googleMapsEmbedUrl } from '../lib/maps'
import NavegacaoModal from './NavegacaoModal'

export default function MapaEndereco({ endereco }) {
  const [open, setOpen] = useState(false)
  if (!endereco) return null

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(true) }}
        className="relative w-full h-40 rounded-2xl overflow-hidden border border-gray-100 cursor-pointer"
      >
        <iframe
          src={googleMapsEmbedUrl(endereco)}
          title="Mapa do endereço"
          className="absolute inset-0 w-full h-full pointer-events-none"
          loading="lazy"
        />
        <span className="absolute bottom-2 right-2 bg-white text-xs font-semibold text-gray-700 px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
          🧭 Como chegar
        </span>
      </div>

      <NavegacaoModal open={open} endereco={endereco} onClose={() => setOpen(false)} />
    </>
  )
}
