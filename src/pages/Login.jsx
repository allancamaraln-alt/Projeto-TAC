import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [modo, setModo] = useState('login') // 'login' | 'cadastro'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-3xl">❄️</span>
          </div>
          <h1 className="text-white text-2xl font-bold">TecnicoOS</h1>
          <p className="text-blue-200 text-sm mt-1">Sistema de Ordens de Serviço</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-800 mb-5">
            {modo === 'login' ? 'Entrar na conta' : 'Criar conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {modo === 'cadastro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
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
              <p className={`text-sm p-3 rounded-lg ${erro.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {erro}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <button
            onClick={() => { setModo(m => m === 'login' ? 'cadastro' : 'login'); setErro('') }}
            className="w-full text-center text-blue-600 text-sm mt-4 py-2"
          >
            {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
