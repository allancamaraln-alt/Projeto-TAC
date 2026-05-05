import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3

serve(async (req) => {
  try {
    const notification = await req.json()

    // Ignora eventos que não sejam de assinatura
    if (notification.type !== 'preapproval') {
      return new Response('ok', { status: 200 })
    }

    const subscriptionId = notification.data?.id
    if (!subscriptionId) return new Response('ok', { status: 200 })

    // Busca detalhes da assinatura no Mercado Pago
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
      // subscribed_until = próximo pagamento + dias de carência
      const base = sub.next_payment_date
        ? new Date(sub.next_payment_date)
        : (() => {
            const d = new Date()
            d.setMonth(d.getMonth() + frequency)
            return d
          })()
      base.setDate(base.getDate() + GRACE_DAYS)

      await supabase.from('profiles').update({
        subscribed_until: base.toISOString(),
        plan,
        mp_subscription_id: subscriptionId,
      }).eq('id', userId)

    } else if (sub.status === 'cancelled') {
      // Mantém subscribed_until para que o acesso dure até o fim do período pago
      await supabase.from('profiles').update({
        plan: null,
        mp_subscription_id: null,
      }).eq('id', userId)
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('error', { status: 500 })
  }
})
