import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import ConfirmModal from '../../ConfirmModal'
import { uploadPmocDocumento, removerPmocDocumento } from '../../../lib/pmocFotos'
import { formatDateTime } from '../../../lib/format'

export default function TabDocumentos({ pmocId, tecnicoId, plano, cliente, estabelecimento, equipamentos, tecnico }) {
  const toast = useToast()
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [confirmRemover, setConfirmRemover] = useState(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('pmoc_documentos').select('*').eq('pmoc_id', pmocId).order('created_at', { ascending: false })
    setDocumentos(data ?? [])
    setLoading(false)
  }, [pmocId])

  useEffect(() => {
    function iniciar() { carregar() }
    iniciar()
  }, [carregar])

  async function gerarPdf() {
    setGerandoPdf(true)
    try {
      const { compartilharPmocPDF } = await import('../../../lib/pmocPdf')
      const equipIds = equipamentos.map(e => e.id)
      const [{ data: todosItens }, { data: execucoes }, { data: execucaoItens }] = await Promise.all([
        equipIds.length ? supabase.from('pmoc_plano_itens').select('*').in('equipamento_id', equipIds) : Promise.resolve({ data: [] }),
        supabase.from('pmoc_execucoes').select('*').eq('pmoc_id', pmocId),
        supabase.from('pmoc_execucao_itens').select('*').eq('pmoc_id', pmocId),
      ])
      await compartilharPmocPDF({
        pmoc: plano,
        cliente,
        estabelecimento,
        equipamentos,
        itens: todosItens ?? [],
        execucoes: execucoes ?? [],
        execucaoItens: execucaoItens ?? [],
        tecnico,
      })
    } catch {
      toast('Erro ao gerar o PDF.', 'error')
    }
    setGerandoPdf(false)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (files.length === 0) return
    setEnviando(true)
    for (const file of files) {
      try {
        await uploadPmocDocumento(file, { tecnicoId, pmocId })
      } catch {
        toast(`Erro ao enviar ${file.name}.`, 'error')
      }
    }
    setEnviando(false)
    carregar()
  }

  async function excluir(doc) {
    try {
      await removerPmocDocumento(doc)
      toast('Documento removido.')
      carregar()
    } catch {
      toast('Erro ao remover documento.', 'error')
    }
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <button onClick={gerarPdf} disabled={gerandoPdf} className="w-full py-3 rounded-2xl font-semibold text-sm border ac-border ac-text bg-white active:bg-gray-50 transition-colors disabled:opacity-60">
        {gerandoPdf ? 'Gerando PDF...' : '📄 Gerar documento PMOC (PDF)'}
      </button>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Anexos</p>
        <label className="text-xs font-semibold ac-text cursor-pointer">
          {enviando ? 'Enviando...' : '+ Adicionar arquivo'}
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={enviando} />
        </label>
      </div>

      {loading && <div className="card h-16 animate-pulse bg-gray-100" />}

      {!loading && documentos.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p className="text-sm">Nenhum documento anexado ainda.</p>
          <p className="text-xs mt-1">Manuais do fabricante, certificados anteriores, notas fiscais...</p>
        </div>
      )}

      <div className="space-y-2">
        {documentos.map(doc => (
          <div key={doc.id} className="card flex items-center gap-3">
            <a href={doc.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{doc.nome}</p>
              <p className="text-xs text-gray-400">{formatDateTime(doc.created_at)}</p>
            </a>
            <button onClick={() => setConfirmRemover(doc)} className="text-gray-300 active:text-red-400 p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={Boolean(confirmRemover)}
        title="Excluir documento?"
        message="Essa ação não poderá ser desfeita."
        confirmLabel="Excluir"
        danger
        onConfirm={() => excluir(confirmRemover)}
        onClose={() => setConfirmRemover(null)}
      />
    </div>
  )
}
