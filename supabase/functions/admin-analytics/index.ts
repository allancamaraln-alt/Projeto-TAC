import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

type Filtros = {
  desde?: string
  ate?: string
  campanha?: string | null
  origem?: string | null
  plano?: string | null
}

function periodoOuPadrao(filters: Filtros | undefined) {
  const agora = new Date()
  return {
    desde: filters?.desde ?? new Date(0).toISOString(),
    ate: filters?.ate ?? new Date(agora.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    const { adminClient } = auth

    const { action, filters } = (await req.json()) as { action: string; filters?: Filtros }

    // Ação principal usada pelo dashboard: dispara todas as agregações em
    // paralelo num único round-trip (em vez do frontend chamar 8+ actions
    // em sequência) — é o que garante o "priorizar velocidade" pedido.
    if (action === 'summary_all') {
      const agora = new Date()
      const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
      const inicioSemana = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
      const inicioEpoch = new Date(0).toISOString()
      const fimJanela = new Date(agora.getTime() + 24 * 60 * 60 * 1000).toISOString()

      const { desde, ate } = periodoOuPadrao(filters)
      const filtroCampanha = filters?.campanha ?? null
      const filtroOrigem = filters?.origem ?? null
      const filtroPlano = filters?.plano ?? null

      const [
        receitaHoje, receitaSemana, receitaMes, receitaTotal,
        subscriptions, landing, campaigns, ads, origin, devices, browsers, timeseries,
      ] = await Promise.all([
        adminClient.rpc('analytics_summary', { desde: inicioHoje, ate: fimJanela, filtro_campanha: null, filtro_origem: null, filtro_plano: null }),
        adminClient.rpc('analytics_summary', { desde: inicioSemana, ate: fimJanela, filtro_campanha: null, filtro_origem: null, filtro_plano: null }),
        adminClient.rpc('analytics_summary', { desde: inicioMes, ate: fimJanela, filtro_campanha: null, filtro_origem: null, filtro_plano: null }),
        adminClient.rpc('analytics_summary', { desde: inicioEpoch, ate: fimJanela, filtro_campanha: null, filtro_origem: null, filtro_plano: null }),
        adminClient.rpc('analytics_subscriptions', { desde, ate }),
        adminClient.rpc('analytics_landing_conversion', { desde, ate }),
        adminClient.rpc('analytics_por_campanha', { desde, ate }),
        adminClient.rpc('analytics_por_anuncio', { desde, ate }),
        adminClient.rpc('analytics_origem', { desde, ate }),
        adminClient.rpc('analytics_dispositivo', { desde, ate }),
        adminClient.rpc('analytics_navegador', { desde, ate }),
        adminClient.rpc('analytics_revenue_timeseries', { desde, ate }),
      ])

      for (const r of [receitaHoje, receitaSemana, receitaMes, receitaTotal, subscriptions, landing, campaigns, ads, origin, devices, browsers, timeseries]) {
        if (r.error) throw new Error(r.error.message)
      }

      const landingRow = landing.data?.[0] ?? { visitas: 0, cadastros: 0 }
      const taxaConversao = landingRow.visitas > 0
        ? Math.round((landingRow.cadastros / landingRow.visitas) * 10000) / 100
        : null

      // Filtros de campanha/origem/plano recortam campanhas/anúncios/origem já
      // trazidos acima só quando fizer sentido no cliente (evita mais 3 RPCs);
      // para receita/assinaturas o filtro de plano/origem/campanha é aplicado
      // direto na query de summary quando fornecido.
      const receitaFiltrada = (filtroCampanha || filtroOrigem || filtroPlano)
        ? await adminClient.rpc('analytics_summary', { desde, ate, filtro_campanha: filtroCampanha, filtro_origem: filtroOrigem, filtro_plano: filtroPlano })
        : null
      if (receitaFiltrada?.error) throw new Error(receitaFiltrada.error.message)

      return json({
        revenue: {
          today: receitaHoje.data?.[0] ?? { receita: 0, compras: 0 },
          week: receitaSemana.data?.[0] ?? { receita: 0, compras: 0 },
          month: receitaMes.data?.[0] ?? { receita: 0, compras: 0 },
          total: receitaTotal.data?.[0] ?? { receita: 0, compras: 0 },
          filtered: receitaFiltrada?.data?.[0] ?? null,
        },
        subscriptions: subscriptions.data?.[0] ?? { novas_assinaturas: 0, assinaturas_ativas: 0, cancelamentos: 0 },
        landing: { ...landingRow, taxa_conversao: taxaConversao },
        campaigns: campaigns.data ?? [],
        ads: ads.data ?? [],
        origin: origin.data ?? [],
        devices: devices.data ?? [],
        browsers: browsers.data ?? [],
        timeseries: timeseries.data ?? [],
      })
    }

    throw new Error('Ação inválida')
  } catch (err) {
    return json({ error: (err as Error).message }, 400)
  }
})
