import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

// Proxy pro ClimaPro IA: mantém a chave da OpenAI só no servidor. O front
// (src/lib/ai/api.js) nunca vê essa chave — só manda o token de sessão do
// usuário, igual as outras funções autenticadas deste projeto.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) throw new Error('Não autorizado')

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: profile } = await serviceClient
      .from('profiles').select('ai_addon_until').eq('id', user.id).single()

    const hasAddon = !!profile?.ai_addon_until && new Date(profile.ai_addon_until) > new Date()
    if (!hasAddon) {
      return new Response(JSON.stringify({ error: 'addon_required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { messages, tools, tool_choice } = await req.json()
    if (!Array.isArray(messages)) throw new Error('messages é obrigatório')

    const openaiRes = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 1500,
        messages,
        ...(tools ? { tools, tool_choice: tool_choice ?? 'auto' } : {}),
      }),
    })

    const data = await openaiRes.json()
    if (!openaiRes.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Erro ao consultar IA.' }), {
        status: openaiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
