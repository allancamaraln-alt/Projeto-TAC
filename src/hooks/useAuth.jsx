import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractPalette, applyPalette } from '../lib/palette'

const AuthContext = createContext({})

function normalizePhone(input) {
  const d = input.replace(/\D/g, '')
  if (d.length === 13 && d.startsWith('55')) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return input.trim()
}

// Usa RPC com security definer para contornar o RLS — o usuário ainda
// não está autenticado neste momento, então a query direta retornaria vazio.
async function findEmailByPhone(phone) {
  const candidates = [...new Set([normalizePhone(phone), phone.replace(/\D/g, ''), phone.trim()])]
  for (const q of candidates) {
    const { data } = await supabase.rpc('get_email_by_phone', { phone_input: q })
    if (data) return data
  }
  return null
}

const TRIAL_DAYS = 7

function computeSubscription(profile) {
  if (!profile) return { status: 'loading', trialDaysLeft: 0, isActive: false }

  const now = new Date()

  if (profile.subscribed_until && new Date(profile.subscribed_until) > now) {
    return { status: 'active', trialDaysLeft: 0, isActive: true }
  }

  if (profile.trial_starts_at) {
    const trialEnd = profile.trial_expires_at
      ? new Date(profile.trial_expires_at)
      : (() => { const d = new Date(profile.trial_starts_at); d.setDate(d.getDate() + TRIAL_DAYS); return d })()
    const msLeft = trialEnd - now
    if (msLeft > 0) {
      return {
        status: 'trial',
        trialDaysLeft: Math.ceil(msLeft / 86_400_000),
        isActive: true,
      }
    }
  }

  return { status: 'expired', trialDaysLeft: 0, isActive: false }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user.email)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user.email)
      else { setProfile(null); setLoading(false); applyPalette(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, userEmail) {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('offline')), 5000))
      const query = supabase.from('profiles').select('*').eq('id', userId).single()
      const { data } = await Promise.race([query, timeout])
      setProfile(data)
      if (data?.cover_url) extractPalette(data.cover_url).then(applyPalette)
      if (userEmail && !data?.email) {
        supabase.from('profiles').update({ email: userEmail }).eq('id', userId).then(() => {})
      }
    } catch {
      // sem internet — continua sem perfil
    } finally {
      setLoading(false)
    }
  }

  async function signIn(identifier, password) {
    const trimmed = identifier.trim()
    let email = trimmed

    if (!trimmed.includes('@')) {
      const found = await findEmailByPhone(trimmed)
      if (!found) return { error: { message: 'phone_not_found' } }
      email = found
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password, nome, telefone) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          telefone: telefone ? normalizePhone(telefone) : '',
        },
        emailRedirectTo: window.location.origin,
      }
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    applyPalette(null)
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error }
  }

  async function updateProfile(updates) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (!error) {
      setProfile(prev => ({ ...prev, ...updates }))
      if (updates.cover_url) {
        extractPalette(updates.cover_url).then(applyPalette)
      }
    }
    return { error }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id, user.email)
  }

  const subscription = computeSubscription(profile)
  const plan = profile?.plan ?? null

  // isLocked: assinante ativo sob o novo regime de planos (tem plan_locked_at)
  // Usuários sem plan_locked_at são grandfathered e recebem acesso completo.
  const isLocked = subscription.status === 'active' && !!profile?.plan_locked_at
  const isBasico = profile?.plan === 'monthly'

  const hasFaturamento        = !(isLocked && isBasico)
  const hasSound              = !(isLocked && isBasico)
  const hasHistoricoCompleto  = !(isLocked && isBasico)
  const hasRelatorioAvancado  = !isLocked || profile?.plan === 'annual'

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, signOut, updateProfile, resetPassword, refreshProfile,
      subscriptionStatus: subscription.status,
      trialDaysLeft: subscription.trialDaysLeft,
      isActive: subscription.isActive,
      plan,
      hasFaturamento,
      hasSound,
      hasHistoricoCompleto,
      hasRelatorioAvancado,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
