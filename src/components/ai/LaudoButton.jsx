import { useState, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { compartilharLaudo } from '../../lib/pdf'

export default function LaudoButton({ laudoData }) {
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { profile } = useAuth()

  const handleGerar = useCallback(async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      await compartilharLaudo({ laudo: laudoData, tecnico: profile })
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setErrorMsg('Erro ao gerar o PDF. Tente novamente.')
    }
  }, [laudoData, profile])

  if (status === 'success') {
    return <p className="mt-2 text-xs text-green-600 font-semibold">✅ Laudo gerado com sucesso!</p>
  }

  return (
    <div className="mt-3">
      {errorMsg && <p className="text-xs text-red-500 mb-2">{errorMsg}</p>}
      <button
        onClick={handleGerar}
        disabled={status === 'loading'}
        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
        style={{ background: 'rgb(var(--ac))' }}
      >
        {status === 'loading' ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Gerando PDF...
          </>
        ) : '📄 Baixar Laudo em PDF'}
      </button>
    </div>
  )
}
