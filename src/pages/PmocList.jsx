import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { statusItem, bucket3, BUCKET3_LABEL } from '../lib/pmoc'
import { formatDate } from '../lib/format'

const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativos', label: 'Ativos' },
  { value: 'em_dia', label: 'Em dia' },
  { value: 'proximo', label: 'Pendentes' },
  { value: 'atrasado', label: 'Atrasados' },
  { value: 'encerrado', label: 'Encerrados' },
]

export default function PmocList() {
  const navigate = useNavigate()
  const [planos, setPlanos] = useState([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const [{ data: planosData }, { data: estabData }, { data: equipData }, { data: itensData }, { data: execItensData }] = await Promise.all([
        supabase.from('pmoc_planos').select('*, clientes(nome, telefone)').order('created_at', { ascending: false }),
        supabase.from('pmoc_estabelecimentos').select('pmoc_id, nome'),
        supabase.from('pmoc_equipamentos').select('id, pmoc_id'),
        supabase.from('pmoc_plano_itens').select('id, equipamento_id, periodicidade, periodicidade_dias, proxima_execucao_override, created_at, ativo').eq('ativo', true),
        supabase.from('pmoc_execucao_itens').select('pmoc_id, plano_item_id, data'),
      ])

      const estabPorPmoc = new Map((estabData ?? []).map(e => [e.pmoc_id, e]))
      const equipamentos = equipData ?? []
      const itens = itensData ?? []
      const execItens = execItensData ?? []

      const enriquecidos = (planosData ?? []).map(plano => {
        const equipDoPlano = equipamentos.filter(e => e.pmoc_id === plano.id)
        const equipIds = new Set(equipDoPlano.map(e => e.id))
        const itensDoPlano = itens.filter(i => equipIds.has(i.equipamento_id))
        const execItensDoPlano = execItens.filter(ei => ei.pmoc_id === plano.id)
        const ultimaMap = new Map()
        for (const ei of execItensDoPlano) {
          if (!ei.plano_item_id) continue
          const atual = ultimaMap.get(ei.plano_item_id)
          if (!atual || ei.data > atual) ultimaMap.set(ei.plano_item_id, ei.data)
        }

        const statusItens = itensDoPlano.map(item => {
          const s = statusItem(item, ultimaMap.get(item.id), plano.data_inicio)
          return { ...s, bucket: bucket3(s.dias) }
        })

        const nAtrasado = statusItens.filter(s => s.bucket === 'atrasado').length
        const nProximo = statusItens.filter(s => s.bucket === 'proximo').length
        const nEmDia = statusItens.filter(s => s.bucket === 'em_dia').length
        const bucketGeral = nAtrasado > 0 ? 'atrasado' : nProximo > 0 ? 'proximo' : 'em_dia'
        const proxima = statusItens.length > 0 ? statusItens.reduce((min, s) => s.prevista < min ? s.prevista : min, statusItens[0].prevista) : null

        return {
          ...plano,
          estabelecimentoNome: estabPorPmoc.get(plano.id)?.nome || '',
          nEquip: equipDoPlano.length,
          nAtrasado, nProximo, nEmDia, bucketGeral, proxima,
        }
      })

      setPlanos(enriquecidos)
      setLoading(false)
    }
    carregar()
  }, [])

  const filtrados = planos.filter(p => {
    const termo = busca.toLowerCase()
    const combina = !busca || p.clientes?.nome?.toLowerCase().includes(termo) || p.estabelecimentoNome?.toLowerCase().includes(termo)
    if (!combina) return false
    if (filtro === 'todos') return true
    if (filtro === 'ativos') return p.status === 'ativo'
    if (filtro === 'encerrado') return p.status === 'encerrado'
    return p.bucketGeral === filtro
  })

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800">PMOC</h1>
          <button
            onClick={() => navigate('/pmoc/novo')}
            className="w-10 h-10 ac-bg rounded-full flex items-center justify-center ac-shadow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <input
          type="search"
          className="input-field mb-2"
          placeholder="Buscar por cliente ou estabelecimento..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filtro === f.value ? 'ac-bg text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-100" />)}
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-3">🗒️</p>
            <p className="font-medium">{busca || filtro !== 'todos' ? 'Nenhum PMOC encontrado.' : 'Nenhum PMOC cadastrado.'}</p>
            {!busca && filtro === 'todos' && (
              <button onClick={() => navigate('/pmoc/novo')} className="mt-4 ac-text font-medium">
                + Criar primeiro PMOC
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filtrados.map(plano => {
            const label = BUCKET3_LABEL[plano.bucketGeral]
            return (
              <button
                key={plano.id}
                onClick={() => navigate(`/pmoc/${plano.id}`)}
                className="card w-full text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">PMOC</p>
                    <p className="font-semibold text-gray-800 truncate">{plano.estabelecimentoNome || plano.clientes?.nome || 'Sem nome'}</p>
                    <p className="text-sm text-gray-500 truncate">{plano.clientes?.nome}</p>
                  </div>
                  <span className={`text-xs font-semibold rounded-full px-2 py-1 whitespace-nowrap ${plano.status === 'ativo' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {plano.status === 'ativo' ? 'ATIVO' : 'ENCERRADO'}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-2">{plano.nEquip} equipamento(s)</p>

                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  <span className="text-green-600">🟢 {plano.nEmDia} em dia</span>
                  <span className="text-orange-500">🟠 {plano.nProximo} próximas</span>
                  <span className="text-red-500">🔴 {plano.nAtrasado} atrasada(s)</span>
                </div>

                {plano.proxima && (
                  <p className={`text-xs font-semibold mt-2 ${label.cor}`}>
                    Próxima: {formatDate(plano.proxima)}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
