import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { findRecentPaymentByExternalReference } from '../_shared/asaas-client.ts'

const GRACE_DAYS = 3

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_DAYS: Record<string, number> = { monthly: 30, plus: 30, professional: 30, annual: 365 }

// Equivalente a asaas-verify-payment, mas público (sem JWT) — usado no polling do
// checkout hospedado durante o cadastro, antes do usuário ter uma sessão no navegador
// (ver asaas-signup-create-checkout e Login.jsx).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, plan } = await req.json()
    if (!user_id) throw new Error('user_id obrigatório')
    if (!PLAN_DAYS[plan]) throw new Error('Plano inválido')

    const recentPayment = await findRecentPaymentByExternalReference(`${user_id}:${plan}`)

    if (!recentPayment) {
      return new Response(
        JSON.stringify({ authorized: false, status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const days = PLAN_DAYS[plan]
    const until = new Date()
    until.setDate(until.getDate() + days + GRACE_DAYS)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await adminClient.from('profiles').update({
      subscribed_until: until.toISOString(),
      plan,
      plan_locked_at: new Date().toISOString(),
    }).eq('id', user_id)

    return new Response(
      JSON.stringify({ authorized: true, payment_id: recentPayment.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
