import { runAgent } from './agent'
import { buildSystemPrompt } from './systemPrompt'
import { ALL_TOOLS, executeTool } from './tools'
import { fetchOsContext } from './context/osContext'

/**
 * Ponto de entrada unificado do ClimaPro IA.
 * Chama o agente com o prompt e o conjunto completo de ferramentas —
 * o próprio modelo decide qual ação executar via tool-calling
 * (não há mais roteador de intenção/especialistas separados).
 *
 * Para adicionar um novo domínio de ferramentas:
 * 1. Crie src/lib/ai/tools/meuDominio.js (schemas) + meuDominioExecutor.js (execução)
 * 2. Registre ambos em src/lib/ai/tools/index.js
 * 3. Descreva as regras de uso em src/lib/ai/systemPrompt.js
 */
export async function callClimaPro(messages, signal, context) {
  let systemPrompt = buildSystemPrompt(context?.profile)

  // Se o técnico abriu o assistente a partir de uma OS (useAI().activeOrdemId),
  // anexa um resumo automático dela ao prompt — ver src/lib/ai/context/osContext.js.
  if (context?.activeOrdemId && context?.userId) {
    const osContext = await fetchOsContext(context.activeOrdemId, context.userId)
    if (osContext) systemPrompt += `\n\n${osContext}`
  }

  return runAgent({
    messages,
    signal,
    systemPrompt,
    tools: ALL_TOOLS,
    executeTool: (name, args) => executeTool(name, args, context?.userId),
    onPhaseChange: context?.onPhaseChange,
  })
}
