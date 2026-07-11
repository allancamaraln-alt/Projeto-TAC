import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADDON = { description: 'ClimaPro — Assistente IA', amount: 19.90, days: 30 }

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

    const { utms } = await req.json().catch(() => ({}))

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, nome')
      .eq('id', user.id)
      .single()

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${user.id}-ai_addon-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: ADDON.amount,
        description: ADDON.description,
        payment_method_id: 'pix',
        external_reference: user.id,
        payer: {
          email: profile?.email ?? user.email,
        },
        metadata: { produto: 'ai_addon', ...(utms ? { utms } : {}) },
      }),
    })

    const mpData = await mpRes.json()

    if (!mpData.point_of_interaction?.transaction_data?.qr_code) {
      console.error('MP Pix error (addon):', JSON.stringify(mpData))
      const msgErro = mpData?.message || mpData?.error || JSON.stringify(mpData)
      throw new Error(`Falha ao gerar Pix: ${msgErro}`)
    }

    return new Response(
      JSON.stringify({
        payment_id: mpData.id,
        qr_code: mpData.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: mpData.point_of_interaction.transaction_data.qr_code_base64,
        days: ADDON.days,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
