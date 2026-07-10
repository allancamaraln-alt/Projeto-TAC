import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3
const COMISSAO_PERC = 0.20

// DEBUG=true (Edge Function secret) liga o log verboso e completo de cada
// etapa do rastreamento. Com DEBUG=false (ou ausente), só os logs essenciais
// (o suficiente para confirmar sucesso/falha de cada envio) ficam ativos.
const DEBUG = Deno.env.get('DEBUG') === 'true'
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log(...args)
}

const MP_METHOD_MAP: Record<string, string> = {
  credit_card: 'credit_card',
  debit_card: 'credit_card',
  bank_transfer: 'pix',
  account_money: 'pix',
}

async function notificarUtmify(
  orderId: string,
  amount: number,
  plan: string,
  paymentMethod: string,
  createdAt: string,
  approvedAt: string | null,
  profile: { nome?: string; email?: string; telefone?: string } | null,
  utms?: Record<string, string | null>,
) {
  try {
    const token = Deno.env.get('UTMIFY_API_TOKEN')
    if (!token) {
      console.log('[utmify] UTMIFY_API_TOKEN não configurado — pedido não enviado')
      return
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
      console.error('[utmify] pedido REJEITADO:', {
        orderId,
        httpStatus: res.status,
        corpoResposta: responseText,
      })
      return
    }

    console.log('[utmify] pedido aceito:', { orderId, httpStatus: res.status })
    debugLog('[utmify][DEBUG] corpo completo da resposta:', responseText)
  } catch (e) {
    console.error('[utmify] erro ao notificar (exceção de rede/parsing):', e)
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
async function enviarMetaCAPI(params: {
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
}) {
  const eventName = 'Purchase'
  try {
    const pixelId = Deno.env.get('META_PIXEL_ID')
    const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')
    if (!pixelId || !accessToken) {
      console.log('[meta-capi] META_PIXEL_ID/META_CAPI_ACCESS_TOKEN não configurados — evento não enviado', {
        eventId: params.eventId,
        eventName,
      })
      return
    }

    const userData: Record<string, unknown> = {}
    if (params.email) userData.em = [await sha256Hex(params.email)]
    if (params.userId) userData.external_id = [await sha256Hex(params.userId)]
    if (params.fbc) userData.fbc = params.fbc
    if (params.fbp) userData.fbp = params.fbp
    if (params.clientIp) userData.client_ip_address = params.clientIp
    if (params.userAgent) userData.client_user_agent = params.userAgent

    // Auditoria de campos exigidos pela Meta — reporta o que ficou ausente
    // (nunca bloqueia o envio, só documenta a lacuna no log).
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
      return
    }

    // Confirmação de que a Meta recebeu e aceitou o evento (não apenas que tentamos enviar).
    console.log('[meta-capi] evento ACEITO pela Meta:', {
      eventId: params.eventId,
      eventName,
      pixelId,
      httpStatus: res.status,
      events_received: json.events_received,
      fbtrace_id: json.fbtrace_id,
    })
    debugLog('[meta-capi][DEBUG] corpo completo da resposta:', JSON.stringify(json))
  } catch (e) {
    console.error('[meta-capi] erro ao enviar evento Purchase (exceção de rede/parsing):', {
      eventId: params.eventId,
      eventName,
      erro: (e as Error).message,
    })
  }
}

async function registrarComissao(supabase: any, userId: string, amount: number, paymentRef: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles').select('ref_code').eq('id', userId).single()
    if (!profile?.ref_code) return

    const { data: afiliado } = await supabase
      .from('afiliados').select('id').eq('codigo', profile.ref_code).single()
    if (!afiliado) return

    const valor = Math.round(amount * COMISSAO_PERC * 100) / 100
    const periodo_ref = new Date().toISOString().slice(0, 7)

    await supabase.from('comissoes').upsert({
      afiliado_id: afiliado.id,
      indicado_user_id: userId,
      valor,
      status: 'pendente',
      periodo_ref,
      payment_ref: paymentRef,
    }, { onConflict: 'payment_ref', ignoreDuplicates: true })
  } catch (e) {
    console.error('Erro ao registrar comissão:', e)
  }
}

const PROFILE_TRACKING_FIELDS = 'nome, email, telefone, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, sck, signup_ip, signup_user_agent, signup_page_url'

