import { useState } from 'react'
import { REGISTRO_TIPOS } from '../../../lib/pmocTemplates'
import ClienteModal from '../ClienteModal'
import { useAuth } from '../../../hooks/useAuth'

export default function StepDadosGerais({ value, onChange, clientes, onClienteCreated }) {
  const { user } = useAuth()
  const [busca, setBusca] = useState('')
  const [showClienteModal, setShowClienteModal] = useState(false)

  const set = campo => e => onChange({ ...value, [campo]: e.target.value })

  const clientesFiltrados = clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))

  function selecionarCliente(c) {
    onChange({
      ...value,
      cliente_id: c.id,
      clienteNome: c.nome,
      clienteTelefone: c.telefone,
      clienteEndereco: c.endereco || '',
    })
  }

  function handleClienteCriado(c) {
    onClienteCreated(c)
    selecionarCliente(c)
    setShowClienteModal(false)
  }

  return (
    <div className="px-4 pt-5 space-y-5 pb-8">
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</h2>
          <button type="button" onClick={() => setShowClienteModal(true)} className="text-xs font-semibold ac-text">
            + Novo cliente
          </button>
        </div>

        {value.cliente_id ? (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
            <div>
              <p className="font-semibold text-gray-800 text-sm">{value.clienteNome}</p>
              <p className="text-xs text-gray-500">{value.clienteTelefone}</p>
            </div>
            <button type="button" onClick={() => onChange({ ...value, cliente_id: '', clienteNome: '', clienteTelefone: '', clienteEndereco: '' })} className="text-xs text-gray-400">
              Trocar
            </button>
          </div>
        ) : (
          <>
            <input
              type="search"
              className="input-field"
              placeholder="Buscar por nome ou telefone..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {clientesFiltrados.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum cliente encontrado.</p>
              )}
              {clientesFiltrados.map(c => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => selecionarCliente(c)}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 active:bg-gray-50"
                >
                  {c.nome}
                  <span className="text-xs text-gray-400 ml-2">{c.telefone}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Responsável técnico</h2>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
          <input className="input-field" value={value.responsavel_tecnico} onChange={set('responsavel_tecnico')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Registro profissional</label>
            <select className="input-field" value={value.registro_tipo} onChange={set('registro_tipo')}>
              {REGISTRO_TIPOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Número do registro</label>
            <input className="input-field" value={value.registro_numero} onChange={set('registro_numero')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">ART/TRT (opcional)</label>
          <input className="input-field" value={value.art_trt} onChange={set('art_trt')} />
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Início do plano</label>
          <input type="date" className="input-field" value={value.data_inicio} onChange={set('data_inicio')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
          <textarea className="input-field" rows={2} value={value.observacoes} onChange={set('observacoes')} placeholder="Opcional" />
        </div>
      </div>

      {showClienteModal && (
        <ClienteModal tecnicoId={user.id} onCreated={handleClienteCriado} onClose={() => setShowClienteModal(false)} />
      )}
    </div>
  )
}
