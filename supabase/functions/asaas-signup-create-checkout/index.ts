import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createOrGetCustomer, createCheckout } from '../_shared/asaas-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEBUG = Deno.env.get('DEBUG') === 'true'
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log(...args)
}

const PLANOS = {
  monthly:      { description: 'ClimaPro Mensal',        amount: 19.90,  cycle: 'MONTHLY' as const },
  plus:         { description: 'ClimaPro Técnico Plus',  amount: 29.90,  cycle: 'MONTHLY' as const },
  professional: { description: 'ClimaPro Profissional',  amount: 39.90,  cycle: 'MONTHLY' as const },
  annual:       { description: 'ClimaPro Anual',         amount: 239.90, cycle: 'YEARLY' as const },
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
    const { email, password, nome, telefone, plan, cpfCnpj, ref_code, utms, page_url, existing_user_id } = await req.json()

    if (!email || !password || !nome || !plan || !cpfCnpj) {
      throw new Error('Dados incompletos')
    }

    if (!PLANOS[plan as keyof typeof PLANOS]) throw new Error('Plano inválido')
    const plano = PLANOS[plan as keyof typeof PLANOS]
    const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '')

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || null
    const userAgent = req.headers.get('user-agent') || null
    const trackingMetadata = utms ? {
      ...(utms.fbclid ? { fbclid: utms.fbclid } : {}),
      ...(utms.fbc ? { fbc: utms.fbc } : {}),
      ...(utms.fbp ? { fbp: utms.fbp } : {}),
      ...(utms.utm_source ? { utm_source: utms.utm_source } : {}),
      ...(utms.utm_medium ? { utm_medium: utms.utm_medium } : {}),
      ...(utms.utm_campaign ? { utm_campaign: utms.utm_campaign } : {}),
      ...(utms.utm_content ? { utm_content: utms.utm_content } : {}),
      ...(utms.utm_term ? { utm_term: utms.utm_term } : {}),
      ...(utms.src ? { src: utms.src } : {}),
      ...(utms.sck ? { sck: utms.sck } : {}),
      ...(utms.entry_url ? { entry_url: utms.entry_url } : {}),
      ...(utms.referrer ? { referrer: utms.referrer } : {}),
    } : {}

    console.log('[asaas-signup-create-checkout] tracking recebido:', {
      hasFbclid: !!utms?.fbclid,
      hasUtmSource: !!utms?.utm_source,
      hasClientIp: !!clientIp,
      hasPageUrl: !!page_url,
    })
    debugLog('[asaas-signup-create-checkout][DEBUG] tracking completo:', { utms, clientIp, userAgent, page_url })

    let userId: string
    if (existing_user_id) {
      // Tentativa anterior criou o usuário mas falhou ao gerar o checkout — reaproveita
      // em vez de tentar criar de novo (auth.admin.createUser rejeitaria por email duplicado).
      userId = existing_user_id
    } else {
      const { data: { user }, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome,
          telefone: telefone ? normalizePhone(telefone) : '',
          ...(ref_code ? { ref_code } : {}),
          ...trackingMetadata,
          ...(clientIp ? { signup_ip: clientIp } : {}),
          ...(userAgent ? { signup_user_agent: userAgent } : {}),
          ...(page_url ? { signup_page_url: page_url } : {}),
        },
      })

      if (createError) {
        const msg = createError.message || ''
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
          throw new Error('Email já cadastrado. Se já tentou pagar antes, tente novamente na mesma tela.')
        }
        throw new Error(msg)
      }

      if (!user) throw new Error('Falha ao criar usuário')
      userId = user.id

      await new Promise(r => setTimeout(r, 500))
      await adminClient.from('profiles')
        .update({ trial_starts_at: null, cpf_cnpj: cpfCnpjLimpo })
        .eq('id', userId)
    }

    // Diferente do fluxo antigo com cartão inline (Mercado Pago Bricks), aqui não há
    // resposta síncrona de aprovação — o checkout é hospedado pelo Asaas e a concessão
    // de acesso acontece via asaas-webhook quando o pagamento for confirmado. Por isso
    // a conta NÃO é apagada se o checkout for criado mas o pagamento não for concluído:
    // ela fica em estado "sem plano" e o usuário pode tentar de novo pelo Paywall. Já uma
    // falha ao CRIAR o checkout em si é síncrona — devolvemos user_id para o frontend
    // poder reenviar como existing_user_id e reaproveitar a conta, sem duplicar cadastro.
    try {
      const customerId = await createOrGetCustomer({ name: nome, email, cpfCnpj: cpfCnpjLimpo })

      const checkout = await createCheckout({
        customerId,
        value: plano.amount,
        description: plano.description,
        externalReference: `${userId}:${plan}`,
        subscriptionCycle: plano.cycle,
      })

      await adminClient.from('profiles').update({
        asaas_customer_id: customerId,
        asaas_subscription_id: checkout.id,
        auto_renew: true,
      }).eq('id', userId)

      console.log('[asaas-signup-create-checkout] checkout criado no Asaas:', { userId, plan })

      return new Response(
        JSON.stringify({ checkout_url: checkout.invoiceUrl, user_id: userId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (checkoutErr) {
      console.error('[asaas-signup-create-checkout] falha ao criar checkout:', checkoutErr)
      return new Response(
        JSON.stringify({ error: 'Não foi possível iniciar o pagamento. Tente novamente.', user_id: userId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
