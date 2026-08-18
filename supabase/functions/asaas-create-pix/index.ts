import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createOrGetCustomer, createPixPayment } from '../_shared/asaas-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLANOS = {
  monthly:         { description: 'ClimaPro Básico',          amount: 19.90,  days: 30  },
  monthly_saida50: { description: 'ClimaPro Mensal — Oferta', amount: 9.95,   days: 30  },
  plus:            { description: 'ClimaPro Técnico Plus',    amount: 29.90,  days: 30  },
  professional:    { description: 'ClimaPro Profissional',    amount: 39.90,  days: 30  },
  annual:          { description: 'ClimaPro Premium Anual',   amount: 239.90, days: 365 },
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

    const { plan, cpfCnpj } = await req.json()
    if (!PLANOS[plan as keyof typeof PLANOS]) throw new Error('Plano inválido')
    if (!cpfCnpj) throw new Error('CPF/CNPJ obrigatório')

    const plano = PLANOS[plan as keyof typeof PLANOS]

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, nome, cpf_cnpj')
      .eq('id', user.id)
      .single()

    const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '')
    if (!profile?.cpf_cnpj) {
      await supabase.from('profiles').update({ cpf_cnpj: cpfCnpjLimpo }).eq('id', user.id)
    }

    const customerId = await createOrGetCustomer({
      name: profile?.nome ?? 'Cliente ClimaPro',
      email: profile?.email ?? user.email!,
      cpfCnpj: profile?.cpf_cnpj ?? cpfCnpjLimpo,
    })

    const grantedPlan = plan === 'monthly_saida50' ? 'monthly' : plan
    const pix = await createPixPayment({
      customerId,
      value: plano.amount,
      description: plano.description,
      externalReference: `${user.id}:${grantedPlan}`,
    })

    return new Response(
      JSON.stringify({
        payment_id: pix.paymentId,
        qr_code: pix.qrCode,
        qr_code_base64: pix.qrCodeBase64,
        plan,
        days: plano.days,
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
