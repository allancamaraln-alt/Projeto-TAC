import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ClienteModal({ tecnicoId, onCreated, onClose }) {
  const [form, setForm] = useState({ nome: '', telefone: '', endereco: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const set = campo => e => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Informe o nome do cliente.'); return }
    if (!form.telefone.trim()) { setErro('Informe o telefone do cliente.'); return }

    setSalvando(true)
    setErro('')

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        endereco: form.endereco.trim(),
        tecnico_id: tecnicoId,
      })
      .select()
      .single()

    setSalvando(false)
    if (error) { setErro('Não foi possível salvar. Tente novamente.'); return }
    onCreated(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Novo cliente</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome*</label>
            <input className="input-field" value={form.nome} onChange={set('nome')} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Telefone*</label>
            <input className="input-field" value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Endereço</label>
            <textarea className="input-field" rows={2} value={form.endereco} onChange={set('endereco')} placeholder="Opcional" />
          </div>
        </div>

        {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}

        <button type="submit" disabled={salvando} className="btn-primary mt-4 w-full disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Salvar cliente'}
        </button>
      </form>
    </div>
  )
}
