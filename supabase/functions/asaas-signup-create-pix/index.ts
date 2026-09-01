import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createOrGetCustomer, createPixPayment } from '../_shared/asaas-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEBUG = Deno.env.get('DEBUG') === 'true'
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log(...args)
}

// Básico, Plus e a oferta de saída foram descontinuados para novas assinaturas
// (só professional/annual seguem no ar; quem já tinha os outros mantém o preço via renovação).
const PLANOS = {
  professional:    { description: 'ClimaPro Profissional',    amount: 39.90,  days: 30  },
  annual:          { description: 'ClimaPro Anual',           amount: 239.90, days: 365 },
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
    const { email, password, nome, telefone, plan, cpfCnpj, ref_code, utms, existing_user_id, page_url } = await req.json()

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

    let userId: string
    let userCreatedNow = false

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

    console.log('[asaas-signup-create-pix] tracking recebido:', {
      hasFbclid: !!utms?.fbclid,
      hasUtmSource: !!utms?.utm_source,
      hasClientIp: !!clientIp,
      hasPageUrl: !!page_url,
    })
    debugLog('[asaas-signup-create-pix][DEBUG] tracking completo:', { utms, clientIp, userAgent, page_url })

    if (existing_user_id) {
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
          throw new Error('Email já cadastrado. Se já tentou pagar antes, feche e abra o PIX novamente na mesma tela.')
        }
        throw new Error(msg)
      }

      if (!user) throw new Error('Falha ao criar usuário')

      userId = user.id
      userCreatedNow = true

      await new Promise(r => setTimeout(r, 500))
      await adminClient.from('profiles')
        .update({ trial_starts_at: null, cpf_cnpj: cpfCnpjLimpo })
        .eq('id', userId)
    }

    try {
      const customerId = await createOrGetCustomer({
        name: nome,
        email,
        cpfCnpj: cpfCnpjLimpo,
      })

      const pix = await createPixPayment({
        customerId,
        value: plano.amount,
        description: plano.description,
        externalReference: `${userId}:${plan}`,
      })

      console.log('[asaas-signup-create-pix] pagamento Pix criado no Asaas:', { payment_id: pix.paymentId, userId, plan })

      return new Response(
        JSON.stringify({
          payment_id: pix.paymentId,
          qr_code: pix.qrCode,
          qr_code_base64: pix.qrCodeBase64,
          plan,
          days: plano.days,
          user_id: userId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (pixErr) {
      if (userCreatedNow) await adminClient.auth.admin.deleteUser(userId)
      throw pixErr
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
