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
      <div className="relative overflow-hidden px-4 pt-12 pb-10 text-center" style={{background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'}}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white opacity-5" />
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 border-2 border-white/30">
          <span className="text-3xl font-extrabold text-white">
            {(profile?.nome || 'C').charAt(0).toUpperCase()}
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-white">{profile?.nome || 'Técnico'}</h1>
        {profile?.empresa && <p className="text-sky-200 text-sm mt-0.5">{profile.empresa}</p>}
        <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
          <span className="text-lg">❄️</span>
          <span className="text-white text-xs font-semibold">ClimaPro</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados do técnico</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">Nome</label>
          <input type="text" className="input-field" value={form.nome} onChange={set('nome')} placeholder="Seu nome" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">WhatsApp</label>
          <input type="tel" className="input-field" value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">Nome da empresa / MEI</label>
          <input type="text" className="input-field" value={form.empresa} onChange={set('empresa')} placeholder="Ex: Gelo Fácil Refrigeração" />
        </div>

        {sucesso && (
          <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl text-center font-medium">
            ✅ Perfil atualizado!
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>

        <button
          type="button"
          onClick={signOut}
          className="w-full text-center text-red-400 font-semibold py-3 mt-1"
        >
          Sair da conta
        </button>
      </form>
    </div>
  )
}
