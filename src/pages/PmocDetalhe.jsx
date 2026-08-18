import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import ConfirmModal from '../components/ConfirmModal'
import { statusItem, bucket3, BUCKET3_LABEL, diasParaData } from '../lib/pmoc'
import { formatDate } from '../lib/format'
import TabVisaoGeral from '../components/pmoc/tabs/TabVisaoGeral'
import TabEquipamentos from '../components/pmoc/tabs/TabEquipamentos'
import TabManutencoes from '../components/pmoc/tabs/TabManutencoes'
import TabHistorico from '../components/pmoc/tabs/TabHistorico'
import TabDocumentos from '../components/pmoc/tabs/TabDocumentos'

const TABS = [
  { value: 'visao-geral', label: 'Visão geral' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'manutencoes', label: 'Manutenções' },
  { value: 'historico', label: 'Histórico' },
  { value: 'documentos', label: 'Documentos' },
]

function diaLabel(dataIso) {
  const dias = diasParaData(dataIso)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Amanhã'
  return formatDate(dataIso)
}

export default function PmocDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const toast = useToast()

  const [plano, setPlano] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [estabelecimento, setEstabelecimento] = useState(null)
  const [equipamentos, setEquipamentos] = useState([])
  const [itens, setItens] = useState([])
  const [execucaoItens, setExecucaoItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmEncerrar, setConfirmEncerrar] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const tabAtiva = searchParams.get('tab') || 'visao-geral'
  function setTab(tab) { setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('tab', tab); return p }) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data: planoData } = await supabase.from('pmoc_planos').select('*, clientes(*)').eq('id', id).single()
    setPlano(planoData)
    setCliente(planoData?.clientes ?? null)

    if (planoData) {
      const [{ data: estab }, { data: equip }, { data: execIt }] = await Promise.all([
        supabase.from('pmoc_estabelecimentos').select('*').eq('pmoc_id', planoData.id).single(),
        supabase.from('pmoc_equipamentos').select('*').eq('pmoc_id', planoData.id).order('created_at'),
        supabase.from('pmoc_execucao_itens').select('*').eq('pmoc_id', planoData.id),
      ])
      setEstabelecimento(estab ?? null)
      setEquipamentos(equip ?? [])
      setExecucaoItens(execIt ?? [])

      const equipIds = (equip ?? []).map(e => e.id)
      if (equipIds.length > 0) {
        const { data: it } = await supabase.from('pmoc_plano_itens').select('*').in('equipamento_id', equipIds)
        setItens(it ?? [])
      } else {
        setItens([])
      }
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    function iniciar() { load() }
    iniciar()
  }, [load])

  const ultimaMap = useMemo(() => {
    const map = new Map()
    for (const ei of execucaoItens) {
      if (!ei.plano_item_id) continue
      const atual = map.get(ei.plano_item_id)
      if (!atual || ei.data > atual) map.set(ei.plano_item_id, ei.data)
    }
    return map
  }, [execucaoItens])

  const itensComStatus = useMemo(() => {
    if (!plano) return []
    return itens.map(item => {
      const status = statusItem(item, ultimaMap.get(item.id), plano.data_inicio)
      return { ...item, status: { ...status, bucket: bucket3(status.dias) } }
    })
  }, [itens, ultimaMap, plano])

  // Indicadores do topo (contagem/progresso/próximas) só consideram
  // atividades ativas — uma desativada não deve contar como pendente.
  const itensAtivosComStatus = useMemo(() => itensComStatus.filter(i => i.ativo), [itensComStatus])

  const contagem = useMemo(() => {
    const c = { em_dia: 0, proximo: 0, atrasado: 0 }
    for (const item of itensAtivosComStatus) c[item.status.bucket]++
    return c
  }, [itensAtivosComStatus])

  const totalItens = itensAtivosComStatus.length
  const percentEmDia = totalItens > 0 ? Math.round((contagem.em_dia / totalItens) * 100) : 100

  const proximasManutencoes = useMemo(() => {
    return [...itensAtivosComStatus]
      .sort((a, b) => a.status.prevista.localeCompare(b.status.prevista))
      .slice(0, 5)
  }, [itensAtivosComStatus])

  async function encerrarPmoc() {
    const novoStatus = plano.status === 'ativo' ? 'encerrado' : 'ativo'
    const { error } = await supabase.from('pmoc_planos').update({ status: novoStatus }).eq('id', plano.id)
    if (error) { toast('Erro ao atualizar status.', 'error'); return }
    toast(novoStatus === 'encerrado' ? 'PMOC encerrado.' : 'PMOC reativado.')
    load()
  }

  async function excluirPmoc() {
    const { error } = await supabase.from('pmoc_planos').delete().eq('id', plano.id)
    if (error) { toast('Erro ao excluir PMOC.', 'error'); return }
    toast('PMOC excluído.')
    navigate('/pmoc')
  }

  if (loading) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  if (!plano) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">PMOC não encontrado.</p>
    </div>
  )

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/pmoc')} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 -ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">PMOC</p>
            <h1 className="text-lg font-bold text-gray-800 truncate">{estabelecimento?.nome || cliente?.nome || 'Sem nome'}</h1>
          </div>
          <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${plano.status === 'ativo' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
            {plano.status === 'ativo' ? 'ATIVO' : 'ENCERRADO'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button onClick={() => setConfirmEncerrar(true)} className="font-semibold ac-text">
            {plano.status === 'ativo' ? 'Encerrar PMOC' : 'Reativar PMOC'}
          </button>
          <button onClick={() => setConfirmExcluir(true)} className="font-semibold text-red-500">Excluir PMOC</button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="ac-bg-lt rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold ac-text">{equipamentos.length}</p>
            <p className="text-xs ac-text opacity-80 mt-0.5">Equipamentos</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{totalItens}</p>
            <p className="text-xs text-purple-500 mt-0.5">Manutenções</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(BUCKET3_LABEL).map(([key, label]) => (
            <div key={key} className={`rounded-2xl p-3 text-center ${label.bg}`}>
              <p className={`text-2xl font-bold ${label.cor}`}>{contagem[key]}</p>
              <p className={`text-xs mt-0.5 ${label.cor}`}>{label.icone} {key === 'em_dia' ? 'Em dia' : key === 'proximo' ? 'Próximas' : 'Atrasadas'}</p>
            </div>
          ))}
        </div>

        {/* Progresso */}
        <div className="card">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-semibold text-gray-700">Plano em dia</p>
            <p className="text-sm font-bold ac-text">{percentEmDia}%</p>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full ac-bg rounded-full transition-all" style={{ width: `${percentEmDia}%` }} />
          </div>
        </div>

        {/* Próximas manutenções */}
        {proximasManutencoes.length > 0 && (
          <div className="card space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Próximas manutenções</p>
            {proximasManutencoes.map(item => {
              const eq = equipamentos.find(e => e.id === item.equipamento_id)
              return (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-gray-700 truncate">• {item.descricao}{eq ? ` — ${eq.tag || eq.tipo}` : ''}</p>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${BUCKET3_LABEL[item.status.bucket].cor}`}>
                    {diaLabel(item.status.prevista)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Abas */}
        <div className="flex gap-1 overflow-x-auto -mx-4 px-4 pb-1">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                tabAtiva === t.value ? 'ac-bg text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-8">
        {tabAtiva === 'visao-geral' && (
          <TabVisaoGeral plano={plano} estabelecimento={estabelecimento} cliente={cliente} onSaved={load} />
        )}
        {tabAtiva === 'equipamentos' && (
          <TabEquipamentos pmocId={plano.id} tecnicoId={user.id} equipamentos={equipamentos} onChanged={load} />
        )}
        {tabAtiva === 'manutencoes' && (
          <TabManutencoes
            tecnicoId={user.id}
            itens={itensComStatus}
            equipamentos={equipamentos}
            onExecutarItem={itemId => navigate(`/pmoc/${plano.id}/execucao/nova?item=${itemId}`)}
            onChanged={load}
          />
        )}
        {tabAtiva === 'historico' && <TabHistorico pmocId={plano.id} />}
        {tabAtiva === 'documentos' && (
          <TabDocumentos
            pmocId={plano.id}
            tecnicoId={user.id}
            plano={plano}
            cliente={cliente}
            estabelecimento={estabelecimento}
            equipamentos={equipamentos}
            itens={itens}
            tecnico={profile}
          />
        )}
      </div>

      <ConfirmModal
        open={confirmEncerrar}
        title={plano.status === 'ativo' ? 'Encerrar PMOC?' : 'Reativar PMOC?'}
        message={plano.status === 'ativo' ? 'O plano fica marcado como encerrado, mas os dados continuam disponíveis.' : 'O plano volta a ficar ativo.'}
        confirmLabel={plano.status === 'ativo' ? 'Encerrar' : 'Reativar'}
        onConfirm={encerrarPmoc}
        onClose={() => setConfirmEncerrar(false)}
      />

      <ConfirmModal
        open={confirmExcluir}
        title="Excluir PMOC?"
        message="Todos os dados deste PMOC (estabelecimento, equipamentos, plano e histórico) serão removidos permanentemente."
        confirmLabel="Excluir"
        danger
        onConfirm={excluirPmoc}
        onClose={() => setConfirmExcluir(false)}
      />
    </div>
  )
}
