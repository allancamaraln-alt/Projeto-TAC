import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLANOS = {
  monthly:         { description: 'ClimaPro Básico',          amount: 19.90,  days: 30  },
  monthly_saida50: { description: 'ClimaPro Mensal — Oferta', amount: 9.95,   days: 30  },
  plus:            { description: 'ClimaPro Técnico Plus',    amount: 29.90,  days: 30  },
  professional:    { description: 'ClimaPro Profissional',    amount: 39.90,  days: 30  },
  annual:          { description: 'ClimaPro Premium Anual',   amount: 149.90, days: 365 },
}

async function saveCardToCustomer(mpToken: string, supabase: any, userId: string, email: string, cardToken: string) {
  // Busca ou cria customer no MP
  const searchRes = await fetch(
    `https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${mpToken}` } }
  )
  const searchData = await searchRes.json()

  let customerId: string
  if (searchData.results?.length > 0) {
    customerId = searchData.results[0].id
  } else {
    const createRes = await fetch('https://api.mercadopago.com/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const customer = await createRes.json()
    if (!customer.id) throw new Error('Falha ao criar customer MP')
    customerId = customer.id
  }

  // Salva cartão no customer
  const cardRes = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: cardToken }),
  })
  const card = await cardRes.json()
  if (!card.id) throw new Error('Falha ao salvar cartão')

  await supabase.from('profiles').update({
    mp_customer_id: customerId,
    mp_card_id: card.id,
    mp_card_last_four: card.last_four_digits,
    mp_card_brand: card.payment_method_id,
    auto_renew: true,
  }).eq('id', userId)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Não autorizado')

    const { plan, cardFormData, saveCard, utms } = await req.json()
    if (!PLANOS[plan as keyof typeof PLANOS]) throw new Error('Plano inválido')

    const plano = PLANOS[plan as keyof typeof PLANOS]
    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')!

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, nome')
      .eq('id', user.id)
      .single()

    const email = profile?.email ?? user.email ?? ''

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${user.id}-${plan}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: plano.amount,
        token: cardFormData.token,
        description: plano.description,
        installments: cardFormData.installments || 1,
        payment_method_id: cardFormData.payment_method_id,
        payer: {
          email,
          identification: cardFormData.payer?.identification,
        },
        external_reference: user.id,
        ...(utms ? { metadata: { utms } } : {}),
      }),
    })

    const payment = await mpRes.json()

    if (payment.status === 'approved') {
      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const until = new Date()
      until.setDate(until.getDate() + plano.days + GRACE_DAYS)

      await serviceSupabase.from('profiles').update({
        subscribed_until: until.toISOString(),
        plan: plan === 'monthly_saida50' ? 'monthly' : plan,
        plan_locked_at: new Date().toISOString(),
      }).eq('id', user.id)

      if (saveCard) {
        try {
          await saveCardToCustomer(mpToken, serviceSupabase, user.id, email, cardFormData.token)
        } catch (e) {
          console.error('Falha ao salvar cartão (não fatal):', e)
        }
      }

      return new Response(
        JSON.stringify({ status: 'approved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (payment.status === 'in_process' || payment.status === 'pending') {
      return new Response(
        JSON.stringify({ status: payment.status, message: 'Pagamento em análise. Você receberá uma confirmação em breve.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.error('MP card payment error:', JSON.stringify(payment))
    throw new Error(payment.status_detail || payment.message || 'Pagamento recusado')

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
