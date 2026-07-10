import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { notificarUtmify, enviarMetaCAPI, resolverTracking, registrarPurchaseLog, PROFILE_TRACKING_FIELDS } from '../_shared/tracking-dispatch.ts'

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

    // Confirma que quem chamou está logado (token do usuário, não anônimo).
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) throw new Error('Não autorizado')

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Só então checa se esse usuário logado é admin — nunca confiar em flag
    // vinda do frontend, sempre reconsultar o profile com a service role.
    const { data: callerProfile } = await adminClient
      .from('profiles').select('is_admin').eq('id', user.id).single()

    if (!callerProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Acesso restrito a administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, payment_id } = await req.json()

    if (action === 'list') {
      const { data: profiles, error: profilesError } = await adminClient
        .from('profiles')
        .select('id, nome, email, created_at, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, entry_url, referrer')
        .order('created_at', { ascending: false })
        .limit(300)
      if (profilesError) throw new Error(profilesError.message)

      const { data: logs, error: logsError } = await adminClient
        .from('purchase_tracking_log')
        .select('*')
        .order('purchased_at', { ascending: false })
      if (logsError) throw new Error(logsError.message)

      // Um usuário pode ter mais de uma compra (renovações); mantém só a mais
      // recente por usuário nesta visão (a lista já vem ordenada por data).
      const logsByUser = new Map<string, Record<string, unknown>>()
      for (const log of logs ?? []) {
        if (!logsByUser.has(log.user_id as string)) logsByUser.set(log.user_id as string, log)
      }

      const users = (profiles ?? []).map((p) => ({
        ...p,
        purchase: logsByUser.get(p.id as string) ?? null,
      }))

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'resend') {
      if (!payment_id) throw new Error('payment_id obrigatório')

      const { data: log, error: logError } = await adminClient
        .from('purchase_tracking_log')
        .select('*')
        .eq('payment_id', payment_id)
        .single()
      if (logError || !log) throw new Error('Registro de compra não encontrado')

      const { data: profile } = await adminClient
        .from('profiles')
        .select(PROFILE_TRACKING_FIELDS)
        .eq('id', log.user_id)
        .single()

      const tracking = resolverTracking(profile, undefined)

      console.log('[admin-tracking] reenvio manual de Purchase solicitado:', {
        paymentId: payment_id,
        adminUserId: user.id,
      })

      const utmifyResult = await notificarUtmify(
        (log.utmify_order_id as string) ?? payment_id,
        Number(log.value),
        log.plan as string,
        'credit_card',
        log.purchased_at as string,
        log.purchased_at as string,
        profile,
        tracking,
      )

      const metaCapiResult = await enviarMetaCAPI({
        eventId: log.event_id as string,
        eventTime: Math.floor(new Date(log.purchased_at as string).getTime() / 1000),
        value: Number(log.value),
        email: profile?.email,
        userId: log.user_id as string,
        fbc: tracking.fbc,
        fbp: tracking.fbp,
        clientIp: (profile as Record<string, unknown> | null)?.signup_ip as string | undefined,
        userAgent: (profile as Record<string, unknown> | null)?.signup_user_agent as string | undefined,
        eventSourceUrl: (profile as Record<string, unknown> | null)?.signup_page_url as string | undefined,
      })

      await registrarPurchaseLog(adminClient, {
        userId: log.user_id as string,
        paymentId: log.payment_id as string,
        eventId: log.event_id as string,
        plan: log.plan as string,
        value: Number(log.value),
        purchasedAt: log.purchased_at as string,
        utmifyResult,
        metaCapiResult,
      })

      return new Response(
        JSON.stringify({ success: true, utmify: utmifyResult, metaCapi: metaCapiResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Ação inválida')
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
