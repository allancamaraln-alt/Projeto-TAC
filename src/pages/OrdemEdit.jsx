import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatOS, formatDate } from '../lib/format'
import { useToast } from '../hooks/useToast'

const FORMAS_PAGAMENTO = [
  { value: '', label: 'Não informada' },
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro / Espécie' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'outros', label: 'Outros' },
]

function calcularVencimento(valor, unidade, base) {
  const d = base ? new Date(base + 'T12:00:00') : new Date()
  if (unidade === 'dias')  d.setDate(d.getDate() + valor)
  if (unidade === 'meses') d.setMonth(d.getMonth() + valor)
  if (unidade === 'anos')  d.setFullYear(d.getFullYear() + valor)
  return d.toISOString().split('T')[0]
}

const TIPOS = [
  'Instalação', 'Manutenção preventiva', 'Manutenção corretiva',
  'Limpeza', 'Recarga de gás', 'Diagnóstico', 'Outro'
]

const EQUIPAMENTO_TIPOS = [
  '', 'Split', 'Janela', 'Portátil', 'Central', 'VRF', 'Chiller', 'Câmara fria', 'Outro'
]

const FLUIDOS = ['', 'R-410A', 'R-32', 'R-22', 'R-134a', 'R-290', 'R-404A', 'Outro']

const STATUS_OPTIONS = [
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
]

export default function OrdemEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [os, setOs] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  useEffect(() => {
    supabase
      .from('ordens_servico')
      .select('*, clientes(nome)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setOs(data)
        setForm({
          tipo_servico: data.tipo_servico,
          descricao: data.descricao || '',
          valor: data.valor ?? '',
          data_agendamento: data.data_agendamento || '',
          hora_agendamento: data.hora_agendamento || '',
          observacoes: data.observacoes || '',
          status: data.status,
          forma_pagamento: data.forma_pagamento || '',
          garantia_valor: data.garantia_valor || '',
          garantia_unidade: data.garantia_unidade || 'meses',
          garantia_obs: data.garantia_obs || '',
          equipamento_tipo: data.equipamento_tipo || '',
          equipamento_marca: data.equipamento_marca || '',
          equipamento_modelo: data.equipamento_modelo || '',
          equipamento_capacidade: data.equipamento_capacidade || '',
          equipamento_fluido: data.equipamento_fluido || '',
          equipamento_numero_serie: data.equipamento_numero_serie || '',
        })
      })
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSaving(true)

    const gValor = parseInt(form.garantia_valor) || null
    const base = os.data_conclusao || null
    const { error } = await supabase
      .from('ordens_servico')
      .update({
        tipo_servico: form.tipo_servico,
        descricao: form.descricao,
        valor: parseFloat(form.valor) || 0,
        data_agendamento: form.data_agendamento || null,
        hora_agendamento: form.hora_agendamento || null,
        observacoes: form.observacoes,
        status: form.status,
        forma_pagamento: form.forma_pagamento || null,
        garantia_valor: gValor,
        garantia_unidade: gValor ? form.garantia_unidade : null,
        garantia_vencimento: gValor ? calcularVencimento(gValor, form.garantia_unidade, base) : null,
        garantia_obs: form.garantia_obs || null,
        equipamento_tipo: form.equipamento_tipo || null,
        equipamento_marca: form.equipamento_marca || null,
        equipamento_modelo: form.equipamento_modelo || null,
        equipamento_capacidade: form.equipamento_capacidade || null,
        equipamento_fluido: form.equipamento_fluido || null,
        equipamento_numero_serie: form.equipamento_numero_serie || null,
      })
      .eq('id', id)

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    toast('OS atualizada!')
    navigate(`/ordens/${id}`)
  }

  if (!form) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-xs text-gray-400">{os?.clientes?.nome}</p>
          <h1 className="text-lg font-bold text-gray-800">Editar {formatOS(os?.numero)}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-5">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, status: s.value }))}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  form.status === s.value
                    ? 'ac-bg ac-text-tx ac-border'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de serviço</label>
          <select className="input-field" value={form.tipo_servico} onChange={set('tipo_servico')}>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            value={form.descricao}
            onChange={set('descricao')}
            placeholder="Descreva o serviço..."
          />
        </div>

        {/* Equipamento — preenchido manualmente ou automaticamente pelo ClimaPro IA (diagnóstico/laudo) */}
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Equipamento</h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select className="input-field" value={form.equipamento_tipo} onChange={set('equipamento_tipo')}>
                {EQUIPAMENTO_TIPOS.map(t => <option key={t} value={t}>{t || 'Não informado'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fluido</label>
              <select className="input-field" value={form.equipamento_fluido} onChange={set('equipamento_fluido')}>
                {FLUIDOS.map(f => <option key={f} value={f}>{f || 'Não informado'}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Marca</label>
              <input
                className="input-field"
                placeholder="Ex: Samsung"
                value={form.equipamento_marca}
                onChange={set('equipamento_marca')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Modelo</label>
              <input
                className="input-field"
                placeholder="Ex: AR12"
                value={form.equipamento_modelo}
                onChange={set('equipamento_modelo')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Capacidade</label>
              <input
                className="input-field"
                placeholder="Ex: 9.000 BTU"
                value={form.equipamento_capacidade}
                onChange={set('equipamento_capacidade')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nº de série</label>
              <input
                className="input-field"
                value={form.equipamento_numero_serie}
                onChange={set('equipamento_numero_serie')}
              />
            </div>
          </div>
        </div>

        {/* Valor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
          <input
            type="number"
            className="input-field"
            placeholder="0,00"
            min="0"
            step="0.01"
            value={form.valor}
            onChange={set('valor')}
          />
        </div>

        {/* Data e Hora */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de agendamento</label>
            <input
              type="date"
              className="input-field"
              value={form.data_agendamento}
              onChange={set('data_agendamento')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
            <input
              type="time"
              className="input-field"
              value={form.hora_agendamento}
              onChange={set('hora_agendamento')}
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações internas</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            value={form.observacoes}
            onChange={set('observacoes')}
            placeholder="Notas internas..."
          />
        </div>

        {/* Forma de pagamento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pagamento</label>
          <select className="input-field" value={form.forma_pagamento} onChange={set('forma_pagamento')}>
            {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Garantia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Garantia <span className="font-normal text-gray-400">(opcional)</span></label>
          <div className="flex gap-2">
            <input
              type="number"
              className="input-field flex-1"
              placeholder="Ex: 3"
              min="1"
              value={form.garantia_valor}
              onChange={set('garantia_valor')}
            />
            <select className="input-field w-32" value={form.garantia_unidade} onChange={set('garantia_unidade')}>
              <option value="dias">Dias</option>
              <option value="meses">Meses</option>
              <option value="anos">Anos</option>
            </select>
          </div>
          {form.garantia_valor && parseInt(form.garantia_valor) > 0 && (
            <p className="text-xs text-gray-500 mt-1.5 pl-1">
              Vence em: {formatDate(calcularVencimento(parseInt(form.garantia_valor), form.garantia_unidade, os.data_conclusao || null))}
            </p>
          )}
          <textarea
            className="input-field resize-none mt-2"
            rows={2}
            value={form.garantia_obs}
            onChange={set('garantia_obs')}
            placeholder="Observações da garantia (ex: cobre peças e mão de obra)..."
          />
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