function resolverTracking(profile: Record<string, unknown> | null, metadataUtms: Record<string, unknown> | undefined) {
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

serve(async (req) => {
  try {
    const notification = await req.json()
    debugLog('[mp-webhook][DEBUG] notificação recebida do Mercado Pago:', JSON.stringify(notification))

    if (notification.type === 'payment') {
      const paymentId = notification.data?.id
      if (!paymentId) return new Response('ok', { status: 200 })

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` },
      })
      const payment = await mpRes.json()

      if (payment.status !== 'approved') return new Response('ok', { status: 200 })

      const userId = payment.external_reference
      if (!userId) return new Response('ok', { status: 200 })

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const amt = payment.transaction_amount
      const plan = amt >= 100 ? 'annual' : amt >= 35 ? 'professional' : amt >= 25 ? 'plus' : amt <= 12 ? 'monthly_saida50' : 'monthly'
      const days = plan === 'annual' ? 365 : 30

      const until = new Date()
      until.setDate(until.getDate() + days + GRACE_DAYS)

      const { data: profile } = await supabase
        .from('profiles')
        .select(PROFILE_TRACKING_FIELDS)
        .eq('id', userId).single()

      await supabase.from('profiles').update({
        subscribed_until: until.toISOString(),
        plan: plan === 'monthly_saida50' ? 'monthly' : plan,
        plan_locked_at: new Date().toISOString(),
      }).eq('id', userId)

      await registrarComissao(supabase, userId, payment.transaction_amount, String(paymentId))

      // O tracking gravado no perfil no cadastro é a fonte canônica; o metadata do
      // pagamento (enviado pelo frontend na hora da compra) só preenche o que faltar,
      // cobrindo o caso de o cadastro ter ocorrido antes desta migração.
      const tracking = resolverTracking(profile, payment.metadata?.utms)

      console.log(`[mp-webhook] dados recuperados para usuário ${userId}:`, {
        hasFbclid: !!tracking.fbclid,
        hasFbc: !!tracking.fbc,
        hasFbp: !!tracking.fbp,
        utm_source: tracking.utm_source,
        utm_campaign: tracking.utm_campaign,
        hasSignupIp: !!profile?.signup_ip,
        hasSignupUserAgent: !!profile?.signup_user_agent,
        hasSignupPageUrl: !!profile?.signup_page_url,
      })
      debugLog('[mp-webhook][DEBUG] tracking completo resolvido:', tracking, {
        signup_ip: profile?.signup_ip,
        signup_user_agent: profile?.signup_user_agent,
        signup_page_url: profile?.signup_page_url,
      })

      console.log('[mp-webhook] enviando para Utmify...', { orderId: String(paymentId) })
      await notificarUtmify(
        String(paymentId),
        payment.transaction_amount,
        plan,
        payment.payment_type_id ?? '',
        payment.date_created ?? new Date().toISOString(),
        payment.date_approved ?? null,
        profile,
        tracking,
      )

      // event_id = paymentId do Mercado Pago, o MESMO valor usado como eventID no
      // fbq('track', 'Purchase', ..., { eventID }) do frontend (Login.jsx). Isso é
      // garantido por construção (ambos os lados usam o payment_id do MP), não por
      // coincidência — é o mecanismo de deduplicação Pixel <-> Conversions API.
      console.log('[mp-webhook] enviando para Meta Conversions API...', { eventId: String(paymentId) })
      await enviarMetaCAPI({
        eventId: String(paymentId),
        eventTime: payment.date_approved
          ? Math.floor(new Date(payment.date_approved).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        value: payment.transaction_amount,
        email: profile?.email,
        userId,
        fbc: tracking.fbc,
        fbp: tracking.fbp,
        clientIp: profile?.signup_ip,
        userAgent: profile?.signup_user_agent,
        eventSourceUrl: profile?.signup_page_url,
      })

      console.log(`[mp-webhook] fluxo concluído com sucesso para usuário ${userId}, pagamento ${paymentId}`)

      return new Response('ok', { status: 200 })
    }

    if (notification.type === 'preapproval') {
      const subscriptionId = notification.data?.id
      if (!subscriptionId) return new Response('ok', { status: 200 })

      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` },
      })
      const sub = await mpRes.json()

      const userId = sub.external_reference
      if (!userId) return new Response('ok', { status: 200 })

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const frequency: number = sub.auto_recurring?.frequency ?? 1
      const plan = frequency >= 12 ? 'annual' : 'monthly'

      if (sub.status === 'authorized') {
        const base = sub.next_payment_date
          ? new Date(sub.next_payment_date)
          : (() => {
              const d = new Date()
              d.setMonth(d.getMonth() + frequency)
              return d
            })()
        base.setDate(base.getDate() + GRACE_DAYS)

        const { data: profile } = await supabase
          .from('profiles')
          .select(PROFILE_TRACKING_FIELDS)
          .eq('id', userId).single()

        await supabase.from('profiles').update({
          subscribed_until: base.toISOString(),
          plan,
          mp_subscription_id: subscriptionId,
        }).eq('id', userId)

        const subAmount = sub.auto_recurring?.transaction_amount ?? 0
        const periodo = new Date().toISOString().slice(0, 7)
        await registrarComissao(supabase, userId, subAmount, `${subscriptionId}_${periodo}`)

        const tracking = resolverTracking(profile, undefined)
        console.log(`[mp-webhook] dados recuperados (preapproval) para usuário ${userId}:`, {
          hasFbclid: !!tracking.fbclid,
          hasFbc: !!tracking.fbc,
          hasFbp: !!tracking.fbp,
          utm_source: tracking.utm_source,
        })

        await notificarUtmify(
          `${subscriptionId}_${periodo}`,
          subAmount,
          plan,
          'credit_card',
          new Date().toISOString(),
          new Date().toISOString(),
          profile,
          tracking,
        )
      } else if (sub.status === 'cancelled') {
        await supabase.from('profiles').update({
          plan: null,
          mp_subscription_id: null,
        }).eq('id', userId)
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('error', { status: 500 })
  }
})
