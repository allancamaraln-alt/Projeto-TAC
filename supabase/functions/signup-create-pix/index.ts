import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLANOS = {
  monthly:         { description: 'ClimaPro Mensal',          amount: 19.90,  days: 30  },
  monthly_saida50: { description: 'ClimaPro Mensal — Oferta', amount: 9.95,   days: 30  },
  plus:            { description: 'ClimaPro Técnico Plus',    amount: 29.90,  days: 30  },
  professional:    { description: 'ClimaPro Profissional',    amount: 39.90,  days: 30  },
  annual:          { description: 'ClimaPro Anual',           amount: 149.90, days: 365 },
}

function normalizePhone(input: string): string {
  const d = input.replace(/\D/g, '')
  if (d.length === 13 && d.startsWith('55')) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return input.trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, nome, telefone, plan, ref_code, utms } = await req.json()

    if (!email || !password || !nome || !plan) {
      throw new Error('Dados incompletos')
    }

    if (!PLANOS[plan as keyof typeof PLANOS]) throw new Error('Plano inválido')
    const plano = PLANOS[plan as keyof typeof PLANOS]

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Cria o usuário (confirma email automaticamente)
    const { data: { user }, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome,
        telefone: telefone ? normalizePhone(telefone) : '',
        ...(ref_code ? { ref_code } : {}),
      },
    })

    if (createError) {
      const msg = createError.message || ''
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        throw new Error('Email já cadastrado.')
      }
      throw new Error(msg)
    }

    if (!user) throw new Error('Falha ao criar usuário')

    // 2. Remove trial — aguarda o trigger criar o perfil e limpa o trial
    await new Promise(r => setTimeout(r, 500))
    await adminClient.from('profiles')
      .update({ trial_starts_at: null })
      .eq('id', user.id)

    // 3. Gera Pix no Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `signup-pix-${user.id}-${plan}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: plano.amount,
        description: plano.description,
        payment_method_id: 'pix',
        external_reference: user.id,
        payer: { email },
        ...(utms ? { metadata: { utms } } : {}),
      }),
    })

    const mpData = await mpRes.json()

    if (!mpData.point_of_interaction?.transaction_data?.qr_code) {
      // Falha ao gerar Pix — deleta o usuário criado
      await adminClient.auth.admin.deleteUser(user.id)
      console.error('MP Pix error:', JSON.stringify(mpData))
      throw new Error(`Falha ao gerar Pix: ${mpData?.message || mpData?.error || 'Erro desconhecido'}`)
    }

    return new Response(
      JSON.stringify({
        payment_id: mpData.id,
        qr_code: mpData.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: mpData.point_of_interaction.transaction_data.qr_code_base64,
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
