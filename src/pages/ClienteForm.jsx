import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ClienteForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const isEdit = Boolean(id && id !== 'novo')

  const [form, setForm] = useState({ nome: '', telefone: '', endereco: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    supabase.from('clientes').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) setForm({ nome: data.nome, telefone: data.telefone, endereco: data.endereco || '' })
        setLoading(false)
      })
  }, [id, isEdit])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (!form.telefone.trim()) { setErro('Telefone é obrigatório.'); return }

    setSaving(true)
    let error
    if (isEdit) {
      ({ error } = await supabase.from('clientes').update(form).eq('id', id))
    } else {
      ({ error } = await supabase.from('clientes').insert({ ...form, tecnico_id: user.id }))
    }

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    navigate('/clientes')
  }

  async function handleDelete() {
    if (!confirm('Excluir este cliente? As OS vinculadas também serão excluídas.')) return
    await supabase.from('clientes').delete().eq('id', id)
    navigate('/clientes')
  }

  if (loading) return (
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
        <h1 className="text-xl font-bold text-gray-800">
          {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input type="text" className="input-field" placeholder="Nome completo" value={form.nome} onChange={set('nome')} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp *</label>
          <input
            type="tel"
            className="input-field"
            placeholder="(11) 99999-9999"
            value={form.telefone}
            onChange={set('telefone')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <textarea
            className="input-field resize-none"
            placeholder="Rua, número, bairro, cidade..."
            rows={3}
            value={form.endereco}
            onChange={set('endereco')}
          />
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}
        </button>

        {isEdit && (
          <button type="button" onClick={handleDelete} className="btn-danger">
            Excluir cliente
          </button>
        )}
      </form>
    </div>
  )
}
