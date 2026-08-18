import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { debugLog, notificarUtmify, enviarMetaCAPI, resolverTracking, registrarPurchaseLog, PROFILE_TRACKING_FIELDS } from '../_shared/tracking-dispatch.ts'
import { enviarEmailFalhaPagamento } from '../_shared/payment-failure-email.ts'

const GRACE_DAYS = 3
const COMISSAO_PERC = 0.20
const PLAN_DAYS: Record<string, number> = { monthly: 30, plus: 30, professional: 30, annual: 365 }

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

/** externalReference é sempre "${userId}:${plan}" (plan = monthly|plus|professional|annual|ai_addon) — ver asaas-client.ts e as functions asaas-create-*. */
function parseExternalReference(externalReference: string | undefined): { userId: string; plan: string } | null {
  if (!externalReference) return null
  const [userId, plan] = externalReference.split(':')
  if (!userId || !plan) return null
  return { userId, plan }
}

serve(async (req) => {
  try {
    const tokenHeader = req.headers.get('asaas-access-token')
    if (tokenHeader !== Deno.env.get('ASAAS_WEBHOOK_TOKEN')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const notification = await req.json()
    debugLog('[asaas-webhook][DEBUG] notificação recebida do Asaas:', JSON.stringify(notification))

    const event = notification.event as string
    const payment = notification.payment
    if (!payment) return new Response('ok', { status: 200 })

    const parsed = parseExternalReference(payment.externalReference)
    if (!parsed) return new Response('ok', { status: 200 })
    const { userId, plan } = parsed

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const webhookStart = Date.now()
      const webhookReceivedAt = new Date(webhookStart).toISOString()
      const paymentId = String(payment.id)
      const value = Number(payment.value)
      const approvedAtIso = payment.clientPaymentDate || payment.paymentDate
        ? new Date(`${payment.clientPaymentDate || payment.paymentDate}T12:00:00Z`).toISOString()
        : new Date().toISOString()

      if (plan === 'ai_addon') {
        const addonUntil = new Date()
        addonUntil.setDate(addonUntil.getDate() + 30 + GRACE_DAYS)

        await supabase.from('profiles').update({
          ai_addon_until: addonUntil.toISOString(),
        }).eq('id', userId)
        const accessGrantedAt = new Date().toISOString()

        await registrarComissao(supabase, userId, value, paymentId)

        const { data: addonProfile } = await supabase
          .from('profiles')
          .select(PROFILE_TRACKING_FIELDS)
          .eq('id', userId).single()

        const tracking = resolverTracking(addonProfile, undefined)

        const utmifyResult = await notificarUtmify(
          paymentId, value, 'ai_addon', payment.billingType ?? '',
          payment.dateCreated ?? new Date().toISOString(), approvedAtIso,
          addonProfile, tracking,
        )

        const metaCapiResult = await enviarMetaCAPI({
          eventId: paymentId,
          eventTime: Math.floor(new Date(approvedAtIso).getTime() / 1000),
          value,
          email: addonProfile?.email,
          userId,
          fbc: tracking.fbc,
          fbp: tracking.fbp,
          clientIp: addonProfile?.signup_ip,
          userAgent: addonProfile?.signup_user_agent,
          eventSourceUrl: addonProfile?.signup_page_url,
        })

        await registrarPurchaseLog(supabase, {
          userId, paymentId, eventId: paymentId, plan: 'ai_addon', value,
          purchasedAt: approvedAtIso, utmifyResult, metaCapiResult,
          processingTimeMs: Date.now() - webhookStart,
          paymentCreatedAt: payment.dateCreated ?? null,
          webhookReceivedAt, accessGrantedAt,
        })

        console.log(`[asaas-webhook] add-on IA concluído para usuário ${userId}, pagamento ${paymentId}`)
        return new Response('ok', { status: 200 })
      }

      if (!PLAN_DAYS[plan]) return new Response('ok', { status: 200 })
      const days = PLAN_DAYS[plan]

      const until = new Date()
      until.setDate(until.getDate() + days + GRACE_DAYS)

      const { data: profile } = await supabase
        .from('profiles')
        .select(PROFILE_TRACKING_FIELDS)
        .eq('id', userId).single()

      await supabase.from('profiles').update({
        subscribed_until: until.toISOString(),
        plan,
        plan_locked_at: new Date().toISOString(),
      }).eq('id', userId)
      const accessGrantedAt = new Date().toISOString()

      await registrarComissao(supabase, userId, value, paymentId)

      const tracking = resolverTracking(profile, undefined)

      const utmifyResult = await notificarUtmify(
        paymentId, value, plan, payment.billingType ?? '',
        payment.dateCreated ?? new Date().toISOString(), approvedAtIso,
        profile, tracking,
      )

      const metaCapiResult = await enviarMetaCAPI({
        eventId: paymentId,
        eventTime: Math.floor(new Date(approvedAtIso).getTime() / 1000),
        value,
        email: profile?.email,
        userId,
        fbc: tracking.fbc,
        fbp: tracking.fbp,
        clientIp: profile?.signup_ip,
        userAgent: profile?.signup_user_agent,
        eventSourceUrl: profile?.signup_page_url,
      })

      await registrarPurchaseLog(supabase, {
        userId, paymentId, eventId: paymentId, plan, value,
        purchasedAt: approvedAtIso, utmifyResult, metaCapiResult,
        processingTimeMs: Date.now() - webhookStart,
        paymentCreatedAt: payment.dateCreated ?? null,
        webhookReceivedAt, accessGrantedAt,
      })

      console.log(`[asaas-webhook] fluxo concluído com sucesso para usuário ${userId}, pagamento ${paymentId} em ${Date.now() - webhookStart}ms`)
      return new Response('ok', { status: 200 })
    }

    if (event === 'PAYMENT_OVERDUE') {
      const { data: profile } = await supabase
        .from('profiles').select('email, nome').eq('id', userId).single()
      if (profile?.email) {
        await enviarEmailFalhaPagamento(profile.email, profile.nome || 'Técnico').catch(() => {})
      }
      console.log(`[asaas-webhook] cobrança vencida sem pagamento — email de falha enviado para usuário ${userId}`)
      return new Response('ok', { status: 200 })
    }

    // Outros eventos (ex.: cancelamento de assinatura) não são tratados ainda —
    // confirmar o catálogo de eventos atual do Asaas durante os testes em sandbox
    // antes de ir para produção.
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('error', { status: 500 })
  }
})
