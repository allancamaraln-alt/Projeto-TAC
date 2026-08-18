import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { PERIODICIDADE_LABEL } from '../lib/pmoc'
import { uploadPmocEvidencia } from '../lib/pmocFotos'
import ExecucaoItemDetalhe from '../components/pmoc/ExecucaoItemDetalhe'

function todayIso() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().split('T')[0]
}

const SITUACOES = [
  { value: 'ok', label: 'OK' },
  { value: 'nao_ok', label: 'Não OK' },
  { value: 'nao_aplicavel', label: 'N/A' },
]

const DETALHE_VAZIO = { situacao_encontrada: '', servico_executado: '', materiais_utilizados: '', proxima_manutencao_override: '' }

export default function PmocExecucaoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const itemParam = searchParams.get('item')
  const { user } = useAuth()
  const toast = useToast()

  const [plano, setPlano] = useState(null)
  const [equipamentos, setEquipamentos] = useState([])
  const [itens, setItens] = useState([])
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)

  const [data, setData] = useState(todayIso())
  const [ordemId, setOrdemId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [respostas, setRespostas] = useState({})
  const [detalhes, setDetalhes] = useState({})
  const [expandidos, setExpandidos] = useState({})
  const [fotos, setFotos] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const { data: planoData } = await supabase.from('pmoc_planos').select('*').eq('id', id).single()
      setPlano(planoData)

      if (planoData) {
        const { data: equip } = await supabase.from('pmoc_equipamentos').select('*').eq('pmoc_id', planoData.id).order('created_at')
        let equipList = (equip ?? []).filter(e => e.status !== 'inativo')

        const { data: itensData } = await supabase.from('pmoc_plano_itens').select('*').in('equipamento_id', equipList.map(e => e.id)).eq('ativo', true).order('ordem')
        let itensList = itensData ?? []

        if (itemParam) {
          itensList = itensList.filter(i => i.id === itemParam)
          const equipIds = new Set(itensList.map(i => i.equipamento_id))
          equipList = equipList.filter(e => equipIds.has(e.id))
          setExpandidos({ [itemParam]: true })
        }

        setEquipamentos(equipList)
        setItens(itensList)

        const { data: os } = await supabase.from('ordens_servico').select('id, numero, tipo_servico').eq('cliente_id', planoData.cliente_id).order('created_at', { ascending: false }).limit(20)
        setOrdens(os ?? [])
      }
      setLoading(false)
    }
    carregar()
  }, [id, itemParam])

  function marcar(itemId, situacao) {
    setRespostas(r => ({ ...r, [itemId]: r[itemId] === situacao ? undefined : situacao }))
  }

  function setDetalheCampo(itemId, campo, valor) {
    setDetalhes(d => ({ ...d, [itemId]: { ...(d[itemId] || DETALHE_VAZIO), [campo]: valor } }))
  }

  function adicionarFotos(itemId, novasFotos) {
    setFotos(f => ({ ...f, [itemId]: [...(f[itemId] || []), ...novasFotos] }))
  }

  function removerFoto(itemId, idx) {
    setFotos(f => ({ ...f, [itemId]: f[itemId].filter((_, i) => i !== idx) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const marcados = Object.entries(respostas).filter(([, v]) => v)
    if (marcados.length === 0) { setErro('Marque ao menos um item do checklist.'); return }

    setSalvando(true)
    setErro('')

    const { data: execucao, error } = await supabase
      .from('pmoc_execucoes')
      .insert({ pmoc_id: plano.id, tecnico_id: user.id, ordem_id: ordemId || null, data, observacoes: observacoes.trim() })
      .select()
      .single()

    if (error) { setSalvando(false); setErro('Não foi possível registrar a execução.'); return }

    let fotosComFalha = 0
    for (const [itemId, situacao] of marcados) {
      const item = itens.find(i => i.id === itemId)
      const det = detalhes[itemId] || DETALHE_VAZIO
      const { data: execItem, error: errItem } = await supabase
        .from('pmoc_execucao_itens')
        .insert({
          execucao_id: execucao.id,
          pmoc_id: plano.id,
          tecnico_id: user.id,
          equipamento_id: item.equipamento_id,
          plano_item_id: item.id,
          descricao: item.descricao,
          periodicidade: item.periodicidade,
          situacao,
          observacao: '',
          situacao_encontrada: det.situacao_encontrada.trim(),
          servico_executado: det.servico_executado.trim(),
          materiais_utilizados: det.materiais_utilizados.trim(),
          proxima_manutencao_override: det.proxima_manutencao_override || null,
          data,
        })
        .select()
        .single()

      if (errItem) continue

      const fotosDoItem = fotos[itemId] || []
      for (const file of fotosDoItem) {
        try {
          await uploadPmocEvidencia(file, { tecnicoId: user.id, execucaoItemId: execItem.id })
        } catch {
          fotosComFalha++
        }
      }
    }

    setSalvando(false)
    toast(fotosComFalha > 0 ? `Execução salva, mas ${fotosComFalha} foto(s) não foram enviadas.` : 'Execução registrada!')
    navigate(itemParam ? `/pmoc/${id}?tab=manutencoes` : `/pmoc/${id}`)
  }

  if (loading) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(itemParam ? `/pmoc/${id}?tab=manutencoes` : `/pmoc/${id}`)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">Registrar execução</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-4 pb-8">
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
              <input type="date" className="input-field" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">OS vinculada</label>
              <select className="input-field" value={ordemId} onChange={e => setOrdemId(e.target.value)}>
                <option value="">Nenhuma</option>
                {ordens.map(o => <option key={o.id} value={o.id}>{`OS-${String(o.numero).padStart(3, '0')} · ${o.tipo_servico}`}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações da visita</label>
            <textarea className="input-field" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        {equipamentos.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum equipamento disponível para execução.</p>
        )}

        {equipamentos.map(equip => {
          const itensEquip = itens.filter(i => i.equipamento_id === equip.id)
          if (itensEquip.length === 0) return null
          return (
            <div key={equip.id} className="card space-y-3">
              <h2 className="text-sm font-bold text-gray-800">{equip.tag || equip.tipo || 'Equipamento'}</h2>
              {itensEquip.map(item => (
                <div key={item.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                  <p className="text-sm text-gray-700">{item.descricao}</p>
                  <p className="text-xs text-gray-400 mb-2">{PERIODICIDADE_LABEL[item.periodicidade]}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SITUACOES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => marcar(item.id, s.value)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          respostas[item.id] === s.value
                            ? 'ac-bg ac-text-tx ac-border'
                            : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <ExecucaoItemDetalhe
                    expanded={Boolean(expandidos[item.id])}
                    onToggleExpand={() => setExpandidos(ex => ({ ...ex, [item.id]: !ex[item.id] }))}
                    situacaoEncontrada={(detalhes[item.id] || DETALHE_VAZIO).situacao_encontrada}
                    onSituacaoEncontradaChange={v => setDetalheCampo(item.id, 'situacao_encontrada', v)}
                    servicoExecutado={(detalhes[item.id] || DETALHE_VAZIO).servico_executado}
                    onServicoExecutadoChange={v => setDetalheCampo(item.id, 'servico_executado', v)}
                    materiaisUtilizados={(detalhes[item.id] || DETALHE_VAZIO).materiais_utilizados}
                    onMateriaisUtilizadosChange={v => setDetalheCampo(item.id, 'materiais_utilizados', v)}
                    proximaOverride={(detalhes[item.id] || DETALHE_VAZIO).proxima_manutencao_override}
                    onProximaOverrideChange={v => setDetalheCampo(item.id, 'proxima_manutencao_override', v)}
                    fotos={fotos[item.id] || []}
                    onAddFotos={arquivos => adicionarFotos(item.id, arquivos)}
                    onRemoveFoto={idx => removerFoto(item.id, idx)}
                  />
                </div>
              ))}
            </div>
          )
        })}

        {erro && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{erro}</div>}

        <button type="submit" disabled={salvando || equipamentos.length === 0} className="btn-primary w-full disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Finalizar manutenção'}
        </button>
      </form>
    </div>
  )
}
