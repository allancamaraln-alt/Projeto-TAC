import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { gerarLinkWhatsApp } from '../lib/whatsapp'
import { formatOS, formatBRL, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge'

const PROXIMOS_STATUS = {
  orcamento:    { label: '✅ Marcar como Aprovado', next: 'aprovado' },
  aprovado:     { label: '🔧 Iniciar Execução', next: 'em_andamento' },
  em_andamento: { label: '✔️ Marcar como Concluído', next: 'concluido' },
}

export default function OrdemDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [os, setOs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  useEffect(() => {
    supabase
      .from('ordens_servico')
      .select('*, clientes(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setOs(data); setLoading(false) })
  }, [id])

  async function avancarStatus() {
    const proximo = PROXIMOS_STATUS[os.status]
    if (!proximo) return
    setAtualizando(true)
    const { error } = await supabase
      .from('ordens_servico')
      .update({ status: proximo.next })
      .eq('id', id)
    if (!error) setOs(prev => ({ ...prev, status: proximo.next }))
    setAtualizando(false)
  }

  async function cancelar() {
    if (!confirm('Cancelar esta OS?')) return
    await supabase.from('ordens_servico').update({ status: 'cancelado' }).eq('id', id)
    setOs(prev => ({ ...prev, status: 'cancelado' }))
  }

  async function excluir() {
    if (!confirm('Excluir esta OS permanentemente?')) return
    await supabase.from('ordens_servico').delete().eq('id', id)
    navigate('/ordens')
  }

  function abrirWhatsApp() {
    const link = gerarLinkWhatsApp({ cliente: os.clientes, ordem: os, tecnico: profile })
    window.open(link, '_blank')
  }

  if (loading) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )
  if (!os) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">OS não encontrada.</p>
    </div>
  )

  const proximo = PROXIMOS_STATUS[os.status]

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">{formatOS(os.numero)}</span>
            <StatusBadge status={os.status} />
          </div>
          <h1 className="text-lg font-bold text-gray-800">{os.clientes?.nome}</h1>
        </div>
        <button
          onClick={() => navigate(`/ordens/${id}/editar`)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100"
          title="Editar OS"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Botão WhatsApp — destaque */}
        <button
          onClick={abrirWhatsApp}
          className="w-full bg-green-500 text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-3 active:bg-green-600 transition-colors shadow-md"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Enviar orçamento via WhatsApp
        </button>

        {/* Dados do cliente */}
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cliente</h2>
          <p className="font-semibold text-gray-800">{os.clientes?.nome}</p>
          <p className="text-sm text-gray-600 mt-0.5">📱 {os.clientes?.telefone}</p>
          {os.clientes?.endereco && (
            <p className="text-sm text-gray-500 mt-0.5">📍 {os.clientes?.endereco}</p>
          )}
        </div>

        {/* Dados da OS */}
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Serviço</h2>

          <Row label="Tipo" value={os.tipo_servico} />
          <Row label="Valor" value={formatBRL(os.valor)} highlight />
          {os.data_agendamento && (
            <Row label="Agendamento" value={formatDate(os.data_agendamento)} />
          )}
          {os.descricao && <Row label="Descrição" value={os.descricao} />}
          {os.observacoes && <Row label="Observações" value={os.observacoes} />}

          <div>
            <p className="text-xs text-gray-400">Criado em</p>
            <p className="text-sm text-gray-600">{formatDate(os.created_at)}</p>
          </div>
        </div>

        {/* Avançar status */}
        {proximo && (
          <button onClick={avancarStatus} disabled={atualizando} className="btn-primary">
            {atualizando ? 'Atualizando...' : proximo.label}
          </button>
        )}

        {/* Cancelar / Excluir */}
        <div className="space-y-2 pb-4">
          {os.status !== 'cancelado' && os.status !== 'concluido' && (
            <button onClick={cancelar} className="btn-danger">
              Cancelar OS
            </button>
          )}
          <button onClick={excluir} className="w-full text-center text-sm text-gray-400 py-2">
            Excluir permanentemente
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm ${highlight ? 'text-lg font-bold text-green-600' : 'text-gray-700'}`}>{value}</p>
    </div>
  )
}
