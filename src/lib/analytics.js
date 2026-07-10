import { supabase } from './supabase'

/** Busca todas as métricas do /admin/analytics num único round-trip. */
export async function fetchAnalyticsSummary(filters) {
  const { data, error } = await supabase.functions.invoke('admin-analytics', {
    body: { action: 'summary_all', filters },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

/** Lista paginada de usuários + última compra, para /admin/tracking-debug. */
export async function fetchTrackingList({ page, pageSize, filters }) {
  const { data, error } = await supabase.functions.invoke('admin-tracking', {
    body: { action: 'list', page, pageSize, filters },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

/** Detalhe completo de uma compra + timeline, para /admin/purchase/:payment_id. */
export async function fetchPurchaseDetail(paymentId) {
  const { data, error } = await supabase.functions.invoke('admin-tracking', {
    body: { action: 'detail', payment_id: paymentId },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

/** Reenvia manualmente o Purchase (Utmify + Meta CAPI) de uma compra. */
export async function resendPurchase(paymentId) {
  const { data, error } = await supabase.functions.invoke('admin-tracking', {
    body: { action: 'resend', payment_id: paymentId },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}
