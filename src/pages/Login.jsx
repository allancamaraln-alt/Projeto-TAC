import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [modo, setModo] = useState('login')
  const [form, setForm] = useState({ nome: '', email: '', password: '' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    if (modo === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) setErro('Email ou senha incorretos.')
    } else {
      if (!form.nome.trim()) { setErro('Digite seu nome.'); setLoading(false); return }
      const { error } = await signUp(form.email, form.password, form.nome)
      if (error) setErro(error.message === 'User already registered' ? 'Email já cadastrado.' : 'Erro ao cadastrar.')
      else setErro('✅ Verifique seu email para confirmar o cadastro.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(160deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)'}}>
      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white opacity-5" />
        <div className="absolute top-32 -left-16 w-48 h-48 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-32 right-8 w-32 h-32 rounded-full bg-white opacity-5" />
      </div>

      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 relative">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-4">
          <span className="text-4xl">❄️</span>
        </div>
        <h1 className="text-white text-3xl font-extrabold tracking-tight">ClimaPro</h1>
        <p className="ac-text-sf text-sm mt-1 font-medium">Ordens de Serviço para Técnicos</p>
      </div>

      {/* Card de login */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl relative">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {modo === 'login' ? 'Entrar na conta' : 'Criar conta grátis'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'cadastro' && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Seu nome</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: João Silva"
                value={form.nome}
                onChange={set('nome')}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="seu@email.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Senha</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              minLength={6}
              required
            />
          </div>

          {erro && (
            <p className={`text-sm p-3 rounded-xl ${erro.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {erro}
            </p>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => { setModo(m => m === 'login' ? 'cadastro' : 'login'); setErro('') }}
          className="w-full text-center ac-text font-semibold text-sm mt-5 py-2"
        >
          {modo === 'login' ? 'Não tem conta? Cadastre-se grátis' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
