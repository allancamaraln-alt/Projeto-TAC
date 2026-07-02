import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLANOS = {
  monthly:      { description: 'ClimaPro Básico',        amount: 19.90,  days: 30  },
  plus:         { description: 'ClimaPro Técnico Plus',  amount: 29.90,  days: 30  },
  professional: { description: 'ClimaPro Profissional',  amount: 39.90,  days: 30  },
  annual:       { description: 'ClimaPro Premium Anual', amount: 149.90, days: 365 },
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

    const { plan, utms } = await req.json()
    if (!PLANOS[plan as keyof typeof PLANOS]) throw new Error('Plano inválido')
    const plano = PLANOS[plan as keyof typeof PLANOS]

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, mp_customer_id, mp_card_id, mp_card_brand')
      .eq('id', user.id)
      .single()

    if (!profile?.mp_customer_id || !profile?.mp_card_id) {
      throw new Error('Nenhum cartão salvo encontrado')
    }

    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')!

    // Gera token a partir do cartão salvo (sem precisar do CVV para cobranças recorrentes)
    const tokenRes = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: profile.mp_customer_id,
        card_id: profile.mp_card_id,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.id) {
      console.error('Falha ao gerar token do cartão salvo:', tokenData)
      throw new Error('Falha ao processar cartão salvo. Tente com um novo cartão.')
    }

    // Efetua a cobrança
    const paymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `saved-card-${user.id}-${plan}-${new Date().toISOString().slice(0, 7)}`,
      },
      body: JSON.stringify({
        transaction_amount: plano.amount,
        token: tokenData.id,
        description: plano.description,
        installments: 1,
        payment_method_id: profile.mp_card_brand,
        payer: {
          type: 'customer',
          id: profile.mp_customer_id,
          email: profile.email ?? user.email,
        },
        external_reference: user.id,
        ...(utms ? { metadata: { utms } } : {}),
      }),
    })
    const payment = await paymentRes.json()

    if (payment.status === 'approved') {
      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const until = new Date()
      until.setDate(until.getDate() + plano.days + GRACE_DAYS)

      await serviceSupabase.from('profiles').update({
        subscribed_until: until.toISOString(),
        plan,
        plan_locked_at: new Date().toISOString(),
      }).eq('id', user.id)

      return new Response(
        JSON.stringify({ status: 'approved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.error('Cobrança cartão salvo recusada:', JSON.stringify(payment))
    throw new Error(payment.status_detail || payment.message || 'Pagamento recusado')

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
