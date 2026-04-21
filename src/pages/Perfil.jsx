import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Perfil() {
  const { profile, updateProfile, signOut } = useAuth()
  const [form, setForm] = useState({
    nome: profile?.nome || '',
    telefone: profile?.telefone || '',
    empresa: profile?.empresa || '',
  })
  const [saving, setSaving] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await updateProfile(form)
    setSucesso(true)
    setTimeout(() => setSucesso(false), 2000)
    setSaving(false)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 pt-12 pb-8 text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl font-bold text-white">
            {(profile?.nome || 'T').charAt(0).toUpperCase()}
          </span>
        </div>
        <h1 className="text-xl font-bold">{profile?.nome || 'Técnico'}</h1>
        {profile?.empresa && <p className="text-blue-200 text-sm">{profile.empresa}</p>}
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dados do técnico</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input type="text" className="input-field" value={form.nome} onChange={set('nome')} placeholder="Seu nome" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
          <input type="tel" className="input-field" value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa / MEI</label>
          <input type="text" className="input-field" value={form.empresa} onChange={set('empresa')} placeholder="Ex: Gelo Fácil Refrigeração" />
        </div>

        {sucesso && (
          <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg text-center">
            ✅ Perfil atualizado!
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>

        <button
          type="button"
          onClick={signOut}
          className="w-full text-center text-red-500 font-medium py-3 mt-2"
        >
          Sair da conta
        </button>
      </form>
    </div>
  )
}
