import { supabase } from '../lib/supabase'

const KEY = 'climapro_biometric'

export function useBiometric() {
  async function isAvailable() {
    try {
      return !!(
        window.PublicKeyCredential &&
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      )
    } catch {
      return false
    }
  }

  function isEnabled() {
    return !!localStorage.getItem(KEY)
  }

  async function enable() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { error: 'Sessão não encontrada.' }

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'ClimaPro', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(session.user.id),
            name: session.user.email,
            displayName: session.user.email,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      })

      localStorage.setItem(KEY, JSON.stringify({
        credId: Array.from(new Uint8Array(credential.rawId)),
        refreshToken: session.refresh_token,
        email: session.user.email,
      }))
      return { error: null }
    } catch (err) {
      if (err.name === 'NotAllowedError') return { error: 'Biometria cancelada.' }
      return { error: 'Não foi possível ativar a biometria.' }
    }
  }

  async function authenticate() {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!stored) return { error: 'Biometria não configurada.' }

    try {
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{
            id: new Uint8Array(stored.credId),
            type: 'public-key',
            transports: ['internal'],
          }],
          userVerification: 'required',
          timeout: 60000,
        },
      })

      const { error } = await supabase.auth.refreshSession({ refresh_token: stored.refreshToken })
      if (error) {
        localStorage.removeItem(KEY)
        return { error: 'Sessão expirada. Faça login com email e senha.' }
      }
      return { error: null }
    } catch (err) {
      if (err.name === 'NotAllowedError') return { cancelled: true }
      return { error: 'Verificação biométrica falhou.' }
    }
  }

  function disable() {
    localStorage.removeItem(KEY)
  }

  function getStoredEmail() {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null')
    return stored?.email ?? null
  }

  return { isAvailable, isEnabled, enable, authenticate, disable, getStoredEmail }
}
