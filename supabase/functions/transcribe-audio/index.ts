import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions'

function extensionFor(mimeType: string | undefined) {
  if (mimeType?.includes('mp4')) return 'mp4'
  if (mimeType?.includes('webm')) return 'webm'
  if (mimeType?.includes('wav')) return 'wav'
  if (mimeType?.includes('ogg')) return 'ogg'
  return 'webm'
}

// Transcrição de voz do ClimaPro IA — usada pelo composer (ChatComposer.jsx)
// como alternativa à Web Speech API, que não existe no Safari/iOS. O
// cliente grava áudio com MediaRecorder (suportado no Safari, diferente de
// SpeechRecognition) e manda o blob em base64; aqui a gente decodifica,
// monta um multipart/form-data e chama o Whisper da OpenAI. Mesmo padrão
// de auth/gate de assinatura de ai-chat/index.ts — a chave da OpenAI nunca
// sai do servidor.
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

    const { audio, mimeType } = await req.json()
    if (!audio) throw new Error('audio é obrigatório')

    const bytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: mimeType || 'audio/webm' })

    const form = new FormData()
    form.append('file', blob, `audio.${extensionFor(mimeType)}`)
    form.append('model', 'whisper-1')
    form.append('language', 'pt')

    const openaiRes = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
      body: form,
    })

    const data = await openaiRes.json()
    if (!openaiRes.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Erro ao transcrever áudio.' }), {
        status: openaiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ text: data.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
