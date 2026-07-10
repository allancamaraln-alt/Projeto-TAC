import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEBUG = Deno.env.get('DEBUG') === 'true'
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log(...args)
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

async function saveCardToCustomer(mpToken: string, supabase: any, userId: string, email: string, cardToken: string) {
  const searchRes = await fetch(
    `https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${mpToken}` } }
  )
  const searchData = await searchRes.json()

  let customerId: string
  if (searchData.results?.length > 0) {
    customerId = searchData.results[0].id
  } else {
    const createRes = await fetch('https://api.mercadopago.com/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const customer = await createRes.json()
    if (!customer.id) throw new Error('Falha ao criar customer MP')
    customerId = customer.id
  }

  const cardRes = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: cardToken }),
  })
  const card = await cardRes.json()
  if (!card.id) throw new Error('Falha ao salvar cartão')

  await supabase.from('profiles').update({
    mp_customer_id: customerId,
    mp_card_id: card.id,
    mp_card_last_four: card.last_four_digits,
    mp_card_brand: card.payment_method_id,
    auto_renew: true,
  }).eq('id', userId)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, nome, telefone, plan, cardFormData, ref_code, utms, page_url } = await req.json()

    if (!email || !password || !nome || !plan || !cardFormData) {
      throw new Error('Dados incompletos')
    }

    if (!PLANOS[plan as keyof typeof PLANOS]) throw new Error('Plano inválido')
    const plano = PLANOS[plan as keyof typeof PLANOS]
    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')!

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Dados de rastreamento (fbclid/fbc/fbp/UTMs) capturados no frontend em
    // src/lib/tracking.js e enviados aqui para serem persistidos no perfil,
    // já que o webhook do Mercado Pago não tem acesso ao localStorage do navegador.
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

    console.log('[signup-subscribe-card] tracking recebido:', {
      hasFbclid: !!utms?.fbclid,
      hasFbc: !!utms?.fbc,
      hasFbp: !!utms?.fbp,
      hasUtmSource: !!utms?.utm_source,
      hasClientIp: !!clientIp,
      hasUserAgent: !!userAgent,
      hasPageUrl: !!page_url,
    })
    debugLog('[signup-subscribe-card][DEBUG] tracking completo:', { utms, clientIp, userAgent, page_url })

    // 1. Cria o usuário
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
        throw new Error('Email já cadastrado.')
      }
      throw new Error(msg)
    }

    if (!user) throw new Error('Falha ao criar usuário')

    // 2. Remove trial
    await new Promise(r => setTimeout(r, 500))
    await adminClient.from('profiles')
      .update({ trial_starts_at: null })
      .eq('id', user.id)

    // Confirmação de que o trigger persistiu o tracking corretamente no perfil
    const { data: persistedCard } = await adminClient
      .from('profiles')
      .select('fbclid, fbc, fbp, utm_source, signup_ip, signup_page_url')
      .eq('id', user.id)
      .single()
    console.log('[signup-subscribe-card] perfil confirmado em profiles:', {
      userId: user.id,
      fbclidPersistido: !!persistedCard?.fbclid,
      fbcPersistido: !!persistedCard?.fbc,
      fbpPersistido: !!persistedCard?.fbp,
      utmSourcePersistido: !!persistedCard?.utm_source,
    })
    debugLog('[signup-subscribe-card][DEBUG] perfil completo:', persistedCard)

    // 3. Processa pagamento no Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `signup-card-${user.id}-${plan}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: plano.amount,
        token: cardFormData.token,
        description: plano.description,
        installments: cardFormData.installments || 1,
        payment_method_id: cardFormData.payment_method_id,
        payer: {
          email,
          identification: cardFormData.payer?.identification,
        },
        external_reference: user.id,
        ...(utms ? { metadata: { utms } } : {}),
      }),
    })

    const payment = await mpRes.json()

    console.log('[signup-subscribe-card] pagamento processado no Mercado Pago:', {
      payment_id: payment.id,
      status: payment.status,
      userId: user.id,
      plan,
      hasMetadataUtms: !!utms,
    })

    if (payment.status === 'approved') {
      const until = new Date()
      until.setDate(until.getDate() + plano.days + GRACE_DAYS)

      await adminClient.from('profiles').update({
        subscribed_until: until.toISOString(),
        plan: plan === 'monthly_saida50' ? 'monthly' : plan,
      }).eq('id', user.id)

      // Salva cartão para renovação automática
      try {
        await saveCardToCustomer(mpToken, adminClient, user.id, email, cardFormData.token)
      } catch (e) {
        console.error('Falha ao salvar cartão (não fatal):', e)
      }

      return new Response(
        JSON.stringify({ status: 'approved', payment_id: payment.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (payment.status === 'in_process' || payment.status === 'pending') {
      return new Response(
        JSON.stringify({ status: payment.status, message: 'Pagamento em análise. Você receberá uma confirmação em breve.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Pagamento recusado — deleta o usuário criado
    await adminClient.auth.admin.deleteUser(user.id)
    console.error('MP card declined:', JSON.stringify(payment))
    throw new Error(payment.status_detail || payment.message || 'Pagamento recusado')

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
