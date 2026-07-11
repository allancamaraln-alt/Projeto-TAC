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
