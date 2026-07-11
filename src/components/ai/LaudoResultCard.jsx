import { useState, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { compartilharLaudo } from '../../lib/pdf'

// Renderizado pelo ActionResultCard quando a ferramenta generate_laudo já
// salvou o laudo (tabela laudos) — substitui o antigo LaudoButton, que
// dependia do modelo reescrever o laudo inteiro num bloco <<<LAUDO_JSON>>>
// em texto livre.
export default function LaudoResultCard({ laudo }) {
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { profile } = useAuth()

  const handleGerar = useCallback(async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      await compartilharLaudo({ laudo, tecnico: profile })
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setErrorMsg('Erro ao gerar o PDF. Tente novamente.')
    }
  }, [laudo, profile])

  return (
    <div className="mt-3">
      <p className="text-xs text-emerald-600 font-semibold mb-2">✅ Laudo salvo</p>
      {errorMsg && <p className="text-xs text-red-500 mb-2">{errorMsg}</p>}
      {status === 'success' ? (
        <p className="text-xs text-green-600 font-semibold">PDF gerado com sucesso!</p>
      ) : (
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
      )}
    </div>
  )
}
