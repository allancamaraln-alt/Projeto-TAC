import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { findRecentPaymentByExternalReference } from '../_shared/asaas-client.ts'

const GRACE_DAYS = 3
const ADDON_DAYS = 30

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Equivalente a asaas-verify-payment, mas para o add-on de IA (grava em ai_addon_until
// em vez de plan/subscribed_until) — usado no polling após abrir o checkout hospedado
// em nova aba (ver asaas-create-addon-checkout).
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

    const recentPayment = await findRecentPaymentByExternalReference(`${user.id}:ai_addon`)

    if (!recentPayment) {
      return new Response(
        JSON.stringify({ authorized: false, status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const until = new Date()
    until.setDate(until.getDate() + ADDON_DAYS + GRACE_DAYS)

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await serviceSupabase.from('profiles').update({
      ai_addon_until: until.toISOString(),
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
