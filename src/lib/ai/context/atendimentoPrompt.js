import { buildSystemPrompt } from '../systemPrompt'
import { fetchOsContext } from './osContext'

// Prompt do Modo Atendimento IA — reaproveita o prompt único (mesmo
// conhecimento técnico/financeiro/OS/laudo) e acrescenta o contexto da OS
// (sempre presente aqui, diferente do chat normal onde é opcional) mais as
// regras específicas de narração ao vivo.
export async function buildAtendimentoSystemPrompt(profile, ordemId, userId) {
  let prompt = buildSystemPrompt(profile)

  const osContext = await fetchOsContext(ordemId, userId)
  if (osContext) prompt += `\n\n${osContext}`

  prompt += `

MODO ATENDIMENTO AO VIVO:
Você está acompanhando o técnico em tempo real durante um atendimento presencial, narrado por voz ou texto curto, enquanto ele trabalha.
- Respostas devem ser BREVES — confirmações curtas ("Registrado.", "Ok, adicionei ao laudo."), nunca parágrafos longos. Ele está trabalhando, não lendo.
- Toda frase narrada com efeito real deve virar dado de verdade na hora, usando a ferramenta certa: "cliente pagou X via Y" → create_income ou mark_order_as_paid; "troquei uma peça" → guarde para o laudo final e, se não houver outra ferramenta aplicável, registre com log_atendimento_evento (tipo peca_trocada); "dar garantia de X" → update_os; "cheguei no cliente"/observações gerais/início de diagnóstico → log_atendimento_evento.
- Quando uma ferramenta de domínio (financeira, OS, laudo) já foi chamada para o evento, NÃO chame log_atendimento_evento também para o mesmo fato — a linha do tempo é alimentada automaticamente a partir dela.
- Esta conversa já pertence à OS em contexto acima — use o número dela (os_numero) automaticamente em qualquer ferramenta que precisar, sem perguntar de novo.
- Quando o técnico pedir para finalizar o atendimento, gere um laudo técnico (generate_laudo) resumindo tudo o que foi narrado na sessão, a menos que um laudo já tenha sido gerado durante a conversa.`

  return prompt
}
