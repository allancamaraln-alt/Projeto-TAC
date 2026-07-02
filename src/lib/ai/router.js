// Padrões que indicam claramente intenção financeira
const FINANCIAL_PATTERNS = [
  /\bgaste[i]?\b|\bpague[i]?\b|\bcompre[i]?\b/i,
  /\brecebi\b|\brecebe[i]?\b|\bpagou\b/i,
  /\bdespesa[s]?\b|\breceita[s]?\b|\blucro\b|\bfluxo\b/i,
  /\bquanto\s+(gastei|recebi|tenho\s+para\s+receber|lucre[i]?)\b/i,
  /\bOS\s*#?\s*\d+\b.*\bpag[ao]/i,
  /\bpag[ao].*\bOS\s*#?\s*\d+\b/i,
  /\babastec[ei]\b/i,
  /R\$\s*[\d,.]+\b.{0,40}\b(gast[oei]|pag[uoei]|compre[i]?|recebi|almo[çc]|jantar|combustível)\b/i,
]

// Palavras que indicam contexto financeiro em follow-ups ambíguos
const FINANCIAL_CONTEXT_PATTERNS = [
  /\bcategoria\b|\bregistr[ae]\b|\bdespesa\b/i,
  /\bcom qual\b|\bem qual\b|\bpara qual\b/i,
  /\bquanto\b.*\?$/i,
]

function matchesAny(patterns, text) {
  return patterns.some(p => p.test(text))
}

function isFinancialFollowUp(lastAIMessage) {
  if (!lastAIMessage) return false
  // Se a última resposta da IA era sobre finanças E terminou com pergunta
  return matchesAny(FINANCIAL_CONTEXT_PATTERNS, lastAIMessage) && /\?/.test(lastAIMessage)
}

export function classifyIntent(userMessage, lastAIMessage) {
  if (matchesAny(FINANCIAL_PATTERNS, userMessage)) return 'financial'
  if (isFinancialFollowUp(lastAIMessage)) return 'financial'
  return 'technical'
}
