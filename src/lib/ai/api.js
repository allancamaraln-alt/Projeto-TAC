import { supabase } from '../supabase'

// A chave da OpenAI fica só na Edge Function `ai-chat` (Deno.env), nunca no
// bundle do cliente. O front só manda o token de sessão do usuário.
async function fetchCompletion(messages, signal, extra = {}) {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages, ...extra },
    signal,
  })

  if (error) {
    const status = error.context?.status
    if (status === 401) throw new Error('Não autorizado.')
    if (status === 429) throw new Error('Limite de requisições atingido. Aguarde um momento.')
    if (status >= 500) throw new Error('Serviço de IA indisponível. Tente novamente.')
    throw new Error(data?.error || error.message || 'Erro ao consultar IA.')
  }
  if (data?.error) throw new Error(data.error)

  return data
}

export async function fetchText(messages, signal) {
  const data = await fetchCompletion(messages, signal)
  return data.choices[0].message.content
}

export async function fetchWithTools(messages, signal, tools) {
  return fetchCompletion(messages, signal, { tools, tool_choice: 'auto' })
}

// Transcrição de voz — usada pelo ChatComposer no iOS, onde a Web Speech
// API não funciona de forma confiável (ver supabase/functions/transcribe-audio).
// Manda o blob em binário puro (não base64) — mais rápido, sem o overhead
// de codificar/decodificar; o mimeType vai num header já que o corpo não é
// mais JSON.
export async function transcribeAudio(audioBlob) {
  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
    body: audioBlob,
    headers: { 'x-audio-mime-type': audioBlob.type },
  })

  if (error) {
    const status = error.context?.status
    if (status === 401) throw new Error('Não autorizado.')
    if (status === 403) throw new Error('plan_required')
    if (status >= 500) throw new Error('Serviço de transcrição indisponível. Tente novamente.')
    throw new Error(data?.error || error.message || 'Erro ao transcrever áudio.')
  }
  if (data?.error) throw new Error(data.error)

  return data.text
}
