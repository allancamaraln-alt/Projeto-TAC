import { useRef, useEffect, useState } from 'react'

export default function SignaturePad({ titulo, onConfirmar, onFechar }) {
  const canvasRef = useRef(null)
  const desenhandoRef = useRef(false)
  const [vazio, setVazio] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPonto(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }

  function iniciar(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const p = getPonto(e, canvas)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    desenhandoRef.current = true
    setVazio(false)
  }

  function desenhar(e) {
    e.preventDefault()
    if (!desenhandoRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const p = getPonto(e, canvas)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function parar(e) {
    e.preventDefault()
    desenhandoRef.current = false
  }

  function limpar() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setVazio(true)
  }

  function confirmar() {
    canvasRef.current.toBlob(blob => onConfirmar(blob), 'image/png', 0.9)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end justify-center">
      <div className="bg-white w-full rounded-t-3xl px-4 pt-5 pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">{titulo}</h2>
          <button onClick={onFechar} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">Assine no espaço abaixo</p>

        <div className="relative border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={640}
            height={240}
            className="w-full"
            style={{ touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={iniciar}
            onMouseMove={desenhar}
            onMouseUp={parar}
            onMouseLeave={parar}
            onTouchStart={iniciar}
            onTouchMove={desenhar}
            onTouchEnd={parar}
          />
          {vazio && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-gray-300">Assine aqui</p>
            </div>
          )}
          <div className="absolute bottom-0 left-8 right-8 h-px bg-gray-200" />
        </div>

        <div className="flex gap-3">
          <button
            onClick={limpar}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 active:bg-gray-50"
          >
            Limpar
          </button>
          <button
            onClick={confirmar}
            disabled={vazio}
            className="flex-1 btn-primary disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
