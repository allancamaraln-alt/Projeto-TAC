import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatOS } from '../lib/format'

const TIPOS = [
  'Instalação', 'Manutenção preventiva', 'Manutenção corretiva',
  'Limpeza', 'Recarga de gás', 'Diagnóstico', 'Outro'
]

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
          observacoes: data.observacoes || '',
          status: data.status,
        })
      })
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSaving(true)

    const { error } = await supabase
      .from('ordens_servico')
      .update({
        tipo_servico: form.tipo_servico,
        descricao: form.descricao,
        valor: parseFloat(form.valor) || 0,
        data_agendamento: form.data_agendamento || null,
        observacoes: form.observacoes,
        status: form.status,
      })
      .eq('id', id)

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSaving(false); return }
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
                    ? 'bg-blue-600 text-white border-blue-600'
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

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data de agendamento</label>
          <input
            type="date"
            className="input-field"
            value={form.data_agendamento}
            onChange={set('data_agendamento')}
          />
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

        {erro && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
