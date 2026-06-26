import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3
const COMISSAO_PERC = 0.20

const PLANOS = {
  monthly: { amount: 19.90, days: 30, description: 'ClimaPro Mensal — Renovação' },
  annual:  { amount: 149.90, days: 365, description: 'ClimaPro Anual — Renovação' },
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
  // Proteção: só aceita chamadas com o secret correto
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const mpToken = Deno.env.get('MP_ACCESS_TOKEN')!

  // Busca assinantes com cartão salvo, auto_renew ativo, vencendo em ≤ 3 dias
  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 3)

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, plan, mp_customer_id, mp_card_id, mp_card_brand, subscribed_until')
    .not('mp_customer_id', 'is', null)
    .not('mp_card_id', 'is', null)
    .eq('auto_renew', true)
    .not('plan', 'is', null)
    .lte('subscribed_until', cutoff.toISOString())
    .gte('subscribed_until', now.toISOString())

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results: any[] = []

  for (const user of users ?? []) {
    const plano = PLANOS[user.plan as keyof typeof PLANOS]
    if (!plano) {
      results.push({ userId: user.id, status: 'plano_invalido' })
      continue
    }

    try {
      // Gera token a partir do cartão salvo
      const tokenRes = await fetch('https://api.mercadopago.com/v1/card_tokens', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user.mp_customer_id,
          card_id: user.mp_card_id,
        }),
      })
      const tokenData = await tokenRes.json()

      if (!tokenData.id) {
        console.error(`Token falhou para ${user.id}:`, tokenData)
        results.push({ userId: user.id, status: 'token_falhou' })
        continue
      }

      // Idempotency key baseada no período da assinatura atual (previne dupla cobrança)
      const periodoAtual = new Date(user.subscribed_until).toISOString().slice(0, 10)
      const idempotencyKey = `renew-${user.id}-${periodoAtual}`

      const paymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          transaction_amount: plano.amount,
          token: tokenData.id,
          description: plano.description,
          installments: 1,
          payment_method_id: user.mp_card_brand,
          payer: {
            type: 'customer',
            id: user.mp_customer_id,
            email: user.email,
          },
          external_reference: user.id,
        }),
      })
      const payment = await paymentRes.json()

      if (payment.status === 'approved') {
        const until = new Date()
        until.setDate(until.getDate() + plano.days + GRACE_DAYS)

        await supabase.from('profiles').update({
          subscribed_until: until.toISOString(),
        }).eq('id', user.id)

        await registrarComissao(supabase, user.id, plano.amount, String(payment.id))

        results.push({ userId: user.id, status: 'renovado' })
      } else {
        console.error(`Cobrança recusada para ${user.id}:`, payment.status, payment.status_detail)
        results.push({ userId: user.id, status: 'recusado', detalhe: payment.status_detail })
      }
    } catch (e) {
      console.error(`Erro ao renovar ${user.id}:`, e)
      results.push({ userId: user.id, status: 'erro', detalhe: (e as Error).message })
    }
  }

  console.log(`renew-subscriptions: ${results.length} processados`, results)

  return new Response(
    JSON.stringify({ processados: results.length, results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
