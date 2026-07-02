const BASE_URL = 'https://api.openai.com/v1'
export const MODEL = 'gpt-4o-mini'

async function fetchCompletion(messages, apiKey, signal, extra = {}) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: 1500, messages, ...extra }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 401) throw new Error('Chave da API OpenAI inválida.')
    if (res.status === 429) throw new Error('Limite de requisições atingido. Aguarde um momento.')
    if (res.status >= 500) throw new Error('Serviço de IA indisponível. Tente novamente.')
    throw new Error(err.error?.message || `Erro ao consultar IA (${res.status}).`)
  }

  return res.json()
}

export async function fetchText(messages, apiKey, signal) {
  const data = await fetchCompletion(messages, apiKey, signal)
  return data.choices[0].message.content
}

export async function fetchWithTools(messages, apiKey, signal, tools) {
  return fetchCompletion(messages, apiKey, signal, { tools, tool_choice: 'auto' })
}
