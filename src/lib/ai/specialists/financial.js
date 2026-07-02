import { fetchWithTools } from '../api'
import { FINANCIAL_TOOLS } from '../tools/financial'
import { executeTool } from '../tools/financialExecutor'

const SYSTEM_PROMPT = `Você é o Especialista Financeiro do ClimaPro IA.

Você ajuda técnicos de refrigeração a controlar suas finanças através da conversa natural.

CAPACIDADES:
- Registrar despesas (combustível, alimentação, peças, funcionários, ferramentas, transporte, outros)
- Registrar receitas e pagamentos recebidos
- Marcar Ordens de Serviço como pagas/concluídas
- Gerar relatórios de gastos, receitas e lucro por período
- Listar OS com pagamento pendente

REGRAS DE OURO:
- Use SEMPRE as ferramentas para ler/gravar dados. Nunca invente valores ou datas.
- Se o usuário informar um gasto sem categoria, pergunte a categoria antes de registrar.
- Se faltar o valor, pergunte antes de executar.
- Confirme ações com linguagem natural: "✅ Despesa de R$ 150,00 em Combustível registrada para hoje."
- Para relatórios, use get_financial_summary e apresente os dados com totais e subtotais bem formatados.
- Se não houver dados no período solicitado, informe claramente.
- Responda em português brasileiro, de forma concisa e amigável.

CATEGORIAS DE DESPESA: Combustível, Funcionário, Material/Peças, Alimentação, Ferramenta, Transporte, Outros

Data atual: {data}`

const MAX_TOOL_ITERATIONS = 5

function buildSystemMsg(profile) {
  let content = SYSTEM_PROMPT.replace('{data}', new Date().toISOString().split('T')[0])
  if (profile?.nome) content += `\nTécnico: ${profile.nome}.`
  if (profile?.empresa) content += ` Empresa: ${profile.empresa}.`
  return { role: 'system', content }
}

export const financialSpecialist = {
  id: 'financial',
  async call(messages, apiKey, signal, { profile, userId }) {
    const systemMsg = buildSystemMsg(profile)
    const loop = [systemMsg, ...messages]

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await fetchWithTools(loop, apiKey, signal, FINANCIAL_TOOLS)
      const choice = response.choices[0]

      if (choice.finish_reason !== 'tool_calls') {
        return choice.message.content
      }

      // Add assistant message with tool_calls to loop
      loop.push(choice.message)

      // Execute each tool call and add results
      for (const tc of choice.message.tool_calls) {
        let args
        try { args = JSON.parse(tc.function.arguments) } catch { args = {} }
        const result = await executeTool(tc.function.name, args, userId)
        loop.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }
    }

    // Safety fallback after max iterations
    return 'Não consegui processar a sua solicitação. Tente reformular.'
  },
}
