import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { debugLog, notificarUtmify, enviarMetaCAPI, resolverTracking, registrarPurchaseLog, PROFILE_TRACKING_FIELDS } from '../_shared/tracking-dispatch.ts'

const GRACE_DAYS = 3
const COMISSAO_PERC = 0.20

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
      const utmifyResult = await notificarUtmify(
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
      const metaCapiResult = await enviarMetaCAPI({
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

      await registrarPurchaseLog(supabase, {
        userId,
        paymentId: String(paymentId),
        eventId: String(paymentId),
        plan,
        value: payment.transaction_amount,
        purchasedAt: payment.date_approved ?? new Date().toISOString(),
        utmifyResult,
        metaCapiResult,
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

        const orderId = `${subscriptionId}_${periodo}`
        const utmifyResult = await notificarUtmify(
          orderId,
          subAmount,
          plan,
          'credit_card',
          new Date().toISOString(),
          new Date().toISOString(),
          profile,
          tracking,
        )

        await registrarPurchaseLog(supabase, {
          userId,
          paymentId: orderId,
          eventId: orderId,
          plan,
          value: subAmount,
          purchasedAt: new Date().toISOString(),
          utmifyResult,
          metaCapiResult: { success: false, errorMessage: 'Não aplicável a renovações de assinatura' },
        })
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
