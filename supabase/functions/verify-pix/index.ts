import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_DAYS: Record<string, number> = { monthly: 30, monthly_saida50: 30, plus: 30, professional: 30, annual: 365 }

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

    const { payment_id, plan } = await req.json()

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment_id}`,
      { headers: { 'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` } }
    )
    const payment = await mpRes.json()

    if (payment.status === 'approved') {
      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const days = PLAN_DAYS[plan] ?? 30
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days + GRACE_DAYS)

      await serviceSupabase.from('profiles').update({
        subscribed_until: expiresAt.toISOString(),
        plan: plan === 'monthly_saida50' ? 'monthly' : plan,
        plan_locked_at: new Date().toISOString(),
      }).eq('id', user.id)

      return new Response(
        JSON.stringify({ authorized: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ authorized: false, status: payment.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
