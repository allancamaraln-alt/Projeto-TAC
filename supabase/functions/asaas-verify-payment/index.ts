import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { findRecentPaymentByExternalReference } from '../_shared/asaas-client.ts'

const GRACE_DAYS = 3

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_DAYS: Record<string, number> = { monthly: 30, plus: 30, professional: 30, annual: 365 }

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
    if (!PLAN_DAYS[plan]) throw new Error('Plano inválido')

    const recentPayment = await findRecentPaymentByExternalReference(`${user.id}:${plan}`)

    if (!recentPayment) {
      return new Response(
        JSON.stringify({ authorized: false, status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const days = PLAN_DAYS[plan]
    const until = new Date()
    until.setDate(until.getDate() + days + GRACE_DAYS)

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await serviceSupabase.from('profiles').update({
      subscribed_until: until.toISOString(),
      plan,
      plan_locked_at: new Date().toISOString(),
    }).eq('id', user.id)

    return new Response(
      JSON.stringify({ authorized: true, payment_id: recentPayment.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
