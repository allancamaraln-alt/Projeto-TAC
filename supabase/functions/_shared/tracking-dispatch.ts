// Módulo compartilhado entre `mp-webhook` e `admin-tracking`. Ambos precisam
// enviar exatamente o mesmo payload para Utmify/Meta CAPI (o botão "Reenviar
// Purchase" reproduz o envio original) — duplicar esse código nos dois lugares
// arriscaria os dois divergirem silenciosamente ao longo do tempo.

const DEBUG = Deno.env.get('DEBUG') === 'true'
export function debugLog(...args: unknown[]) {
  if (DEBUG) console.log(...args)
}

const MP_METHOD_MAP: Record<string, string> = {
  credit_card: 'credit_card',
  debit_card: 'credit_card',
  bank_transfer: 'pix',
  account_money: 'pix',
}

export const PROFILE_TRACKING_FIELDS = 'nome, email, telefone, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, sck, signup_ip, signup_user_agent, signup_page_url, entry_url, referrer'

export type DispatchResult = {
  success: boolean
  httpStatus?: number
  response?: string
  errorMessage?: string
}

// Registra o resultado de cada tentativa de envio (sucesso ou falha) para que
// a página /admin/tracking-debug exiba o status real e o botão "Reenviar
// Purchase" tenha o que reprocessar. onConflict por payment_id: uma nova
// notificação do mesmo pagamento (ou um reenvio manual) atualiza a mesma
// linha em vez de duplicar.
export async function registrarPurchaseLog(supabase: any, params: {
  userId: string
  paymentId: string
  eventId: string
  plan: string
  value: number
  purchasedAt: string
  utmifyResult: DispatchResult
  metaCapiResult: DispatchResult
}) {
  try {
    await supabase.from('purchase_tracking_log').upsert({
      user_id: params.userId,
      payment_id: params.paymentId,
      event_id: params.eventId,
      plan: params.plan,
      value: params.value,
      purchased_at: params.purchasedAt,
      utmify_order_id: params.paymentId,
      utmify_status: params.utmifyResult.success ? 'success' : 'error',
      utmify_http_status: params.utmifyResult.httpStatus ?? null,
      utmify_response: params.utmifyResult.response ?? params.utmifyResult.errorMessage ?? null,
      meta_capi_status: params.metaCapiResult.success ? 'success' : 'error',
      meta_capi_http_status: params.metaCapiResult.httpStatus ?? null,
      meta_capi_response: params.metaCapiResult.response ?? params.metaCapiResult.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'payment_id' })
  } catch (e) {
    console.error('[purchase-log] erro ao gravar purchase_tracking_log:', e)
  }
}

export function resolverTracking(profile: Record<string, unknown> | null, metadataUtms: Record<string, unknown> | undefined) {
  const tracking: Record<string, string | null> = {
    fbclid: (profile?.fbclid as string) ?? null,
    fbc: (profile?.fbc as string) ?? null,
    fbp: (profile?.fbp as string) ?? null,
    utm_source: (profile?.utm_source as string) ?? null,
    utm_medium: (profile?.utm_medium as string) ?? null,
    utm_campaign: (profile?.utm_campaign as string) ?? null,
    utm_content: (profile?.utm_content as string) ?? null,
    utm_term: (profile?.utm_term as string) ?? null,
    src: (profile?.src as string) ?? null,
    sck: (profile?.sck as string) ?? null,
  }
  for (const [key, value] of Object.entries(metadataUtms ?? {})) {
    if (value && !tracking[key]) tracking[key] = value as string
  }
  return tracking
}

