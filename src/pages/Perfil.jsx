import { useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../lib/supabase'

function CameraIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function resizeAvatar(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')
      const min = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, 400, 400)
      URL.revokeObjectURL(url)
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    }
    img.src = url
  })
}

function resizeCover(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const W = 1200, H = 400
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      const imgRatio = img.width / img.height
      const targetRatio = W / H
      let sx, sy, sw, sh
      if (imgRatio > targetRatio) {
        sh = img.height; sw = sh * targetRatio
        sx = (img.width - sw) / 2; sy = 0
      } else {
        sw = img.width; sh = sw / targetRatio
        sx = 0; sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
      URL.revokeObjectURL(url)
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    }
    img.src = url
  })
}

export default function Perfil() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { isDark, toggle: toggleTheme } = useTheme()
  const avatarInputRef = useRef()
  const coverInputRef = useRef()

  const [form, setForm] = useState({
    nome: profile?.nome || '',
    telefone: profile?.telefone || '',
    empresa: profile?.empresa || '',
  })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setErro('')
    setUploadingAvatar(true)
    try {
      const blob = await resizeAvatar(file)
      const path = `${user.id}.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ avatar_url: `${publicUrl}?v=${Date.now()}` })
    } catch (err) {
      setErro(`Erro: ${err?.message || JSON.stringify(err)}`)
    }
    setUploadingAvatar(false)
    e.target.value = ''
  }

  async function handleCoverChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setErro('')
    setUploadingCover(true)
    try {
      const blob = await resizeCover(file)
      const path = `${user.id}_cover.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ cover_url: `${publicUrl}?v=${Date.now()}` })
    } catch (err) {
      setErro(`Erro: ${err?.message || JSON.stringify(err)}`)
    }
    setUploadingCover(false)
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await updateProfile(form)
    setSucesso(true)
    setTimeout(() => setSucesso(false), 2000)
    setSaving(false)
  }

  const avatarUrl = profile?.avatar_url
  const coverUrl = profile?.cover_url

  return (
    <div className="page-container">

      {/* Capa / tema de cores */}
      <div className="relative h-44 overflow-hidden">
        {coverUrl
          ? <img src={coverUrl} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 60%, #0369a1 100%)' }} />
        }
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute top-12 right-4 z-20 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-black/45 transition-colors"
        >
          {uploadingCover
            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <CameraIcon className="w-3.5 h-3.5 text-white" />
          }
          <span className="text-white text-xs font-medium">Personalizar cores</span>
        </button>

        <div className="absolute bottom-3 left-4 right-4 z-10">
          <p className="text-white/80 text-xs drop-shadow">
            As cores do app se adaptam a esta foto
          </p>
        </div>
      </div>

      {/* Avatar + info — avatar sobrepõe a capa */}
      <div className="flex flex-col items-center -mt-11 relative z-10 pb-5">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative active:scale-95 transition-transform"
          style={{ width: 88, height: 88 }}
        >
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg">
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38bdf8, #0284c7)' }}>
                  <span className="text-3xl font-extrabold text-white">
                    {(profile?.nome || 'C').charAt(0).toUpperCase()}
                  </span>
                </div>
              )
            }
          </div>
          <div className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow border border-gray-100">
            {uploadingAvatar
              ? <span className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              : <CameraIcon className="w-3 h-3 ac-text" />
            }
          </div>
        </button>

        <h1 className="mt-3 text-xl font-bold text-gray-800">{profile?.nome || 'Técnico'}</h1>
        {profile?.empresa && (
          <p className="text-gray-400 text-sm mt-0.5">{profile.empresa}</p>
        )}

        <div className="mt-3 inline-flex items-center gap-1.5 bg-sky-50 border border-sky-100 rounded-full px-3 py-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a1 1 0 011 1v1.586l1.293-1.293a1 1 0 111.414 1.414L14.414 6H17a1 1 0 110 2h-4V9.586l3.293 3.293-3.293 3.293V17h4a1 1 0 110 2h-2.586l1.293 1.293a1 1 0 11-1.414 1.414L13 20.414V22a1 1 0 11-2 0v-1.586l-1.293 1.293a1 1 0 01-1.414-1.414L9.586 19H7a1 1 0 110-2h4v-1.121L7.707 12.5 11 9.207V8H7a1 1 0 110-2h2.586L8.293 4.707a1 1 0 011.414-1.414L11 4.586V3a1 1 0 011-1z"/>
          </svg>
          <span className="text-sky-600 text-xs font-semibold">ClimaPro</span>
        </div>

        {erro && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mx-4">
            {erro}
          </p>
        )}
      </div>

      {/* Inputs ocultos */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

      {/* Formulário */}
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

        {/* Toggle de tema */}
        <div className="flex items-center justify-between py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-lg">{isDark ? '🌙' : '☀️'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Tema escuro</p>
              <p className="text-xs text-gray-400">{isDark ? 'Ativado' : 'Desativado'}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${isDark ? 'ac-bg' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <button type="button" onClick={signOut} className="w-full text-center text-red-400 font-semibold py-3 mt-1">
          Sair da conta
        </button>
      </form>
    </div>
  )
}
