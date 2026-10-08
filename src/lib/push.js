import { supabase } from './supabase'

// Chave pública VAPID (par da VAPID_PRIVATE_KEY configurada nos secrets da edge
// function `send-service-notifications`). Pública por definição — pode ficar no código.
const VAPID_PUBLIC_KEY = 'BE9gISgzVqF62xs6o1u4RFJK5LVMhzXp_DEu2WeSxycA6IBMjlbv7gJcVdENIBho00h9AoUPn0sxuWC-a4Pb994'

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// No iPhone, o push só existe com o app adicionado à tela de início (iOS 16.4+).
export function precisaInstalarNoIOS() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  return isIOS && !standalone
}

export function permissaoAtual() {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

async function getRegistration() {
  // O SW não é registrado em dev nem dentro de WebView (ver main.jsx).
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise(resolve => setTimeout(() => resolve(null), 4000)),
  ])
  if (!reg) throw new Error('sw_indisponivel')
  return reg
}

export async function getInscricaoAtual() {
  if (!isPushSupported()) return null
  try {
    const reg = await getRegistration()
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

// Pede permissão, inscreve este navegador e salva no Supabase.
// Lança 'permissao_negada' | 'sw_indisponivel' | 'nao_suportado' | erro do banco.
export async function ativarNotificacoes() {
  if (!isPushSupported()) throw new Error('nao_suportado')

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') throw new Error('permissao_negada')

  const reg = await getRegistration()
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
  })

  const { endpoint, keys } = sub.toJSON()
  const { error } = await supabase.rpc('registrar_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: navigator.userAgent.slice(0, 300),
  })
  if (error) throw error
  return sub
}

export async function desativarNotificacoes() {
  const sub = await getInscricaoAtual()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function enviarNotificacaoTeste() {
  const { data, error } = await supabase.functions.invoke('send-service-notifications', { body: { teste: true } })
  if (error) throw error
  return data
}