export async function notificarUtmify(
  orderId: string,
  amount: number,
  plan: string,
  paymentMethod: string,
  createdAt: string,
  approvedAt: string | null,
  profile: { nome?: string; email?: string; telefone?: string } | null,
  utms?: Record<string, string | null>,
): Promise<DispatchResult> {
  try {
    const token = Deno.env.get('UTMIFY_API_TOKEN')
    if (!token) {
      console.log('[utmify] UTMIFY_API_TOKEN não configurado — pedido não enviado')
      return { success: false, errorMessage: 'UTMIFY_API_TOKEN não configurado' }
    }

    const priceInCents = Math.round(amount * 100)
    const planName = plan === 'annual' ? 'Anual' : 'Mensal'

    const body = {
      orderId,
      platform: 'ClimaPro',
      paymentMethod: MP_METHOD_MAP[paymentMethod] ?? 'pix',
      status: 'paid',
      createdAt,
      approvedDate: approvedAt ?? new Date().toISOString(),
      refundedAt: null,
      customer: {
        name: profile?.nome ?? '',
        email: profile?.email ?? '',
        phone: profile?.telefone ?? '',
        document: '',
      },
      products: [{
        id: plan,
        name: `ClimaPro ${planName}`,
        planId: plan,
        planName,
        quantity: 1,
        priceInCents,
      }],
      trackingParameters: {
        src: utms?.src ?? null,
        sck: utms?.sck ?? null,
        utm_source: utms?.utm_source ?? null,
        utm_campaign: utms?.utm_campaign ?? null,
        utm_medium: utms?.utm_medium ?? null,
        utm_content: utms?.utm_content ?? null,
        utm_term: utms?.utm_term ?? null,
        fbclid: utms?.fbclid ?? null,
        fbc: utms?.fbc ?? null,
        fbp: utms?.fbp ?? null,
      },
      commission: {
        totalPriceInCents: priceInCents,
        gatewayFeeInCents: 0,
        userCommissionInCents: priceInCents,
        currency: 'BRL',
      },
    }

    debugLog('[utmify][DEBUG] payload enviado:', JSON.stringify(body))

    const res = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-token': token },
      body: JSON.stringify(body),
    })
    const responseText = await res.text()

    if (!res.ok) {
      console.error('[utmify] pedido REJEITADO:', { orderId, httpStatus: res.status, corpoResposta: responseText })
      return { success: false, httpStatus: res.status, response: responseText, errorMessage: `HTTP ${res.status}` }
    }

    console.log('[utmify] pedido aceito:', { orderId, httpStatus: res.status })
    debugLog('[utmify][DEBUG] corpo completo da resposta:', responseText)
    return { success: true, httpStatus: res.status, response: responseText }
  } catch (e) {
    console.error('[utmify] erro ao notificar (exceção de rede/parsing):', e)
    return { success: false, errorMessage: (e as Error).message }
  }
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Envia o evento Purchase para a Meta Conversions API (server-side), complementando
// o Pixel do navegador (que sozinho perde eventos por bloqueadores de anúncio, Safari
// ITP e navegadores in-app do Instagram/Facebook). event_id igual ao usado no fbq()
// do frontend (Login.jsx: eventID = payment_id) permite que a Meta deduplique os dois
// envios — o mesmo payment_id do Mercado Pago é usado nos dois lados por construção.
export async function enviarMetaCAPI(params: {
  eventId: string
  eventTime: number
  value: number
  email?: string | null
  userId?: string | null
  fbc?: string | null
  fbp?: string | null
  clientIp?: string | null
  userAgent?: string | null
  eventSourceUrl?: string | null
}): Promise<DispatchResult> {
  const eventName = 'Purchase'
  try {
    const pixelId = Deno.env.get('META_PIXEL_ID')
    const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')
    if (!pixelId || !accessToken) {
      console.log('[meta-capi] META_PIXEL_ID/META_CAPI_ACCESS_TOKEN não configurados — evento não enviado', {
        eventId: params.eventId,
        eventName,
      })
      return { success: false, errorMessage: 'META_PIXEL_ID/META_CAPI_ACCESS_TOKEN não configurados' }
    }

    const userData: Record<string, unknown> = {}
    if (params.email) userData.em = [await sha256Hex(params.email)]
    if (params.userId) userData.external_id = [await sha256Hex(params.userId)]
    if (params.fbc) userData.fbc = params.fbc
    if (params.fbp) userData.fbp = params.fbp
    if (params.clientIp) userData.client_ip_address = params.clientIp
    if (params.userAgent) userData.client_user_agent = params.userAgent

    const camposEsperados = {
      event_name: true,
      event_time: true,
      event_id: true,
      action_source: true,
      event_source_url: !!params.eventSourceUrl,
      external_id: !!userData.external_id,
      client_ip_address: !!userData.client_ip_address,
      client_user_agent: !!userData.client_user_agent,
      fbc: !!userData.fbc,
      fbp: !!userData.fbp,
      em: !!userData.em,
      currency: true,
      value: Number.isFinite(params.value),
    }
    const camposAusentes = Object.entries(camposEsperados).filter(([, presente]) => !presente).map(([campo]) => campo)
    if (camposAusentes.length > 0) {
      console.log('[meta-capi] campos ausentes neste evento:', { eventId: params.eventId, camposAusentes })
    }

    const payload = {
      data: [{
        event_name: eventName,
        event_time: params.eventTime,
        event_id: params.eventId,
        action_source: 'website',
        ...(params.eventSourceUrl ? { event_source_url: params.eventSourceUrl } : {}),
        user_data: userData,
        custom_data: { currency: 'BRL', value: params.value },
      }],
    }

    debugLog('[meta-capi][DEBUG] payload completo enviado (em/external_id já são hashes SHA-256):', JSON.stringify(payload))

    const res = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!res.ok || json.error) {
      console.error('[meta-capi] evento REJEITADO pela Meta:', {
        eventId: params.eventId,
        eventName,
        pixelId,
        httpStatus: res.status,
        codigoErro: json.error?.code,
        subcodigoErro: json.error?.error_subcode,
        mensagemErro: json.error?.message,
        tipoErro: json.error?.type,
        fbtraceId: json.error?.fbtrace_id ?? json.fbtrace_id,
        corpoCompleto: JSON.stringify(json),
      })
      return {
        success: false,
        httpStatus: res.status,
        response: JSON.stringify(json),
        errorMessage: json.error?.message ?? `HTTP ${res.status}`,
      }
    }

    console.log('[meta-capi] evento ACEITO pela Meta:', {
      eventId: params.eventId,
      eventName,
      pixelId,
      httpStatus: res.status,
      events_received: json.events_received,
      fbtrace_id: json.fbtrace_id,
    })
    debugLog('[meta-capi][DEBUG] corpo completo da resposta:', JSON.stringify(json))
    return { success: true, httpStatus: res.status, response: JSON.stringify(json) }
  } catch (e) {
    console.error('[meta-capi] erro ao enviar evento Purchase (exceção de rede/parsing):', {
      eventId: params.eventId,
      eventName,
      erro: (e as Error).message,
    })
    return { success: false, errorMessage: (e as Error).message }
  }
}
