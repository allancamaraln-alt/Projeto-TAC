import { fetchWithTools } from './api'

const MAX_ITERATIONS = 6

// Loop de tool-calling único do ClimaPro IA — generalizado do loop que antes
// vivia só em specialists/financial.js. Toda mensagem passa por aqui com o
// conjunto completo de ferramentas (src/lib/ai/tools/index.js); não há mais
// roteador de intenção decidindo qual "especialista" chamar.
//
// onPhaseChange(phase) é opcional — 'pensando' antes de cada chamada ao
// modelo, 'executando' enquanto ferramentas estão rodando. Usado pela UI
// (TypingIndicator) para mostrar um estado mais informativo que um
// "carregando" genérico — ver src/hooks/useAI.jsx / useAtendimento.js.
export async function runAgent({ messages, signal, systemPrompt, tools, executeTool, onPhaseChange, maxIterations = MAX_ITERATIONS }) {
  const systemMsg = { role: 'system', content: systemPrompt }
  const loop = [systemMsg, ...messages]
  const actions = []

  for (let i = 0; i < maxIterations; i++) {
    onPhaseChange?.('pensando')
    const response = await fetchWithTools(loop, signal, tools)
    const choice = response.choices[0]

    if (choice.finish_reason !== 'tool_calls') {
      return { text: choice.message.content, actions }
    }

    loop.push(choice.message)
    onPhaseChange?.('executando')

    for (const tc of choice.message.tool_calls) {
      let args
      try { args = JSON.parse(tc.function.arguments) } catch { args = {} }

      const result = await executeTool(tc.function.name, args)
      if (result?.action) actions.push(result.action)

      loop.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }
  }

  return { text: 'Não consegui processar a sua solicitação. Tente reformular.', actions }
}
