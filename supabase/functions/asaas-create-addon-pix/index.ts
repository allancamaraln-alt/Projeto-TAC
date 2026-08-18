import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createOrGetCustomer, createPixPayment } from '../_shared/asaas-client.ts'

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

    const { cpfCnpj } = await req.json()
    if (!cpfCnpj) throw new Error('CPF/CNPJ obrigatório')

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

    const pix = await createPixPayment({
      customerId,
      value: ADDON.amount,
      description: ADDON.description,
      externalReference: `${user.id}:ai_addon`,
    })

    return new Response(
      JSON.stringify({
        payment_id: pix.paymentId,
        qr_code: pix.qrCode,
        qr_code_base64: pix.qrCodeBase64,
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
