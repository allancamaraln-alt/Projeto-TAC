import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3
const COMISSAO_PERC = 0.20

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
    if (!token) return

    const priceInCents = Math.round(amount * 100)
    const planName = plan === 'annual' ? 'Anual' : 'Mensal'

    await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-token': token },
      body: JSON.stringify({
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
        },
        commission: {
          totalPriceInCents: priceInCents,
          gatewayFeeInCents: 0,
          userCommissionInCents: priceInCents,
          currency: 'BRL',
        },
      }),
    })
  } catch (e) {
    console.error('Erro ao notificar Utmify:', e)
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

serve(async (req) => {
  try {
    const notification = await req.json()

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
        .from('profiles').select('nome, email, telefone').eq('id', userId).single()

      await supabase.from('profiles').update({
        subscribed_until: until.toISOString(),
        plan: plan === 'monthly_saida50' ? 'monthly' : plan,
        plan_locked_at: new Date().toISOString(),
      }).eq('id', userId)

      await registrarComissao(supabase, userId, payment.transaction_amount, String(paymentId))

      await notificarUtmify(
        String(paymentId),
        payment.transaction_amount,
        plan,
        payment.payment_type_id ?? '',
        payment.date_created ?? new Date().toISOString(),
        payment.date_approved ?? null,
        profile,
        payment.metadata?.utms,
      )

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
          .from('profiles').select('nome, email, telefone').eq('id', userId).single()

        await supabase.from('profiles').update({
          subscribed_until: base.toISOString(),
          plan,
          mp_subscription_id: subscriptionId,
        }).eq('id', userId)

        const subAmount = sub.auto_recurring?.transaction_amount ?? 0
        const periodo = new Date().toISOString().slice(0, 7)
        await registrarComissao(supabase, userId, subAmount, `${subscriptionId}_${periodo}`)

        await notificarUtmify(
          `${subscriptionId}_${periodo}`,
          subAmount,
          plan,
          'credit_card',
          new Date().toISOString(),
          new Date().toISOString(),
          profile,
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
