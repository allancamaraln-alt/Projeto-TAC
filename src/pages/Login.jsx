import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const EMAIL_KEY = 'climapro_email'

function IconOlhoAberto() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function IconOlhoFechado() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}


export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()

  const [modo, setModo] = useState('login')
  const [form, setForm] = useState(() => ({
    nome: '',
    email:    localStorage.getItem(EMAIL_KEY) || '',
    password: '',
  }))
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [lembrarEmail, setLembrarEmail] = useState(() => !!localStorage.getItem(EMAIL_KEY))

  function toggleLembrarEmail(checked) {
    setLembrarEmail(checked)
    if (!checked) localStorage.removeItem(EMAIL_KEY)
  }

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    if (modo === 'recuperar') {
      if (!form.email.includes('@')) {
        setErro('Para recuperar a senha, informe seu email.')
        setLoading(false)
        return
      }
      const { error } = await resetPassword(form.email)
      if (error) setErro('Não foi possível enviar o email. Verifique o endereço.')
      else setErro('✅ Email de recuperação enviado! Verifique sua caixa de entrada.')
      setLoading(false)
      return
    }

    if (modo === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) {
        const msg = error.message || ''
        if (msg === 'phone_not_found') {
          setErro('Telefone não encontrado. Verifique o número ou use seu email.')
        } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('NetworkError') || msg.includes('Failed')) {
          setErro('Sem conexão com a internet. Verifique sua rede.')
        } else {
          setErro('Email/telefone ou senha incorretos.')
        }
      } else {
        if (lembrarEmail) localStorage.setItem(EMAIL_KEY, form.email)
        else localStorage.removeItem(EMAIL_KEY)
      }
    } else {
      if (!form.nome.trim()) { setErro('Digite seu nome.'); setLoading(false); return }
      const { error } = await signUp(form.email, form.password, form.nome)
      if (error) setErro(error.message === 'User already registered' ? 'Email já cadastrado.' : 'Erro ao cadastrar.')
      else setErro('✅ Verifique seu email para confirmar o cadastro.')
    }
    setLoading(false)
  }

  function trocarModo(novoModo) {
    setModo(novoModo)
    setErro('')
    setSenhaVisivel(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white opacity-5" />
        <div className="absolute top-32 -left-16 w-48 h-48 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-32 right-8 w-32 h-32 rounded-full bg-white opacity-5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 relative">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-4">
          <span className="text-4xl">❄️</span>
        </div>
        <h1 className="text-white text-3xl font-extrabold tracking-tight">ClimaPro</h1>
        <p className="ac-text-sf text-sm mt-1 font-medium">Ordens de Serviço para Técnicos</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl relative">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {modo === 'login' && 'Entrar na conta'}
          {modo === 'cadastro' && 'Criar conta grátis'}
          {modo === 'recuperar' && 'Recuperar senha'}
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
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">
              {modo === 'login' ? 'Email ou telefone' : 'Email'}
            </label>
            <input
              type="text"
              inputMode={modo === 'login' && /^[\d(+]/.test(form.email) ? 'tel' : 'email'}
              className="input-field"
              placeholder={modo === 'login' ? 'email@exemplo.com ou (11) 99999-9999' : 'seu@email.com'}
              value={form.email}
              onChange={set('email')}
              autoCapitalize="none"
              required
            />
          </div>

          {modo !== 'recuperar' && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={senhaVisivel ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel(v => !v)}
                  aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {senhaVisivel ? <IconOlhoFechado /> : <IconOlhoAberto />}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2.5">
                {modo === 'login' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={lembrarEmail}
                      onChange={e => toggleLembrarEmail(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'rgb(var(--ac))' }}
                    />
                    <span className="text-sm text-gray-500">Lembrar email</span>
                  </label>
                )}
                {modo === 'login' && (
                  <button
                    type="button"
                    onClick={() => trocarModo('recuperar')}
                    className="text-xs ac-text font-semibold"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
            </div>
          )}

          {erro && (
            <p className={`text-sm p-3 rounded-xl ${erro.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {erro}
            </p>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : modo === 'cadastro' ? 'Criar conta' : 'Enviar email de recuperação'}
          </button>
        </form>

        {modo === 'recuperar' ? (
          <button
            onClick={() => trocarModo('login')}
            className="w-full text-center ac-text font-semibold text-sm mt-5 py-2"
          >
            ← Voltar para o login
          </button>
        ) : (
          <button
            onClick={() => trocarModo(modo === 'login' ? 'cadastro' : 'login')}
            className="w-full text-center ac-text font-semibold text-sm mt-5 py-2"
          >
            {modo === 'login' ? 'Não tem conta? Cadastre-se grátis' : 'Já tem conta? Entrar'}
          </button>
        )}
      </div>
    </div>
  )
}
