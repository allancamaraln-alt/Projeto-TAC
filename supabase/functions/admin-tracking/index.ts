import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { notificarUtmify, enviarMetaCAPI, resolverTracking, registrarPurchaseLog, PROFILE_TRACKING_FIELDS } from '../_shared/tracking-dispatch.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// Espelha public.classify_origin() do schema.sql — usado só para filtrar a
// action `list` em memória (a agregação "de verdade" por origem mora nas
// funções SQL de admin-analytics). Mantenha as duas em sincronia se mudar.
function classificarOrigem(fbclid: string | null, utmSource: string | null, referrer: string | null): string {
  const src = (utmSource ?? '').toLowerCase()
  const ref = (referrer ?? '').toLowerCase()
  if (fbclid || src.includes('facebook') || src.includes('fb')) return 'Facebook'
  if (src.includes('instagram') || ref.includes('instagram')) return 'Instagram'
  if (src.includes('google') || ref.includes('google')) return 'Google'
  if (!utmSource && !referrer) return 'Direto'
  if (referrer && !utmSource) return 'Orgânico'
  return 'Outros'
}

// Monta as etapas da timeline de uma compra a partir dos timestamps gravados
// em purchase_tracking_log. Durações entre etapas ficam a cargo do frontend
// (PurchaseTimeline.jsx) — aqui só ordenamos e rotulamos.
function construirTimeline(log: Record<string, unknown>, profileCreatedAt?: string | null) {
  return [
    { etapa: 'Cadastro', horario: profileCreatedAt ?? null, status: profileCreatedAt ? 'ok' : 'sem_dado' },
    { etapa: 'Pagamento criado (Mercado Pago)', horario: log.payment_created_at ?? null, status: log.payment_created_at ? 'ok' : 'sem_dado' },
    { etapa: 'Webhook recebido', horario: log.webhook_received_at ?? null, status: log.webhook_received_at ? 'ok' : 'sem_dado' },
    { etapa: 'Acesso liberado', horario: log.access_granted_at ?? null, status: log.access_granted_at ? 'ok' : 'sem_dado' },
    { etapa: 'Enviado à Utmify', horario: log.utmify_sent_at ?? null, status: log.utmify_status ?? 'sem_dado' },
    { etapa: 'Enviado à Meta CAPI', horario: log.meta_sent_at ?? null, status: log.meta_capi_status ?? 'sem_dado' },
  ]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    const { user, adminClient } = auth

    const { action, payment_id, page, pageSize, filters } = await req.json()

    if (action === 'list') {
      const pageNum = Math.max(1, Number(page) || 1)
      const size = Math.min(200, Math.max(1, Number(pageSize) || 50))
      const from = (pageNum - 1) * size
      const to = from + size - 1

      let query = adminClient
        .from('profiles')
        .select('id, nome, email, created_at, plan, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, entry_url, referrer', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters?.desde) query = query.gte('created_at', filters.desde)
      if (filters?.ate) query = query.lt('created_at', filters.ate)
      if (filters?.campanha) query = query.eq('utm_campaign', filters.campanha)
      if (filters?.plano) query = query.eq('plan', filters.plano)
      if (filters?.busca) query = query.or(`nome.ilike.%${filters.busca}%,email.ilike.%${filters.busca}%`)

      const { data: profiles, error: profilesError, count } = await query.range(from, to)
      if (profilesError) throw new Error(profilesError.message)

      const ids = (profiles ?? []).map((p) => p.id as string)
      const { data: logs } = ids.length
        ? await adminClient.from('purchase_tracking_log').select('*').in('user_id', ids).order('purchased_at', { ascending: false })
        : { data: [] }

      const logsByUser = new Map<string, Record<string, unknown>>()
      for (const log of logs ?? []) {
        if (!logsByUser.has(log.user_id as string)) logsByUser.set(log.user_id as string, log)
      }

      let users = (profiles ?? []).map((p) => ({ ...p, purchase: logsByUser.get(p.id as string) ?? null }))

      if (filters?.status) {
        users = users.filter((u) => (u.purchase as Record<string, unknown> | null)?.processing_status === filters.status)
      }
      if (filters?.origem) {
        users = users.filter((u) => classificarOrigem(u.fbclid as string, u.utm_source as string, u.referrer as string) === filters.origem)
      }

      return json({ users, total: count ?? users.length, page: pageNum, pageSize: size })
    }

    if (action === 'detail') {
      if (!payment_id) throw new Error('payment_id obrigatório')

      const { data: log, error: logError } = await adminClient
        .from('purchase_tracking_log')
        .select('*')
        .eq('payment_id', payment_id)
        .single()
      if (logError || !log) throw new Error('Registro de compra não encontrado')

      const { data: profile } = await adminClient
        .from('profiles')
        .select(`${PROFILE_TRACKING_FIELDS}, created_at`)
        .eq('id', log.user_id)
        .single()

      const timeline = construirTimeline(log, profile?.created_at as string | undefined)

      return json({ log, profile, timeline })
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
        retryCount: ((log.retry_count as number) ?? 0) + 1,
        lastRetryAt: new Date().toISOString(),
      })

      return json({ success: true, utmify: utmifyResult, metaCapi: metaCapiResult })
    }

    throw new Error('Ação inválida')
  } catch (err) {
    return json({ error: (err as Error).message }, 400)
  }
})
