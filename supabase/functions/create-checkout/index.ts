import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLANOS = {
  monthly: { reason: 'ClimaPro Mensal', frequency: 1,  amount: 19.90 },
  annual:  { reason: 'ClimaPro Anual',  frequency: 12, amount: 149.90 },
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

    const { plan } = await req.json()
    if (!PLANOS[plan as keyof typeof PLANOS]) throw new Error('Plano inválido')

    const plano = PLANOS[plan as keyof typeof PLANOS]
    const appUrl = Deno.env.get('APP_URL') ?? 'https://climapro.app'

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, nome')
      .eq('id', user.id)
      .single()

    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: plano.reason,
        external_reference: user.id,
        payer_email: profile?.email ?? user.email,
        auto_recurring: {
          frequency: plano.frequency,
          frequency_type: 'months',
          transaction_amount: plano.amount,
          currency_id: 'BRL',
        },
        back_url: `${appUrl}/?pagamento=sucesso`,
        status: 'pending',
      }),
    })

    const mpData = await mpRes.json()
    if (!mpData.init_point) {
      console.error('MP error:', mpData)
      throw new Error('Falha ao criar checkout no Mercado Pago')
    }

    return new Response(
      JSON.stringify({ url: mpData.init_point }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
