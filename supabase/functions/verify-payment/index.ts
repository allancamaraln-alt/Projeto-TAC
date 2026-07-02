import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const searchRes = await fetch(
      `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=${user.id}&status=approved`,
      { headers: { 'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` } }
    )
    const searchData = await searchRes.json()

    const recentPayment = searchData.results?.find((p: any) => {
      const ageMs = Date.now() - new Date(p.date_created).getTime()
      return ageMs < 30 * 60 * 1000
    })

    if (!recentPayment) {
      return new Response(
        JSON.stringify({ authorized: false, status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const plan = recentPayment.transaction_amount >= 100 ? 'annual' : 'monthly'
    const days = plan === 'annual' ? 365 : 30

    const until = new Date()
    until.setDate(until.getDate() + days + GRACE_DAYS)

    await serviceSupabase.from('profiles').update({
      subscribed_until: until.toISOString(),
      plan,
    }).eq('id', user.id)

    return new Response(
      JSON.stringify({ authorized: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
