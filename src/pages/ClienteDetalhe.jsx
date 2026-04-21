import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatOS, formatBRL, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge'

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: os }] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', id).single(),
        supabase
          .from('ordens_servico')
          .select('*')
          .eq('cliente_id', id)
          .order('created_at', { ascending: false }),
      ])
      setCliente(c)
      setOrdens(os ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  const totalGasto = ordens
    .filter(os => os.status === 'concluido')
    .reduce((acc, os) => acc + Number(os.valor), 0)

  if (loading) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  if (!cliente) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">Cliente não encontrado.</p>
    </div>
  )

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800 flex-1">{cliente.nome}</h1>
        <button
          onClick={() => navigate(`/clientes/${id}/editar`)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Info do cliente */}
        <div className="card space-y-2">
          <a
            href={`tel:${cliente.telefone}`}
            className="flex items-center gap-2 text-blue-600"
          >
            <span>📱</span>
            <span className="font-medium">{cliente.telefone}</span>
          </a>
          {cliente.endereco && (
            <p className="text-sm text-gray-600 flex gap-2">
              <span>📍</span>
              <span>{cliente.endereco}</span>
            </p>
          )}
          <p className="text-xs text-gray-400">
            Cliente desde {formatDate(cliente.created_at)}
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{ordens.length}</p>
            <p className="text-xs text-blue-500 mt-0.5">Total OS</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {ordens.filter(os => os.status === 'concluido').length}
            </p>
            <p className="text-xs text-green-500 mt-0.5">Concluídas</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-3 text-center">
            <p className="text-lg font-bold text-purple-600 leading-tight">
              {formatBRL(totalGasto).replace('R$\u00a0', 'R$')}
            </p>
            <p className="text-xs text-purple-500 mt-0.5">Faturado</p>
          </div>
        </div>

        {/* Nova OS para este cliente */}
        <button
          onClick={() => navigate(`/ordens/nova?cliente=${id}`)}
          className="btn-primary"
        >
          + Nova OS para este cliente
        </button>

        {/* Histórico */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1">
          Histórico de OS
        </h2>

        {ordens.length === 0 ? (
          <div className="card text-center text-gray-400 py-8">
            <p className="text-3xl mb-2">📋</p>
            <p>Nenhuma OS para este cliente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordens.map(os => (
              <button
                key={os.id}
                onClick={() => navigate(`/ordens/${os.id}`)}
                className="card w-full text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-xs text-gray-400 font-mono">{formatOS(os.numero)}</span>
                    <p className="font-semibold text-gray-800">{os.tipo_servico}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <StatusBadge status={os.status} />
                    <p className="text-sm font-bold text-gray-700 mt-1">{formatBRL(os.valor)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{formatDate(os.created_at)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
