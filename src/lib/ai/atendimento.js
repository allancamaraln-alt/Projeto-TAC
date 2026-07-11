import { runAgent } from './agent'
import { ALL_TOOLS, executeTool } from './tools'
import { ATENDIMENTO_TOOLS } from './tools/atendimento'
import { executeAtendimentoTool } from './tools/atendimentoExecutor'
import { buildAtendimentoSystemPrompt } from './context/atendimentoPrompt'

const ATENDIMENTO_TOOL_NAMES = new Set(ATENDIMENTO_TOOLS.map(t => t.function.name))

// Turno do Modo Atendimento IA — reaproveita o mesmo agente/ferramentas do
// chat normal (src/lib/ai/agent.js, src/lib/ai/tools/index.js) e só
// acrescenta log_atendimento_evento + o contexto de OS sempre presente.
export async function runAtendimentoTurn(messages, signal, { profile, userId, ordemId, conversationId, onPhaseChange }) {
  const systemPrompt = await buildAtendimentoSystemPrompt(profile, ordemId, userId)
  const tools = [...ALL_TOOLS, ...ATENDIMENTO_TOOLS]

  return runAgent({
    messages,
    signal,
    systemPrompt,
    tools,
    executeTool: (name, args) => {
      if (ATENDIMENTO_TOOL_NAMES.has(name)) {
        return executeAtendimentoTool(args, { userId, ordemId, conversationId })
      }
      return executeTool(name, args, userId)
    },
    onPhaseChange,
  })
}
