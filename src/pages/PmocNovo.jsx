import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import ConfirmModal from '../components/ConfirmModal'
import WizardProgress from '../components/pmoc/wizard/WizardProgress'
import StepDadosGerais from '../components/pmoc/wizard/StepDadosGerais'
import StepEstabelecimento from '../components/pmoc/wizard/StepEstabelecimento'
import StepEquipamentos from '../components/pmoc/wizard/StepEquipamentos'
import StepPlano from '../components/pmoc/wizard/StepPlano'
import StepRevisao from '../components/pmoc/wizard/StepRevisao'

function todayIso() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().split('T')[0]
}

const STEPS = ['Dados gerais', 'Estabelecimento', 'Equipamentos', 'Manutenção', 'Revisão']

const ESTABELECIMENTO_VAZIO = {
  nome: '', cnpj_cpf: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  tipo_estabelecimento: '', area_climatizada_m2: '', qtd_ambientes: '', observacoes: '',
}

export default function PmocNovo() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const toast = useToast()

  const [stepIndex, setStepIndex] = useState(0)
  const [clientes, setClientes] = useState([])

  const [dadosGerais, setDadosGerais] = useState({
    cliente_id: '', clienteNome: '', clienteTelefone: '', clienteEndereco: '',
    responsavel_tecnico: profile?.nome || '', registro_tipo: '', registro_numero: '', art_trt: '',
    data_inicio: todayIso(), observacoes: '',
  })
  const [estabelecimento, setEstabelecimento] = useState(ESTABELECIMENTO_VAZIO)
  const [equipamentos, setEquipamentos] = useState([])
  const [planoItens, setPlanoItens] = useState([])

  const [erroEtapa, setErroEtapa] = useState('')
  const [erroRevisao, setErroRevisao] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, nome, telefone, endereco').order('nome').then(({ data }) => setClientes(data ?? []))
  }, [])

  const temDadosPreenchidos = Boolean(
    dadosGerais.cliente_id || estabelecimento.nome || equipamentos.length > 0 || planoItens.length > 0
  )

  function handleVoltar() {
    if (stepIndex === 0) {
      if (temDadosPreenchidos) setConfirmSair(true)
      else navigate('/pmoc')
      return
    }
    setStepIndex(i => i - 1)
  }

  function handleContinuar() {
    setErroEtapa('')
    if (stepIndex === 0) {
      if (!dadosGerais.cliente_id) { setErroEtapa('Selecione o cliente.'); return }
      if (!dadosGerais.responsavel_tecnico.trim()) { setErroEtapa('Informe o responsável técnico.'); return }
      if (!dadosGerais.data_inicio) { setErroEtapa('Informe a data de início do plano.'); return }
    }
    if (stepIndex === 1 && !estabelecimento.nome.trim()) { setErroEtapa('Informe o nome do estabelecimento.'); return }
    setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
  }

  // Equipamentos (rascunho em memória)
  function addEquipamento(draft, draftItens) {
    setEquipamentos(list => [...list, draft])
    setPlanoItens(list => [...list, ...draftItens])
  }
  function editEquipamento(updated) {
    setEquipamentos(list => list.map(e => e._localId === updated._localId ? updated : e))
  }
  function duplicateEquipamento(eq) {
    const novoLocalId = crypto.randomUUID()
    const clone = { ...eq, _localId: novoLocalId, tag: eq.tag ? `${eq.tag} (cópia)` : eq.tag, codigo_interno: eq.codigo_interno ? `${eq.codigo_interno}-2` : '' }
    setEquipamentos(list => [...list, clone])
    const itensClone = planoItens
      .filter(i => i.equipamento_local_id === eq._localId)
      .map(i => ({ ...i, _localId: crypto.randomUUID(), equipamento_local_id: novoLocalId }))
    setPlanoItens(list => [...list, ...itensClone])
  }
  function removeEquipamento(localId) {
    setEquipamentos(list => list.filter(e => e._localId !== localId))
    setPlanoItens(list => list.filter(i => i.equipamento_local_id !== localId))
  }

  // Plano de manutenção (rascunho em memória)
  function addItem(item) { setPlanoItens(list => [...list, item]) }
  function editItem(item) { setPlanoItens(list => list.map(i => i._localId === item._localId ? item : i)) }
  function removeItem(localId) { setPlanoItens(list => list.filter(i => i._localId !== localId)) }

  async function criarPmoc() {
    setSubmitting(true)
    setErroRevisao('')

    const { data: pmoc, error: err1 } = await supabase
      .from('pmoc_planos')
      .insert({
        cliente_id: dadosGerais.cliente_id,
        tecnico_id: user.id,
        responsavel_tecnico: dadosGerais.responsavel_tecnico.trim(),
        registro_tipo: dadosGerais.registro_tipo || null,
        registro_numero: dadosGerais.registro_numero.trim(),
        art_trt: dadosGerais.art_trt.trim(),
        data_inicio: dadosGerais.data_inicio,
        observacoes: dadosGerais.observacoes.trim(),
      })
      .select()
      .single()

    if (err1) { setSubmitting(false); setErroRevisao('Não foi possível criar o PMOC. Tente novamente.'); return }

    const { error: err2 } = await supabase.from('pmoc_estabelecimentos').insert({
      pmoc_id: pmoc.id,
      tecnico_id: user.id,
      nome: estabelecimento.nome.trim(),
      cnpj_cpf: estabelecimento.cnpj_cpf.trim(),
      cep: estabelecimento.cep.trim(),
      rua: estabelecimento.rua.trim(),
      numero: estabelecimento.numero.trim(),
      complemento: estabelecimento.complemento.trim(),
      bairro: estabelecimento.bairro.trim(),
      cidade: estabelecimento.cidade.trim(),
      estado: estabelecimento.estado.trim(),
      tipo_estabelecimento: estabelecimento.tipo_estabelecimento || '',
      area_climatizada_m2: estabelecimento.area_climatizada_m2 === '' ? null : Number(estabelecimento.area_climatizada_m2),
      qtd_ambientes: estabelecimento.qtd_ambientes === '' ? null : Number(estabelecimento.qtd_ambientes),
      observacoes: estabelecimento.observacoes.trim(),
    })

    if (err2) {
      await supabase.from('pmoc_planos').delete().eq('id', pmoc.id)
      setSubmitting(false)
      setErroRevisao('Não foi possível salvar o estabelecimento. Tente novamente.')
      return
    }

    const idMap = new Map()
    for (const eq of equipamentos) {
      const { data: novoEq, error: errEq } = await supabase
        .from('pmoc_equipamentos')
        .insert({
          pmoc_id: pmoc.id,
          tecnico_id: user.id,
          tag: eq.tag,
          codigo_interno: eq.codigo_interno,
          tipo: eq.tipo,
          fabricante: eq.fabricante,
          modelo: eq.modelo,
          capacidade_valor: eq.capacidade_valor,
          capacidade_unidade: eq.capacidade_unidade,
          fluido: eq.fluido,
          localizacao: eq.localizacao,
          numero_serie: eq.numero_serie,
          status: eq.status,
          observacoes: eq.observacoes,
        })
        .select()
        .single()

      if (errEq) {
        await supabase.from('pmoc_planos').delete().eq('id', pmoc.id)
        setSubmitting(false)
        setErroRevisao('Não foi possível salvar os equipamentos. Tente novamente.')
        return
      }
      idMap.set(eq._localId, novoEq.id)
    }

    const linhas = []
    for (const item of planoItens) {
      const alvos = item.todos_do_tipo
        ? equipamentos.filter(e => e.tipo === item.tipo_alvo).map(e => idMap.get(e._localId))
        : [idMap.get(item.equipamento_local_id)]
      for (const equipamentoId of alvos) {
        if (!equipamentoId) continue
        linhas.push({
          equipamento_id: equipamentoId,
          tecnico_id: user.id,
          descricao: item.descricao,
          periodicidade: item.periodicidade,
          periodicidade_dias: item.periodicidade === 'personalizada' ? Number(item.periodicidade_dias) : null,
          proxima_execucao_override: item.proxima_execucao_override || null,
          responsavel: (item.responsavel || '').trim(),
          observacoes: (item.observacoes || '').trim(),
        })
      }
    }

    if (linhas.length > 0) {
      const { error: err4 } = await supabase.from('pmoc_plano_itens').insert(linhas)
      if (err4) {
        await supabase.from('pmoc_planos').delete().eq('id', pmoc.id)
        setSubmitting(false)
        setErroRevisao('Não foi possível salvar o plano de manutenção. Tente novamente.')
        return
      }
    }

    setSubmitting(false)
    toast('PMOC criado!')
    navigate(`/pmoc/${pmoc.id}`)
  }

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={handleVoltar} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">Novo PMOC</h1>
      </div>

      <WizardProgress steps={STEPS} currentIndex={stepIndex} onStepClick={setStepIndex} />

      {stepIndex === 0 && (
        <StepDadosGerais
          value={dadosGerais}
          onChange={setDadosGerais}
          clientes={clientes}
          onClienteCreated={c => setClientes(list => [...list, c])}
        />
      )}
      {stepIndex === 1 && (
        <StepEstabelecimento value={estabelecimento} onChange={setEstabelecimento} clienteEnderecoFreeform={dadosGerais.clienteEndereco} />
      )}
      {stepIndex === 2 && (
        <StepEquipamentos
          equipamentos={equipamentos}
          onAdd={addEquipamento}
          onEdit={editEquipamento}
          onDuplicate={duplicateEquipamento}
          onRemove={removeEquipamento}
        />
      )}
      {stepIndex === 3 && (
        <StepPlano
          equipamentos={equipamentos}
          itens={planoItens}
          onAdd={addItem}
          onEdit={editItem}
          onRemove={removeItem}
          dataInicio={dadosGerais.data_inicio}
        />
      )}
      {stepIndex === 4 && (
        <StepRevisao
          dadosGerais={dadosGerais}
          estabelecimento={estabelecimento}
          equipamentos={equipamentos}
          itens={planoItens}
          onEditStep={setStepIndex}
          onSubmit={criarPmoc}
          submitting={submitting}
          erro={erroRevisao}
        />
      )}

      {stepIndex < 4 && (
        <div className="px-4 pb-8">
          {erroEtapa && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-3">{erroEtapa}</div>}
          <button type="button" onClick={handleContinuar} className="btn-primary w-full">Continuar</button>
        </div>
      )}

      <ConfirmModal
        open={confirmSair}
        title="Sair sem salvar?"
        message="Os dados preenchidos neste PMOC serão perdidos."
        confirmLabel="Sair"
        danger
        onConfirm={() => navigate('/pmoc')}
        onClose={() => setConfirmSair(false)}
      />
    </div>
  )
}
