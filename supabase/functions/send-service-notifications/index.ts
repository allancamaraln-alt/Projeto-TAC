import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Envia notificações push (Web Push / VAPID) dos serviços agendados.
//
// Dois modos:
//  - Cron (header x-cron-secret): roda a cada 5 min e manda
//      • lembrete N minutos antes de cada OS com data+hora (N = profiles.notif_antecedencia_min)
//      • resumo do dia às 7h com as OS de hoje (profiles.notif_resumo_diario)
//  - Teste (Authorization: Bearer <JWT do usuário>, body { teste: true }):
//      manda uma notificação de teste pros aparelhos do próprio usuário.

const TZ = 'America/Sao_Paulo'
// Brasil sem horário de verão desde 2019 — o fuso de São Paulo é fixo em -03:00.
const TZ_OFFSET = '-03:00'
const STATUS_ATIVOS = ['orcamento', 'aprovado', 'em_andamento']
const RESUMO_INICIO = '07:00'
const RESUMO_FIM = '07:30'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

// Data (YYYY-MM-DD) e hora (HH:MM) atuais no fuso de São Paulo.
function agoraLocal(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map(p => [p.type, p.value]),
  )
  return { data: `${parts.year}-${parts.month}-${parts.day}`, hora: `${parts.hour}:${parts.minute}` }
}

function somarDias(dataIso: string, dias: number) {
  const d = new Date(`${dataIso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function labelFaltando(min: number) {
  if (min < 60) return `Começa em ${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return `Começa em ${h}h${m ? String(m).padStart(2, '0') : ''}`
}

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
type Payload = { title: string; body: string; url: string; tag: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Envia pra todos os aparelhos e apaga as inscrições que o navegador já invalidou.
  async function enviar(subs: Sub[], payload: Payload) {
    // Configurado só na hora de enviar: sem as chaves VAPID, setVapidDetails lança.
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@climaproapp.com.br',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )
    let ok = 0
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60, urgency: 'high' },
        )
        ok++
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id)
        } else {
          console.error('push falhou', code, (err as Error).message)
        }
      }
    }))
    return ok
  }

  // ── Modo teste ────────────────────────────────────────────────────────────
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== Deno.env.get('PUSH_CRON_SECRET')) {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return json({ error: 'unauthorized' }, 401)

    const { data: subs } = await supabase
      .from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').eq('user_id', user.id)
    if (!subs?.length) return json({ enviados: 0, error: 'sem_aparelhos' })

    const enviados = await enviar(subs, {
      title: 'Notificações ativadas ✅',
      body: 'Você vai receber um aviso antes de cada serviço agendado.',
      url: '/ordens',
      tag: 'teste',
    })
    return json({ enviados })
  }

  // ── Modo cron ─────────────────────────────────────────────────────────────
  const now = new Date()
  const local = agoraLocal(now)
  const amanha = somarDias(local.data, 1)

  // Hoje e amanhã cobrem qualquer antecedência de até 24h.
  const { data: ordens, error } = await supabase
    .from('ordens_servico')
    .select('id, numero, tecnico_id, tipo_servico, data_agendamento, hora_agendamento, clientes(nome)')
    .in('status', STATUS_ATIVOS)
    .in('data_agendamento', [local.data, amanha])
  if (error) return json({ error: error.message }, 500)
  if (!ordens?.length) return json({ lembretes: 0, resumos: 0 })

  const tecnicoIds = [...new Set(ordens.map(o => o.tecnico_id))]
  const [{ data: subs }, { data: perfis }] = await Promise.all([
    supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', tecnicoIds),
    supabase.from('profiles').select('id, notif_antecedencia_min, notif_resumo_diario').in('id', tecnicoIds),
  ])
  if (!subs?.length) return json({ lembretes: 0, resumos: 0 })

  const subsPorUser = new Map<string, Sub[]>()
  for (const s of subs) subsPorUser.set(s.user_id, [...(subsPorUser.get(s.user_id) ?? []), s])
  const perfilPorId = new Map((perfis ?? []).map(p => [p.id, p]))

  // Grava a chave antes de enviar: se outra execução do cron estiver rodando
  // ao mesmo tempo, só uma consegue inserir e só ela manda.
  async function reservar(userId: string, chave: string) {
    const { data } = await supabase
      .from('notificacoes_enviadas')
      .upsert({ user_id: userId, chave }, { onConflict: 'user_id,chave', ignoreDuplicates: true })
      .select('chave')
    return !!data?.length
  }

  let lembretes = 0
  let resumos = 0

  for (const o of ordens) {
    const userSubs = subsPorUser.get(o.tecnico_id)
    const antecedencia = perfilPorId.get(o.tecnico_id)?.notif_antecedencia_min ?? 60
    if (!userSubs || !o.hora_agendamento || antecedencia <= 0) continue

    const hora = String(o.hora_agendamento).slice(0, 5)
    const inicio = new Date(`${o.data_agendamento}T${hora}:00${TZ_OFFSET}`)
    const avisarEm = new Date(inicio.getTime() - antecedencia * 60_000)
    if (now < avisarEm || now >= inicio) continue

    if (!(await reservar(o.tecnico_id, `lembrete:${o.id}:${o.data_agendamento}T${hora}`))) continue

    const cliente = (o.clientes as { nome?: string } | null)?.nome
    const minutosFaltando = Math.round((inicio.getTime() - now.getTime()) / 60_000)
    lembretes += await enviar(userSubs, {
      title: `Serviço às ${hora}${cliente ? ` · ${cliente}` : ''}`,
      body: [labelFaltando(Math.max(minutosFaltando, 1)), o.tipo_servico || `OS #${o.numero}`].join(' · '),
      url: `/ordens/${o.id}`,
      tag: `os-${o.id}`,
    })
  }

  if (local.hora >= RESUMO_INICIO && local.hora < RESUMO_FIM) {
    const deHoje = ordens.filter(o => o.data_agendamento === local.data)
    const porTecnico = new Map<string, typeof deHoje>()
    for (const o of deHoje) porTecnico.set(o.tecnico_id, [...(porTecnico.get(o.tecnico_id) ?? []), o])

    for (const [tecnicoId, lista] of porTecnico) {
      const userSubs = subsPorUser.get(tecnicoId)
      if (!userSubs || perfilPorId.get(tecnicoId)?.notif_resumo_diario === false) continue
      if (!(await reservar(tecnicoId, `resumo:${local.data}`))) continue

      const ordenada = [...lista].sort((a, b) =>
        String(a.hora_agendamento ?? '99').localeCompare(String(b.hora_agendamento ?? '99')))
      const linhas = ordenada.slice(0, 4).map(o => {
        const hora = o.hora_agendamento ? String(o.hora_agendamento).slice(0, 5) : '--:--'
        const cliente = (o.clientes as { nome?: string } | null)?.nome
        return `${hora} ${cliente || o.tipo_servico || `OS #${o.numero}`}`
      })
      if (ordenada.length > 4) linhas.push(`+${ordenada.length - 4} outros`)

      resumos += await enviar(userSubs, {
        title: lista.length === 1 ? 'Você tem 1 serviço hoje' : `Você tem ${lista.length} serviços hoje`,
        body: linhas.join('\n'),
        url: '/ordens',
        tag: `resumo-${local.data}`,
      })
    }
  }

  // Faxina: chaves com mais de 7 dias não servem mais pra deduplicar nada.
  await supabase.from('notificacoes_enviadas').delete().lt('enviado_em', new Date(now.getTime() - 7 * 86_400_000).toISOString())

  return json({ lembretes, resumos })
})
