import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TIPOS = [
  'Instalação', 'Manutenção preventiva', 'Manutenção corretiva',
  'Limpeza', 'Recarga de gás', 'Diagnóstico', 'Outro'
]

export default function OrdemForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [clientes, setClientes] = useState([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const [form, setForm] = useState({
    tipo_servico: 'Manutenção preventiva',
    descricao: '',
    valor: '',
    data_agendamento: '',
    observacoes: '',
    status: 'orcamento',
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  useEffect(() => {
    // Pré-selecionar cliente se veio da tela de clientes
    const clienteId = searchParams.get('cliente')
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      setClientes(data ?? [])
      if (clienteId) {
        const c = data?.find(c => c.id === clienteId)
        if (c) { setClienteSelecionado(c); setBuscaCliente(c.nome) }
      }
    })
  }, [])

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.telefone.includes(buscaCliente)
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!clienteSelecionado) { setErro('Selecione um cliente.'); return }
    if (!form.tipo_servico) { setErro('Selecione o tipo de serviço.'); return }

    setSaving(true)
    const { error } = await supabase.from('ordens_servico').insert({
      tecnico_id: user.id,
      cliente_id: clienteSelecionado.id,
      tipo_servico: form.tipo_servico,
      descricao: form.descricao,
      valor: parseFloat(form.valor) || 0,
      data_agendamento: form.data_agendamento || null,
      observacoes: form.observacoes,
      status: form.status,
    })

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    navigate('/ordens')
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">Nova OS / Orçamento</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-5">

        {/* Selecionar cliente */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Cliente *</label>
            <button
              type="button"
              onClick={() => navigate('/clientes/novo')}
              className="text-xs text-blue-600 font-medium"
            >
              + Novo cliente
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              className="input-field"
              placeholder="Buscar cliente..."
              value={buscaCliente}
              onChange={e => { setBuscaCliente(e.target.value); setShowDropdown(true); setClienteSelecionado(null) }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && buscaCliente && !clienteSelecionado && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {clientesFiltrados.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400 text-center">Nenhum cliente encontrado</p>
                ) : (
                  clientesFiltrados.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                      onClick={() => {
                        setClienteSelecionado(c)
                        setBuscaCliente(c.nome)
                        setShowDropdown(false)
                      }}
                    >
                      <p className="font-medium text-gray-800">{c.nome}</p>
                      <p className="text-xs text-gray-500">{c.telefone}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {clienteSelecionado && (
            <p className="text-xs text-green-600 mt-1 pl-1">✅ {clienteSelecionado.telefone} — {clienteSelecionado.endereco}</p>
          )}
        </div>

        {/* Tipo de serviço */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de serviço *</label>
          <select className="input-field" value={form.tipo_servico} onChange={set('tipo_servico')}>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do problema</label>
          <textarea
            className="input-field resize-none"
            placeholder="Descreva o serviço a ser realizado..."
            rows={3}
            value={form.descricao}
            onChange={set('descricao')}
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

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status inicial</label>
          <select className="input-field" value={form.status} onChange={set('status')}>
            <option value="orcamento">Orçamento</option>
            <option value="aprovado">Aprovado</option>
            <option value="em_andamento">Em andamento</option>
          </select>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações internas</label>
          <textarea
            className="input-field resize-none"
            placeholder="Notas para uso interno..."
            rows={2}
            value={form.observacoes}
            onChange={set('observacoes')}
          />
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Criar OS / Orçamento'}
        </button>
      </form>
    </div>
  )
}
