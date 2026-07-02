import { technicalSpecialist } from './specialists/technical'
import { financialSpecialist } from './specialists/financial'
import { classifyIntent } from './router'

const SPECIALISTS = {
  technical: technicalSpecialist,
  financial: financialSpecialist,
}

/**
 * Ponto de entrada unificado do ClimaPro IA.
 * Classifica a intenção do usuário e delega ao especialista correto.
 *
 * Para adicionar um novo especialista:
 * 1. Crie src/lib/ai/specialists/meuEspecialista.js
 * 2. Adicione à constante SPECIALISTS acima
 * 3. Adicione os padrões de detecção em router.js
 */
function extractText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.find(c => c.type === 'text')?.text ?? ''
  return ''
}

export async function callClimaPro(messages, apiKey, signal, context) {
  const lastUserText = extractText(messages[messages.length - 1]?.content)
  const lastAIText = extractText([...messages].reverse().find(m => m.role === 'assistant')?.content ?? '')

  const intent = classifyIntent(lastUserText, lastAIText)
  const specialist = SPECIALISTS[intent] ?? SPECIALISTS.technical

  return specialist.call(messages, apiKey, signal, context)
}
